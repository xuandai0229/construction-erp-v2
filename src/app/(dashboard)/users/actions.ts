"use server";

import prisma from "@/lib/prisma";
import { requireHighLevelUser, assertRoleHierarchy, getAllowedRolesForActor, ROLE_DISPLAY_NAMES } from "@/lib/rbac";
import { writeAuditLog, writeSecurityAuditEvent } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import * as bcrypt from "bcryptjs";
import { Prisma, ProjectRole, UserRole } from "@prisma/client";
import { assertPermission } from "@/lib/permissions/permission-resolver";

const VALID_ROLES: UserRole[] = [
  "ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR", "SUPERVISION_HEAD", "CHIEF_COMMANDER",
  "CONSTRUCTION_SUPERVISOR", "MANAGER", "ENGINEER", "STAFF",
];
const VALID_PROJECT_ROLES: ProjectRole[] = [
  "PROJECT_MANAGER", "SITE_COMMANDER", "CHIEF_COMMANDER", "ASSISTANT_COMMANDER",
  "QA_QC", "HSE", "SUPERVISOR", "VIEWER",
];

function getExplicitProjectRole(projectId: string, projectRoles?: Record<string, ProjectRole>): ProjectRole {
  const projectRole = projectRoles?.[projectId];
  if (!projectRole) {
    throw new Error("Vui lòng chọn vai trò tại công trình cho từng công trình được gán.");
  }
  if (!VALID_PROJECT_ROLES.includes(projectRole)) {
    throw new Error("Vai trò tại công trình không hợp lệ.");
  }
  return projectRole;
}

// ─── Helpers ──────────────────────────────────────────────────

async function assertValidProjectIds(projectIds: string[] | undefined) {
  const uniqueProjectIds = [...new Set((projectIds ?? []).filter(Boolean))];
  if (uniqueProjectIds.length === 0) return uniqueProjectIds;

  const existingProjects = await prisma.project.count({
    where: { id: { in: uniqueProjectIds }, deletedAt: null },
  });
  if (existingProjects !== uniqueProjectIds.length) {
    throw new Error("Một hoặc nhiều công trình được chọn không còn tồn tại hoặc đã ngừng sử dụng.");
  }
  return uniqueProjectIds;
}

async function syncChiefCommanderAssignments(
  tx: Prisma.TransactionClient,
  input: {
    userId: string;
    projectIds: string[];
    projectRoles: Map<string, ProjectRole>;
    actorUserId: string;
  },
) {
  const user = await tx.user.findUnique({
    where: { id: input.userId },
    select: { role: true, employee: { select: { id: true } } },
  });
  if (!user || user.role !== "CHIEF_COMMANDER") return;
  if (!user.employee) {
    throw new Error("Tài khoản Chỉ huy trưởng chưa liên kết hồ sơ nhân sự. Vui lòng liên kết hồ sơ trước khi gán công trình.");
  }

  const personnelRole = await tx.projectPersonnelRole.findFirst({
    where: { code: "CHT", isActive: true },
    select: { id: true },
  });
  if (!personnelRole) throw new Error("Không tìm thấy vai trò nhân sự Chỉ huy trưởng đang hoạt động.");

  const desiredProjectIds = input.projectIds.filter(
    (projectId) => input.projectRoles.get(projectId) === "CHIEF_COMMANDER",
  );
  const activeAssignments = await tx.employeeProjectAssignment.findMany({
    where: {
      employeeId: user.employee.id,
      projectPersonnelRoleId: personnelRole.id,
      status: "ACTIVE",
    },
    select: { id: true, projectId: true },
  });
  const activeProjectIds = new Set(activeAssignments.map((assignment) => assignment.projectId));
  const desiredProjectIdSet = new Set(desiredProjectIds);
  const now = new Date();

  const toRelease = activeAssignments.filter((assignment) => !desiredProjectIdSet.has(assignment.projectId));
  if (toRelease.length) {
    await tx.employeeProjectAssignment.updateMany({
      where: { id: { in: toRelease.map((assignment) => assignment.id) } },
      data: {
        status: "RELEASED",
        endDate: now,
        endReason: "EARLY_RELEASE",
        notes: "Gỡ phân công từ Quản lý tài khoản; đã đồng bộ quyền công trình.",
      },
    });
  }

  for (const projectId of desiredProjectIds) {
    if (activeProjectIds.has(projectId)) continue;
    await tx.employeeProjectAssignment.create({
      data: {
        employeeId: user.employee.id,
        projectId,
        projectPersonnelRoleId: personnelRole.id,
        startDate: now,
        allocationPercentage: 100,
        status: "ACTIVE",
        notes: "Gán từ Quản lý tài khoản; đã đồng bộ quyền công trình.",
        createdById: input.actorUserId,
      },
    });
  }
}

