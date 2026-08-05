import { PrismaClient } from "@prisma/client";
import {
  buildEffectiveDateWhere,
  validateEffectiveDateRange,
  validateTransferEffectiveDate,
} from "./effective-date-helper";

export interface CreateOrgUnitInput {
  code: string;
  name: string;
  parentId?: string | null;
  description?: string | null;
  orderIndex?: number;
}

export interface UpdateOrgUnitInput {
  id: string;
  code: string;
  name: string;
  parentId?: string | null;
  description?: string | null;
  orderIndex?: number;
  isActive?: boolean;
}

export interface CreatePositionInput {
  code: string;
  title: string;
  description?: string | null;
  level?: number | null;
}

export interface UpdatePositionInput {
  id: string;
  code: string;
  title: string;
  description?: string | null;
  level?: number | null;
  isActive?: boolean;
}

export interface AssignUnitManagerInput {
  organizationUnitId: string;
  employeeId: string;
  startDate: Date;
  isPrimary?: boolean;
  decisionNo?: string | null;
  appointedById?: string | null;
  notes?: string | null;
}

export interface TransferEmployeeOrgInput {
  employeeId: string;
  organizationUnitId: string;
  positionId: string;
  effectiveDate: Date;
  decisionNo?: string | null;
  reason?: string | null;
  notes?: string | null;
  performedById: string;
}

export interface AssignEmployeeOrgInput {
  employeeId: string;
  organizationUnitId: string;
  positionId: string;
  startDate: Date;
  isPrimary?: boolean;
  decisionNo?: string | null;
  notes?: string | null;
  createdById?: string | null;
}

type PrismaTransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
type PrismaLike = PrismaClient | PrismaTransactionClient;

/**
 * Validates that setting `parentId` on `unitId` does NOT create circular hierarchy.
 */
export async function validateOrgUnitHierarchy(
  prisma: PrismaLike,
  unitId: string | null,
  newParentId: string | null
): Promise<void> {
  if (!newParentId) return;
  if (unitId && unitId === newParentId) {
    throw new Error("Một đơn vị không thể chọn chính mình làm đơn vị cha.");
  }

  let currId: string | null = newParentId;
  const visited = new Set<string>();
  if (unitId) visited.add(unitId);

  while (currId) {
    if (visited.has(currId)) {
      throw new Error("Phát hiện vòng lặp phân cấp trong cơ cấu tổ chức.");
    }
    visited.add(currId);

    const parentUnit: { parentId: string | null; isActive: boolean } | null = await prisma.organizationUnit.findUnique({
      where: { id: currId },
      select: { parentId: true, isActive: true },
    });
    if (!parentUnit || !parentUnit.isActive) {
      throw new Error("Đơn vị cha không tồn tại hoặc đã bị vô hiệu hóa.");
    }
    currId = parentUnit.parentId ?? null;
  }
}

/**
 * Creates a new OrganizationUnit after validating code uniqueness and hierarchy.
 */
export async function createOrganizationUnit(
  prisma: PrismaLike,
  input: CreateOrgUnitInput
) {
  const codeNormalized = input.code.trim().toUpperCase();
  const nameTrimmed = input.name.trim();

  if (!codeNormalized || !nameTrimmed) {
    throw new Error("Mã và tên đơn vị tổ chức không được để rỗng.");
  }

  const existingCode = await prisma.organizationUnit.findUnique({
    where: { code: codeNormalized },
  });
  if (existingCode) {
    throw new Error(`Mã đơn vị '${codeNormalized}' đã tồn tại trong hệ thống.`);
  }

  if (input.parentId) {
    await validateOrgUnitHierarchy(prisma, null, input.parentId);
  }

  return prisma.organizationUnit.create({
    data: {
      code: codeNormalized,
      name: nameTrimmed,
      parentId: input.parentId || null,
      description: input.description?.trim() || null,
      orderIndex: input.orderIndex ?? 0,
    },
  });
}

/**
 * Updates an existing OrganizationUnit with cycle check and code uniqueness check.
 */
export async function updateOrganizationUnit(
  prisma: PrismaLike,
  input: UpdateOrgUnitInput
) {
  const codeNormalized = input.code.trim().toUpperCase();
  const nameTrimmed = input.name.trim();

  if (!codeNormalized || !nameTrimmed) {
    throw new Error("Mã và tên đơn vị tổ chức không được để rỗng.");
  }

  const currentUnit = await prisma.organizationUnit.findUnique({
    where: { id: input.id },
  });
  if (!currentUnit) {
    throw new Error("Đơn vị tổ chức không tồn tại.");
  }

  if (currentUnit.code !== codeNormalized) {
    const existingCode = await prisma.organizationUnit.findUnique({
      where: { code: codeNormalized },
    });
    if (existingCode) {
      throw new Error(`Mã đơn vị '${codeNormalized}' đã được sử dụng.`);
    }
  }

  if (input.parentId) {
    await validateOrgUnitHierarchy(prisma, input.id, input.parentId);
  }

  // If deactivating, check constraints
  if (input.isActive === false && currentUnit.isActive === true) {
    await validateOrgUnitDeactivation(prisma, input.id);
  }

  return prisma.organizationUnit.update({
    where: { id: input.id },
    data: {
      code: codeNormalized,
      name: nameTrimmed,
      parentId: input.parentId || null,
      description: input.description?.trim() || null,
      orderIndex: input.orderIndex ?? currentUnit.orderIndex,
      isActive: input.isActive ?? currentUnit.isActive,
    },
  });
}

