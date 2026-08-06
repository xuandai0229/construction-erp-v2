import {
  PrismaClient,
  EmployeeProjectAssignmentStatus,
  EmployeeProjectAssignmentEndReason,
  EmployeeProjectAssignment,
} from "@prisma/client";
import { executeWithAdvisoryLock } from "./concurrency-lock-helper";
import { checkAllocationCapacity, AllocationCandidate } from "./allocation-engine";
import { parseVietnamDateOnly, formatVietnamDateOnly } from "./vietnam-date-helper";
import { validateEffectiveDateRange } from "./effective-date-helper";

export interface CreateAssignmentInput {
  employeeId: string;
  projectId: string;
  projectPersonnelRoleId: string;
  startDate: Date;
  expectedEndDate?: Date | null;
  allocationPercentage?: number;
  assignmentDecisionNo?: string | null;
  notes?: string | null;
  overrideReason?: string | null;
  createdById?: string | null;
}

export interface ExtendAssignmentInput {
  assignmentId: string;
  newExpectedEndDate: Date;
  reason?: string;
  performedById?: string;
}

export interface ReleaseAssignmentInput {
  assignmentId: string;
  endDate: Date;
  endReason: EmployeeProjectAssignmentEndReason;
  notes?: string;
  performedById?: string;
}

export interface TransferAssignmentInput {
  assignmentId: string;
  effectiveDate: Date;
  newProjectId?: string;
  newProjectPersonnelRoleId?: string;
  newAllocationPercentage?: number;
  endReason: EmployeeProjectAssignmentEndReason;
  assignmentDecisionNo?: string;
  notes?: string;
  overrideReason?: string;
  performedById?: string;
}

export interface CancelAssignmentInput {
  assignmentId: string;
  reason?: string;
  updatedById?: string;
}

type TransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

/**
 * Creates a new Project Personnel Assignment under postgres advisory lock & allocation checks.
 * NOTE: Absolutely DOES NOT auto-create ProjectMember (DEC-05).
 */
