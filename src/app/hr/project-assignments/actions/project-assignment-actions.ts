"use server";

import { z } from "zod";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import {
  EmployeeProjectAssignmentEndReason,
  EmployeeProjectAssignmentStatus,
} from "@prisma/client";
import {
  createProjectAssignment,
  transferProjectRoleOrAllocation,
  extendProjectAssignment,
  releaseEmployeeFromProject,
  cancelFutureProjectAssignment,
} from "@/lib/hr/project-assignment-service";
import {
  authorizeProjectAssignmentAction,
} from "@/lib/hr/project-assignment-auth";
import {
  projectAssignmentDTOSelect,
  toProjectAssignmentDTO,
  ProjectAssignmentDTO,
} from "@/lib/hr/project-assignment-dto";

// --- ActionResult Type ---
export type ActionResult<T> =
  | {
      success: true;
      data: T;
      message?: string;
    }
  | {
      success: false;
      error: string;
      code:
        | "AUTHENTICATION_REQUIRED"
        | "PERMISSION_DENIED"
        | "EMPLOYEE_SCOPE_DENIED"
        | "PROJECT_SCOPE_DENIED"
        | "VALIDATION_ERROR"
        | "EMPLOYEE_NOT_FOUND"
        | "PROJECT_NOT_FOUND"
        | "ROLE_NOT_FOUND"
        | "INVALID_EMPLOYEE_STATUS"
        | "INVALID_PROJECT_STATUS"
        | "ALLOCATION_OVERLAP_EXCEEDED"
        | "CONCURRENCY_LOCK_TIMEOUT"
        | "INTERNAL_ERROR";
      details?: Record<string, unknown>;
    };

// --- Zod Validation Schemas ---
const AssignEmployeeSchema = z.object({
  employeeId: z.string().min(1, "Vui lòng chọn nhân viên"),
  projectId: z.string().min(1, "Vui lòng chọn công trình / dự án"),
  projectPersonnelRoleId: z.string().min(1, "Vui lòng chọn vai trò nhân sự công trình"),
  startDate: z.string().min(1, "Vui lòng chọn ngày bắt đầu phân công"),
  expectedEndDate: z.string().optional().nullable(),
  allocationPercentage: z
    .number()
    .int("Tỷ lệ phân bổ phải là số nguyên")
    .min(1, "Tỷ lệ phân bổ tối thiểu 1%")
    .max(100, "Tỷ lệ phân bổ tối đa 100%"),
  decisionNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  allowOverlapOverride: z.boolean().optional().default(false),
  overrideReason: z.string().optional().nullable(),
});

const TransferRoleOrAllocationSchema = z.object({
  assignmentId: z.string().min(1, "Thiếu mã phân công công trình"),
  effectiveDate: z.string().min(1, "Vui lòng chọn ngày có hiệu lực"),
  newProjectPersonnelRoleId: z.string().optional().nullable(),
  newAllocationPercentage: z.number().int().min(1).max(100).optional().nullable(),
  endReason: z.nativeEnum(EmployeeProjectAssignmentEndReason, {
    message: "Lý do thay đổi không hợp lệ",
  }),
  decisionNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  allowOverlapOverride: z.boolean().optional().default(false),
  overrideReason: z.string().optional().nullable(),
});

