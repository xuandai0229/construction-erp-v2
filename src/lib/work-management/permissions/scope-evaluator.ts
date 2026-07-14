import type { ParticipantRole, TaskSnapshot } from "../domain/types";
import type { WorkManagementPermission, WorkManagementScope } from "./contract";

export type DelegationContext = { delegateId: string; permissions: readonly WorkManagementPermission[]; scopes: readonly WorkManagementScope[]; startsAt: Date; endsAt: Date | null; status: "ACTIVE" | "REVOKED" | "EXPIRED" };
export type TaskAccessContext = { actorId: string; task: TaskSnapshot; activeProjectMember: boolean; departmentMember: boolean; executiveAccess: boolean; permissions: readonly WorkManagementPermission[]; delegation?: DelegationContext | null; now: Date };

export function hasParticipantRole(task: TaskSnapshot, userId: string, role: ParticipantRole): boolean { return task.participants.some((participant) => participant.userId === userId && participant.role === role && participant.active !== false); }
export function isCreator(task: TaskSnapshot, userId: string): boolean { return task.creatorId === userId; }
export function isAssignedBy(task: TaskSnapshot, userId: string): boolean { return task.assignedById === userId; }
export function isPrimaryAssignee(task: TaskSnapshot, userId: string): boolean { return task.primaryAssigneeId === userId || hasParticipantRole(task, userId, "PRIMARY_ASSIGNEE"); }
export function isCollaborator(task: TaskSnapshot, userId: string): boolean { return hasParticipantRole(task, userId, "COLLABORATOR"); }
export function isReviewer(task: TaskSnapshot, userId: string): boolean { return task.reviewerId === userId || hasParticipantRole(task, userId, "REVIEWER"); }
export function isApprover(task: TaskSnapshot, userId: string): boolean { return task.approverId === userId || hasParticipantRole(task, userId, "APPROVER"); }
export function isWatcher(task: TaskSnapshot, userId: string): boolean { return hasParticipantRole(task, userId, "WATCHER"); }
export function isTaskParticipant(task: TaskSnapshot, userId: string): boolean {
  return isCreator(task, userId) || isAssignedBy(task, userId) || isPrimaryAssignee(task, userId) || isCollaborator(task, userId) || isReviewer(task, userId) || isApprover(task, userId) || isWatcher(task, userId);
}
export function isInProjectScope(context: Pick<TaskAccessContext, "task" | "activeProjectMember">): boolean { return Boolean(context.task.projectId) && context.activeProjectMember; }
export function isDelegationEffective(delegation: DelegationContext | null | undefined, now: Date): boolean { return Boolean(delegation && delegation.status === "ACTIVE" && delegation.startsAt <= now && (!delegation.endsAt || delegation.endsAt >= now)); }
export function isDelegatedActionAllowed(context: TaskAccessContext, permission: WorkManagementPermission, scope: WorkManagementScope): boolean { const delegation=context.delegation; return Boolean(delegation && context.actorId === delegation.delegateId && isDelegationEffective(delegation, context.now) && delegation.permissions.includes(permission) && delegation.scopes.includes(scope)); }
export function isConfidential(task: Pick<TaskSnapshot, "confidentiality">): boolean { return task.confidentiality === "RESTRICTED" || task.confidentiality === "CONFIDENTIAL" || task.confidentiality === "EXECUTIVE"; }
export function canViewTask(context: TaskAccessContext): boolean {
  const { actorId, task } = context;
  const participating = isTaskParticipant(task, actorId);
  const own = isCreator(task, actorId) || isPrimaryAssignee(task, actorId);
  const participantPermission = own ? context.permissions.includes("task.view.own") || context.permissions.includes("task.view.participating") : context.permissions.includes("task.view.participating");
  if (isConfidential(task)) {
    return participating && participantPermission && (task.confidentiality === "EXECUTIVE" ? context.executiveAccess && context.permissions.includes("task.view.executive") : context.permissions.includes("task.view.confidential"));
  }
  return (participating && participantPermission) || (isInProjectScope(context) && context.permissions.includes("task.view.project")) || (context.departmentMember && context.permissions.includes("task.view.department")) || context.permissions.includes("task.view.companywide");
}
