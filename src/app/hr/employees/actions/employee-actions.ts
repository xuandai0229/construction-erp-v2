"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { checkHrPermission, buildEmployeeScopeWhereClause, getHrUserContext } from "@/lib/hr/hr-auth-guard";
import { generateNextEmployeeCode } from "@/lib/hr/employee-code-generator";
import {
  encryptIdentityNumber,
  generateIdentityBlindIndex,
  serializeEnvelope,
  normalizeIdentityNumber,
  decryptIdentityNumber,
  parseEnvelope,
} from "@/lib/hr/pii-encryption";
import { writeAuditLog } from "@/lib/audit";
import { EmployeeStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { executeWithAdvisoryLock } from "@/lib/hr/concurrency-lock-helper";
import {
  provisionSiteCommanderAccount,
  SiteCommanderProvisioningError,
} from "@/lib/hr/site-commander-account-service";
import { assertPermission } from "@/lib/permissions/permission-resolver";

// --- Zod Schemas ---
const CreateEmployeeSchema = z.object({
  fullName: z.string().min(2, "Họ và tên phải có ít nhất 2 ký tự").max(100),
  gender: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  personalEmail: z.string().email("Email không hợp lệ").optional().nullable().or(z.literal("")),
  joinedDate: z.string().min(1, "Vui lòng chọn ngày vào công ty"),
  status: z.nativeEnum(EmployeeStatus).default(EmployeeStatus.ACTIVE),
  identityNumber: z.string().optional().nullable(),
  // Initial Assignment fields
  organizationUnitId: z.string().optional().nullable(),
  positionId: z.string().optional().nullable(),
  assignmentStartDate: z.string().optional().nullable(),
  decisionNo: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // User Link
  userId: z.string().optional().nullable(),
});

const UpdateEmployeeSchema = z.object({
  employeeId: z.string().min(1),
  fullName: z.string().min(2).max(100),
  gender: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  phoneNumber: z.string().optional().nullable(),
  personalEmail: z.string().email().optional().nullable().or(z.literal("")),
  joinedDate: z.string().optional().nullable(),
  status: z.nativeEnum(EmployeeStatus),
  resignedDate: z.string().optional().nullable(),
  expectedUpdatedAt: z.string().min(1, "Thiếu thông tin phiên bản hồ sơ"),
});

async function findEmployeeInScope(employeeId: string, permission: Awaited<ReturnType<typeof checkHrPermission>>) {
  const scopeWhere = await buildEmployeeScopeWhereClause(permission.context, permission.scope);
  return prisma.employee.findFirst({
    where: { AND: [{ id: employeeId }, scopeWhere] },
  });
}

// --- Server Action: Create Employee ---
export async function createEmployeeAction(formData: unknown) {
  const permCheck = await checkHrPermission("hr:employee:create");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền khởi tạo hồ sơ nhân viên mới (hr:employee:create)" };
  }

  const parsed = CreateEmployeeSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const currentUserId = permCheck.context.session.id;
  if (data.fullName.trim().length < 2) {
    return { success: false, error: "Họ và tên phải có ít nhất 2 ký tự sau khi loại bỏ khoảng trắng" };
  }

  // Validate initial assignment requirement for ACTIVE / PROBATION status
  if ((data.status === EmployeeStatus.ACTIVE || data.status === EmployeeStatus.PROBATION) && (!data.organizationUnitId || !data.positionId)) {
    return { success: false, error: "Nhân viên đang làm việc hoặc thử việc bắt buộc chọn Phòng ban và Chức danh ban đầu" };
  }

  // Handle Identity Number (CCCD) encryption
  let identityNumberEncrypted: string | null = null;
  let identityNumberBlindIndex: string | null = null;
  let identityNumberLastDigits: string | null = null;

  if (data.identityNumber && data.identityNumber.trim() !== "") {
    let normalized: string;
    try {
      normalized = normalizeIdentityNumber(data.identityNumber);
    } catch {
      return { success: false, error: "CCCD/CMND phải gồm 9 hoặc 12 chữ số hợp lệ" };
    }
    const blindIndex = generateIdentityBlindIndex(normalized);

    const existingIdentity = await prisma.employee.findUnique({
      where: { identityNumberBlindIndex: blindIndex },
    });
    if (existingIdentity) {
      return { success: false, error: "Số CCCD/CMND này đã tồn tại trên hệ thống nhân sự" };
    }

    const envelope = encryptIdentityNumber(normalized);
    identityNumberEncrypted = serializeEnvelope(envelope);
    identityNumberBlindIndex = blindIndex;
    identityNumberLastDigits = normalized.slice(-4);
  }

  // Validate userId linkage if selected
  if (data.userId) {
    const existingUserLink = await prisma.employee.findUnique({
      where: { userId: data.userId },
    });
    if (existingUserLink) {
      return { success: false, error: "Tài khoản người dùng này đã được liên kết với nhân viên khác" };
    }
  }

  const joinedDateObj = new Date(data.joinedDate);
  const dateOfBirthObj = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
  const startDateObj = data.assignmentStartDate ? new Date(data.assignmentStartDate) : joinedDateObj;

  if (Number.isNaN(joinedDateObj.getTime()) || Number.isNaN(startDateObj.getTime())) {
    return { success: false, error: "Ngày vào công ty hoặc ngày bắt đầu phân công không hợp lệ" };
  }
  if (dateOfBirthObj && (Number.isNaN(dateOfBirthObj.getTime()) || dateOfBirthObj > new Date())) {
    return { success: false, error: "Ngày sinh không hợp lệ hoặc không được ở tương lai" };
  }

  try {
    const createdEmployee = await prisma.$transaction(async (tx) => {
      // 1. Generate atomic code NV-YYYY-NNNN
      const code = await generateNextEmployeeCode(tx, joinedDateObj);

      if (data.userId) {
        const user = await tx.user.findFirst({
          where: { id: data.userId, isActive: true, deletedAt: null, employee: null },
          select: { id: true },
        });
        if (!user) throw new Error("Tài khoản được chọn không còn khả dụng hoặc đã liên kết");
      }

      if (data.organizationUnitId && data.positionId) {
        const [organizationUnit, position] = await Promise.all([
          tx.organizationUnit.findFirst({ where: { id: data.organizationUnitId, isActive: true }, select: { id: true } }),
          tx.position.findFirst({ where: { id: data.positionId, isActive: true }, select: { id: true } }),
        ]);
        if (!organizationUnit || !position) {
          throw new Error("Phòng ban hoặc chức danh không còn hoạt động");
        }
      }

      // 2. Create Employee master record
      const employee = await tx.employee.create({
        data: {
          code,
          userId: data.userId || null,
          fullName: data.fullName.trim(),
          gender: data.gender || null,
          dateOfBirth: dateOfBirthObj,
          phoneNumber: data.phoneNumber || null,
          personalEmail: data.personalEmail || null,
          joinedDate: joinedDateObj,
          status: data.status,
          identityNumberEncrypted,
          identityNumberBlindIndex,
          identityNumberLastDigits,
          createdById: currentUserId,
        },
      });

      // 3. Create initial organization assignment if department selected
      if (data.organizationUnitId && data.positionId) {
        await tx.employeeOrganizationAssignment.create({
          data: {
            employeeId: employee.id,
            organizationUnitId: data.organizationUnitId,
            positionId: data.positionId,
            startDate: startDateObj,
            isPrimary: true,
            decisionNo: data.decisionNo || null,
            notes: data.notes || null,
            createdById: currentUserId,
          },
        });
      }

      // 4. Create EmployeeChangeHistory
      await tx.employeeChangeHistory.create({
        data: {
          employeeId: employee.id,
          changeType: "EMPLOYEE_CREATED",
          performedById: currentUserId,
          reason: "Khởi tạo hồ sơ nhân viên ban đầu",
          details: {
            code: employee.code,
            status: employee.status,
            organizationUnitId: data.organizationUnitId || null,
            positionId: data.positionId || null,
          },
        },
      });

      return employee;
    });

    // 5. Security audit log
    await writeAuditLog({
      userId: currentUserId,
      action: "EMPLOYEE_CREATED",
      entityType: "Employee",
      entityId: createdEmployee.id,
      afterData: {
        id: createdEmployee.id,
        code: createdEmployee.code,
        status: createdEmployee.status,
      },
    });

    revalidatePath("/hr");
    revalidatePath("/hr/employees");

    return { success: true, employeeId: createdEmployee.id, code: createdEmployee.code };
  } catch (error: any) {
    console.error("Create Employee error:", error instanceof Error ? error.name : "unknown");
    return { success: false, error: "Không thể tạo hồ sơ nhân viên. Vui lòng kiểm tra dữ liệu và thử lại." };
  }
}