export async function createProjectAssignment(
  prisma: PrismaClient,
  input: CreateAssignmentInput
): Promise<EmployeeProjectAssignment> {
  const allocationPercentage = input.allocationPercentage ?? 100;
  if (allocationPercentage < 1 || allocationPercentage > 100) {
    throw new Error("Tỷ lệ phân bổ phải nằm trong khoảng từ 1% đến 100%.");
  }

  if (input.expectedEndDate) {
    validateEffectiveDateRange(input.startDate, input.expectedEndDate, "Ngày kết thúc dự kiến");
  }

  return executeWithAdvisoryLock(prisma, input.employeeId, async (tx) => {
    // 1. Verify existence of Employee, Project, Role
    const employee = await tx.employee.findUnique({ where: { id: input.employeeId } });
    if (!employee) {
      throw new Error(`Nhân viên (${input.employeeId}) không tồn tại.`);
    }

    const project = await tx.project.findUnique({ where: { id: input.projectId } });
    if (!project || project.deletedAt) {
      throw new Error(`Dự án (${input.projectId}) không tồn tại hoặc đã bị xóa.`);
    }

    const role = await tx.projectPersonnelRole.findUnique({
      where: { id: input.projectPersonnelRoleId },
    });
    if (!role || !role.isActive) {
      throw new Error(`Vai trò dự án (${input.projectPersonnelRoleId}) không tồn tại hoặc không hoạt động.`);
    }

    // 2. Query active assignments for sweep-line allocation check
    const existing = await tx.employeeProjectAssignment.findMany({
      where: {
        employeeId: input.employeeId,
        status: EmployeeProjectAssignmentStatus.ACTIVE,
      },
    });

    const candidates: AllocationCandidate[] = existing.map((a) => ({
      assignmentId: a.id,
      employeeId: a.employeeId,
      projectId: a.projectId,
      projectPersonnelRoleId: a.projectPersonnelRoleId,
      startDate: a.startDate,
      expectedEndDate: a.expectedEndDate,
      endDate: a.endDate,
      allocationPercentage: a.allocationPercentage,
      status: a.status,
    }));

    const candidate: AllocationCandidate = {
      employeeId: input.employeeId,
      projectId: input.projectId,
      projectPersonnelRoleId: input.projectPersonnelRoleId,
      startDate: input.startDate,
      expectedEndDate: input.expectedEndDate || null,
      endDate: null,
      allocationPercentage,
      status: EmployeeProjectAssignmentStatus.ACTIVE,
    };

    const capacityResult = checkAllocationCapacity(candidates, candidate);
    if (capacityResult.hasConflict && !input.overrideReason) {
      const conflictStartStr = capacityResult.conflictStartDate
        ? formatVietnamDateOnly(capacityResult.conflictStartDate)
        : "";
      throw new Error(
        `Tổng tỷ lệ phân bổ của nhân viên vượt quá 100% (${capacityResult.maximumCombinedAllocation}%) từ ngày ${conflictStartStr}. Yêu cầu nhập lý do ghi đè (overrideReason) nếu muốn cho phép vượt định mức.`
      );
    }

    // 3. Create assignment record
    const assignment = await tx.employeeProjectAssignment.create({
      data: {
        employeeId: input.employeeId,
        projectId: input.projectId,
        projectPersonnelRoleId: input.projectPersonnelRoleId,
        startDate: input.startDate,
        expectedEndDate: input.expectedEndDate || null,
        allocationPercentage,
        status: EmployeeProjectAssignmentStatus.ACTIVE,
        assignmentDecisionNo: input.assignmentDecisionNo || null,
        notes: input.notes || null,
        overrideReason: input.overrideReason || null,
        createdById: input.createdById || null,
      },
    });

    // 4. Create EmployeeChangeHistory
    if (input.createdById) {
      await tx.employeeChangeHistory.create({
        data: {
          employeeId: input.employeeId,
          changeType: "EMPLOYEE_PROJECT_ASSIGNED",
          performedById: input.createdById,
          reason: input.assignmentDecisionNo ? `Quyết định: ${input.assignmentDecisionNo}` : "Điều động công trình",
          details: {
            assignmentId: assignment.id,
            projectId: input.projectId,
            projectPersonnelRoleId: input.projectPersonnelRoleId,
            allocationPercentage,
            startDate: assignment.startDate,
          },
        },
      });
    }

    // 5. Create AuditLog entry
    await tx.auditLog.create({
      data: {
        userId: (input.createdById && input.createdById !== "SYSTEM") ? input.createdById : null,
        projectId: input.projectId,
        action: "PROJECT_ASSIGNMENT_CREATED",
        entityType: "EmployeeProjectAssignment",
        entityId: assignment.id,
        afterData: JSON.stringify({
          employeeId: input.employeeId,
          projectId: input.projectId,
          allocationPercentage,
          startDate: assignment.startDate,
        }),
      },
    });

    return assignment;
  });
}

/**
 * Extends the expectedEndDate of an active assignment.
 */
export async function extendProjectAssignment(
  prisma: PrismaClient,
  input: ExtendAssignmentInput
): Promise<EmployeeProjectAssignment> {
  const current = await prisma.employeeProjectAssignment.findUnique({
    where: { id: input.assignmentId },
  });
  if (!current) throw new Error("Bản ghi điều động không tồn tại.");
  if (current.status !== EmployeeProjectAssignmentStatus.ACTIVE) {
    throw new Error("Chỉ có thể gia hạn bản ghi điều động đang hoạt động (ACTIVE).");
  }

  validateEffectiveDateRange(current.startDate, input.newExpectedEndDate, "Ngày gia hạn dự kiến");

  return executeWithAdvisoryLock(prisma, current.employeeId, async (tx) => {
    const updated = await tx.employeeProjectAssignment.update({
      where: { id: input.assignmentId },
      data: {
        expectedEndDate: input.newExpectedEndDate,
        notes: input.reason ? `Gia hạn: ${input.reason}` : current.notes,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: (input.performedById && input.performedById !== "SYSTEM") ? input.performedById : null,
        projectId: current.projectId,
        action: "PROJECT_ASSIGNMENT_EXTENDED",
        entityType: "EmployeeProjectAssignment",
        entityId: updated.id,
        afterData: JSON.stringify({
          oldExpectedEndDate: current.expectedEndDate,
          newExpectedEndDate: input.newExpectedEndDate,
          reason: input.reason,
        }),
      },
    });

    return updated;
  });
}