/**
 * Validates whether an OrganizationUnit can be deactivated.
 */
export async function validateOrgUnitDeactivation(
  prisma: PrismaLike,
  unitId: string
): Promise<void> {
  const now = new Date();
  const activeChildrenCount = await prisma.organizationUnit.count({
    where: { parentId: unitId, isActive: true },
  });
  if (activeChildrenCount > 0) {
    throw new Error("Không thể vô hiệu hóa đơn vị vì vẫn còn đơn vị con đang hoạt động.");
  }

  const activeEmployeesCount = await prisma.employeeOrganizationAssignment.count({
    where: {
      organizationUnitId: unitId,
      ...buildEffectiveDateWhere(now),
    },
  });
  if (activeEmployeesCount > 0) {
    throw new Error("Không thể vô hiệu hóa đơn vị vì vẫn còn nhân viên đang làm việc.");
  }

  const activeManagersCount = await prisma.organizationUnitManagerAssignment.count({
    where: {
      organizationUnitId: unitId,
      ...buildEffectiveDateWhere(now),
    },
  });
  if (activeManagersCount > 0) {
    throw new Error("Không thể vô hiệu hóa đơn vị vì vẫn còn người quản lý đang đương nhiệm.");
  }
}

/**
 * Creates a new Position.
 */
export async function createPosition(
  prisma: PrismaLike,
  input: CreatePositionInput
) {
  const codeNormalized = input.code.trim().toUpperCase();
  const titleTrimmed = input.title.trim();

  if (!codeNormalized || !titleTrimmed) {
    throw new Error("Mã và tên chức danh không được để rỗng.");
  }

  if (input.level !== undefined && input.level !== null) {
    if (input.level < 1 || input.level > 10) {
      throw new Error("Cấp bậc chức danh (level) phải từ 1 đến 10.");
    }
  }

  const existing = await prisma.position.findUnique({
    where: { code: codeNormalized },
  });
  if (existing) {
    throw new Error(`Mã chức danh '${codeNormalized}' đã tồn tại.`);
  }

  return prisma.position.create({
    data: {
      code: codeNormalized,
      title: titleTrimmed,
      description: input.description?.trim() || null,
      level: input.level ?? null,
      isActive: true,
    },
  });
}

/**
 * Updates a Position.
 */
export async function updatePosition(
  prisma: PrismaLike,
  input: UpdatePositionInput
) {
  const codeNormalized = input.code.trim().toUpperCase();
  const titleTrimmed = input.title.trim();

  if (!codeNormalized || !titleTrimmed) {
    throw new Error("Mã và tên chức danh không được để rỗng.");
  }

  if (input.level !== undefined && input.level !== null) {
    if (input.level < 1 || input.level > 10) {
      throw new Error("Cấp bậc chức danh (level) phải từ 1 đến 10.");
    }
  }

  const current = await prisma.position.findUnique({
    where: { id: input.id },
  });
  if (!current) {
    throw new Error("Chức danh không tồn tại.");
  }

  if (current.code !== codeNormalized) {
    const existing = await prisma.position.findUnique({
      where: { code: codeNormalized },
    });
    if (existing) {
      throw new Error(`Mã chức danh '${codeNormalized}' đã tồn tại.`);
    }
  }

  if (input.isActive === false && current.isActive === true) {
    await validatePositionDeactivation(prisma, input.id);
  }

  return prisma.position.update({
    where: { id: input.id },
    data: {
      code: codeNormalized,
      title: titleTrimmed,
      description: input.description?.trim() || null,
      level: input.level ?? current.level,
      isActive: input.isActive ?? current.isActive,
    },
  });
}

/**
 * Validates whether a Position can be deactivated.
 */
export async function validatePositionDeactivation(
  prisma: PrismaLike,
  positionId: string
): Promise<void> {
  const now = new Date();
  const activeCount = await prisma.employeeOrganizationAssignment.count({
    where: {
      positionId,
      ...buildEffectiveDateWhere(now),
    },
  });
  if (activeCount > 0) {
    throw new Error("Không thể vô hiệu hóa chức danh đang được phân công cho nhân viên active.");
  }
}