// --- Server Action: Update Employee Profile ---
export async function updateEmployeeProfileAction(formData: unknown) {
  const permCheck = await checkHrPermission("hr:employee:update");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền chỉnh sửa hồ sơ nhân viên (hr:employee:update)" };
  }

  const parsed = UpdateEmployeeSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const data = parsed.data;
  const currentUserId = permCheck.context.session.id;

  const currentEmp = await findEmployeeInScope(data.employeeId, permCheck);
  if (!currentEmp) {
    return { success: false, error: "Hồ sơ nhân viên không tồn tại" };
  }

  const expectedUpdatedAt = new Date(data.expectedUpdatedAt);
  const nextDateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
  const nextResignedDate = data.resignedDate ? new Date(data.resignedDate) : null;
  if (Number.isNaN(expectedUpdatedAt.getTime()) || (nextDateOfBirth && (Number.isNaN(nextDateOfBirth.getTime()) || nextDateOfBirth > new Date()))) {
    return { success: false, error: "Ngày sinh hoặc phiên bản hồ sơ không hợp lệ" };
  }
  if ((data.status === EmployeeStatus.RESIGNED || data.status === EmployeeStatus.RETIRED) && !nextResignedDate) {
    return { success: false, error: "Nhân viên nghỉ việc hoặc nghỉ hưu bắt buộc phải có ngày nghỉ" };
  }
  if (nextResignedDate && (Number.isNaN(nextResignedDate.getTime()) || (currentEmp.joinedDate && nextResignedDate < currentEmp.joinedDate))) {
    return { success: false, error: "Ngày nghỉ không được trước ngày vào công ty" };
  }

  // Optimistic concurrency check
  if (currentEmp.updatedAt.toISOString() !== expectedUpdatedAt.toISOString()) {
    return {
      success: false,
      error: "Hồ sơ đã được cập nhật bởi người khác trong thời gian bạn chỉnh sửa. Vui lòng tải lại trang trước khi thử lại.",
    };
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.employee.updateMany({
        where: { id: data.employeeId, updatedAt: expectedUpdatedAt },
        data: {
          fullName: data.fullName.trim(),
          gender: data.gender || null,
          dateOfBirth: nextDateOfBirth,
          phoneNumber: data.phoneNumber || null,
          personalEmail: data.personalEmail || null,
          ...(data.joinedDate ? { joinedDate: new Date(data.joinedDate) } : {}),
          status: data.status,
          resignedDate: nextResignedDate,
          updatedById: currentUserId,
        },
      });
      if (updateResult.count !== 1) {
        throw new Error("STALE_EMPLOYEE_PROFILE");
      }
      const emp = await tx.employee.findUniqueOrThrow({ where: { id: data.employeeId } });

      await tx.employeeChangeHistory.create({
        data: {
          employeeId: emp.id,
          changeType: "EMPLOYEE_PROFILE_UPDATED",
          performedById: currentUserId,
          reason: "Cập nhật thông tin hồ sơ nhân viên",
          details: {
            updatedFields: ["fullName", "gender", "dateOfBirth", "phoneNumber", "personalEmail", "status", "resignedDate"],
          },
        },
      });

      return emp;
    });

    await writeAuditLog({
      userId: currentUserId,
      action: "EMPLOYEE_PROFILE_UPDATED",
      entityType: "Employee",
      entityId: updated.id,
      afterData: {
        id: updated.id,
        code: updated.code,
        status: updated.status,
      },
    });

    revalidatePath("/hr");
    revalidatePath("/hr/employees");
    revalidatePath(`/hr/employees/${updated.id}`);

    return { success: true };
  } catch (error: any) {
    if (error instanceof Error && error.message === "STALE_EMPLOYEE_PROFILE") {
      return { success: false, error: "Hồ sơ đã được cập nhật bởi người khác. Vui lòng tải lại dữ liệu trước khi tiếp tục." };
    }
    return { success: false, error: "Không thể cập nhật hồ sơ. Vui lòng thử lại." };
  }
}