/**
 * Returns the list of roles the current actor is allowed to assign/create.
 * Exported so the page server component can pass it to the client.
 */
export async function getAllowedRoles(): Promise<{ role: UserRole; label: string }[]> {
  const session = await requireHighLevelUser();
  const allowed = getAllowedRolesForActor(session.role);
  return allowed.map(r => ({ role: r, label: ROLE_DISPLAY_NAMES[r] }));
}

// ─── Get Users ────────────────────────────────────────────────

export async function getUsers() {
  const session = await requireHighLevelUser();
  await assertPermission(session, "users.view");

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: {
      projectMembers: {
        where: { deletedAt: null, isActive: true },
        include: {
          project: { select: { id: true, code: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return users;
}

// ─── Create User ──────────────────────────────────────────────

interface CreateUserInput {
  name: string;
  email?: string | null;
  username?: string;
  phone?: string;
  password: string;
  role: UserRole;
  projectIds?: string[];
  projectRoles?: Record<string, ProjectRole>;
  note?: string;
  supervisionScopeType?: "ALL_PROJECTS" | "SELECTED_PROJECTS";
  supervisionProjectIds?: string[];
}

export async function createUser(input: CreateUserInput) {
  const session = await requireHighLevelUser();
  await assertPermission(session, "users.create");
  await assertPermission(session, "users.assign_system_role");

  // ── Role hierarchy: actor must be allowed to assign the requested role ──
  if (!VALID_ROLES.includes(input.role)) {
    return { error: "Vai trò không hợp lệ" };
  }
  if (input.role === "CHIEF_COMMANDER") {
    return { error: "Tài khoản Chỉ huy trưởng phải được tạo từ hồ sơ nhân sự để bảo đảm một người chỉ có một tài khoản." };
  }
  try {
    assertRoleHierarchy(session, "", input.role, input.role, "tạo tài khoản với vai trò");
  } catch (e: any) {
    return { error: e.message };
  }

  // ── Validate inputs ──
  const trimmedEmail = input.email?.trim().toLowerCase() || null;
  const trimmedName = input.name.trim();
  const trimmedUsername = input.username?.trim() || null;
  const trimmedPhone = input.phone?.trim() || null;
  if (!trimmedName) return { error: "Họ tên không được bỏ trống" };
  if (!trimmedEmail && !trimmedUsername) return { error: "Vui lòng nhập tên đăng nhập hoặc email" };
  if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { error: "Email không đúng định dạng" };
  }

  // Validate unique email
  if (trimmedEmail) {
    const existingEmail = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });
    if (existingEmail) {
      return { error: "Email đã tồn tại trong hệ thống" };
    }
  }

  // Validate unique username if provided
  if (trimmedUsername) {
    const existingUsername = await prisma.user.findUnique({
      where: { username: trimmedUsername },
    });
    if (existingUsername) {
      return { error: "Tên đăng nhập đã tồn tại trong hệ thống" };
    }
  }

  if (trimmedPhone) {
    const existingPhone = await prisma.user.findFirst({
      where: { phone: trimmedPhone, deletedAt: null },
      select: { id: true },
    });
    if (existingPhone) return { error: "Số điện thoại đã được sử dụng bởi một tài khoản đang hoạt động." };
  }

  // Validate password length
  if (input.password.length < 6) {
    return { error: "Mật khẩu phải có ít nhất 6 ký tự" };
  }

  const projectIds = await assertValidProjectIds(input.projectIds);
  if (projectIds.length > 0) await assertPermission(session, "users.assign_project_role");
  try {
    projectIds.forEach((projectId) => getExplicitProjectRole(projectId, input.projectRoles));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Vai trò tại công trình không hợp lệ." };
  }

  // Supervision scope validation
  if (input.role === "SUPERVISION_HEAD") {
    if (!input.supervisionScopeType) {
      return { error: "Vui lòng chọn phạm vi giám sát." };
    }
    if (input.supervisionScopeType === "SELECTED_PROJECTS") {
      if (!input.supervisionProjectIds || input.supervisionProjectIds.length === 0) {
        return { error: "Vui lòng chọn ít nhất một công trình cho phạm vi giám sát." };
      }
      // Note: we can just check length since uniqueness is handled in assertValidProjectIds
      const validScopeProjects = await assertValidProjectIds(input.supervisionProjectIds);
      // We update the input.supervisionProjectIds to the deduplicated/valid ones
      input.supervisionProjectIds = validScopeProjects;
    } else if (input.supervisionScopeType === "ALL_PROJECTS") {
      // Clear selected projects if ALL_PROJECTS
      input.supervisionProjectIds = [];
    }
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: trimmedName,
          email: trimmedEmail,
          username: trimmedUsername,
          phone: trimmedPhone,
          password: hashedPassword,
          role: input.role,
          isActive: true,
          mustChangePassword: true,
          passwordChangedAt: null,
        },
      });

      // Project membership is explicit and independent from the system role.
      if (projectIds.length > 0) {
        await Promise.all(
          projectIds.map((projectId) =>
            tx.projectMember.create({
              data: {
                projectId,
                userId: newUser.id,
                role: getExplicitProjectRole(projectId, input.projectRoles),
                assignedById: session.id,
                isActive: true,
                note: input.note || null,
              },
            })
          )
        );
      }

      if (input.role === "SUPERVISION_HEAD" && input.supervisionScopeType) {
        await tx.supervisionScope.create({
          data: {
            userId: newUser.id,
            scopeType: input.supervisionScopeType,
            createdById: session.id,
            projects: input.supervisionScopeType === "SELECTED_PROJECTS" && input.supervisionProjectIds?.length 
              ? { create: input.supervisionProjectIds.map(id => ({ projectId: id })) } 
              : undefined,
          }
        });
      }

      return newUser;
    });

    await writeAuditLog({
      userId: session.id,
      action: "CREATE_USER",
      entityType: "User",
      entityId: user.id,
      afterData: { name: user.name, email: user.email, role: user.role } as unknown as Record<string, unknown>,
    });
    if (user.role === "CONSTRUCTION_SUPERVISOR") {
      await writeSecurityAuditEvent({ eventType: "ROLE_GRANTED", actorId: session.id, role: session.role, action: "users.create", resourceType: "User", resourceId: user.id, reasonCode: "CONSTRUCTION_SUPERVISOR_ASSIGNED" });
    }

    revalidatePath("/users");
    return { success: true, userId: user.id };
  } catch (error: any) {
    console.error("Create user error:", error);
    return { error: "Đã xảy ra lỗi khi tạo tài khoản" };
  }
}

