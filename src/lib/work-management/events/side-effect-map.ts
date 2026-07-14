import type { TaskAction } from "../domain/types";
import type { WorkManagementActivityType } from "./activity-types";
import type { WorkManagementAuditAction } from "./audit-actions";

export type WorkManagementSideEffectMapping = {
  activity: WorkManagementActivityType;
  audit: WorkManagementAuditAction;
  notification: boolean;
};

export const sideEffectMap = {
  CREATE_DRAFT: { activity: "TASK_CREATED", audit: "TASK_CREATE", notification: false },
  ASSIGN: { activity: "TASK_ASSIGNED", audit: "TASK_ASSIGN", notification: true },
  ACCEPT: { activity: "TASK_ACCEPTED", audit: "TASK_ACCEPT", notification: true },
  REQUEST_CLARIFICATION: { activity: "TASK_CLARIFICATION_REQUESTED", audit: "TASK_REQUEST_CLARIFICATION", notification: true },
  START: { activity: "TASK_STARTED", audit: "TASK_START", notification: false },
  UPDATE_PROGRESS: { activity: "TASK_PROGRESS_UPDATED", audit: "TASK_UPDATE_PROGRESS", notification: false },
  REQUEST_EXTENSION: { activity: "TASK_EXTENSION_REQUESTED", audit: "TASK_REQUEST_EXTENSION", notification: true },
  CHANGE_DEADLINE: { activity: "TASK_DEADLINE_CHANGED", audit: "TASK_CHANGE_DEADLINE", notification: true },
  PAUSE: { activity: "TASK_PAUSED", audit: "TASK_PAUSE", notification: true },
  RESUME: { activity: "TASK_RESUMED", audit: "TASK_RESUME", notification: true },
  BLOCK: { activity: "TASK_BLOCKED", audit: "TASK_BLOCK", notification: true },
  UNBLOCK: { activity: "TASK_UNBLOCKED", audit: "TASK_UNBLOCK", notification: true },
  SUBMIT: { activity: "TASK_SUBMITTED", audit: "TASK_SUBMIT", notification: true },
  REQUEST_CHANGES: { activity: "TASK_CHANGES_REQUESTED", audit: "TASK_REQUEST_CHANGES", notification: true },
  APPROVE_RESULT: { activity: "TASK_RESULT_APPROVED", audit: "TASK_APPROVE_RESULT", notification: true },
  CONFIRM_COMPLETION: { activity: "TASK_COMPLETED", audit: "TASK_CONFIRM_COMPLETION", notification: true },
  REOPEN: { activity: "TASK_REOPENED", audit: "TASK_REOPEN", notification: true },
  CANCEL: { activity: "TASK_CANCELLED", audit: "TASK_CANCEL", notification: true },
  ARCHIVE: { activity: "TASK_ARCHIVED", audit: "TASK_ARCHIVE", notification: false },
  RESTORE: { activity: "TASK_RESTORED", audit: "TASK_RESTORE", notification: false },
  REQUEST_HANDOVER: { activity: "TASK_HANDOVER_REQUESTED", audit: "TASK_REQUEST_HANDOVER", notification: true },
  ACCEPT_HANDOVER: { activity: "TASK_HANDOVER_ACCEPTED", audit: "TASK_ACCEPT_HANDOVER", notification: true },
  REJECT_HANDOVER: { activity: "TASK_HANDOVER_REJECTED", audit: "TASK_REJECT_HANDOVER", notification: true },
  APPROVE_HANDOVER: { activity: "TASK_HANDOVER_APPROVED", audit: "TASK_APPROVE_HANDOVER", notification: true },
  EXECUTE_HANDOVER: { activity: "TASK_HANDOVER_EXECUTED", audit: "TASK_EXECUTE_HANDOVER", notification: true },
} satisfies Record<TaskAction, WorkManagementSideEffectMapping>;
