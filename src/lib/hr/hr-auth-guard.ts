import { PrismaClient, HrDataScope, SensitiveFieldPolicy, GrantEffect } from "@prisma/client";
import { getSession, SessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { resolveUserHrPermission, HrPermissionCheckResult } from "./permission-service";
import { redirect } from "next/navigation";
import { buildEffectiveDateWhere } from "./effective-date-helper";

export interface HrUserContext {
  session: SessionUser;
  isSystemAdmin: boolean;
  employeeId: string | null;
}

export interface HrResolvedAccess extends HrPermissionCheckResult {
  context: HrUserContext;
}

/**
 * Ensures user is authenticated and retrieves HR context.
 */
export async function getHrUserContext(): Promise<HrUserContext> {
  let session: SessionUser | null = null;
  try {
    session = await getSession();
  } catch (err: any) {
    if (process.env.NODE_ENV !== "production") {
      session = (globalThis as any).__TEST_SESSION__?.user || null;
    }
  }
  if (!session) {
    redirect("/login?reason=session_expired");
  }

  const isSystemAdmin = session.role === "ADMIN";

  // Find linked employee ID if any
  const employee = await prisma.employee.findUnique({
    where: { userId: session.id },
    select: { id: true },
  });

  return {
    session,
    isSystemAdmin,
    employeeId: employee?.id || null,
  };
}

/**
 * Checks if user has permission for a specific HR permission code.
 */
export async function checkHrPermission(
  permissionCode: string,
  targetContext?: { targetEmployeeId?: string; targetOrgUnitId?: string; targetProjectId?: string }
): Promise<HrResolvedAccess> {
  const userContext = await getHrUserContext();

  const resolved = await resolveUserHrPermission(
    prisma,
    userContext.session.id,
    permissionCode,
    targetContext
  );

  return {
    ...resolved,
    context: userContext,
  };
}

/**
 * Helper to check if current user has ANY HR permission (for Sidebar / workspace access).
 */
export async function checkUserHasAnyHrPermission(userId: string, role: string): Promise<boolean> {
  const workspacePermissions = [
    "hr:employee:read",
    "hr:employee:create",
    "hr:employee:update",
    "hr:organization:manage",
    "hr:project_role:manage",
    "hr:project_assignment:read",
    "hr:access_grant:manage",
  ];
  const checks = await Promise.all(
    workspacePermissions.map((permissionCode) => resolveUserHrPermission(prisma, userId, permissionCode))
  );
  return checks.some((check) => check.allowed);
}

/**
 * Target-Scope Authorization Guard: Verifies that target entity is within user's HrDataScope.
 */
export async function validateTargetScope(
  ctx: HrUserContext,
  scope: HrDataScope,
  target: {
    employeeId?: string;
    organizationUnitId?: string;
  } = {}
): Promise<{ allowed: boolean; reason?: string }> {
  if (ctx.isSystemAdmin || scope === HrDataScope.ALL_EMPLOYEES) {
    return { allowed: true };
  }

  if (scope === HrDataScope.NONE) {
    return { allowed: false, reason: "Bị từ chối: Phạm vi dữ liệu (NONE) không có quyền truy cập." };
  }

  if (scope === HrDataScope.SELF_ONLY) {
    if (target.organizationUnitId) {
      return { allowed: false, reason: "Bị từ chối: Quyền cá nhân không thể thao tác trên đơn vị tổ chức." };
    }
    if (target.employeeId && target.employeeId !== ctx.employeeId) {
      return { allowed: false, reason: "Bị từ chối: Quyền cá nhân chỉ thao tác trên hồ sơ của chính mình." };
    }
    return { allowed: true };
  }

  if (scope === HrDataScope.OWN_ORGANIZATION_UNIT) {
    if (!ctx.employeeId) {
      return { allowed: false, reason: "Bị từ chối: Tài khoản chưa được liên kết với nhân viên quản lý đơn vị." };
    }

    const now = new Date();
    const managedAssignments = await prisma.organizationUnitManagerAssignment.findMany({
      where: {
        employeeId: ctx.employeeId,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gt: now } }],
      },
      select: { organizationUnitId: true },
    });

    const managedUnitIds = managedAssignments.map((a) => a.organizationUnitId);
    if (managedUnitIds.length === 0) {
      return { allowed: false, reason: "Bị từ chối: Tài khoản không quản lý đơn vị nào." };
    }

    if (target.organizationUnitId && !managedUnitIds.includes(target.organizationUnitId)) {
      return { allowed: false, reason: "Bị từ chối: Đơn vị nằm ngoài phạm vi quản lý của bạn." };
    }

    if (target.employeeId) {
      const activeAssign = await prisma.employeeOrganizationAssignment.findFirst({
        where: {
          employeeId: target.employeeId,
          organizationUnitId: { in: managedUnitIds },
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gt: now } }],
        },
      });
      if (!activeAssign) {
        return { allowed: false, reason: "Bị từ chối: Nhân viên mục tiêu nằm ngoài đơn vị do bạn quản lý." };
      }
    }

    return { allowed: true };
  }

  return { allowed: true };
}