// --- Server Action: Update Identity Number (CCCD) ---
export async function updateEmployeeIdentityNumberAction(employeeId: string, newIdentityNumber: string) {
  const permCheck = await checkHrPermission("hr:employee:update");
  const sensitivePerm = await checkHrPermission("hr:employee:read_sensitive");
  if (!permCheck.allowed || !sensitivePerm.allowed || sensitivePerm.sensitiveFieldPolicy === "BASIC_ONLY" || sensitivePerm.sensitiveFieldPolicy === "CONTACT") {
    return { success: false, error: "Bạn không có quyền cập nhật thông tin nhận dạng (hr:employee:update)" };
  }

  const currentUserId = permCheck.context.session.id;
  const scopedEmployee = await findEmployeeInScope(employeeId, sensitivePerm);
  if (!scopedEmployee) {
    return { success: false, error: "Không tìm thấy hồ sơ nhân viên trong phạm vi được phép" };
  }
  let normalized: string;
  try {
    normalized = normalizeIdentityNumber(newIdentityNumber);
  } catch {
    return { success: false, error: "CCCD/CMND phải gồm 9 hoặc 12 chữ số hợp lệ" };
  }
  const blindIndex = generateIdentityBlindIndex(normalized);

  const existing = await prisma.employee.findFirst({
    where: {
      identityNumberBlindIndex: blindIndex,
      NOT: { id: employeeId },
    },
  });
  if (existing) {
    return { success: false, error: "Số CCCD/CMND này đã được sử dụng bởi nhân viên khác" };
  }

  const envelope = encryptIdentityNumber(normalized);
  const identityNumberEncrypted = serializeEnvelope(envelope);
  const identityNumberLastDigits = normalized.slice(-4);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          identityNumberEncrypted,
          identityNumberBlindIndex: blindIndex,
          identityNumberLastDigits,
          updatedById: currentUserId,
        },
      });

      await tx.employeeChangeHistory.create({
        data: {
          employeeId,
          changeType: "EMPLOYEE_PROFILE_UPDATED",
          performedById: currentUserId,
          reason: "Cập nhật số CCCD/CMND",
          details: { masked: `•••• •••• ${identityNumberLastDigits}` },
        },
      });
    });

    await writeAuditLog({
      userId: currentUserId,
      action: "EMPLOYEE_IDENTITY_UPDATED",
      entityType: "Employee",
      entityId: employeeId,
      afterData: { last4: identityNumberLastDigits },
    });

    revalidatePath(`/hr/employees/${employeeId}`);

    return { success: true };
  } catch {
    return { success: false, error: "Không thể cập nhật CCCD. Vui lòng thử lại." };
  }
}