const ExtendAssignmentSchema = z.object({
  assignmentId: z.string().min(1, "Thiếu mã phân công công trình"),
  newExpectedEndDate: z.string().min(1, "Vui lòng chọn ngày dự kiến kết thúc mới"),
  decisionNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const ReleaseAssignmentSchema = z.object({
  assignmentId: z.string().min(1, "Thiếu mã phân công công trình"),
  releaseDate: z.string().min(1, "Vui lòng chọn ngày rút khỏi công trình"),
  endReason: z.nativeEnum(EmployeeProjectAssignmentEndReason, {
    message: "Lý do rút khỏi công trình không hợp lệ",
  }),
  decisionNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const CancelAssignmentSchema = z.object({
  assignmentId: z.string().min(1, "Thiếu mã phân công công trình"),
  reason: z.string().min(3, "Lý do hủy phân công phải có ít nhất 3 ký tự"),
});

// --- Server Action: Assign Employee to Project ---
export async function assignEmployeeToProjectAction(
  input: unknown
): Promise<ActionResult<ProjectAssignmentDTO>> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      error: "Yêu cầu đăng nhập hệ thống",
      code: "AUTHENTICATION_REQUIRED",
    };
  }

  const parsed = AssignEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: "VALIDATION_ERROR",
    };
  }

  const data = parsed.data;
  const actionType = data.allowOverlapOverride ? "override" : "create";
  const permCode = data.allowOverlapOverride
    ? "hr:project_allocation:override"
    : "hr:project_assignment:create";

  const auth = await authorizeProjectAssignmentAction(prisma, {
    userId: session.id,
    permissionCode: permCode,
    targetEmployeeId: data.employeeId,
    targetProjectId: data.projectId,
    action: actionType,
    overrideReason: data.overrideReason || undefined,
  });

  if (!auth.allowed) {
    return {
      success: false,
      error: auth.error,
      code: auth.code,
    };
  }

  const startDateObj = new Date(data.startDate);
  const expectedEndDateObj = data.expectedEndDate ? new Date(data.expectedEndDate) : null;

  if (Number.isNaN(startDateObj.getTime())) {
    return {
      success: false,
      error: "Ngày bắt đầu phân công không hợp lệ",
      code: "VALIDATION_ERROR",
    };
  }

  if (expectedEndDateObj && (Number.isNaN(expectedEndDateObj.getTime()) || expectedEndDateObj < startDateObj)) {
    return {
      success: false,
      error: "Ngày kết thúc dự kiến không được trước ngày bắt đầu",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const created = await createProjectAssignment(prisma, {
      employeeId: data.employeeId,
      projectId: data.projectId,
      projectPersonnelRoleId: data.projectPersonnelRoleId,
      startDate: startDateObj,
      expectedEndDate: expectedEndDateObj || undefined,
      allocationPercentage: data.allocationPercentage,
      assignmentDecisionNo: data.decisionNumber || undefined,
      notes: data.notes || undefined,
      createdById: session.id,
      overrideReason: data.overrideReason || undefined,
    });

    // Record Security AuditLog
    await writeAuditLog({
      userId: session.id,
      action: "PROJECT_ASSIGNMENT_CREATED",
      entityType: "EmployeeProjectAssignment",
      entityId: created.id,
      afterData: {
        id: created.id,
        employeeId: data.employeeId,
        projectId: data.projectId,
        roleId: data.projectPersonnelRoleId,
        allocationPercentage: data.allocationPercentage,
        overrideUsed: data.allowOverlapOverride,
      },
    });

    revalidatePath("/hr");
    revalidatePath("/hr/project-assignments");

    // Fetch complete PII-safe DTO
    const fullRecord = await prisma.employeeProjectAssignment.findUniqueOrThrow({
      where: { id: created.id },
      select: projectAssignmentDTOSelect,
    });

    return {
      success: true,
      data: toProjectAssignmentDTO(fullRecord),
      message: "Điều động nhân sự vào công trình thành công",
    };
  } catch (err: any) {
    const message = err instanceof Error ? err.message : "Lỗi hệ thống";
    if (message.includes("Total allocation would exceed 100%") || message.includes("vượt quá 100%")) {
      return {
        success: false,
        error: "Tổng tỷ lệ phân bổ vượt quá 100%. Yêu cầu quyền ghi đè (override) và lý do giải trình để tiếp tục.",
        code: "ALLOCATION_OVERLAP_EXCEEDED",
      };
    }
    if (message.includes("Could not acquire lock")) {
      return {
        success: false,
        error: "Hệ thống đang xử lý phân công cho nhân viên này từ phiên làm việc khác. Vui lòng thử lại sau.",
        code: "CONCURRENCY_LOCK_TIMEOUT",
      };
    }
    return {
      success: false,
      error: message,
      code: "INTERNAL_ERROR",
    };
  }
}