// ─── Update User ──────────────────────────────────────────────

interface UpdateUserInput {
  name?: string;
  email?: string | null;
  username?: string;
  phone?: string;
  role?: UserRole;
  projectIds?: string[];
  projectRoles?: Record<string, ProjectRole>;
  note?: string;
  supervisionScopeType?: "ALL_PROJECTS" | "SELECTED_PROJECTS";
  supervisionProjectIds?: string[];
}

export async function updateUser(userId: string, input: UpdateUserInput) {
  const session = await requireHighLevelUser();
  await assertPermission(session, "users.update_profile");
  if (input.role !== undefined) await assertPermission(session, "users.assign_system_role");
  if (input.projectIds !== undefined) await assertPermission(session, "users.assign_project_role");

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return { error: "Không tìm thấy tài khoản" };
  if (existing.deletedAt) return { error: "Tài khoản đã bị xóa mềm. Vui lòng khôi phục trước khi chỉnh sửa." };


  // ── Role hierarchy: actor must outrank target ──
  try {
    assertRoleHierarchy(session, userId, existing.role, input.role, "sửa");
  } catch (e: any) {
    return { error: e.message };
  }

  // ── Self role change guard ──
  if (input.role && userId === session.id && input.role !== existing.role) {
    return { error: "Bạn không thể tự đổi vai trò của chính mình." };
  }

  // ── Last admin guard (role downgrade) ──
  if (input.role && existing.role === "ADMIN" && input.role !== "ADMIN") {
    const activeAdmins = await prisma.user.count({
      where: { isActive: true, deletedAt: null, role: "ADMIN", id: { not: userId } },
    });
    if (activeAdmins === 0) {
      return { error: "Không thể hạ quyền quản trị viên cuối cùng." };
    }
  }

  if (input.role && !VALID_ROLES.includes(input.role)) {
    return { error: "Vai trò không hợp lệ." };
  }
  if (input.name !== undefined && !input.name.trim()) {
    return { error: "Họ tên không được để trống." };
  }
  if (input.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) {
    return { error: "Email không đúng định dạng." };
  }

  // Check email uniqueness if changing
  const trimmedUsername = input.username?.trim() || null;
  const trimmedPhone = input.phone?.trim() || null;
  const trimmedEmail = input.email?.trim().toLowerCase() || null;
  const effectiveEmail = input.email === undefined ? existing.email : trimmedEmail;
  const effectiveUsername = input.username === undefined ? existing.username : trimmedUsername;
  if (!effectiveEmail && !effectiveUsername) {
    return { error: "Tài khoản phải có tên đăng nhập hoặc email." };
  }
  if (trimmedEmail && trimmedEmail !== existing.email) {
    const emailConflict = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });
    if (emailConflict) return { error: "Email đã tồn tại" };
  }

  // Check username uniqueness if changing
  if (trimmedUsername && trimmedUsername !== existing.username) {
    const usernameConflict = await prisma.user.findUnique({
      where: { username: trimmedUsername },
    });
    if (usernameConflict) return { error: "Tên đăng nhập đã tồn tại" };
  }

  if (trimmedPhone && trimmedPhone !== existing.phone) {
    const phoneConflict = await prisma.user.findFirst({
      where: { phone: trimmedPhone, deletedAt: null, id: { not: userId } },
      select: { id: true },
    });
    if (phoneConflict) return { error: "Số điện thoại đã được sử dụng bởi một tài khoản đang hoạt động." };
  }

  const projectIds = input.projectIds === undefined ? undefined : await assertValidProjectIds(input.projectIds);

  const currentRole = input.role || existing.role;
  if (currentRole === "SUPERVISION_HEAD") {
    if (input.supervisionScopeType === "SELECTED_PROJECTS") {
      if (!input.supervisionProjectIds || input.supervisionProjectIds.length === 0) {
        return { error: "Vui lòng chọn ít nhất một công trình cho phạm vi giám sát." };
      }
      const validScopeProjects = await assertValidProjectIds(input.supervisionProjectIds);
      input.supervisionProjectIds = validScopeProjects;
    } else if (input.supervisionScopeType === "ALL_PROJECTS") {
      input.supervisionProjectIds = [];
    }
  }
  try {
    const updated = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          ...(input.name !== undefined && { name: input.name.trim() }),
          ...(input.email !== undefined && { email: trimmedEmail }),
          ...(input.username !== undefined && { username: trimmedUsername }),
          ...(input.phone !== undefined && { phone: trimmedPhone }),
          ...(input.role !== undefined && { role: input.role }),
        },
      });

      // Handle project assignments if provided
      if (projectIds !== undefined) {
        // Find existing active projects
        const existingMembers = await tx.projectMember.findMany({
          where: { userId, isActive: true, deletedAt: null },
        });

        const existingProjectIds = existingMembers.map((m) => m.projectId);
        const newProjectIds = projectIds;

        const toAdd = newProjectIds.filter((id) => !existingProjectIds.includes(id));
        const toRemove = existingProjectIds.filter((id) => !newProjectIds.includes(id));

        // A project role changes only when this explicit membership form is submitted.
        for (const member of existingMembers) {
          const requestedProjectRole = input.projectRoles?.[member.projectId];
          if (requestedProjectRole && requestedProjectRole !== member.role) {
            await tx.projectMember.update({
              where: { id: member.id },
              data: { role: getExplicitProjectRole(member.projectId, input.projectRoles) },
            });
          }
        }

        // Remove (soft delete/deactivate) unselected projects
        if (toRemove.length > 0) {
          await tx.projectMember.updateMany({
            where: { userId, projectId: { in: toRemove } },
            data: { isActive: false, deletedAt: new Date(), leftAt: new Date() },
          });
        }

        // Add new projects
        if (toAdd.length > 0) {
          for (const projectId of toAdd) {
            // Check if there's a soft-deleted record to reactivate
            const existingRecord = await tx.projectMember.findUnique({
              where: { projectId_userId: { projectId, userId } },
            });

            if (existingRecord) {
              const requestedProjectRole = input.projectRoles?.[projectId];
              await tx.projectMember.update({
                where: { id: existingRecord.id },
                data: {
                  isActive: true,
                  deletedAt: null,
                  leftAt: null,
                  role: requestedProjectRole
                    ? getExplicitProjectRole(projectId, input.projectRoles)
                    : existingRecord.role,
                  assignedById: session.id,
                  note: input.note || null,
                },
              });
            } else {
              await tx.projectMember.create({
                data: {
                  projectId,
                  userId,
                  role: getExplicitProjectRole(projectId, input.projectRoles),
                  assignedById: session.id,
                  isActive: true,
                  note: input.note || null,
                },
              });
            }
          }
        }

        const effectiveProjectRoles = new Map<string, ProjectRole>();
        for (const projectId of newProjectIds) {
          const role = input.projectRoles?.[projectId]
            ?? existingMembers.find((member) => member.projectId === projectId)?.role;
          if (role) effectiveProjectRoles.set(projectId, role);
        }
        await syncChiefCommanderAssignments(tx, {
          userId,
          projectIds: newProjectIds,
          projectRoles: effectiveProjectRoles,
          actorUserId: session.id,
        });
      }

      const currentRole = input.role || existing.role;
      if (currentRole === "SUPERVISION_HEAD") {
        if (input.supervisionScopeType) {
          const existingScope = await tx.supervisionScope.findUnique({ where: { userId } });
          if (existingScope) {
            await tx.supervisionScope.update({
              where: { userId },
              data: { scopeType: input.supervisionScopeType },
            });
            await tx.supervisionScopeProject.deleteMany({ where: { scopeId: existingScope.id } });
            if (input.supervisionScopeType === "SELECTED_PROJECTS" && input.supervisionProjectIds?.length) {
              await tx.supervisionScopeProject.createMany({
                data: input.supervisionProjectIds.map(id => ({ scopeId: existingScope.id, projectId: id }))
              });
            }
          } else {
            await tx.supervisionScope.create({
              data: {
                userId,
                scopeType: input.supervisionScopeType,
                createdById: session.id,
                projects: input.supervisionScopeType === "SELECTED_PROJECTS" && input.supervisionProjectIds?.length 
                  ? { create: input.supervisionProjectIds.map(id => ({ projectId: id })) } 
                  : undefined,
              }
            });
          }
        }
      }

      return updatedUser;
    });

    await writeAuditLog({
      userId: session.id,
      action: "UPDATE_USER",
      entityType: "User",
      entityId: userId,
      beforeData: { name: existing.name, role: existing.role, isActive: existing.isActive } as unknown as Record<string, unknown>,
      afterData: { name: updated.name, role: updated.role, isActive: updated.isActive } as unknown as Record<string, unknown>,
    });
    if (existing.role !== updated.role && updated.role === "CONSTRUCTION_SUPERVISOR") {
      await writeSecurityAuditEvent({ eventType: "ROLE_GRANTED", actorId: session.id, role: session.role, action: "users.assign_system_role", resourceType: "User", resourceId: userId, reasonCode: "CONSTRUCTION_SUPERVISOR_ASSIGNED" });
    } else if (existing.role === "CONSTRUCTION_SUPERVISOR" && updated.role !== existing.role) {
      await writeSecurityAuditEvent({ eventType: "ROLE_REVOKED", actorId: session.id, role: session.role, action: "users.assign_system_role", resourceType: "User", resourceId: userId, reasonCode: "CONSTRUCTION_SUPERVISOR_REMOVED" });
    }

    revalidatePath("/users");
    return { success: true };
  } catch (error: any) {
    console.error("Update user error:", error);
    return { error: error.message || "Đã xảy ra lỗi khi cập nhật" };
  }
}