/**
 * Assigns a unit manager with term overlap prevention & transaction support.
 */
export async function assignUnitManager(
  prisma: PrismaLike,
  input: AssignUnitManagerInput
) {
  const executeManagerAssignment = async (tx: PrismaTransactionClient) => {
    // Row lock on OrganizationUnit to prevent concurrent appointments
    await tx.$queryRaw`SELECT id FROM "OrganizationUnit" WHERE id = ${input.organizationUnitId} FOR UPDATE`;

    const employee = await tx.employee.findUnique({
      where: { id: input.employeeId },
      select: { id: true, fullName: true, status: true },
    });
    if (!employee || employee.status === "RESIGNED" || employee.status === "RETIRED") {
      throw new Error("Nhân viên không hợp lệ hoặc đã nghỉ việc.");
    }

    const unit = await tx.organizationUnit.findUnique({
      where: { id: input.organizationUnitId },
    });
    if (!unit || !unit.isActive) {
      throw new Error("Đơn vị không tồn tại hoặc đã bị vô hiệu hóa.");
    }

    const isPrimary = input.isPrimary ?? true;

    if (isPrimary) {
      // Close previous active primary manager for this unit by setting endDate = input.startDate
      await tx.organizationUnitManagerAssignment.updateMany({
        where: {
          organizationUnitId: input.organizationUnitId,
          isPrimary: true,
          ...buildEffectiveDateWhere(input.startDate),
        },
        data: {
          endDate: input.startDate,
        },
      });
    }

    const managerAssignment = await tx.organizationUnitManagerAssignment.create({
      data: {
        organizationUnitId: input.organizationUnitId,
        employeeId: input.employeeId,
        startDate: input.startDate,
        isPrimary,
        decisionNo: input.decisionNo?.trim() || null,
        appointedById: input.appointedById || null,
      },
      include: {
        employee: { select: { id: true, fullName: true, code: true } },
        organizationUnit: { select: { id: true, name: true, code: true } },
      },
    });

    return managerAssignment;
  };

  if (!("$transaction" in prisma)) {
    return executeManagerAssignment(prisma as any);
  }
  return (prisma as PrismaClient).$transaction(executeManagerAssignment);
}

/**
 * Ends a manager assignment term.
 */
export async function endUnitManagerTerm(
  prisma: PrismaLike,
  assignmentId: string,
  endDate: Date
) {
  const assignment = await prisma.organizationUnitManagerAssignment.findUnique({
    where: { id: assignmentId },
  });
  if (!assignment) {
    throw new Error("Lịch sử phân công quản lý không tồn tại.");
  }

  validateEffectiveDateRange(assignment.startDate, endDate, "Ngày kết thúc nhiệm kỳ");

  return prisma.organizationUnitManagerAssignment.update({
    where: { id: assignmentId },
    data: {
      endDate,
    },
  });
}

/**
 * Transfers employee to a new unit and/or position cleanly within 1 transaction.
 */