// --- Server Action: Transfer Project Role or Allocation ---
export async function transferProjectRoleOrAllocationAction(
  input: unknown
): Promise<ActionResult<ProjectAssignmentDTO>> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      error: "Yêu cầu đăng nhập hệ thống",
      code: "AUTHENTICATION_REQUIRED",
    };
  }

  const parsed = TransferRoleOrAllocationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: "VALIDATION_ERROR",
    };
  }

  const data = parsed.data;

  const currentAssignment = await prisma.employeeProjectAssignment.findUnique({
    where: { id: data.assignmentId },
    select: { id: true, employeeId: true, projectId: true, status: true },
  });

  if (!currentAssignment || currentAssignment.status !== EmployeeProjectAssignmentStatus.ACTIVE) {
    return {
      success: false,
      error: "Phân công công trình không tồn tại hoặc đã kết thúc",
      code: "VALIDATION_ERROR",
    };
  }

  const actionType = data.allowOverlapOverride ? "override" : "update";
  const permCode = data.allowOverlapOverride
    ? "hr:project_allocation:override"
    : "hr:project_assignment:update";

  const auth = await authorizeProjectAssignmentAction(prisma, {
    userId: session.id,
    permissionCode: permCode,
    targetEmployeeId: currentAssignment.employeeId,
    targetProjectId: currentAssignment.projectId,
    action: actionType,
    overrideReason: data.overrideReason || undefined,
  });

  if (!auth.allowed) {
    return {
      success: false,
      error: auth.error,
      code: auth.code,
    };
  }

  const effectiveDateObj = new Date(data.effectiveDate);
  if (Number.isNaN(effectiveDateObj.getTime())) {
    return {
      success: false,
      error: "Ngày hiệu lực không hợp lệ",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const updated = await transferProjectRoleOrAllocation(prisma, {
      assignmentId: data.assignmentId,
      effectiveDate: effectiveDateObj,
      newProjectPersonnelRoleId: data.newProjectPersonnelRoleId || undefined,
      newAllocationPercentage: data.newAllocationPercentage || undefined,
      endReason: data.endReason,
      assignmentDecisionNo: data.decisionNumber || undefined,
      notes: data.notes || undefined,
      performedById: session.id,
      overrideReason: data.overrideReason || undefined,
    });

    await writeAuditLog({
      userId: session.id,
      action: "PROJECT_ASSIGNMENT_TRANSFERRED",
      entityType: "EmployeeProjectAssignment",
      entityId: updated.id,
      afterData: {
        id: updated.id,
        endReason: data.endReason,
        allocationPercentage: updated.allocationPercentage,
      },
    });

    revalidatePath("/hr");
    revalidatePath("/hr/project-assignments");

    const fullRecord = await prisma.employeeProjectAssignment.findUniqueOrThrow({
      where: { id: updated.id },
      select: projectAssignmentDTOSelect,
    });

    return {
      success: true,
      data: toProjectAssignmentDTO(fullRecord),
      message: "Cập nhật / chuyển đổi vai trò phân công công trình thành công",
    };
  } catch (err: any) {
    const message = err instanceof Error ? err.message : "Lỗi hệ thống";
    if (message.includes("Total allocation would exceed 100%") || message.includes("vượt quá 100%")) {
      return {
        success: false,
        error: "Tổng tỷ lệ phân bổ vượt quá 100%. Yêu cầu quyền ghi đè (override) và lý do giải trình.",
        code: "ALLOCATION_OVERLAP_EXCEEDED",
      };
    }
    return {
      success: false,
      error: message,
      code: "INTERNAL_ERROR",
    };
  }
}

// --- Server Action: Extend Project Assignment ---
export async function extendProjectAssignmentAction(
  input: unknown
): Promise<ActionResult<ProjectAssignmentDTO>> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      error: "Yêu cầu đăng nhập hệ thống",
      code: "AUTHENTICATION_REQUIRED",
    };
  }

  const parsed = ExtendAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: "VALIDATION_ERROR",
    };
  }

  const data = parsed.data;

  const currentAssignment = await prisma.employeeProjectAssignment.findUnique({
    where: { id: data.assignmentId },
    select: { id: true, employeeId: true, projectId: true, status: true },
  });

  if (!currentAssignment || currentAssignment.status !== EmployeeProjectAssignmentStatus.ACTIVE) {
    return {
      success: false,
      error: "Phân công công trình không tồn tại hoặc đã kết thúc",
      code: "VALIDATION_ERROR",
    };
  }

  const auth = await authorizeProjectAssignmentAction(prisma, {
    userId: session.id,
    permissionCode: "hr:project_assignment:update",
    targetEmployeeId: currentAssignment.employeeId,
    targetProjectId: currentAssignment.projectId,
    action: "update",
  });

  if (!auth.allowed) {
    return {
      success: false,
      error: auth.error,
      code: auth.code,
    };
  }

  const newExpectedEndDateObj = new Date(data.newExpectedEndDate);
  if (Number.isNaN(newExpectedEndDateObj.getTime())) {
    return {
      success: false,
      error: "Ngày dự kiến kết thúc mới không hợp lệ",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const updated = await extendProjectAssignment(prisma, {
      assignmentId: data.assignmentId,
      newExpectedEndDate: newExpectedEndDateObj,
      reason: data.notes || undefined,
      performedById: session.id,
    });

    await writeAuditLog({
      userId: session.id,
      action: "PROJECT_ASSIGNMENT_EXTENDED",
      entityType: "EmployeeProjectAssignment",
      entityId: updated.id,
      afterData: {
        id: updated.id,
        newExpectedEndDate: newExpectedEndDateObj.toISOString(),
      },
    });

    revalidatePath("/hr");
    revalidatePath("/hr/project-assignments");

    const fullRecord = await prisma.employeeProjectAssignment.findUniqueOrThrow({
      where: { id: updated.id },
      select: projectAssignmentDTOSelect,
    });

    return {
      success: true,
      data: toProjectAssignmentDTO(fullRecord),
      message: "Gia hạn đợt công tác công trình thành công",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Lỗi hệ thống",
      code: "INTERNAL_ERROR",
    };
  }
}