// ─── Reset Password ───────────────────────────────────────────

function generateSecurePassword(length = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  const randomBytes = new Uint32Array(length);
  crypto.getRandomValues(randomBytes);
  for (let i = 0; i < length; i++) {
    password += charset.charAt(randomBytes[i] % charset.length);
  }
  const upperIdx = crypto.getRandomValues(new Uint32Array(1))[0] % 26 + 26;
  const numIdx = crypto.getRandomValues(new Uint32Array(1))[0] % 10 + 52;
  password = password.replace(/^[a-z]/, charset.charAt(upperIdx));
  password = password.replace(/^[A-Z]/, charset.charAt(numIdx));
  return password;
}

export async function resetUserPassword(userId: string) {
  const session = await requireHighLevelUser();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Không tìm thấy tài khoản" };
  if (user.deletedAt) return { error: "Tài khoản đã bị xóa mềm. Vui lòng khôi phục trước khi thao tác." };

  // ── Role hierarchy: cannot reset password of higher/equal role ──
  try {
    assertRoleHierarchy(session, userId, user.role, undefined, "đổi mật khẩu");
  } catch (e: any) {
    return { error: e.message };
  }

  // Self reset via admin action is not allowed (use change-password flow)
  if (userId === session.id) {
    return { error: "Không thể dùng chức năng này để đổi mật khẩu chính mình." };
  }

  const tempPassword = generateSecurePassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, mustChangePassword: true, passwordChangedAt: null },
    });

    await writeAuditLog({
      userId: session.id,
      action: "RESET_USER_PASSWORD",
      entityType: "User",
      entityId: userId,
    });

    revalidatePath("/users");
    return { success: true, tempPassword };
  } catch {
    return { error: "Đã xảy ra lỗi khi đổi mật khẩu" };
  }
}

