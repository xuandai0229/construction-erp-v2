import type { ZodTypeAny } from "zod";
import { WorkManagementDomainError } from "../errors/codes";
import type { TaskAction } from "../domain/types";
import type {
  WorkManagementTransitionPolicyKey,
} from "../domain/transition-policies";
import type { WorkManagementActivityType } from "../events/activity-types";
import type { WorkManagementAuditAction } from "../events/audit-actions";
import type { WorkManagementDomainEvent } from "../events/domain-events";
import type {
  WorkManagementPermission,
  WorkManagementScope,
} from "../permissions/contract";
import {
  acceptHandoverSchema,
  acceptTaskSchema,
  approveHandoverSchema,
  approveSubmissionSchema,
  archiveTaskSchema,
  assignTaskSchema,
  blockTaskSchema,
  cancelTaskSchema,
  changeDeadlineSchema,
  changesRequestSchema,
  clarificationSchema,
  completeTaskSchema,
  createTaskSchema,
  executeHandoverSchema,
  extensionRequestSchema,
  handoverRequestSchema,
  pauseTaskSchema,
  progressUpdateSchema,
  rejectHandoverSchema,
  reopenTaskSchema,
  restoreTaskSchema,
  resumeTaskSchema,
  startTaskSchema,
  submissionSchema,
  unblockTaskSchema,
} from "../validation/schemas";
import type { WorkManagementActorPolicy } from "./actor-policy";

export type WorkManagementCommandSchemaKey =
  | "createTask"
  | "assignTask"
  | "acceptTask"
  | "clarification"
  | "startTask"
  | "progressUpdate"
  | "extensionRequest"
  | "changeDeadline"
  | "pauseTask"
  | "resumeTask"
  | "blockTask"
  | "unblockTask"
  | "submission"
  | "changesRequest"
  | "approveSubmission"
  | "completeTask"
  | "reopenTask"
  | "cancelTask"
  | "archiveTask"
  | "restoreTask"
  | "handoverRequest"
  | "acceptHandover"
  | "rejectHandover"
  | "approveHandover"
  | "executeHandover";

export type WorkManagementInvariantPolicyKey =
  | "NO_CLIENT_CONTROLLED_METADATA"
  | "DEADLINE_REASON_REQUIRED"
  | "DUE_DATE_HISTORY_REQUIRED"
  | "REQUEST_ONLY_NO_DEADLINE_CHANGE"
  | "SUBMISSION_VERSION_APPEND_ONLY"
  | "COMPLETION_GUARDS_REQUIRED"
  | "PRESERVE_SUBMISSION_HISTORY"
  | "BLOCK_REASON_REQUIRED"
  | "UNBLOCK_RESOLUTION_REQUIRED"
  | "CANCELLATION_REASON_REQUIRED"
  | "ARCHIVE_SOURCE_STATE_REQUIRED"
  | "RESTORE_PREVIOUS_LIFECYCLE_REQUIRED"
  | "HANDOVER_RECEIVER_REQUIRED"
  | "HANDOVER_EFFECTIVE_REQUIRED"
  | "ASSIGNMENT_HISTORY_REQUIRED";

export type WorkManagementNotificationPolicy =
  | "NONE"
  | "OUTBOX_REQUIRED";
export type WorkManagementIdempotencyPolicy = "REQUIRED";
export type WorkManagementConcurrencyPolicy =
  | "NONE"
  | "EXPECTED_VERSION_REQUIRED";
export type WorkManagementTransactionPolicy = "REQUIRED";

export type WorkManagementActionDefinition = {
  action: TaskAction;
  commandSchemaKey: WorkManagementCommandSchemaKey;
  commandSchema: ZodTypeAny;
  requiredPermission: WorkManagementPermission;
  allowedScopes: readonly WorkManagementScope[];
  actorPolicy: WorkManagementActorPolicy;
  transitionPolicyKey: WorkManagementTransitionPolicyKey;
  invariantPolicy: readonly WorkManagementInvariantPolicyKey[];
  eventType: WorkManagementDomainEvent;
  activityType: WorkManagementActivityType;
  auditType: WorkManagementAuditAction;
  notificationPolicy: WorkManagementNotificationPolicy;
  idempotencyPolicy: WorkManagementIdempotencyPolicy;
  concurrencyPolicy: WorkManagementConcurrencyPolicy;
  transactionPolicy: WorkManagementTransactionPolicy;
};

