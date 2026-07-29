import type { UserRole } from "@prisma/client";
import type { SessionUser } from "@/lib/auth";
import { getProjectAccessScope, projectScopeAllows, projectScopeWhere, type ProjectAccessScope } from "@/lib/rbac";
import prisma from "@/lib/prisma";

export type ExecutiveDashboardScope = {
  mode: "ALL_PROJECTS" | "SINGLE_PROJECT";
  userId: string;
  role: UserRole;
  projectId: string | null;
  allowedProjectIds: string[];
  timezone: string;
  generatedAt: Date;
};

export async function resolveExecutiveDashboardScope(
  session: SessionUser,
  rawProjectId?: string | null
): Promise<ExecutiveDashboardScope> {
  const baseScope = await getProjectAccessScope(session);
  const now = new Date();

  // Fetch allowed project IDs for this user
  let allowedIds: string[] = [];
  if (baseScope.kind === "ALL_PROJECTS") {
    const projects = await prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    allowedIds = projects.map((p) => p.id);
  } else if (baseScope.kind === "PROJECT_IDS") {
    allowedIds = baseScope.projectIds;
  }

  const isSingle = Boolean(rawProjectId && rawProjectId !== "all" && projectScopeAllows(baseScope, rawProjectId));
  const activeProjectId = isSingle ? (rawProjectId as string) : null;

  return {
    mode: isSingle ? "SINGLE_PROJECT" : "ALL_PROJECTS",
    userId: session.id,
    role: session.role,
    projectId: activeProjectId,
    allowedProjectIds: isSingle ? [activeProjectId!] : allowedIds,
    timezone: "Asia/Ho_Chi_Minh",
    generatedAt: now,
  };
}

export function scopeWhereProject(scope: ExecutiveDashboardScope) {
  if (scope.mode === "SINGLE_PROJECT" && scope.projectId) {
    return { id: scope.projectId, deletedAt: null };
  }
  return { id: { in: scope.allowedProjectIds }, deletedAt: null };
}

export function scopeWhereProjectId(scope: ExecutiveDashboardScope) {
  if (scope.mode === "SINGLE_PROJECT" && scope.projectId) {
    return { projectId: scope.projectId, deletedAt: null };
  }
  return { projectId: { in: scope.allowedProjectIds }, deletedAt: null };
}

export function scopeWhereTaskProjectId(scope: ExecutiveDashboardScope) {
  if (scope.mode === "SINGLE_PROJECT" && scope.projectId) {
    return { projectId: scope.projectId };
  }
  return { projectId: { in: scope.allowedProjectIds } };
}

export async function resolveDashboardProjectScope(
  session: SessionUser,
  rawProjectId?: string | null
): Promise<{
  scope: ExecutiveDashboardScope;
  projectWhere: { deletedAt: null; id?: string | { in: string[] } };
  visibleProjectWhere: { deletedAt: null; id?: string | { in: string[] }; status: { in: ("PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED")[] } };
}> {
  const scope = await resolveExecutiveDashboardScope(session, rawProjectId);
  const projectWhere = scopeWhereProject(scope);
  const visibleProjectWhere = {
    ...projectWhere,
    status: { in: ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"] as ("PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED")[] },
  };

  return {
    scope,
    projectWhere,
    visibleProjectWhere,
  };
}

