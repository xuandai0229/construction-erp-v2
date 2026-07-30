import "server-only";

import { randomUUID } from "node:crypto";
import type { ProjectRole, UserRole } from "@prisma/client";
import { headers } from "next/headers";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getProjectAccessScope } from "@/lib/rbac";
import {
  getSafetyPermissionSet,
  type SafetyPermission,
} from "./permissions";
import type { SafetyServerActor } from "./mutation-actor";
import type { SafetyProjectScope } from "./types";
import { SafetyApiError } from "./errors";

export type SafetyServerActorContext = {
  actorId: string;
  systemRole: UserRole;
  projectRole: ProjectRole | null;
  projectRoles: ReadonlyMap<string, ProjectRole>;
  projectScope: SafetyProjectScope;
  safetyPermissions: ReadonlySet<SafetyPermission>;
  correlationId: string;
  isCommandActor: boolean;
  unitNames: readonly string[];
};

function resolveCorrelationId(value: string | null): string {
  const trimmed = value?.trim();
  return trimmed && /^[A-Za-z0-9._-]{1,100}$/.test(trimmed)
    ? trimmed
    : randomUUID();
}

function unionPermissions(
  systemRole: UserRole,
  roles: Iterable<ProjectRole>,
): ReadonlySet<SafetyPermission> {
  const permissions = new Set(
    getSafetyPermissionSet({ systemRole, projectRole: null }),
  );
  for (const projectRole of roles) {
    for (const permission of getSafetyPermissionSet({
      systemRole,
      projectRole,
    })) {
      permissions.add(permission);
    }
  }
  return permissions;
}

export async function getSafetyServerActorContext(input?: {
  projectId?: string;
}): Promise<SafetyServerActorContext> {
  const session = await getSession();
  if (!session) {
    throw new SafetyApiError(
      "SAFETY_UNAUTHENTICATED",
      "Vui lòng đăng nhập để tiếp tục.",
    );
  }

  const [projectScope, memberships, requestHeaders] = await Promise.all([
    getProjectAccessScope(session),
    prisma.projectMember.findMany({
      where: {
        userId: session.id,
        isActive: true,
        deletedAt: null,
        leftAt: null,
      },
      select: { projectId: true, role: true },
    }),
    headers(),
  ]);
  const projectRoles = new Map(
    memberships.map((membership) => [
      membership.projectId,
      membership.role,
    ]),
  );
  const projectRole = input?.projectId
    ? projectRoles.get(input.projectId) ?? null
    : null;
  const safetyPermissions = input?.projectId
    ? getSafetyPermissionSet({
        systemRole: session.role,
        projectRole,
      })
    : unionPermissions(session.role, projectRoles.values());

  return {
    actorId: session.id,
    systemRole: session.role,
    projectRole,
    projectRoles,
    projectScope,
    safetyPermissions,
    correlationId: resolveCorrelationId(
      requestHeaders.get("x-correlation-id"),
    ),
    isCommandActor:
      session.role === "CHIEF_COMMANDER" ||
      projectRole === "PROJECT_MANAGER" ||
      projectRole === "SITE_COMMANDER" ||
      projectRole === "CHIEF_COMMANDER" ||
      projectRole === "ASSISTANT_COMMANDER",
    unitNames: [],
  };
}

export function safetyActorForProject(
  context: SafetyServerActorContext,
  projectId: string,
): SafetyServerActor {
  return {
    id: context.actorId,
    projectScope: context.projectScope,
    permissions: getSafetyPermissionSet({
      systemRole: context.systemRole,
      projectRole: context.projectRoles.get(projectId) ?? null,
    }),
    isCommandActor: context.isCommandActor,
    unitNames: context.unitNames,
  };
}

export function safetyActorFromContext(
  context: SafetyServerActorContext,
): SafetyServerActor {
  return {
    id: context.actorId,
    projectScope: context.projectScope,
    permissions: context.safetyPermissions,
    isCommandActor: context.isCommandActor,
    unitNames: context.unitNames,
  };
}