// --- Server Action: Release Employee from Project ---
export async function releaseEmployeeFromProjectAction(
  input: unknown
): Promise<ActionResult<ProjectAssignmentDTO>> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      error: "Yêu cầu đăng nhập hệ thống",
      code: "AUTHENTICATION_REQUIRED",
    };
  }

  const parsed = ReleaseAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: "VALIDATION_ERROR",
    };
  }

  const data = parsed.data;

  const currentAssignment = await prisma.employeeProjectAssignment.findUnique({
    where: { id: data.assignmentId },
    select: { id: true, employeeId: true, projectId: true, status: true },
  });

  if (!currentAssignment || currentAssignment.status !== EmployeeProjectAssignmentStatus.ACTIVE) {
    return {
      success: false,
      error: "Phân công công trình không tồn tại hoặc đã giải phóng từ trước",
      code: "VALIDATION_ERROR",
    };
  }

  const auth = await authorizeProjectAssignmentAction(prisma, {
    userId: session.id,
    permissionCode: "hr:project_assignment:release",
    targetEmployeeId: currentAssignment.employeeId,
    targetProjectId: currentAssignment.projectId,
    action: "release",
  });

  if (!auth.allowed) {
    return {
      success: false,
      error: auth.error,
      code: auth.code,
    };
  }

  const releaseDateObj = new Date(data.releaseDate);
  if (Number.isNaN(releaseDateObj.getTime())) {
    return {
      success: false,
      error: "Ngày rút khỏi công trình không hợp lệ",
      code: "VALIDATION_ERROR",
    };
  }

  try {
    const released = await releaseEmployeeFromProject(prisma, {
      assignmentId: data.assignmentId,
      endDate: releaseDateObj,
      endReason: data.endReason,
      notes: data.notes || undefined,
      performedById: session.id,
    });

    await writeAuditLog({
      userId: session.id,
      action: "PROJECT_ASSIGNMENT_RELEASED",
      entityType: "EmployeeProjectAssignment",
      entityId: released.id,
      afterData: {
        id: released.id,
        endDate: releaseDateObj.toISOString(),
        endReason: data.endReason,
      },
    });

    revalidatePath("/hr");
    revalidatePath("/hr/project-assignments");

    const fullRecord = await prisma.employeeProjectAssignment.findUniqueOrThrow({
      where: { id: released.id },
      select: projectAssignmentDTOSelect,
    });

    return {
      success: true,
      data: toProjectAssignmentDTO(fullRecord),
      message: "Giải phóng / rút nhân lực khỏi công trình thành công",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Lỗi hệ thống",
      code: "INTERNAL_ERROR",
    };
  }
}

