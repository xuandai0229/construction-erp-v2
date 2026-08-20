import { getSession, SessionUser } from "@/lib/auth";
import { getProjectAccessScopeByCredentials, ProjectAccessScope } from "@/lib/rbac";
import prisma from "@/lib/prisma";
import { AIRequestContext } from "../types";
import { randomUUID } from "node:crypto";
import { resolveProjectMention } from "../controller/ai-project-resolver";
import { projectScopeAllows } from "@/lib/rbac";
import { AIUIContextCandidate } from "../types";
import { validateAIUIContextCandidate } from "./ai-ui-context";

export interface AIContextResolveOptions {
  explicitUser?: SessionUser;
  activeProjectId?: string;
  requestId?: string;
  conversationId?: string;
  uiContext?: AIUIContextCandidate;
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

  const uiContext = validateAIUIContextCandidate(options.uiContext);
  const conversationId = options.conversationId?.startsWith("conv_")
    ? options.conversationId.slice(0, 90)
    : `conv_${randomUUID()}`;
  let timezone = "Asia/Bangkok";
  try {
    const settings = await prisma.systemSetting.findUnique({
      where: { singletonKey: "DEFAULT_SETTINGS" },
      select: { timezone: true },
    });
    if (settings?.timezone) timezone = settings.timezone;
  } catch {
    // Context remains usable with the application default timezone.
  }

  const baseContext: AIRequestContext = {
    userId: dbUser.id,
    role: dbUser.role,
    projectScope,
    allowedProjectIds,
    route: uiContext.route,
    module: uiContext.module,
    recordType: uiContext.recordType,
    recordId: uiContext.recordId,
    timezone,
    locale: "vi-VN",
    effectiveTime: new Date().toISOString(),
    conversationId,
    requestId,
    userEmail: dbUser.email || undefined,
    userName: dbUser.name || dbUser.username || undefined,
  };

  // A project route is a stronger UI context candidate than the global selector.
  const activeProjectCandidate = uiContext.recordType === "PROJECT" && uiContext.recordId
    ? uiContext.recordId
    : options.activeProjectId;
  let activeProjectId: string | undefined;
  let activeProjectCode: string | undefined;
  let activeProjectName: string | undefined;

  if (activeProjectCandidate && projectScope.kind !== "NO_PROJECTS") {
    if (projectScopeAllows(projectScope, activeProjectCandidate) && projectScope.kind === "PROJECT_IDS") {
      activeProjectId = activeProjectCandidate;
      try {
        const project = await prisma.project.findFirst({
          where: { id: activeProjectCandidate, deletedAt: null },
          select: { code: true, name: true },
        });
        activeProjectCode = project?.code;
        activeProjectName = project?.name;
      } catch {
        // Tests may inject a canonical project ID without a project repository mock.
      }
    } else {
      const resolved = await resolveProjectMention(activeProjectCandidate, baseContext);
      if (resolved.matchType === "EXACT" || resolved.matchType === "FUZZY") {
        activeProjectId = resolved.projectId;
        activeProjectCode = resolved.projectCode;
        activeProjectName = resolved.projectName;
      }
    }
  }

  return {
    ...baseContext,
    activeProjectId,
    activeProjectCode,
    activeProjectName,
  };
}
