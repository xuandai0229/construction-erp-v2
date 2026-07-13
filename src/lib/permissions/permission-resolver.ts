import type { ProjectRole } from "@prisma/client";
import { PERMISSION_REGISTRY } from "./permission-registry";
import { evaluatePermissionPolicy } from "./evaluate-permission-policy";
import type { Permission, PermissionActor, PermissionContext, PermissionResolution } from "./permission-types";
import { getActiveProjectMembership, type ProjectMembership } from "./project-scope";

export class PermissionDeniedError extends Error {
  readonly reasonCode = "PERMISSION_DENIED";
  readonly sourcePolicy: string;
  readonly permission: Permission;
  readonly projectId: string | null;

  constructor(resolution: PermissionResolution, projectId: string | null) {
    super("Bạn không có quyền thực hiện thao tác này.");
    this.name = "PermissionDeniedError";
    this.sourcePolicy = resolution.sourcePolicy;
    this.permission = resolution.permission;
    this.projectId = projectId;
  }
}

/** Resolve a server action after obtaining only the required membership record. */
export async function resolvePermission(actor: PermissionActor, permission: Permission, context: PermissionContext = {}): Promise<PermissionResolution> {
  const projectId = context.projectId ?? null;
  let membership = context.membership ?? null;
  if (!membership && projectId && !PERMISSION_REGISTRY[permission].globalRoles?.includes(actor.role)) {
    membership = await getActiveProjectMembership(actor.id, projectId);
  }
  return evaluatePermissionPolicy({ actorUserId: actor.id, systemRole: actor.role, permission, requestedProjectId: projectId, membership, resourceOwnerId: context.ownerId });
}

export async function assertPermission(actor: PermissionActor, permission: Permission, context: PermissionContext = {}) {
  const resolution = await resolvePermission(actor, permission, context);
  if (!resolution.allowed) throw new PermissionDeniedError(resolution, context.projectId ?? null);
  return resolution;
}

export function hasProjectRole(membership: { role: ProjectRole } | null, roles: readonly ProjectRole[]) {
  return Boolean(membership && roles.includes(membership.role));
}

export type { ProjectMembership };