const PRIVILEGED_SCOPES = ["DEPARTMENT", "PROJECT", "COMPANY"] as const;
const MANAGEMENT_SCOPES = ["OWN", ...PRIVILEGED_SCOPES] as const;
const PRIMARY_SCOPES = ["OWN", "ASSIGNED_SCOPE", "PROJECT", "COMPANY"] as const;
const NO_CLIENT_METADATA = ["NO_CLIENT_CONTROLLED_METADATA"] as const;
const CREATOR_OR_ASSIGNER = ["CREATOR", "ASSIGNED_BY"] as const;

const creatorOrPrivileged: WorkManagementActorPolicy = {
  mode: "RELATION_OR_PRIVILEGED_SCOPE",
  relations: CREATOR_OR_ASSIGNER,
  privilegedScopes: PRIVILEGED_SCOPES,
};
const primaryAssignee: WorkManagementActorPolicy = {
  mode: "RELATION_REQUIRED",
  relations: ["PRIMARY_ASSIGNEE"],
};
const reviewer: WorkManagementActorPolicy = {
  mode: "RELATION_REQUIRED",
  relations: ["REVIEWER"],
};
const approver: WorkManagementActorPolicy = {
  mode: "RELATION_REQUIRED",
  relations: ["APPROVER"],
};
const handoverReceiver: WorkManagementActorPolicy = {
  mode: "RELATION_REQUIRED",
  relations: ["HANDOVER_RECEIVER"],
};
const handoverRequesterOrPrivileged: WorkManagementActorPolicy = {
  mode: "RELATION_OR_PRIVILEGED_SCOPE",
  relations: ["PRIMARY_ASSIGNEE", "CREATOR", "ASSIGNED_BY"],
  privilegedScopes: PRIVILEGED_SCOPES,
};
const systemOrPrivileged: WorkManagementActorPolicy = {
  mode: "SYSTEM_OR_PRIVILEGED_SCOPE",
  privilegedScopes: PRIVILEGED_SCOPES,
};

function defineAction(
  definition: WorkManagementActionDefinition,
): WorkManagementActionDefinition {
  return definition;
}