// ─── Toggle Active ────────────────────────────────────────────

export async function toggleUserActive(userId: string) {
  const session = await requireHighLevelUser();
  await assertPermission(session, "users.lock");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Không tìm thấy tài khoản" };
  if (user.deletedAt) return { error: "Tài khoản đã bị xóa mềm. Vui lòng khôi phục trước khi thao tác." };

  // Prevent deactivating yourself
  if (userId === session.id) {
    return { error: "Bạn không thể khóa chính tài khoản đang đăng nhập." };
  }

  // ── Role hierarchy: cannot lock/unlock higher/equal role ──
  try {
    assertRoleHierarchy(session, userId, user.role, undefined, "khóa/mở khóa");
  } catch (e: any) {
    return { error: e.message };
  }

  // Prevent locking the last active ADMIN
  if (user.isActive && user.role === "ADMIN") {
    const activeAdmins = await prisma.user.count({
      where: {
        isActive: true,
        deletedAt: null,
        role: "ADMIN",
        id: { not: userId }
      }
    });
    if (activeAdmins === 0) {
      return { error: "Không thể khóa quản trị viên ADMIN cuối cùng đang hoạt động." };
    }
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  });

  await writeAuditLog({
    userId: session.id,
    action: user.isActive ? "DEACTIVATE_USER" : "ACTIVATE_USER",
    entityType: "User",
    entityId: userId,
  });
  if (user.role === "CONSTRUCTION_SUPERVISOR") {
    await writeSecurityAuditEvent({
      eventType: updated.isActive ? "ROLE_GRANTED" : "ROLE_REVOKED",
      actorId: session.id,
      role: session.role,
      action: updated.isActive ? "users.activate" : "users.deactivate",
      resourceType: "User",
      resourceId: userId,
      reasonCode: updated.isActive ? "ACCOUNT_REACTIVATED" : "ACCOUNT_DEACTIVATED",
    });
  }

  revalidatePath("/users");
  return { success: true, isActive: updated.isActive };
}