// --- Server Action: Link / Unlink User Account ---
export async function linkUserAccountAction(employeeId: string, userId: string | null, reason?: string) {
  let permCheck = await checkHrPermission("hr:employee:update");
  if (!permCheck.allowed) {
    permCheck = await checkHrPermission("hr:access_grant:manage");
  }
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền quản lý liên kết tài khoản" };
  }

  const currentUserId = permCheck.context.session.id;
  const scopedEmployee = await findEmployeeInScope(employeeId, permCheck);
  if (!scopedEmployee) {
    return { success: false, error: "Không tìm thấy hồ sơ nhân viên trong phạm vi được phép" };
  }

  if (userId) {
    const existing = await prisma.employee.findFirst({
      where: { userId, NOT: { id: employeeId } },
    });
    if (existing) {
      return { success: false, error: "Tài khoản người dùng này đã được liên kết với nhân viên khác" };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (userId) {
        const user = await tx.user.findFirst({
          where: { id: userId, isActive: true, deletedAt: null, employee: null },
          select: { id: true },
        });
        if (!user) throw new Error("Tài khoản được chọn không còn khả dụng hoặc đã liên kết");
      }
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          userId: userId || null,
          updatedById: currentUserId,
        },
      });

      await tx.employeeChangeHistory.create({
        data: {
          employeeId,
          changeType: userId ? "ACCESS_GRANTED" : "ACCESS_REVOKED",
          performedById: currentUserId,
          reason: reason || (userId ? "Liên kết tài khoản người dùng" : "Hủy liên kết tài khoản người dùng"),
          details: { targetUserId: userId },
        },
      });
    });

    await writeAuditLog({
      userId: currentUserId,
      action: userId ? "EMPLOYEE_USER_LINKED" : "EMPLOYEE_USER_UNLINKED",
      entityType: "Employee",
      entityId: employeeId,
      afterData: { targetUserId: userId },
    });

    revalidatePath(`/hr/employees/${employeeId}`);
    revalidatePath("/hr/employees");

    return { success: true };
  } catch {
    return { success: false, error: "Không thể cập nhật liên kết tài khoản. Vui lòng thử lại." };
  }
}