export const WORK_MANAGEMENT_ACTION_REGISTRY = {
  CREATE_DRAFT: defineAction({ action: "CREATE_DRAFT", commandSchemaKey: "createTask", commandSchema: createTaskSchema, requiredPermission: "task.create.personal", allowedScopes: ["OWN"], actorPolicy: { mode: "NOT_APPLICABLE" }, transitionPolicyKey: "CREATE_NEW_TASK", invariantPolicy: NO_CLIENT_METADATA, eventType: "TaskCreated", activityType: "TASK_CREATED", auditType: "TASK_CREATE", notificationPolicy: "NONE", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "NONE", transactionPolicy: "REQUIRED" }),
  ASSIGN: defineAction({ action: "ASSIGN", commandSchemaKey: "assignTask", commandSchema: assignTaskSchema, requiredPermission: "task.update.assignee", allowedScopes: MANAGEMENT_SCOPES, actorPolicy: creatorOrPrivileged, transitionPolicyKey: "ASSIGN_PRIMARY_ASSIGNEE", invariantPolicy: NO_CLIENT_METADATA, eventType: "TaskAssigned", activityType: "TASK_ASSIGNED", auditType: "TASK_ASSIGN", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  ACCEPT: defineAction({ action: "ACCEPT", commandSchemaKey: "acceptTask", commandSchema: acceptTaskSchema, requiredPermission: "task.accept", allowedScopes: PRIMARY_SCOPES, actorPolicy: primaryAssignee, transitionPolicyKey: "ACCEPT_ASSIGNMENT", invariantPolicy: NO_CLIENT_METADATA, eventType: "TaskAccepted", activityType: "TASK_ACCEPTED", auditType: "TASK_ACCEPT", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  REQUEST_CLARIFICATION: defineAction({ action: "REQUEST_CLARIFICATION", commandSchemaKey: "clarification", commandSchema: clarificationSchema, requiredPermission: "task.request_clarification", allowedScopes: PRIMARY_SCOPES, actorPolicy: primaryAssignee, transitionPolicyKey: "REQUEST_TASK_CLARIFICATION", invariantPolicy: NO_CLIENT_METADATA, eventType: "TaskClarificationRequested", activityType: "TASK_CLARIFICATION_REQUESTED", auditType: "TASK_REQUEST_CLARIFICATION", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  START: defineAction({ action: "START", commandSchemaKey: "startTask", commandSchema: startTaskSchema, requiredPermission: "task.update_progress", allowedScopes: PRIMARY_SCOPES, actorPolicy: primaryAssignee, transitionPolicyKey: "START_EXECUTION", invariantPolicy: NO_CLIENT_METADATA, eventType: "TaskStarted", activityType: "TASK_STARTED", auditType: "TASK_START", notificationPolicy: "NONE", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  UPDATE_PROGRESS: defineAction({ action: "UPDATE_PROGRESS", commandSchemaKey: "progressUpdate", commandSchema: progressUpdateSchema, requiredPermission: "task.update_progress", allowedScopes: PRIMARY_SCOPES, actorPolicy: primaryAssignee, transitionPolicyKey: "UPDATE_EXECUTION_PROGRESS", invariantPolicy: NO_CLIENT_METADATA, eventType: "TaskProgressUpdated", activityType: "TASK_PROGRESS_UPDATED", auditType: "TASK_UPDATE_PROGRESS", notificationPolicy: "NONE", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  REQUEST_EXTENSION: defineAction({ action: "REQUEST_EXTENSION", commandSchemaKey: "extensionRequest", commandSchema: extensionRequestSchema, requiredPermission: "task.request_extension", allowedScopes: PRIMARY_SCOPES, actorPolicy: primaryAssignee, transitionPolicyKey: "REQUEST_DEADLINE_EXTENSION", invariantPolicy: [...NO_CLIENT_METADATA, "REQUEST_ONLY_NO_DEADLINE_CHANGE"], eventType: "TaskExtensionRequested", activityType: "TASK_EXTENSION_REQUESTED", auditType: "TASK_REQUEST_EXTENSION", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  CHANGE_DEADLINE: defineAction({ action: "CHANGE_DEADLINE", commandSchemaKey: "changeDeadline", commandSchema: changeDeadlineSchema, requiredPermission: "task.update.deadline", allowedScopes: MANAGEMENT_SCOPES, actorPolicy: creatorOrPrivileged, transitionPolicyKey: "CHANGE_TASK_DEADLINE", invariantPolicy: [...NO_CLIENT_METADATA, "DEADLINE_REASON_REQUIRED", "DUE_DATE_HISTORY_REQUIRED"], eventType: "TaskDeadlineChanged", activityType: "TASK_DEADLINE_CHANGED", auditType: "TASK_CHANGE_DEADLINE", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  PAUSE: defineAction({ action: "PAUSE", commandSchemaKey: "pauseTask", commandSchema: pauseTaskSchema, requiredPermission: "task.pause", allowedScopes: PRIMARY_SCOPES, actorPolicy: primaryAssignee, transitionPolicyKey: "PAUSE_EXECUTION", invariantPolicy: NO_CLIENT_METADATA, eventType: "TaskPaused", activityType: "TASK_PAUSED", auditType: "TASK_PAUSE", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  RESUME: defineAction({ action: "RESUME", commandSchemaKey: "resumeTask", commandSchema: resumeTaskSchema, requiredPermission: "task.resume", allowedScopes: PRIMARY_SCOPES, actorPolicy: primaryAssignee, transitionPolicyKey: "RESUME_EXECUTION", invariantPolicy: NO_CLIENT_METADATA, eventType: "TaskResumed", activityType: "TASK_RESUMED", auditType: "TASK_RESUME", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  BLOCK: defineAction({ action: "BLOCK", commandSchemaKey: "blockTask", commandSchema: blockTaskSchema, requiredPermission: "task.update_progress", allowedScopes: PRIMARY_SCOPES, actorPolicy: primaryAssignee, transitionPolicyKey: "BLOCK_EXECUTION", invariantPolicy: [...NO_CLIENT_METADATA, "BLOCK_REASON_REQUIRED"], eventType: "TaskBlocked", activityType: "TASK_BLOCKED", auditType: "TASK_BLOCK", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  UNBLOCK: defineAction({ action: "UNBLOCK", commandSchemaKey: "unblockTask", commandSchema: unblockTaskSchema, requiredPermission: "task.update_progress", allowedScopes: PRIMARY_SCOPES, actorPolicy: primaryAssignee, transitionPolicyKey: "UNBLOCK_EXECUTION", invariantPolicy: [...NO_CLIENT_METADATA, "UNBLOCK_RESOLUTION_REQUIRED"], eventType: "TaskUnblocked", activityType: "TASK_UNBLOCKED", auditType: "TASK_UNBLOCK", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  SUBMIT: defineAction({ action: "SUBMIT", commandSchemaKey: "submission", commandSchema: submissionSchema, requiredPermission: "task.submit", allowedScopes: PRIMARY_SCOPES, actorPolicy: primaryAssignee, transitionPolicyKey: "SUBMIT_RESULT", invariantPolicy: [...NO_CLIENT_METADATA, "SUBMISSION_VERSION_APPEND_ONLY"], eventType: "TaskSubmitted", activityType: "TASK_SUBMITTED", auditType: "TASK_SUBMIT", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  REQUEST_CHANGES: defineAction({ action: "REQUEST_CHANGES", commandSchemaKey: "changesRequest", commandSchema: changesRequestSchema, requiredPermission: "task.review", allowedScopes: ["PARTICIPATING", "PROJECT", "COMPANY"], actorPolicy: reviewer, transitionPolicyKey: "REQUEST_RESULT_CHANGES", invariantPolicy: NO_CLIENT_METADATA, eventType: "TaskChangesRequested", activityType: "TASK_CHANGES_REQUESTED", auditType: "TASK_REQUEST_CHANGES", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  APPROVE_RESULT: defineAction({ action: "APPROVE_RESULT", commandSchemaKey: "approveSubmission", commandSchema: approveSubmissionSchema, requiredPermission: "task.approve", allowedScopes: ["PARTICIPATING", "PROJECT", "COMPANY"], actorPolicy: approver, transitionPolicyKey: "APPROVE_RESULT_REVIEW", invariantPolicy: NO_CLIENT_METADATA, eventType: "TaskResultApproved", activityType: "TASK_RESULT_APPROVED", auditType: "TASK_APPROVE_RESULT", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  CONFIRM_COMPLETION: defineAction({ action: "CONFIRM_COMPLETION", commandSchemaKey: "completeTask", commandSchema: completeTaskSchema, requiredPermission: "task.complete", allowedScopes: ["PARTICIPATING", "PROJECT", "COMPANY"], actorPolicy: approver, transitionPolicyKey: "CONFIRM_TASK_COMPLETION", invariantPolicy: [...NO_CLIENT_METADATA, "COMPLETION_GUARDS_REQUIRED"], eventType: "TaskCompleted", activityType: "TASK_COMPLETED", auditType: "TASK_CONFIRM_COMPLETION", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  REOPEN: defineAction({ action: "REOPEN", commandSchemaKey: "reopenTask", commandSchema: reopenTaskSchema, requiredPermission: "task.reopen", allowedScopes: MANAGEMENT_SCOPES, actorPolicy: creatorOrPrivileged, transitionPolicyKey: "REOPEN_COMPLETED_TASK", invariantPolicy: [...NO_CLIENT_METADATA, "PRESERVE_SUBMISSION_HISTORY"], eventType: "TaskReopened", activityType: "TASK_REOPENED", auditType: "TASK_REOPEN", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  CANCEL: defineAction({ action: "CANCEL", commandSchemaKey: "cancelTask", commandSchema: cancelTaskSchema, requiredPermission: "task.cancel", allowedScopes: MANAGEMENT_SCOPES, actorPolicy: creatorOrPrivileged, transitionPolicyKey: "CANCEL_TASK", invariantPolicy: [...NO_CLIENT_METADATA, "CANCELLATION_REASON_REQUIRED"], eventType: "TaskCancelled", activityType: "TASK_CANCELLED", auditType: "TASK_CANCEL", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  ARCHIVE: defineAction({ action: "ARCHIVE", commandSchemaKey: "archiveTask", commandSchema: archiveTaskSchema, requiredPermission: "task.archive", allowedScopes: MANAGEMENT_SCOPES, actorPolicy: creatorOrPrivileged, transitionPolicyKey: "ARCHIVE_TASK", invariantPolicy: [...NO_CLIENT_METADATA, "ARCHIVE_SOURCE_STATE_REQUIRED"], eventType: "TaskArchived", activityType: "TASK_ARCHIVED", auditType: "TASK_ARCHIVE", notificationPolicy: "NONE", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  RESTORE: defineAction({ action: "RESTORE", commandSchemaKey: "restoreTask", commandSchema: restoreTaskSchema, requiredPermission: "task.restore", allowedScopes: MANAGEMENT_SCOPES, actorPolicy: creatorOrPrivileged, transitionPolicyKey: "RESTORE_ARCHIVED_TASK", invariantPolicy: [...NO_CLIENT_METADATA, "RESTORE_PREVIOUS_LIFECYCLE_REQUIRED"], eventType: "TaskRestored", activityType: "TASK_RESTORED", auditType: "TASK_RESTORE", notificationPolicy: "NONE", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  REQUEST_HANDOVER: defineAction({ action: "REQUEST_HANDOVER", commandSchemaKey: "handoverRequest", commandSchema: handoverRequestSchema, requiredPermission: "task.handover.request", allowedScopes: MANAGEMENT_SCOPES, actorPolicy: handoverRequesterOrPrivileged, transitionPolicyKey: "REQUEST_TASK_HANDOVER", invariantPolicy: [...NO_CLIENT_METADATA, "HANDOVER_RECEIVER_REQUIRED", "HANDOVER_EFFECTIVE_REQUIRED"], eventType: "TaskHandoverRequested", activityType: "TASK_HANDOVER_REQUESTED", auditType: "TASK_REQUEST_HANDOVER", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  ACCEPT_HANDOVER: defineAction({ action: "ACCEPT_HANDOVER", commandSchemaKey: "acceptHandover", commandSchema: acceptHandoverSchema, requiredPermission: "task.handover.accept", allowedScopes: ["HANDOVER_SCOPE"], actorPolicy: handoverReceiver, transitionPolicyKey: "ACCEPT_TASK_HANDOVER", invariantPolicy: NO_CLIENT_METADATA, eventType: "TaskHandoverAccepted", activityType: "TASK_HANDOVER_ACCEPTED", auditType: "TASK_ACCEPT_HANDOVER", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  REJECT_HANDOVER: defineAction({ action: "REJECT_HANDOVER", commandSchemaKey: "rejectHandover", commandSchema: rejectHandoverSchema, requiredPermission: "task.handover.reject", allowedScopes: ["HANDOVER_SCOPE"], actorPolicy: handoverReceiver, transitionPolicyKey: "REJECT_TASK_HANDOVER", invariantPolicy: NO_CLIENT_METADATA, eventType: "TaskHandoverRejected", activityType: "TASK_HANDOVER_REJECTED", auditType: "TASK_REJECT_HANDOVER", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  APPROVE_HANDOVER: defineAction({ action: "APPROVE_HANDOVER", commandSchemaKey: "approveHandover", commandSchema: approveHandoverSchema, requiredPermission: "task.handover.approve", allowedScopes: MANAGEMENT_SCOPES, actorPolicy: creatorOrPrivileged, transitionPolicyKey: "APPROVE_TASK_HANDOVER", invariantPolicy: NO_CLIENT_METADATA, eventType: "TaskHandoverApproved", activityType: "TASK_HANDOVER_APPROVED", auditType: "TASK_APPROVE_HANDOVER", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
  EXECUTE_HANDOVER: defineAction({ action: "EXECUTE_HANDOVER", commandSchemaKey: "executeHandover", commandSchema: executeHandoverSchema, requiredPermission: "task.handover.execute", allowedScopes: PRIVILEGED_SCOPES, actorPolicy: systemOrPrivileged, transitionPolicyKey: "EXECUTE_TASK_HANDOVER", invariantPolicy: [...NO_CLIENT_METADATA, "HANDOVER_EFFECTIVE_REQUIRED", "ASSIGNMENT_HISTORY_REQUIRED"], eventType: "TaskHandoverEffective", activityType: "TASK_HANDOVER_EXECUTED", auditType: "TASK_EXECUTE_HANDOVER", notificationPolicy: "OUTBOX_REQUIRED", idempotencyPolicy: "REQUIRED", concurrencyPolicy: "EXPECTED_VERSION_REQUIRED", transactionPolicy: "REQUIRED" }),
} satisfies Record<TaskAction, WorkManagementActionDefinition>;

export function getWorkManagementActionDefinition(
  action: string,
): WorkManagementActionDefinition {
  if (!Object.prototype.hasOwnProperty.call(WORK_MANAGEMENT_ACTION_REGISTRY, action)) {
    throw new WorkManagementDomainError("TASK_ACTION_UNSUPPORTED");
  }

  return WORK_MANAGEMENT_ACTION_REGISTRY[action as TaskAction];
}