export async function transferEmployee(
  prisma: PrismaLike,
  input: TransferEmployeeOrgInput
) {
  const executeTransfer = async (tx: PrismaTransactionClient) => {
    // Row lock on Employee to prevent race conditions during transfers
    await tx.$queryRaw`SELECT id FROM "Employee" WHERE id = ${input.employeeId} FOR UPDATE`;

    const employee = await tx.employee.findUnique({
      where: { id: input.employeeId },
      select: { id: true, fullName: true, status: true },
    });
    if (!employee || ["RESIGNED", "RETIRED"].includes(employee.status)) {
      throw new Error("Nhân viên không tồn tại hoặc đã nghỉ việc.");
    }

    const targetUnit = await tx.organizationUnit.findUnique({
      where: { id: input.organizationUnitId },
    });
    if (!targetUnit || !targetUnit.isActive) {
      throw new Error("Phòng ban/Đơn vị mới không khả dụng.");
    }

    const targetPosition = await tx.position.findUnique({
      where: { id: input.positionId },
    });
    if (!targetPosition || !targetPosition.isActive) {
      throw new Error("Chức danh mới không khả dụng.");
    }

    // Get current active primary assignment
    const currentPrimary = await tx.employeeOrganizationAssignment.findFirst({
      where: {
        employeeId: input.employeeId,
        isPrimary: true,
        ...buildEffectiveDateWhere(input.effectiveDate),
      },
      include: {
        organizationUnit: true,
        position: true,
      },
    });

    if (
      currentPrimary &&
      currentPrimary.organizationUnitId === input.organizationUnitId &&
      currentPrimary.positionId === input.positionId
    ) {
      throw new Error("Không thể điều chuyển vào chính đơn vị và chức danh hiện tại mà không có thay đổi.");
    }

    if (currentPrimary) {
      validateTransferEffectiveDate(currentPrimary.startDate, input.effectiveDate);
    }

    const isOrgUnitChanged = !currentPrimary || currentPrimary.organizationUnitId !== input.organizationUnitId;
    const isPositionChanged = !currentPrimary || currentPrimary.positionId !== input.positionId;

    // Close previous active primary assignment by setting endDate = input.effectiveDate
    await tx.employeeOrganizationAssignment.updateMany({
      where: {
        employeeId: input.employeeId,
        isPrimary: true,
        ...buildEffectiveDateWhere(input.effectiveDate),
      },
      data: {
        endDate: input.effectiveDate,
      },
    });

    // Create new active primary assignment
    const newAssignment = await tx.employeeOrganizationAssignment.create({
      data: {
        employeeId: input.employeeId,
        organizationUnitId: input.organizationUnitId,
        positionId: input.positionId,
        startDate: input.effectiveDate,
        isPrimary: true,
        decisionNo: input.decisionNo?.trim() || null,
        notes: input.notes?.trim() || null,
        createdById: input.performedById,
      },
      include: {
        organizationUnit: { select: { id: true, name: true, code: true } },
        position: { select: { id: true, title: true, code: true } },
      },
    });

    // Correct operator precedence for transfer history reason
    const transferReason =
      input.reason?.trim() ||
      (input.decisionNo ? `Quyết định: ${input.decisionNo.trim()}` : "Điều chuyển phòng ban");

    const positionReason =
      input.reason?.trim() ||
      (input.decisionNo ? `Quyết định: ${input.decisionNo.trim()}` : "Thay đổi chức danh");

    if (isOrgUnitChanged) {
      await tx.employeeChangeHistory.create({
        data: {
          employeeId: input.employeeId,
          changeType: "EMPLOYEE_ORGANIZATION_TRANSFERRED",
          performedById: input.performedById,
          reason: transferReason,
          details: {
            fromUnitId: currentPrimary?.organizationUnitId || null,
            fromUnitName: currentPrimary?.organizationUnit.name || null,
            toUnitId: input.organizationUnitId,
            toUnitName: targetUnit.name,
            effectiveDate: input.effectiveDate.toISOString(),
            decisionNo: input.decisionNo?.trim() || null,
          },
        },
      });
    }

    if (isPositionChanged && !isOrgUnitChanged) {
      await tx.employeeChangeHistory.create({
        data: {
          employeeId: input.employeeId,
          changeType: "EMPLOYEE_POSITION_CHANGED",
          performedById: input.performedById,
          reason: positionReason,
          details: {
            fromPositionId: currentPrimary?.positionId || null,
            fromPositionTitle: currentPrimary?.position.title || null,
            toPositionId: input.positionId,
            toPositionTitle: targetPosition.title,
            effectiveDate: input.effectiveDate.toISOString(),
            decisionNo: input.decisionNo?.trim() || null,
          },
        },
      });
    }

    return newAssignment;
  };

  if (!("$transaction" in prisma)) {
    return executeTransfer(prisma as any);
  }
  return (prisma as PrismaClient).$transaction(executeTransfer);
}

/**
 * Assigns an employee to an organization unit & position.
 */
export async function assignEmployeeToOrganization(
  prisma: PrismaLike,
  input: AssignEmployeeOrgInput
) {
  const executeAssignment = async (tx: PrismaTransactionClient) => {
    if (input.isPrimary) {
      await tx.employeeOrganizationAssignment.updateMany({
        where: {
          employeeId: input.employeeId,
          isPrimary: true,
          ...buildEffectiveDateWhere(input.startDate),
        },
        data: {
          endDate: input.startDate,
        },
      });
    }

    const assignment = await tx.employeeOrganizationAssignment.create({
      data: {
        employeeId: input.employeeId,
        organizationUnitId: input.organizationUnitId,
        positionId: input.positionId,
        startDate: input.startDate,
        isPrimary: input.isPrimary ?? true,
        decisionNo: input.decisionNo?.trim() || null,
        notes: input.notes?.trim() || null,
        createdById: input.createdById || null,
      },
    });

    if (input.createdById) {
      await tx.employeeChangeHistory.create({
        data: {
          employeeId: input.employeeId,
          changeType: "EMPLOYEE_ORGANIZATION_TRANSFERRED",
          performedById: input.createdById,
          reason: input.decisionNo ? `Quyết định: ${input.decisionNo.trim()}` : "Tạo phân công phòng ban",
          details: {
            organizationUnitId: input.organizationUnitId,
            positionId: input.positionId,
            isPrimary: input.isPrimary ?? true,
          },
        },
      });
    }

    return assignment;
  };

  if (!("$transaction" in prisma)) {
    return executeAssignment(prisma as any);
  }
  return (prisma as PrismaClient).$transaction(executeAssignment);
}