// ─── Assign Project ───────────────────────────────────────────

export async function assignProjectToUser(
  userId: string,
  projectId: string,
  projectRole: ProjectRole,
  note?: string
) {
  const session = await requireHighLevelUser();
  await assertPermission(session, "users.assign_project_role");
  await assertValidProjectIds([projectId]);
  if (!projectRole) {
    return { error: "Vui lòng chọn vai trò tại công trình trước khi gán." };
  }
  if (!VALID_PROJECT_ROLES.includes(projectRole)) {
    return { error: "Vai trò tại công trình không hợp lệ." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Không tìm thấy tài khoản" };

  // ── Role hierarchy: cannot manage project membership of higher/equal role ──
  try {
    assertRoleHierarchy(session, userId, user.role, undefined, "gán công trình cho");
  } catch (e: any) {
    return { error: e.message };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
      });
      if (existing?.isActive && !existing.deletedAt && !existing.leftAt) {
        throw new Error("Người dùng đã được gán vào công trình này.");
      }
      if (existing) {
        await tx.projectMember.update({
          where: { id: existing.id },
          data: {
            isActive: true,
            deletedAt: null,
            leftAt: null,
            role: projectRole,
            assignedById: session.id,
            note: note || null,
          },
        });
      } else {
        await tx.projectMember.create({
          data: {
            projectId,
            userId,
            role: projectRole,
            assignedById: session.id,
            isActive: true,
            note: note || null,
          },
        });
      }

      const activeMembers = await tx.projectMember.findMany({
        where: { userId, isActive: true, deletedAt: null, leftAt: null },
        select: { projectId: true, role: true },
      });
      await syncChiefCommanderAssignments(tx, {
        userId,
        projectIds: activeMembers.map((member) => member.projectId),
        projectRoles: new Map(activeMembers.map((member) => [member.projectId, member.role])),
        actorUserId: session.id,
      });
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Không thể gán công trình." };
  }

  await writeAuditLog({
    userId: session.id,
    projectId,
    action: "ASSIGN_PROJECT",
    entityType: "ProjectMember",
    entityId: `${userId}:${projectId}`,
  });
  revalidatePath("/users");
  return { success: true };
}