// --- Server Action: Archive / Resign Employee ---
export async function archiveEmployeeAction(employeeId: string, resignedDate: string, reason: string, status: EmployeeStatus) {
  const permCheck = await checkHrPermission("hr:employee:delete");
  if (!permCheck.allowed) {
    return { success: false, error: "Bạn không có quyền chuyển trạng thái nghỉ việc / lưu trữ hồ sơ (hr:employee:delete)" };
  }

  const scopedEmployee = await findEmployeeInScope(employeeId, permCheck);
  if (!scopedEmployee) {
    return { success: false, error: "Không tìm thấy hồ sơ nhân viên trong phạm vi được phép" };
  }

  if (!resignedDate) {
    return { success: false, error: "Vui lòng chọn ngày chính thức nghỉ việc" };
  }
  if (!reason || reason.trim().length < 3) {
    return { success: false, error: "Vui lòng nhập lý do nghỉ việc / lưu trữ" };
  }

  if (status !== EmployeeStatus.RESIGNED && status !== EmployeeStatus.RETIRED) {
    return { success: false, error: "Trạng thái lưu trữ phải là nghỉ việc hoặc nghỉ hưu" };
  }

  const currentUserId = permCheck.context.session.id;
  const resignedDateObj = new Date(resignedDate);
  if (Number.isNaN(resignedDateObj.getTime()) || (scopedEmployee.joinedDate && resignedDateObj < scopedEmployee.joinedDate)) {
    return { success: false, error: "Ngày nghỉ không hợp lệ hoặc sớm hơn ngày vào công ty" };
  }

  try {
    await executeWithAdvisoryLock(prisma, employeeId, async (tx) => {
      // 1. Update Employee status & resignedDate
      await tx.employee.update({
        where: { id: employeeId },
        data: {
          status: status || EmployeeStatus.RESIGNED,
          resignedDate: resignedDateObj,
          updatedById: currentUserId,
        },
      });

      // 2. End active primary organization assignment
      await tx.employeeOrganizationAssignment.updateMany({
        where: { employeeId, endDate: null },
        data: {
          endDate: resignedDateObj,
          isPrimary: false,
        },
      });

      // 3. End active manager terms in OrganizationUnitManagerAssignment
      await tx.organizationUnitManagerAssignment.updateMany({
        where: { employeeId, endDate: null },
        data: {
          endDate: resignedDateObj,
        },
      });

      // 4. Release or cancel all active project assignments for this employee
      const activeProjectAssignments = await tx.employeeProjectAssignment.findMany({
        where: { employeeId, status: "ACTIVE" },
      });

      for (const assignment of activeProjectAssignments) {
        const isFutureAssignment = assignment.startDate > resignedDateObj;
        const nextStatus = isFutureAssignment ? "CANCELLED" : "RELEASED";
        const effectiveEndDate = isFutureAssignment ? assignment.startDate : resignedDateObj;
        const appendNote = isFutureAssignment
          ? `Tự động hủy do nhân viên nghỉ việc trước ngày bắt đầu (${resignedDateObj.toLocaleDateString("vi-VN")})`
          : `Tự động thu hồi phân công do nhân viên nghỉ việc ngày ${resignedDateObj.toLocaleDateString("vi-VN")}`;
        const newNotes = assignment.notes ? `${assignment.notes} | ${appendNote}` : appendNote;

        await tx.employeeProjectAssignment.update({
          where: { id: assignment.id },
          data: {
            status: nextStatus,
            endDate: effectiveEndDate,
            notes: newNotes,
          },
        });

        await tx.employeeChangeHistory.create({
          data: {
            employeeId,
            changeType: "EMPLOYEE_PROJECT_RELEASED",
            performedById: currentUserId,
            reason: appendNote,
            details: {
              projectId: assignment.projectId,
              assignmentId: assignment.id,
              previousStatus: "ACTIVE",
              newStatus: nextStatus,
              releasedDate: effectiveEndDate.toISOString(),
            },
          },
        });
      }

      // 5. Record employment status change history
      await tx.employeeChangeHistory.create({
        data: {
          employeeId,
          changeType: "EMPLOYMENT_STATUS_CHANGED",
          performedById: currentUserId,
          reason,
          details: {
            resignedDate: resignedDateObj.toISOString(),
            status,
            releasedProjectAssignmentsCount: activeProjectAssignments.length,
          },
        },
      });
    });

    await writeAuditLog({
      userId: currentUserId,
      action: "EMPLOYEE_ARCHIVED_RESIGNED",
      entityType: "Employee",
      entityId: employeeId,
      afterData: { status, resignedDate: resignedDateObj.toISOString() },
    });

    revalidatePath(`/hr/employees/${employeeId}`);
    revalidatePath("/hr/employees");
    revalidatePath("/hr");
    revalidatePath("/hr/organization");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Không thể lưu trữ hồ sơ nhân viên. Vui lòng thử lại." };
  }
}

