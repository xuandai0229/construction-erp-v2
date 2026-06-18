"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requireHighLevelUser, canManageUsers } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import * as bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

// ─── Get Users ────────────────────────────────────────────────

export async function getUsers() {
  const session = await requireHighLevelUser();

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
  email: string;
  username?: string;
  phone?: string;
  password: string;
  role: UserRole;
  projectIds?: string[];
  note?: string;
}

export async function createUser(input: CreateUserInput) {
  const session = await requireHighLevelUser();

  // Validate unique email
  const existingEmail = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existingEmail) {
    return { error: "Email đã tồn tại trong hệ thống" };
  }

  // Validate unique username if provided
  if (input.username) {
    const existingUsername = await prisma.user.findUnique({
      where: { username: input.username },
    });
    if (existingUsername) {
      return { error: "Tên đăng nhập đã tồn tại trong hệ thống" };
    }
  }

  // Validate password length
  if (input.password.length < 6) {
    return { error: "Mật khẩu phải có ít nhất 6 ký tự" };
  }

  const hashedPassword = await bcrypt.hash(input.password, 10);

  try {
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          username: input.username || null,
          phone: input.phone || null,
          password: hashedPassword,
          role: input.role,
          isActive: true,
        },
      });

      // Assign projects if provided (for CHIEF_COMMANDER)
      if (input.projectIds && input.projectIds.length > 0) {
        const projectRole = input.role === "CHIEF_COMMANDER" ? "CHIEF_COMMANDER" as const : "VIEWER" as const;
        
        await Promise.all(
          input.projectIds.map((projectId) =>
            tx.projectMember.create({
              data: {
                projectId,
                userId: newUser.id,
                role: projectRole,
                assignedById: session.id,
                isActive: true,
                note: input.note || null,
              },
            })
          )
        );
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
  email?: string;
  username?: string;
  phone?: string;
  role?: UserRole;
  isActive?: boolean;
  projectIds?: string[];
  note?: string;
}

export async function updateUser(userId: string, input: UpdateUserInput) {
  const session = await requireHighLevelUser();

  const existing = await prisma.user.findUnique({ where: { id: userId } });
  if (!existing) return { error: "Không tìm thấy tài khoản" };

  // Check email uniqueness if changing
  if (input.email && input.email !== existing.email) {
    const emailConflict = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (emailConflict) return { error: "Email đã tồn tại" };
  }

  // Check username uniqueness if changing
  if (input.username && input.username !== existing.username) {
    const usernameConflict = await prisma.user.findUnique({
      where: { username: input.username },
    });
    if (usernameConflict) return { error: "Tên đăng nhập đã tồn tại" };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.email !== undefined && { email: input.email }),
          ...(input.username !== undefined && { username: input.username || null }),
          ...(input.phone !== undefined && { phone: input.phone || null }),
          ...(input.role !== undefined && { role: input.role }),
          ...(input.isActive !== undefined && { isActive: input.isActive }),
        },
      });

      // Handle project assignments if provided
      if (input.projectIds !== undefined) {
        // Find existing active projects
        const existingMembers = await tx.projectMember.findMany({
          where: { userId, isActive: true, deletedAt: null },
        });

        const existingProjectIds = existingMembers.map((m) => m.projectId);
        const newProjectIds = input.projectIds;

        const toAdd = newProjectIds.filter((id) => !existingProjectIds.includes(id));
        const toRemove = existingProjectIds.filter((id) => !newProjectIds.includes(id));

        const projectRole = updatedUser.role === "CHIEF_COMMANDER" ? ("CHIEF_COMMANDER" as const) : ("VIEWER" as const);

        // Remove (soft delete/deactivate) unselected projects
        if (toRemove.length > 0) {
          await tx.projectMember.updateMany({
            where: { userId, projectId: { in: toRemove } },
            data: { isActive: false, deletedAt: new Date() },
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
              await tx.projectMember.update({
                where: { id: existingRecord.id },
                data: {
                  isActive: true,
                  deletedAt: null,
                  role: projectRole,
                  assignedById: session.id,
                  note: input.note || null,
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
                  note: input.note || null,
                },
              });
            }
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

    revalidatePath("/users");
    return { success: true };
  } catch (error: any) {
    console.error("Update user error:", error);
    return { error: "Đã xảy ra lỗi khi cập nhật" };
  }
}

// ─── Reset Password ───────────────────────────────────────────

export async function resetUserPassword(userId: string, newPassword: string) {
  const session = await requireHighLevelUser();

  if (newPassword.length < 6) {
    return { error: "Mật khẩu phải có ít nhất 6 ký tự" };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await writeAuditLog({
      userId: session.id,
      action: "RESET_USER_PASSWORD",
      entityType: "User",
      entityId: userId,
    });

    revalidatePath("/users");
    return { success: true };
  } catch {
    return { error: "Đã xảy ra lỗi khi đổi mật khẩu" };
  }
}

// ─── Toggle Active ────────────────────────────────────────────

export async function toggleUserActive(userId: string) {
  const session = await requireHighLevelUser();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Không tìm thấy tài khoản" };

  // Prevent deactivating yourself
  if (userId === session.id) {
    return { error: "Không thể khóa tài khoản của chính mình" };
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

  revalidatePath("/users");
  return { success: true, isActive: updated.isActive };
}

// ─── Assign Project ───────────────────────────────────────────

export async function assignProjectToUser(
  userId: string,
  projectId: string,
  note?: string
) {
  const session = await requireHighLevelUser();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Không tìm thấy tài khoản" };

  // Check if already assigned
  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (existing) {
    if (existing.isActive && !existing.deletedAt) {
      return { error: "Người dùng đã được gán vào công trình này" };
    }
    // Reactivate
    await prisma.projectMember.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        deletedAt: null,
        assignedById: session.id,
        note: note || null,
      },
    });
  } else {
    const projectRole =
      user.role === "CHIEF_COMMANDER" ? ("CHIEF_COMMANDER" as const) : ("VIEWER" as const);

    await prisma.projectMember.create({
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

  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });

  if (!member) return { error: "Không tìm thấy gán công trình" };

  await prisma.projectMember.update({
    where: { id: member.id },
    data: { isActive: false, deletedAt: new Date() },
  });

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
