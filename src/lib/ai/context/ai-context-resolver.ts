import { getSession, SessionUser } from "@/lib/auth";
import { getProjectAccessScopeByCredentials, ProjectAccessScope } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { AIRequestContext } from "../types";
import { randomUUID } from "node:crypto";

export interface AIContextResolveOptions {
  explicitUser?: SessionUser;
  activeProjectId?: string;
  requestId?: string;
}

/**
 * Resolves an authoritative, server-side AIRequestContext.
 *
 * Security Invariants:
 * 1. Client-supplied role or project lists are NEVER trusted.
 * 2. Identity is resolved from validated session or database lookup.
 * 3. Scope is calculated dynamically from RBAC & ProjectMember database tables.
 * 4. Disabled, deleted, or missing users result in null context.
 */
export async function resolveAIRequestContext(
  options: AIContextResolveOptions = {}
): Promise<AIRequestContext | null> {
  const requestId = options.requestId || randomUUID();
  let sessionUser: SessionUser | null = options.explicitUser || null;

  if (!sessionUser) {
    sessionUser = await getSession();
  }

  if (!sessionUser || !sessionUser.id) {
    return null;
  }

  // Double check DB state to guarantee user is active and not soft-deleted
  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      id: true,
      role: true,
      email: true,
      username: true,
      name: true,
      isActive: true,
      deletedAt: true,
      mustChangePassword: true,
    },
  });

  if (!dbUser || !dbUser.isActive || dbUser.deletedAt !== null) {
    return null;
  }

  // Calculate authoritative project access scope
  const projectScope: ProjectAccessScope = await getProjectAccessScopeByCredentials(
    dbUser.id,
    dbUser.role
  );

  let allowedProjectIds: string[] | undefined;
  if (projectScope.kind === "PROJECT_IDS") {
    allowedProjectIds = projectScope.projectIds;
  } else if (projectScope.kind === "NO_PROJECTS") {
    allowedProjectIds = [];
  }

  // Validate activeProjectId against authoritative scope
  let activeProjectId = options.activeProjectId;
  if (activeProjectId) {
    if (projectScope.kind === "PROJECT_IDS" && !projectScope.projectIds.includes(activeProjectId)) {
      // Requested active project not allowed for user; clear or clamp
      activeProjectId = undefined;
    } else if (projectScope.kind === "NO_PROJECTS") {
      activeProjectId = undefined;
    }
  }

  return {
    userId: dbUser.id,
    role: dbUser.role,
    projectScope,
    allowedProjectIds,
    activeProjectId,
    requestId,
    userEmail: dbUser.email || undefined,
    userName: dbUser.name || dbUser.username || undefined,
  };
}
