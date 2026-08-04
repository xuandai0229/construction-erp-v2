import { PrismaClient, HrDataScope, SensitiveFieldPolicy, GrantEffect } from "@prisma/client";
import { getSession, SessionUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { resolveUserHrPermission, HrPermissionCheckResult } from "./permission-service";
import { redirect } from "next/navigation";

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
  const session = await getSession();
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
    "hr:org_unit:manage",
    "hr:project_role:manage",
    "hr:access_grant:manage",
  ];
  const checks = await Promise.all(
    workspacePermissions.map((permissionCode) => resolveUserHrPermission(prisma, userId, permissionCode))
  );
  return checks.some((check) => check.allowed);
}

/**
 * Builds Prisma `where` clause for `Employee` model based on HrDataScope.
 */
export async function buildEmployeeScopeWhereClause(
  ctx: HrUserContext,
  scope: HrDataScope
): Promise<any> {
  const now = new Date();
  if (ctx.isSystemAdmin || scope === HrDataScope.ALL_EMPLOYEES) {
    return {};
  }

  if (scope === HrDataScope.SELF_ONLY) {
    if (!ctx.employeeId) {
      // User has no linked employee profile
      return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };
    }
    return { id: ctx.employeeId };
  }

  if (scope === HrDataScope.OWN_ORGANIZATION_UNIT) {
    if (!ctx.employeeId) return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };

    // Find org units managed by user
    const managedOrgUnits = await prisma.organizationUnitManagerAssignment.findMany({
      where: {
        employeeId: ctx.employeeId,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
      },
      select: { organizationUnitId: true },
    });

    const orgUnitIds = managedOrgUnits.map((m) => m.organizationUnitId);

    if (orgUnitIds.length === 0) return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };

    return {
      orgAssignments: {
        some: {
          organizationUnitId: { in: orgUnitIds },
          isPrimary: true,
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
      },
    };
  }

  if (scope === HrDataScope.OWN_PROJECTS) {
    if (!ctx.employeeId) return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };

    // Find projects where current employee is assigned
    const userProjects = await prisma.employeeProjectAssignment.findMany({
      where: {
        employeeId: ctx.employeeId,
        status: "ACTIVE",
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: now } }],
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
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        },
      },
    };
  }

  // NONE or unhandled scope
  return { id: "IMPOSSIBLE_NON_EXISTENT_ID" };
}