// --- Server Action: Cancel Future Project Assignment ---
export async function cancelFutureProjectAssignmentAction(
  input: unknown
): Promise<ActionResult<ProjectAssignmentDTO>> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      error: "Yêu cầu đăng nhập hệ thống",
      code: "AUTHENTICATION_REQUIRED",
    };
  }

  const parsed = CancelAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0].message,
      code: "VALIDATION_ERROR",
    };
  }

  const data = parsed.data;

  const currentAssignment = await prisma.employeeProjectAssignment.findUnique({
    where: { id: data.assignmentId },
    select: { id: true, employeeId: true, projectId: true, status: true },
  });

  if (!currentAssignment) {
    return {
      success: false,
      error: "Phân công công trình không tồn tại",
      code: "VALIDATION_ERROR",
    };
  }

  const auth = await authorizeProjectAssignmentAction(prisma, {
    userId: session.id,
    permissionCode: "hr:project_assignment:release",
    targetEmployeeId: currentAssignment.employeeId,
    targetProjectId: currentAssignment.projectId,
    action: "release",
  });

  if (!auth.allowed) {
    return {
      success: false,
      error: auth.error,
      code: auth.code,
    };
  }

  try {
    const cancelled = await cancelFutureProjectAssignment(prisma, {
      assignmentId: data.assignmentId,
      reason: data.reason,
      updatedById: session.id,
    });

    await writeAuditLog({
      userId: session.id,
      action: "PROJECT_ASSIGNMENT_CANCELLED",
      entityType: "EmployeeProjectAssignment",
      entityId: cancelled.id,
      afterData: { id: cancelled.id, status: cancelled.status },
    });

    revalidatePath("/hr");
    revalidatePath("/hr/project-assignments");

    const fullRecord = await prisma.employeeProjectAssignment.findUniqueOrThrow({
      where: { id: cancelled.id },
      select: projectAssignmentDTOSelect,
    });

    return {
      success: true,
      data: toProjectAssignmentDTO(fullRecord),
      message: "Hủy bỏ phân công công trình thành công",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Lỗi hệ thống",
      code: "INTERNAL_ERROR",
    };
  }
}

// --- Query Server Action: Get Project Assignments List ---
export async function getProjectAssignmentsQuery(input?: {
  projectId?: string;
  employeeId?: string;
  status?: EmployeeProjectAssignmentStatus;
  page?: number;
  pageSize?: number;
}): Promise<ActionResult<{ items: ProjectAssignmentDTO[]; total: number; page: number; pageSize: number }>> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      error: "Yêu cầu đăng nhập hệ thống",
      code: "AUTHENTICATION_REQUIRED",
    };
  }

  const auth = await authorizeProjectAssignmentAction(prisma, {
    userId: session.id,
    permissionCode: "hr:project_assignment:read",
    targetEmployeeId: input?.employeeId,
    targetProjectId: input?.projectId,
    action: "read",
  });

  if (!auth.allowed) {
    return {
      success: false,
      error: auth.error,
      code: auth.code,
    };
  }

  const page = Math.max(1, input?.page || 1);
  const pageSize = Math.min(100, Math.max(1, input?.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const where: any = {};
  if (input?.projectId) where.projectId = input.projectId;
  if (input?.employeeId) where.employeeId = input.employeeId;
  if (input?.status) where.status = input.status;

  try {
    const [items, total] = await Promise.all([
      prisma.employeeProjectAssignment.findMany({
        where,
        select: projectAssignmentDTOSelect,
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
        skip,
        take: pageSize,
      }),
      prisma.employeeProjectAssignment.count({ where }),
    ]);

    return {
      success: true,
      data: {
        items: items.map(toProjectAssignmentDTO),
        total,
        page,
        pageSize,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Lỗi truy vấn dữ liệu",
      code: "INTERNAL_ERROR",
    };
  }
}

// --- Query Server Action: Get Employee Project Assignment History ---
export async function getEmployeeProjectAssignmentHistoryQuery(
  employeeId: string
): Promise<ActionResult<ProjectAssignmentDTO[]>> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      error: "Yêu cầu đăng nhập hệ thống",
      code: "AUTHENTICATION_REQUIRED",
    };
  }

  const auth = await authorizeProjectAssignmentAction(prisma, {
    userId: session.id,
    permissionCode: "hr:project_assignment:read",
    targetEmployeeId: employeeId,
    action: "read",
  });

  if (!auth.allowed) {
    return {
      success: false,
      error: auth.error,
      code: auth.code,
    };
  }

  try {
    const records = await prisma.employeeProjectAssignment.findMany({
      where: { employeeId },
      select: projectAssignmentDTOSelect,
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    });

    return {
      success: true,
      data: records.map(toProjectAssignmentDTO),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Lỗi truy vấn lịch sử phân công",
      code: "INTERNAL_ERROR",
    };
  }
}

