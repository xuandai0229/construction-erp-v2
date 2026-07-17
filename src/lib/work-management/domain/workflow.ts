import type { WorkManagementErrorCode } from "../errors/codes";
import type { DeadlineStatus, TaskAction, TaskState } from "./types";

export type DomainEvent = { type: string; taskId?: string };
export type SideEffectIntent = "SEND_NOTIFICATION" | "WRITE_AUDIT_LOG" | "WRITE_TASK_ACTIVITY" | "GRANT_TEMPORARY_ACCESS" | "REVOKE_TEMPORARY_ACCESS";
export type TransitionTarget = { strategy: "EXPLICIT"; state: TaskState } | { strategy: "RESTORE_ACTIVE_ARCHIVE" };
export type TransitionDecision = { allowed: boolean; nextState?: TaskState; target?: TransitionTarget; errorCode?: WorkManagementErrorCode; requiredEvents: DomainEvent[]; requiredSideEffects: SideEffectIntent[]; requiredPermission?: string };
export type TransitionInput = { currentState: TaskState; action: TaskAction; taskId?: string; actorHasPermission: boolean; now: Date };

const permissionByAction: Record<TaskAction, string> = {
  CREATE_DRAFT: "task.create.personal", ASSIGN: "task.assign.self", ACCEPT: "task.accept", REQUEST_CLARIFICATION: "task.request_clarification", START: "task.update.progress", UPDATE_PROGRESS: "task.update_progress", REQUEST_EXTENSION: "task.request_extension", CHANGE_DEADLINE: "task.update.deadline", PAUSE: "task.pause", RESUME: "task.resume", BLOCK: "task.update.progress", UNBLOCK: "task.update.progress", SUBMIT: "task.submit", REQUEST_CHANGES: "task.review", APPROVE_RESULT: "task.approve", CONFIRM_COMPLETION: "task.complete", REOPEN: "task.reopen", CANCEL: "task.cancel", ARCHIVE: "task.archive", RESTORE: "task.restore", REQUEST_HANDOVER: "task.handover.request", ACCEPT_HANDOVER: "task.handover.accept", REJECT_HANDOVER: "task.handover.reject", APPROVE_HANDOVER: "task.handover.approve", EXECUTE_HANDOVER: "task.handover.execute",
};

const eventByAction: Record<TaskAction, string> = {
  CREATE_DRAFT: "TaskCreated", ASSIGN: "TaskAssigned", ACCEPT: "TaskAccepted", REQUEST_CLARIFICATION: "TaskClarificationRequested", START: "TaskStarted", UPDATE_PROGRESS: "TaskProgressUpdated", REQUEST_EXTENSION: "TaskExtensionRequested", CHANGE_DEADLINE: "TaskDeadlineChanged", PAUSE: "TaskPaused", RESUME: "TaskResumed", BLOCK: "TaskBlocked", UNBLOCK: "TaskUnblocked", SUBMIT: "TaskSubmitted", REQUEST_CHANGES: "TaskChangesRequested", APPROVE_RESULT: "TaskResultApproved", CONFIRM_COMPLETION: "TaskCompleted", REOPEN: "TaskReopened", CANCEL: "TaskCancelled", ARCHIVE: "TaskArchived", RESTORE: "TaskRestored", REQUEST_HANDOVER: "TaskHandoverRequested", ACCEPT_HANDOVER: "TaskHandoverAccepted", REJECT_HANDOVER: "TaskHandoverRejected", APPROVE_HANDOVER: "TaskHandoverApproved", EXECUTE_HANDOVER: "TaskHandoverEffective",
};
export const requiredPermissionForAction = (action: TaskAction): string => permissionByAction[action];