/**
 * Releases an employee early or upon completion from a project.
 */
export async function releaseEmployeeFromProject(
  prisma: PrismaClient,
  input: ReleaseAssignmentInput
): Promise<EmployeeProjectAssignment> {
  const current = await prisma.employeeProjectAssignment.findUnique({
    where: { id: input.assignmentId },
  });
  if (!current) throw new Error("Bản ghi điều động không tồn tại.");
  if (current.status !== EmployeeProjectAssignmentStatus.ACTIVE) {
    throw new Error("Bản ghi điều động đã được kết thúc hoặc hủy trước đó.");
  }

  validateEffectiveDateRange(current.startDate, input.endDate, "Ngày kết thúc");

  return executeWithAdvisoryLock(prisma, current.employeeId, async (tx) => {
    const updated = await tx.employeeProjectAssignment.update({
      where: { id: input.assignmentId },
      data: {
        status: EmployeeProjectAssignmentStatus.RELEASED,
        endDate: input.endDate,
        endReason: input.endReason,
        notes: input.notes ? `Giải phóng: ${input.notes}` : current.notes,
      },
    });

    if (input.performedById) {
      await tx.employeeChangeHistory.create({
        data: {
          employeeId: current.employeeId,
          changeType: "EMPLOYEE_PROJECT_RELEASED",
          performedById: input.performedById,
          reason: input.notes || `Giải phóng phân công (${input.endReason})`,
          details: {
            assignmentId: current.id,
            projectId: current.projectId,
            endDate: input.endDate,
            endReason: input.endReason,
          },
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: (input.performedById && input.performedById !== "SYSTEM") ? input.performedById : null,
        projectId: current.projectId,
        action: "PROJECT_ASSIGNMENT_RELEASED",
        entityType: "EmployeeProjectAssignment",
        entityId: updated.id,
        afterData: JSON.stringify({
          endDate: input.endDate,
          endReason: input.endReason,
        }),
      },
    });

    return updated;
  });
}

/**
 * Performs a historical roll-over transfer (role, allocation, or project transfer).
 * Closes existing record at effectiveDate (endDate = effectiveDate, status = RELEASED)
 * and creates a new record starting at effectiveDate.
 */
export async function transferProjectRoleOrAllocation(
  prisma: PrismaClient,
  input: TransferAssignmentInput
): Promise<EmployeeProjectAssignment> {
  const current = await prisma.employeeProjectAssignment.findUnique({
    where: { id: input.assignmentId },
  });
  if (!current) throw new Error("Bản ghi điều động không tồn tại.");
  if (current.status !== EmployeeProjectAssignmentStatus.ACTIVE) {
    throw new Error("Chỉ có thể chuyển đổi bản ghi điều động đang hoạt động (ACTIVE).");
  }

  if (input.effectiveDate < current.startDate) {
    throw new Error(
      `Ngày hiệu lực mới (${formatVietnamDateOnly(input.effectiveDate)}) không thể trước ngày bắt đầu hiện tại (${formatVietnamDateOnly(current.startDate)}).`
    );
  }

  return executeWithAdvisoryLock(prisma, current.employeeId, async (tx) => {
    // 1. Close current record
    await tx.employeeProjectAssignment.update({
      where: { id: current.id },
      data: {
        status: EmployeeProjectAssignmentStatus.RELEASED,
        endDate: input.effectiveDate,
        endReason: input.endReason,
      },
    });

    // 2. Open new record starting at effectiveDate
    const targetProjectId = input.newProjectId ?? current.projectId;
    const targetRoleId = input.newProjectPersonnelRoleId ?? current.projectPersonnelRoleId;
    const targetAllocation = input.newAllocationPercentage ?? current.allocationPercentage;

    // Check capacity for new assignment
    const existing = await tx.employeeProjectAssignment.findMany({
      where: {
        employeeId: current.employeeId,
        status: EmployeeProjectAssignmentStatus.ACTIVE,
      },
    });

    const candidates: AllocationCandidate[] = existing.map((a) => ({
      assignmentId: a.id,
      employeeId: a.employeeId,
      projectId: a.projectId,
      projectPersonnelRoleId: a.projectPersonnelRoleId,
      startDate: a.startDate,
      expectedEndDate: a.expectedEndDate,
      endDate: a.endDate,
      allocationPercentage: a.allocationPercentage,
      status: a.status,
    }));

    const newCandidate: AllocationCandidate = {
      employeeId: current.employeeId,
      projectId: targetProjectId,
      projectPersonnelRoleId: targetRoleId,
      startDate: input.effectiveDate,
      expectedEndDate: current.expectedEndDate,
      endDate: null,
      allocationPercentage: targetAllocation,
      status: EmployeeProjectAssignmentStatus.ACTIVE,
    };

    const capacityResult = checkAllocationCapacity(candidates, newCandidate);
    if (capacityResult.hasConflict && !input.overrideReason) {
      throw new Error(
        `Tổng tỷ lệ phân bổ vượt quá 100% (${capacityResult.maximumCombinedAllocation}%) khi chuyển đổi. Cần nhập lý do ghi đè (overrideReason).`
      );
    }

    const newAssignment = await tx.employeeProjectAssignment.create({
      data: {
        employeeId: current.employeeId,
        projectId: targetProjectId,
        projectPersonnelRoleId: targetRoleId,
        startDate: input.effectiveDate,
        expectedEndDate: current.expectedEndDate,
        allocationPercentage: targetAllocation,
        status: EmployeeProjectAssignmentStatus.ACTIVE,
        assignmentDecisionNo: input.assignmentDecisionNo ?? current.assignmentDecisionNo,
        notes: input.notes ?? current.notes,
        overrideReason: input.overrideReason ?? current.overrideReason,
        createdById: input.performedById ?? current.createdById,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: (input.performedById && input.performedById !== "SYSTEM") ? input.performedById : null,
        projectId: targetProjectId,
        action: "PROJECT_ASSIGNMENT_TRANSFERRED",
        entityType: "EmployeeProjectAssignment",
        entityId: newAssignment.id,
        afterData: JSON.stringify({
          previousAssignmentId: current.id,
          effectiveDate: input.effectiveDate,
          endReason: input.endReason,
        }),
      },
    });

    return newAssignment;
  });
}

/**
 * Cancels a future or current active project assignment.
 */
export async function cancelFutureProjectAssignment(
  prisma: PrismaClient,
  input: CancelAssignmentInput
): Promise<EmployeeProjectAssignment> {
  const current = await prisma.employeeProjectAssignment.findUnique({
    where: { id: input.assignmentId },
  });
  if (!current) throw new Error("Bản ghi điều động không tồn tại.");
  if (current.status !== EmployeeProjectAssignmentStatus.ACTIVE) {
    throw new Error("Bản ghi điều động đã kết thúc hoặc bị hủy trước đó.");
  }

  return executeWithAdvisoryLock(prisma, current.employeeId, async (tx) => {
    const updated = await tx.employeeProjectAssignment.update({
      where: { id: input.assignmentId },
      data: {
        status: EmployeeProjectAssignmentStatus.CANCELLED,
        endReason: EmployeeProjectAssignmentEndReason.EARLY_RELEASE,
        notes: input.reason ? `Đã hủy: ${input.reason}` : current.notes,
      },
    });

    if (input.updatedById) {
      await tx.employeeChangeHistory.create({
        data: {
          employeeId: current.employeeId,
          changeType: "EMPLOYEE_PROJECT_RELEASED",
          performedById: input.updatedById,
          reason: input.reason || "Hủy bỏ đợt điều động công trình",
          details: { assignmentId: current.id, projectId: current.projectId, cancelled: true },
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: (input.updatedById && input.updatedById !== "SYSTEM") ? input.updatedById : null,
        projectId: current.projectId,
        action: "PROJECT_ASSIGNMENT_CANCELLED",
        entityType: "EmployeeProjectAssignment",
        entityId: updated.id,
        afterData: JSON.stringify({ reason: input.reason, status: updated.status }),
      },
    });

    return updated;
  });
}