// ─── Unassign Project ─────────────────────────────────────────

export async function unassignProjectFromUser(
  userId: string,
  projectId: string
) {
  const session = await requireHighLevelUser();
  await assertPermission(session, "users.assign_project_role");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Không tìm thấy tài khoản" };

  // ── Role hierarchy ──
  try {
    assertRoleHierarchy(session, userId, user.role, undefined, "gỡ công trình của");
  } catch (e: any) {
    return { error: e.message };
  }

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (!member) return { error: "Không tìm thấy gán công trình" };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.projectMember.update({
        where: { id: member.id },
        data: { isActive: false, deletedAt: new Date(), leftAt: new Date() },
      });
      const activeMembers = await tx.projectMember.findMany({
        where: { userId, isActive: true, deletedAt: null, leftAt: null },
        select: { projectId: true, role: true },
      });
      await syncChiefCommanderAssignments(tx, {
        userId,
        projectIds: activeMembers.map((item) => item.projectId),
        projectRoles: new Map(activeMembers.map((item) => [item.projectId, item.role])),
        actorUserId: session.id,
      });
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Không thể gỡ công trình." };
  }

  await writeAuditLog({
    userId: session.id,
    projectId,
    action: "UNASSIGN_PROJECT",
    entityType: "ProjectMember",
    entityId: `${userId}:${projectId}`,
  });

  revalidatePath("/users");
  return { success: true };
}

// ─── Get Projects for assignment ──────────────────────────────

export async function getProjectsForAssignment() {
  await requireHighLevelUser();

  return prisma.project.findMany({
    where: { deletedAt: null },
    select: { id: true, code: true, name: true, status: true },
    orderBy: { code: "asc" },
  });
}

// ─── Soft Delete User ─────────────────────────────────────────

export async function softDeleteUser(userId: string, reason?: string) {
  const session = await requireHighLevelUser();
  await assertPermission(session, "users.deactivate");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Không tìm thấy tài khoản" };
  if (user.deletedAt) return { error: "Tài khoản đã bị xóa mềm" };

  if (userId === session.id) {
    return { error: "Bạn không thể xóa chính tài khoản đang đăng nhập." };
  }

  // ── Role hierarchy: cannot delete higher/equal role ──
  try {
    assertRoleHierarchy(session, userId, user.role, undefined, "xóa");
  } catch (e: any) {
    return { error: e.message };
  }

  if (user.role === "ADMIN") {
    const activeAdmins = await prisma.user.count({
      where: {
        isActive: true,
        deletedAt: null,
        role: "ADMIN",
        id: { not: userId }
      }
    });
    if (activeAdmins === 0) {
      return { error: "Không thể xóa quản trị viên ADMIN cuối cùng đang hoạt động." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false, deletedAt: new Date() },
  });

  await writeAuditLog({
    userId: session.id,
    action: "SOFT_DELETE_USER",
    entityType: "User",
    entityId: userId,
    afterData: { reason: reason?.trim() || null, accountStatus: "STOPPED" } as unknown as Record<string, unknown>,
  });
  if (user.role === "CONSTRUCTION_SUPERVISOR") {
    await writeSecurityAuditEvent({ eventType: "ROLE_REVOKED", actorId: session.id, role: session.role, action: "users.soft_delete", resourceType: "User", resourceId: userId, reasonCode: "ACCOUNT_SOFT_DELETED" });
  }

  revalidatePath("/users");
  return { success: true };
}

// ─── Restore User ─────────────────────────────────────────────