// --- Server Action: Reveal Sensitive Identity Number ---
export async function revealIdentityNumberAction(employeeId: string) {
  const permCheck = await checkHrPermission("hr:employee:read_sensitive");
  if (!permCheck.allowed || permCheck.sensitiveFieldPolicy === "BASIC_ONLY" || permCheck.sensitiveFieldPolicy === "CONTACT") {
    return { success: false, error: "Bạn không có quyền giải mã và xem số CCCD/CMND nhạy cảm (hr:employee:read_sensitive)" };
  }

  const currentUserId = permCheck.context.session.id;

  const scopedEmployee = await findEmployeeInScope(employeeId, permCheck);
  if (!scopedEmployee) {
    return { success: false, error: "Không tìm thấy hồ sơ nhân viên trong phạm vi được phép" };
  }

  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { id: true, code: true, identityNumberEncrypted: true },
  });

  if (!emp || !emp.identityNumberEncrypted) {
    return { success: false, error: "Không tìm thấy dữ liệu CCCD cho nhân viên này" };
  }

  try {
    const envelope = parseEnvelope(emp.identityNumberEncrypted);
    const plaintext = decryptIdentityNumber(envelope);

    // Audit log for viewing sensitive identity
    await writeAuditLog({
      userId: currentUserId,
      action: "VIEW_SENSITIVE_IDENTITY_NUMBER",
      entityType: "Employee",
      entityId: employeeId,
      afterData: { code: emp.code },
    });

    return { success: true, identityNumber: plaintext };
  } catch (error: any) {
    return { success: false, error: "Không thể giải mã dữ liệu CCCD do lỗi khóa bảo mật" };
  }
}

// --- Server Action: Provision a verified site commander account ---
export async function provisionSiteCommanderAccountAction(employeeId: string) {
  const permCheck = await checkHrPermission("hr:employee:update");
  if (!permCheck.allowed) {
    return { success: false as const, code: "PERMISSION_DENIED", error: "Bạn không có quyền cập nhật hồ sơ nhân sự." };
  }

  const scopedEmployee = await findEmployeeInScope(employeeId, permCheck);
  if (!scopedEmployee) {
    return { success: false as const, code: "EMPLOYEE_NOT_FOUND", error: "Không tìm thấy Employee trong phạm vi được phép." };
  }

  const actor = permCheck.context.session;
  try {
    await assertPermission(actor, "users.create");
    await assertPermission(actor, "users.assign_system_role");
    await assertPermission(actor, "users.assign_project_role");

    const result = await provisionSiteCommanderAccount({
      prisma,
      employeeId,
      actorUserId: actor.id,
    });

    revalidatePath("/hr/employees");
    revalidatePath(`/hr/employees/${employeeId}`);
    revalidatePath("/users");
    revalidatePath("/projects");
    return { success: true as const, result };
  } catch (error) {
    if (error instanceof SiteCommanderProvisioningError) {
      return { success: false as const, code: error.code, error: error.message };
    }
    return {
      success: false as const,
      code: "PROVISIONING_FAILED",
      error: error instanceof Error ? error.message : "Không thể tạo tài khoản Chỉ huy trưởng.",
    };
  }
}