// --- Query Server Action: Get Project Staffing ---
export async function getProjectStaffingQuery(
  projectId: string
): Promise<ActionResult<ProjectAssignmentDTO[]>> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      error: "Yêu cầu đăng nhập hệ thống",
      code: "AUTHENTICATION_REQUIRED",
    };
  }

  const auth = await authorizeProjectAssignmentAction(prisma, {
    userId: session.id,
    permissionCode: "hr:project_assignment:read",
    targetProjectId: projectId,
    action: "read",
  });

  if (!auth.allowed) {
    return {
      success: false,
      error: auth.error,
      code: auth.code,
    };
  }

  try {
    const records = await prisma.employeeProjectAssignment.findMany({
      where: { projectId, status: EmployeeProjectAssignmentStatus.ACTIVE },
      select: projectAssignmentDTOSelect,
      orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
    });

    return {
      success: true,
      data: records.map(toProjectAssignmentDTO),
    };
  } catch (err: any) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Lỗi truy vấn nhân sự dự án",
      code: "INTERNAL_ERROR",
    };
  }
}

export interface AssignmentFormOptionEmployee {
  id: string;
  code: string;
  fullName: string;
  orgUnitId: string | null;
  orgUnitName: string | null;
}

export interface AssignmentFormOptionProject {
  id: string;
  code: string;
  name: string;
}

export interface AssignmentFormOptionRole {
  id: string;
  code: string;
  name: string;
}

export interface AssignmentUserCapabilities {
  canCreate: boolean;
  canUpdate: boolean;
  canRelease: boolean;
  canOverride: boolean;
  userRole: string;
}

export async function getAssignmentFormOptionsQuery(): Promise<
  ActionResult<{
    employees: AssignmentFormOptionEmployee[];
    projects: AssignmentFormOptionProject[];
    roles: AssignmentFormOptionRole[];
    capabilities: AssignmentUserCapabilities;
  }>
> {
  const session = await getSession();
  if (!session) {
    return {
      success: false,
      error: "Yêu cầu đăng nhập hệ thống",
      code: "AUTHENTICATION_REQUIRED",
    };
  }

  try {
    const [canCreateRes, canUpdateRes, canReleaseRes, canOverrideRes] = await Promise.all([
      authorizeProjectAssignmentAction(prisma, { userId: session.id, permissionCode: "hr:project_assignment:create", action: "create" }),
      authorizeProjectAssignmentAction(prisma, { userId: session.id, permissionCode: "hr:project_assignment:update", action: "update" }),
      authorizeProjectAssignmentAction(prisma, { userId: session.id, permissionCode: "hr:project_assignment:release", action: "release" }),
      authorizeProjectAssignmentAction(prisma, { userId: session.id, permissionCode: "hr:project_allocation:override", action: "override", overrideReason: "Kiểm tra quyền override hệ thống" }),
    ]);

    const [empRecords, prjRecords, roleRecords] = await Promise.all([
      prisma.employee.findMany({
        where: { status: "ACTIVE" },
        select: {
          id: true,
          code: true,
          fullName: true,
          orgAssignments: {
            where: { isPrimary: true, endDate: null },
            select: { organizationUnit: { select: { id: true, name: true } } },
            take: 1,
          },
        },
        orderBy: { fullName: "asc" },
      }),
      prisma.project.findMany({
        where: { status: { in: ["ACTIVE", "PLANNING"] } },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
      }),
      prisma.projectPersonnelRole.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const employees: AssignmentFormOptionEmployee[] = empRecords.map((e) => ({
      id: e.id,
      code: e.code,
      fullName: e.fullName,
      orgUnitId: e.orgAssignments[0]?.organizationUnit?.id || null,
      orgUnitName: e.orgAssignments[0]?.organizationUnit?.name || null,
    }));

    return {
      success: true,
      data: {
        employees,
        projects: prjRecords,
        roles: roleRecords,
        capabilities: {
          canCreate: canCreateRes.allowed,
          canUpdate: canUpdateRes.allowed,
          canRelease: canReleaseRes.allowed,
          canOverride: canOverrideRes.allowed,
          userRole: session.role,
        },
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Lỗi nạp danh mục chọn lọc",
      code: "INTERNAL_ERROR",
    };
  }
}
