import { WorkManagementDomainError } from "../errors/codes";
import type { Participant, TaskSnapshot } from "./types";

export function assertSinglePrimaryAssignee(participants: Participant[]): void {
  if (participants.filter((participant) => participant.role === "PRIMARY_ASSIGNEE" && participant.active !== false).length !== 1) throw new WorkManagementDomainError("TASK_PRIMARY_ASSIGNEE_CONFLICT");
}
export function assertPrimaryAssigneeIsNotCollaborator(participants: Participant[], primaryAssigneeId: string): void {
  const roles = participants.filter((participant) => participant.userId === primaryAssigneeId && participant.active !== false).map((participant) => participant.role);
  if (!roles.includes("PRIMARY_ASSIGNEE") || roles.includes("COLLABORATOR")) throw new WorkManagementDomainError("TASK_PARTICIPANT_ROLE_INVALID");
}
export function assertTaskAssigneeReference(reference: { userId: string; source: "USER" | "PROJECT_MEMBER" }): void {
  if (!reference.userId || reference.source !== "USER") throw new WorkManagementDomainError("TASK_PARTICIPANT_ROLE_INVALID");
}
export function assertReviewerIndependence(task: TaskSnapshot, confirmerId: string): void {
  if (task.requiresIndependentReviewer && confirmerId === task.primaryAssigneeId) throw new WorkManagementDomainError("TASK_REVIEWER_CONFLICT");
}
export function assertProgress(progress: number): void { if (!Number.isFinite(progress) || progress < 0 || progress > 100) throw new WorkManagementDomainError("TASK_PROGRESS_INVALID"); }
export function assertDateRange(startAt: Date | null, endAt: Date | null): void { if (startAt && endAt && endAt < startAt) throw new WorkManagementDomainError("TASK_DATE_RANGE_INVALID"); }
export function assertDeadlineChangeReason(isAssigned: boolean, reason?: string | null): void { if (isAssigned && !reason?.trim()) throw new WorkManagementDomainError("TASK_DEADLINE_REASON_REQUIRED"); }
export function assertHandoverRecipient(fromUserId: string, toUser: { id: string; isActive: boolean }): void { if (fromUserId === toUser.id) throw new WorkManagementDomainError("TASK_HANDOVER_SELF_TRANSFER"); if (!toUser.isActive) throw new WorkManagementDomainError("TASK_ASSIGNEE_INACTIVE"); }
export function assertNoCycle(edges: Array<{ fromId: string; toId: string }>, fromId: string, toId: string, code: "TASK_PARENT_CYCLE" | "TASK_DEPENDENCY_CYCLE"): void {
  if (fromId === toId) throw new WorkManagementDomainError(code);
  const graph = new Map<string, string[]>();
  for (const edge of edges) graph.set(edge.fromId, [...(graph.get(edge.fromId) ?? []), edge.toId]);
  const stack = [toId]; const seen = new Set<string>();
  while (stack.length) { const current = stack.pop()!; if (current === fromId) throw new WorkManagementDomainError(code); if (seen.has(current)) continue; seen.add(current); stack.push(...(graph.get(current) ?? [])); }
}
export function assertCompletionReadiness(input: { requiredChecklistComplete: boolean; requiredOutputsPresent: boolean; requiredSubtasksComplete: boolean; blocked: boolean }): void {
  if (!input.requiredChecklistComplete) throw new WorkManagementDomainError("TASK_REQUIRED_CHECKLIST_INCOMPLETE");
  if (!input.requiredOutputsPresent) throw new WorkManagementDomainError("TASK_REQUIRED_OUTPUT_MISSING");
  if (!input.requiredSubtasksComplete) throw new WorkManagementDomainError("TASK_SUBTASKS_INCOMPLETE");
  if (input.blocked) throw new WorkManagementDomainError("TASK_INVALID_TRANSITION");
}
export function assertNoOverlappingHandover(intervals: Array<{ startAt: Date; endAt: Date | null }>, candidate: { startAt: Date; endAt: Date | null }): void {
  const candidateEnd = candidate.endAt?.getTime() ?? Number.POSITIVE_INFINITY;
  if (intervals.some((interval) => interval.startAt.getTime() <= candidateEnd && (interval.endAt?.getTime() ?? Number.POSITIVE_INFINITY) >= candidate.startAt.getTime())) throw new WorkManagementDomainError("TASK_HANDOVER_CONFLICT");
}
export function assertHardDeleteAllowed(hasBeenAssigned: boolean): void { if (hasBeenAssigned) throw new WorkManagementDomainError("TASK_HARD_DELETE_FORBIDDEN"); }
export function assertNewSubmission(existingSubmissionNumber: number, requestedSubmissionNumber: number): void { if (requestedSubmissionNumber <= existingSubmissionNumber) throw new WorkManagementDomainError("TASK_SUBMISSION_IMMUTABLE"); }