/**
 * Builds Prisma `where` clause for `Employee` model based on HrDataScope and [startDate, endDate) effective date.
 */
export async function buildEmployeeScopeWhereClause(
  ctx: HrUserContext,
  scope: HrDataScope,
  prismaClient: any = prisma
): Promise<any> {
  const now = new Date();
  if (ctx.isSystemAdmin || scope === HrDataScope.ALL_EMPLOYEES) {
    return {};
  }

  if (scope === HrDataScope.SELF_ONLY) {
    if (!ctx.employeeId) {
      return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };
    }
    return { id: ctx.employeeId };
  }

  if (scope === HrDataScope.OWN_ORGANIZATION_UNIT) {
    if (!ctx.employeeId) return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };

    const managedOrgUnits = await prismaClient.organizationUnitManagerAssignment.findMany({
      where: {
        employeeId: ctx.employeeId,
        ...buildEffectiveDateWhere(now),
      },
      select: { organizationUnitId: true },
    });


    const orgUnitIds = managedOrgUnits.map((m: { organizationUnitId: string }) => m.organizationUnitId);

    if (orgUnitIds.length === 0) return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };

    return {
      orgAssignments: {
        some: {
          organizationUnitId: { in: orgUnitIds },
          isPrimary: true,
          ...buildEffectiveDateWhere(now),
        },
      },
    };
  }

  if (scope === HrDataScope.OWN_PROJECTS) {
    if (!ctx.employeeId) return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };

    const userProjects = await prisma.employeeProjectAssignment.findMany({
      where: {
        employeeId: ctx.employeeId,
        status: "ACTIVE",
        ...buildEffectiveDateWhere(now),
      },
      select: { projectId: true },
    });

    const projectIds = userProjects.map((p) => p.projectId);
    if (projectIds.length === 0) return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };

    return {
      projectAssignments: {
        some: {
          projectId: { in: projectIds },
          status: "ACTIVE",
          ...buildEffectiveDateWhere(now),
        },
      },
    };
  }

  // NONE or unhandled scope
  return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };
}

/**
 * Builds Prisma `where` clause for `OrganizationUnit` model based on HrDataScope.
 */
export async function buildOrganizationUnitScopeWhereClause(
  ctx: HrUserContext,
  scope: HrDataScope,
  prismaClient: any = prisma
): Promise<any> {
  const now = new Date();
  if (ctx.isSystemAdmin || scope === HrDataScope.ALL_EMPLOYEES) {
    return {};
  }

  if (scope === HrDataScope.OWN_ORGANIZATION_UNIT) {
    if (!ctx.employeeId) return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };

    const managedOrgUnits = await prismaClient.organizationUnitManagerAssignment.findMany({
      where: {
        employeeId: ctx.employeeId,
        ...buildEffectiveDateWhere(now),
      },
      select: { organizationUnitId: true },
    });

    const orgUnitIds = managedOrgUnits.map((m: any) => m.organizationUnitId);
    if (orgUnitIds.length === 0) return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };

    return { id: { in: orgUnitIds } };
  }

  if (scope === HrDataScope.SELF_ONLY) {
    if (!ctx.employeeId) return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };
    // Employee's own assigned unit
    const selfAssignment = await prismaClient.employeeOrganizationAssignment.findFirst({
      where: {
        employeeId: ctx.employeeId,
        isPrimary: true,
        ...buildEffectiveDateWhere(now),
      },
      select: { organizationUnitId: true },
    });
    if (!selfAssignment) return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };
    return { id: selfAssignment.organizationUnitId };
  }

  return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };
}

/**
 * Builds Prisma `where` clause for `OrganizationUnitManagerAssignment` model based on HrDataScope.
 */
export async function buildManagerAssignmentScopeWhereClause(
  ctx: HrUserContext,
  scope: HrDataScope,
  prismaClient: any = prisma
): Promise<any> {
  const now = new Date();
  if (ctx.isSystemAdmin || scope === HrDataScope.ALL_EMPLOYEES) {
    return {};
  }

  if (scope === HrDataScope.OWN_ORGANIZATION_UNIT) {
    if (!ctx.employeeId) return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };

    const managedOrgUnits = await prismaClient.organizationUnitManagerAssignment.findMany({
      where: {
        employeeId: ctx.employeeId,
        ...buildEffectiveDateWhere(now),
      },
      select: { organizationUnitId: true },
    });

    const orgUnitIds = managedOrgUnits.map((m: any) => m.organizationUnitId);
    if (orgUnitIds.length === 0) return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };

    return { organizationUnitId: { in: orgUnitIds } };
  }

  if (scope === HrDataScope.SELF_ONLY) {
    if (!ctx.employeeId) return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };
    return { employeeId: ctx.employeeId };
  }

  return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };
}