function denied(input: TransitionInput, code: WorkManagementErrorCode): TransitionDecision { return { allowed: false, errorCode: code, requiredEvents: [], requiredSideEffects: [], requiredPermission: permissionByAction[input.action] }; }
function allowed(input: TransitionInput, nextState: TaskState): TransitionDecision { return { allowed: true, nextState, target: { strategy: "EXPLICIT", state: nextState }, requiredPermission: permissionByAction[input.action], requiredEvents: [{ type: eventByAction[input.action], taskId: input.taskId }], requiredSideEffects: ["WRITE_TASK_ACTIVITY", "WRITE_AUDIT_LOG", "SEND_NOTIFICATION"] }; }
function restoreFromArchive(input: TransitionInput): TransitionDecision { return { allowed: true, target: { strategy: "RESTORE_ACTIVE_ARCHIVE" }, requiredPermission: permissionByAction[input.action], requiredEvents: [{ type: eventByAction[input.action], taskId: input.taskId }], requiredSideEffects: ["WRITE_TASK_ACTIVITY", "WRITE_AUDIT_LOG", "SEND_NOTIFICATION"] }; }
function withState(state: TaskState, patch: Partial<TaskState>): TaskState { return { ...state, ...patch }; }

export function evaluateTaskTransition(input: TransitionInput): TransitionDecision {
  if (!input.actorHasPermission) return denied(input, "TASK_ACCESS_DENIED");
  const state = input.currentState;
  if (state.lifecycle === "ARCHIVED" && !["RESTORE", "ARCHIVE"].includes(input.action)) return denied(input, "TASK_INVALID_TRANSITION");
  switch (input.action) {
    case "CREATE_DRAFT": return state.lifecycle === "DRAFT" ? allowed(input, state) : denied(input, "TASK_INVALID_TRANSITION");
    case "ASSIGN": return ["DRAFT", "ASSIGNED"].includes(state.lifecycle) ? allowed(input, withState(state, { lifecycle: "ASSIGNED", acceptance: "PENDING" })) : denied(input, "TASK_INVALID_TRANSITION");
    case "ACCEPT": return state.lifecycle === "ASSIGNED" && state.acceptance === "PENDING" ? allowed(input, withState(state, { acceptance: "ACCEPTED" })) : denied(input, "TASK_INVALID_TRANSITION");
    case "REQUEST_CLARIFICATION": return state.lifecycle === "ASSIGNED" && state.acceptance === "PENDING" ? allowed(input, withState(state, { acceptance: "CLARIFICATION_REQUESTED" })) : denied(input, "TASK_INVALID_TRANSITION");
    case "START": return ["ASSIGNED", "IN_PROGRESS"].includes(state.lifecycle) && ["ACCEPTED", "NOT_REQUIRED"].includes(state.acceptance) ? allowed(input, withState(state, { lifecycle: "IN_PROGRESS", execution: "ACTIVE", waitingReason: null })) : denied(input, "TASK_INVALID_TRANSITION");
    case "UPDATE_PROGRESS": case "REQUEST_EXTENSION": case "CHANGE_DEADLINE": return state.lifecycle === "IN_PROGRESS" ? allowed(input, state) : denied(input, "TASK_INVALID_TRANSITION");
    case "PAUSE": return state.lifecycle === "IN_PROGRESS" && state.execution === "ACTIVE" ? allowed(input, withState(state, { execution: "PAUSED" })) : denied(input, "TASK_INVALID_TRANSITION");
    case "RESUME": return state.lifecycle === "IN_PROGRESS" && state.execution === "PAUSED" ? allowed(input, withState(state, { execution: "ACTIVE", waitingReason: null })) : denied(input, "TASK_INVALID_TRANSITION");
    case "BLOCK": return state.lifecycle === "IN_PROGRESS" && state.execution !== "BLOCKED" ? allowed(input, withState(state, { execution: "BLOCKED" })) : denied(input, "TASK_INVALID_TRANSITION");
    case "UNBLOCK": return state.lifecycle === "IN_PROGRESS" && state.execution === "BLOCKED" ? allowed(input, withState(state, { execution: "ACTIVE", waitingReason: null })) : denied(input, "TASK_INVALID_TRANSITION");
    case "SUBMIT": return state.lifecycle === "IN_PROGRESS" ? allowed(input, withState(state, { lifecycle: "SUBMITTED", review: "PENDING" })) : denied(input, "TASK_INVALID_TRANSITION");
    case "REQUEST_CHANGES": return state.lifecycle === "SUBMITTED" && state.review === "PENDING" ? allowed(input, withState(state, { lifecycle: "IN_PROGRESS", review: "CHANGES_REQUESTED" })) : denied(input, "TASK_INVALID_TRANSITION");
    case "APPROVE_RESULT": return state.lifecycle === "SUBMITTED" && state.review === "PENDING" ? allowed(input, withState(state, { review: "RESULT_APPROVED" })) : denied(input, state.review === "RESULT_APPROVED" ? "TASK_SUBMISSION_ALREADY_APPROVED" : "TASK_INVALID_TRANSITION");
    case "CONFIRM_COMPLETION": return state.lifecycle === "SUBMITTED" && state.review === "RESULT_APPROVED" ? allowed(input, withState(state, { lifecycle: "COMPLETED" })) : denied(input, state.lifecycle === "COMPLETED" ? "TASK_ALREADY_COMPLETED" : state.lifecycle === "SUBMITTED" ? "TASK_REVIEW_NOT_APPROVED" : "TASK_INVALID_TRANSITION");
    case "REOPEN": return state.lifecycle === "COMPLETED" ? allowed(input, withState(state, { lifecycle: "IN_PROGRESS", execution: "ACTIVE", review: "NOT_SUBMITTED", waitingReason: null })) : denied(input, "TASK_INVALID_TRANSITION");
    case "CANCEL": return state.lifecycle === "CANCELLED" ? denied(input, "TASK_ALREADY_CANCELLED") : !["COMPLETED", "ARCHIVED"].includes(state.lifecycle) ? allowed(input, withState(state, { lifecycle: "CANCELLED" })) : denied(input, "TASK_INVALID_TRANSITION");
    case "ARCHIVE": return state.lifecycle === "ARCHIVED" ? denied(input, "TASK_ALREADY_ARCHIVED") : ["COMPLETED", "CANCELLED"].includes(state.lifecycle) ? allowed(input, withState(state, { lifecycle: "ARCHIVED" })) : denied(input, "TASK_INVALID_TRANSITION");
    case "RESTORE": return state.lifecycle === "ARCHIVED" ? restoreFromArchive(input) : denied(input, "TASK_ARCHIVE_REQUIRED");
    case "REQUEST_HANDOVER": return ["NONE", "REJECTED", "EFFECTIVE"].includes(state.handover) ? allowed(input, withState(state, { handover: "PENDING_TO_USER" })) : denied(input, "TASK_HANDOVER_CONFLICT");
    case "ACCEPT_HANDOVER": return state.handover === "PENDING_TO_USER" ? allowed(input, withState(state, { handover: "PENDING_APPROVAL" })) : denied(input, "TASK_INVALID_TRANSITION");
    case "REJECT_HANDOVER": return ["PENDING_TO_USER", "PENDING_APPROVAL"].includes(state.handover) ? allowed(input, withState(state, { handover: "REJECTED" })) : denied(input, "TASK_INVALID_TRANSITION");
    case "APPROVE_HANDOVER": return state.handover === "PENDING_APPROVAL" ? allowed(input, withState(state, { handover: "APPROVED" })) : denied(input, "TASK_INVALID_TRANSITION");
    case "EXECUTE_HANDOVER": return state.handover === "APPROVED" ? allowed(input, withState(state, { handover: "EFFECTIVE" })) : denied(input, "TASK_INVALID_TRANSITION");
  }
}

export function getDeadlineStatus(input: { dueAt: Date | null; now: Date; completedAt?: Date | null; dueSoonHours?: number }): DeadlineStatus {
  if (!input.dueAt) return "NO_DEADLINE";
  if (input.completedAt) return input.completedAt.getTime() <= input.dueAt.getTime() ? "COMPLETED_ON_TIME" : "COMPLETED_LATE";
  const difference = input.dueAt.getTime() - input.now.getTime();
  if (difference < 0) return "OVERDUE";
  const sameDay = input.dueAt.getFullYear() === input.now.getFullYear() && input.dueAt.getMonth() === input.now.getMonth() && input.dueAt.getDate() === input.now.getDate();
  if (sameDay) return "DUE_TODAY";
  return difference <= (input.dueSoonHours ?? 72) * 3_600_000 ? "DUE_SOON" : "NOT_DUE";
}