export async function restoreUser(userId: string) {
  const session = await requireHighLevelUser();
  await assertPermission(session, "users.deactivate");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Không tìm thấy tài khoản" };
  if (!user.deletedAt) return { error: "Tài khoản chưa bị xóa mềm" };

  // ── Role hierarchy ──
  try {
    assertRoleHierarchy(session, userId, user.role, undefined, "khôi phục");
  } catch (e: any) {
    return { error: e.message };
  }

  // Check email conflict with active users
  const emailConflict = user.email ? await prisma.user.findFirst({
    where: { email: user.email, deletedAt: null, id: { not: userId } }
  }) : null;
  
  if (emailConflict) {
    return { error: "Không thể khôi phục vì email đã được tài khoản khác sử dụng." };
  }

  // Check username conflict with active users
  if (user.username) {
    const usernameConflict = await prisma.user.findFirst({
      where: { username: user.username, deletedAt: null, id: { not: userId } }
    });
    
    if (usernameConflict) {
      return { error: "Không thể khôi phục vì tên đăng nhập đã được tài khoản khác sử dụng." };
    }
  }

  if (user.phone) {
    const phoneConflict = await prisma.user.findFirst({
      where: { phone: user.phone, deletedAt: null, id: { not: userId } },
      select: { id: true },
    });
    if (phoneConflict) {
      return { error: "Không thể khôi phục vì số điện thoại đã được tài khoản khác sử dụng." };
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: null, isActive: true },
  });

  await writeAuditLog({
    userId: session.id,
    action: "RESTORE_USER",
    entityType: "User",
    entityId: userId,
  });

  revalidatePath("/users");
  return { success: true };
}

export async function deleteUserSafely(userId: string) {
  const session = await requireHighLevelUser();
  await assertPermission(session, "users.deactivate");
  if (session.role !== "ADMIN") return { error: "Chỉ Quản trị viên được phép xóa tài khoản." };
  if (userId === session.id) return { error: "Bạn không thể xóa tài khoản đang đăng nhập." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      employee: { select: { id: true } },
      _count: {
        select: {
          projectMembers: true,
          auditLogs: true,
          documents: true,
          createdSiteReports: true,
          approvedSiteReports: true,
          messages: true,
          approvalRequests: true,
          approvals: true,
          createdFieldEntries: true,
          approvedFieldEntries: true,
          materialProposalsCreated: true,
          materialProposalApprovals: true,
        },
      },
    },
  });
  if (!user) return { error: "Không tìm thấy tài khoản." };

  if (user.role === "ADMIN") {
    const otherActiveAdmins = await prisma.user.count({
      where: { id: { not: userId }, role: "ADMIN", isActive: true, deletedAt: null },
    });
    if (otherActiveAdmins === 0) return { error: "Không thể xóa Quản trị viên cuối cùng của hệ thống." };
  }

  const dependencyCount = Object.values(user._count).reduce((sum, count) => sum + count, 0)
    + (user.employee ? 1 : 0);
  if (dependencyCount > 0) {
    if (!user.deletedAt || user.isActive) {
      await prisma.user.update({
        where: { id: userId },
        data: { isActive: false, deletedAt: user.deletedAt ?? new Date() },
      });
    }
    await writeAuditLog({
      userId: session.id,
      action: "USER_DELETE_CONVERTED_TO_ARCHIVE",
      entityType: "User",
      entityId: userId,
      afterData: { dependencyCount, accountStatus: "STOPPED" } as unknown as Record<string, unknown>,
    });
    revalidatePath("/users");
    return {
      success: true,
      archived: true,
      message: "Tài khoản có lịch sử nghiệp vụ nên đã chuyển sang Ngừng sử dụng, không xóa vĩnh viễn.",
    };
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch {
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false, deletedAt: user.deletedAt ?? new Date() },
    });
    await writeAuditLog({
      userId: session.id,
      action: "USER_DELETE_CONVERTED_TO_ARCHIVE",
      entityType: "User",
      entityId: userId,
      afterData: { reason: "FOREIGN_KEY_DEPENDENCY", accountStatus: "STOPPED" } as unknown as Record<string, unknown>,
    });
    revalidatePath("/users");
    return {
      success: true,
      archived: true,
      message: "Tài khoản còn liên kết dữ liệu nên đã chuyển sang Ngừng sử dụng.",
    };
  }

  await writeAuditLog({
    userId: session.id,
    action: "HARD_DELETE_UNUSED_USER",
    entityType: "User",
    entityId: userId,
  });
  revalidatePath("/users");
  return { success: true, archived: false, message: "Đã xóa tài khoản chưa phát sinh nghiệp vụ." };
}
