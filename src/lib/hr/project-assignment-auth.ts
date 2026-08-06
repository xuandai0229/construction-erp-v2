import { PrismaClient, GrantEffect, HrDataScope } from "@prisma/client";
import prisma from "@/lib/prisma";
import { resolveUserHrPermission } from "./permission-service";
import { buildEffectiveDateWhere } from "./effective-date-helper";

export type EmployeeTargetScope = "SELF_ONLY" | "OWN_ORGANIZATION_UNIT" | "ALL_EMPLOYEES";
export type ProjectStaffingScope = "NONE" | "OWN_PROJECTS" | "ALL_PROJECTS";
export type ProjectReadScope = "NONE" | "OWN_PROJECTS" | "ALL_PROJECTS";

export type ProjectAssignmentAction = "read" | "create" | "update" | "release" | "override";

export interface ProjectAssignmentAuthInput {
  userId: string;
  permissionCode: string;
  targetEmployeeId?: string;
  targetProjectId?: string;
  action: ProjectAssignmentAction;
  overrideReason?: string;
  now?: Date;
}

export type AuthorizationResult =
  | {
      allowed: true;
      actorId: string;
      actorEmployeeId: string | null;
      employeeScope: EmployeeTargetScope;
      projectStaffingScope: ProjectStaffingScope;
      permissionUsed?: string;
    }
  | {
      allowed: false;
      code:
        | "AUTHENTICATION_REQUIRED"
        | "PERMISSION_DENIED"
        | "EMPLOYEE_SCOPE_DENIED"
        | "PROJECT_SCOPE_DENIED"
        | "INVALID_PROJECT_STATUS"
        | "INVALID_EMPLOYEE_STATUS";
      error: string;
    };

type PrismaTransactionClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];
type PrismaLike = PrismaClient | PrismaTransactionClient;

/**
 * Shared Authorization Resolver for Project Personnel Assignment Actions.
 * Enforces Action Permission AND Employee Target Scope AND Project Staffing Scope AND Invariants.
 */
