import { WorkManagementDomainError } from "../errors/codes";

export type CompletionReadinessDecision =
  | { ready: true }
  | { ready: false; reason: "PROGRESS_INCOMPLETE" | "CHECKLIST_INCOMPLETE" | "ACTIVE_BLOCKER" | "REVIEW_NOT_APPROVED" | "HANDOVER_PENDING" };

export function assertReviewSeparation(input: { actorId: string; primaryAssigneeId: string | null; submissionAuthorId: string; requiresIndependentReviewer: boolean }): void {
  if (input.requiresIndependentReviewer && (input.actorId === input.primaryAssigneeId || input.actorId === input.submissionAuthorId)) throw new WorkManagementDomainError("TASK_REVIEW_ACTOR_CONFLICT");
}

export function assertCompletionReadiness(decision: CompletionReadinessDecision): void {
  if (decision.ready) return;
  const codes = { PROGRESS_INCOMPLETE: "TASK_COMPLETION_PROGRESS_INCOMPLETE", CHECKLIST_INCOMPLETE: "TASK_COMPLETION_CHECKLIST_INCOMPLETE", ACTIVE_BLOCKER: "TASK_COMPLETION_BLOCKED", REVIEW_NOT_APPROVED: "TASK_REVIEW_NOT_APPROVED", HANDOVER_PENDING: "TASK_COMPLETION_HANDOVER_PENDING" } as const;
  throw new WorkManagementDomainError(codes[decision.reason]);
}