export async function authorizeProjectAssignmentAction(
  db: PrismaLike,
  input: ProjectAssignmentAuthInput
): Promise<AuthorizationResult> {
  const checkTime = input.now || new Date();

  if (!input.userId) {
    return {
      allowed: false,
      code: "AUTHENTICATION_REQUIRED",
      error: "Yêu cầu đăng nhập hệ thống",
    };
  }

  // 1. Resolve User & Actor Employee
  const user = await db.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      role: true,
      isActive: true,
      deletedAt: true,
      employee: { select: { id: true } },
    },
  });

  if (!user || !user.isActive || user.deletedAt) {
    return {
      allowed: false,
      code: "AUTHENTICATION_REQUIRED",
      error: "Tài khoản không hợp lệ hoặc đã bị khóa",
    };
  }

  const actorEmployeeId = user.employee?.id || null;
  const userRole = user.role;

  // 2. Override action policy enforcement
  if (input.action === "override") {
    // Only ADMIN or DIRECTOR can override allocation
    if (userRole !== "ADMIN" && userRole !== "DIRECTOR") {
      return {
        allowed: false,
        code: "PERMISSION_DENIED",
        error: "Từ chối quyền: Chỉ Giám đốc hoặc Admin mới có quyền ghi đè hạn mức phân bổ",
      };
    }

    if (!input.overrideReason || input.overrideReason.trim().length < 10) {
      return {
        allowed: false,
        code: "PERMISSION_DENIED",
        error: "Vui lòng nhập lý do ghi đè hợp lệ (ít nhất 10 ký tự)",
      };
    }
  }

  // CHIEF_COMMANDER restriction
  if (userRole === "CHIEF_COMMANDER" && input.action !== "read") {
    return {
      allowed: false,
      code: "PERMISSION_DENIED",
      error: "Chỉ huy trưởng công trình không có quyền thực hiện thao tác thay đổi phân công nhân sự",
    };
  }

  // Read-only roles restriction
  if (["VIEWER", "QA_QC", "HSE"].includes(userRole) && input.action !== "read") {
    return {
      allowed: false,
      code: "PERMISSION_DENIED",
      error: "Vai trò chỉ đọc không được phép thực hiện thao tác điều động nhân sự",
    };
  }

  // 3. Permission Definition Check
  const permCheck = await resolveUserHrPermission(db, input.userId, input.permissionCode, {
    targetEmployeeId: input.targetEmployeeId,
    targetProjectId: input.targetProjectId,
    now: checkTime,
  });

  // System ADMIN, DIRECTOR, DEPUTY_DIRECTOR are bypass-role for assignment actions (except override rules above)
  const isHighRole = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"].includes(userRole);
  if (!isHighRole && !permCheck.allowed) {
    return {
      allowed: false,
      code: "PERMISSION_DENIED",
      error: "Bạn không có quyền thực hiện thao tác điều động nhân sự này",
    };
  }

  // 4. Resolve Employee Target Scope
  let resolvedEmployeeScope: EmployeeTargetScope = "SELF_ONLY";
  if (isHighRole) {
    resolvedEmployeeScope = "ALL_EMPLOYEES";
  } else if (permCheck.scope === HrDataScope.ALL_EMPLOYEES) {
    resolvedEmployeeScope = "ALL_EMPLOYEES";
  } else if (permCheck.scope === HrDataScope.OWN_ORGANIZATION_UNIT) {
    resolvedEmployeeScope = "OWN_ORGANIZATION_UNIT";
  } else if (permCheck.scope === HrDataScope.SELF_ONLY) {
    resolvedEmployeeScope = "SELF_ONLY";
  } else {
    // MANAGER role defaults to OWN_ORGANIZATION_UNIT if has permission
    if (userRole === "MANAGER") {
      resolvedEmployeeScope = "OWN_ORGANIZATION_UNIT";
    } else {
      resolvedEmployeeScope = "SELF_ONLY";
    }
  }

  // Validate target employee scope if targetEmployeeId is provided
  if (input.targetEmployeeId) {
    const targetEmp = await db.employee.findUnique({
      where: { id: input.targetEmployeeId },
      select: { id: true, status: true },
    });

    if (!targetEmp) {
      return {
        allowed: false,
        code: "EMPLOYEE_SCOPE_DENIED",
        error: "Nhân viên mục tiêu không tồn tại hoặc không nằm trong phạm vi truy cập",
      };
    }

    if (input.action !== "read" && (targetEmp.status === "RESIGNED" || targetEmp.status === "RETIRED")) {
      return {
        allowed: false,
        code: "INVALID_EMPLOYEE_STATUS",
        error: "Không thể phân công nhân viên đã nghỉ việc hoặc nghỉ hưu",
      };
    }

    if (resolvedEmployeeScope === "SELF_ONLY") {
      if (!actorEmployeeId || actorEmployeeId !== input.targetEmployeeId) {
        return {
          allowed: false,
          code: "EMPLOYEE_SCOPE_DENIED",
          error: "Phạm vi cá nhân chỉ được phép xem thông tin của chính mình",
        };
      }
    } else if (resolvedEmployeeScope === "OWN_ORGANIZATION_UNIT") {
      if (!actorEmployeeId) {
        return {
          allowed: false,
          code: "EMPLOYEE_SCOPE_DENIED",
          error: "Tài khoản chưa được liên kết với nhân viên quản lý đơn vị",
        };
      }

      // Check if actor manages any org unit
      const managedUnits = await db.organizationUnitManagerAssignment.findMany({
        where: {
          employeeId: actorEmployeeId,
          ...buildEffectiveDateWhere(checkTime),
        },
        select: { organizationUnitId: true },
      });

      const managedUnitIds = managedUnits.map((u) => u.organizationUnitId);
      if (managedUnitIds.length === 0) {
        return {
          allowed: false,
          code: "EMPLOYEE_SCOPE_DENIED",
          error: "Bạn không quản lý đơn vị tổ chức nào",
        };
      }

      // Verify target employee is assigned to one of managed units
      const empOrgAssignment = await db.employeeOrganizationAssignment.findFirst({
        where: {
          employeeId: input.targetEmployeeId,
          organizationUnitId: { in: managedUnitIds },
          ...buildEffectiveDateWhere(checkTime),
        },
      });

      if (!empOrgAssignment) {
        return {
          allowed: false,
          code: "EMPLOYEE_SCOPE_DENIED",
          error: "Nhân viên mục tiêu không thuộc đơn vị do bạn quản lý",
        };
      }
    }
  }

  // 5. Resolve Project Staffing Scope
  let resolvedProjectScope: ProjectStaffingScope = "NONE";
  if (isHighRole) {
    resolvedProjectScope = "ALL_PROJECTS";
  } else if (isHighRole || permCheck.allowed) {
    resolvedProjectScope = "ALL_PROJECTS";
  } else if (userRole === "CHIEF_COMMANDER") {
    resolvedProjectScope = "OWN_PROJECTS";
  }

  // Validate target project scope & project status if targetProjectId provided
  if (input.targetProjectId) {
    const targetProject = await db.project.findUnique({
      where: { id: input.targetProjectId },
      select: { id: true, status: true },
    });

    if (!targetProject) {
      return {
        allowed: false,
        code: "PROJECT_SCOPE_DENIED",
        error: "Dự án mục tiêu không tồn tại hoặc không có quyền truy cập",
      };
    }

    if (input.action !== "read" && !["ACTIVE", "PLANNING"].includes(targetProject.status)) {
      return {
        allowed: false,
        code: "INVALID_PROJECT_STATUS",
        error: "Chỉ được phép thực hiện điều động trên dự án đang Hoạt động (ACTIVE) hoặc Lập kế hoạch (PLANNING)",
      };
    }

    if (resolvedProjectScope === "OWN_PROJECTS") {
      if (!actorEmployeeId) {
        return {
          allowed: false,
          code: "PROJECT_SCOPE_DENIED",
          error: "Tài khoản chưa được liên kết với nhân viên",
        };
      }

      const activeAssignedProject = await db.employeeProjectAssignment.findFirst({
        where: {
          employeeId: actorEmployeeId,
          projectId: input.targetProjectId,
          status: "ACTIVE",
          ...buildEffectiveDateWhere(checkTime),
        },
      });

      if (!activeAssignedProject) {
        return {
          allowed: false,
          code: "PROJECT_SCOPE_DENIED",
          error: "Dự án nằm ngoài phạm vi công trình phụ trách",
        };
      }
    }
  }

  return {
    allowed: true,
    actorId: input.userId,
    actorEmployeeId,
    employeeScope: resolvedEmployeeScope,
    projectStaffingScope: resolvedProjectScope,
    permissionUsed: input.permissionCode,
  };
}
