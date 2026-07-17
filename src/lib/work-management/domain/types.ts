export const TASK_LIFECYCLES = ["DRAFT", "ASSIGNED", "IN_PROGRESS", "SUBMITTED", "COMPLETED", "CANCELLED", "ARCHIVED"] as const;
export type TaskLifecycle = (typeof TASK_LIFECYCLES)[number];

export const ACCEPTANCE_STATES = ["NOT_REQUIRED", "PENDING", "ACCEPTED", "CLARIFICATION_REQUESTED", "DISPUTED"] as const;
export type AcceptanceState = (typeof ACCEPTANCE_STATES)[number];
export const EXECUTION_CONDITIONS = ["ACTIVE", "PAUSED", "BLOCKED"] as const;
export type ExecutionCondition = (typeof EXECUTION_CONDITIONS)[number];
export const REVIEW_STATES = ["NOT_SUBMITTED", "PENDING", "CHANGES_REQUESTED", "RESULT_APPROVED", "REJECTED"] as const;
export type ReviewState = (typeof REVIEW_STATES)[number];
export const TASK_HANDOVER_STATES = ["NONE", "DRAFT", "PENDING_FROM_USER", "PENDING_TO_USER", "PENDING_APPROVAL", "APPROVED", "EFFECTIVE", "REJECTED", "CANCELLED", "EXPIRED", "COMPLETED"] as const;
export type TaskHandoverState = (typeof TASK_HANDOVER_STATES)[number];
export const WAITING_REASONS = ["WAITING_FOR_DATA", "WAITING_FOR_APPROVAL", "WAITING_FOR_COLLABORATION", "WAITING_FOR_EXTERNAL_PARTY", "OTHER"] as const;
export type WaitingReason = (typeof WAITING_REASONS)[number];

export type TaskState = {
  lifecycle: TaskLifecycle;
  acceptance: AcceptanceState;
  execution: ExecutionCondition;
  review: ReviewState;
  handover: TaskHandoverState;
  waitingReason: WaitingReason | null;
};

/** Server-owned state captured when a task is archived. It is never accepted from a command. */
export type ArchivedTaskStateSnapshot = Readonly<TaskState>;

export const TASK_ACTIONS = [
  "CREATE_DRAFT", "ASSIGN", "ACCEPT", "REQUEST_CLARIFICATION", "START", "UPDATE_PROGRESS", "REQUEST_EXTENSION", "CHANGE_DEADLINE",
  "PAUSE", "RESUME", "BLOCK", "UNBLOCK", "SUBMIT", "REQUEST_CHANGES", "APPROVE_RESULT", "CONFIRM_COMPLETION",
  "REOPEN", "CANCEL", "ARCHIVE", "RESTORE", "REQUEST_HANDOVER", "ACCEPT_HANDOVER", "REJECT_HANDOVER",
  "APPROVE_HANDOVER", "EXECUTE_HANDOVER",
] as const;
export type TaskAction = (typeof TASK_ACTIONS)[number];

export const DEADLINE_STATUSES = ["NO_DEADLINE", "NOT_DUE", "DUE_SOON", "DUE_TODAY", "OVERDUE", "COMPLETED_ON_TIME", "COMPLETED_LATE"] as const;
export type DeadlineStatus = (typeof DEADLINE_STATUSES)[number];
export const PARTICIPANT_ROLES = ["PRIMARY_ASSIGNEE", "COLLABORATOR", "REVIEWER", "APPROVER", "WATCHER", "NOTIFIED_PARTY"] as const;
export type ParticipantRole = (typeof PARTICIPANT_ROLES)[number];
export const CONFIDENTIALITY_LEVELS = ["NORMAL", "DEPARTMENT_INTERNAL", "PROJECT_INTERNAL", "RESTRICTED", "CONFIDENTIAL", "EXECUTIVE"] as const;
export type ConfidentialityLevel = (typeof CONFIDENTIALITY_LEVELS)[number];
export const TASK_PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export const HANDOVER_STATUSES = ["DRAFT", "PENDING_RECIPIENT", "PENDING_APPROVAL", "EFFECTIVE", "REJECTED", "CANCELLED", "EXPIRED", "REVOKED"] as const;
export type HandoverStatus = (typeof HANDOVER_STATUSES)[number];
export const HANDOVER_TYPES = ["TASK", "BULK_TASK", "RESPONSIBILITY", "PROJECT", "DEPARTMENT", "TEMPORARY", "LEAVE", "TERMINATION", "TRANSFER"] as const;
export type HandoverType = (typeof HANDOVER_TYPES)[number];
export const DELEGATION_STATUSES = ["DRAFT", "PENDING_APPROVAL", "ACTIVE", "REVOKED", "EXPIRED", "REJECTED"] as const;
export type DelegationStatus = (typeof DELEGATION_STATUSES)[number];
export const RESPONSIBILITY_ASSIGNMENT_STATUSES = ["DRAFT", "ACTIVE", "SUSPENDED", "CANCELLED", "EXPIRED", "HANDED_OVER"] as const;
export type ResponsibilityAssignmentStatus = (typeof RESPONSIBILITY_ASSIGNMENT_STATUSES)[number];
export const SUBMISSION_REVIEW_STATUSES = ["PENDING_REVIEW", "CHANGES_REQUESTED", "ACCEPTED", "REJECTED"] as const;
export type SubmissionReviewStatus = (typeof SUBMISSION_REVIEW_STATUSES)[number];
export const DEPENDENCY_TYPES = ["FINISH_TO_START", "FINISH_TO_FINISH", "START_TO_START", "RELATED", "EXTERNAL"] as const;
export type DependencyType = (typeof DEPENDENCY_TYPES)[number];

export type Participant = { userId: string; role: ParticipantRole; active?: boolean };
export type TaskSnapshot = {
  id: string;
  state: TaskState;
  creatorId: string;
  assignedById: string | null;
  projectId: string | null;
  confidentiality: ConfidentialityLevel;
  requiresIndependentReviewer: boolean;
  primaryAssigneeId: string | null;
  reviewerId: string | null;
  approverId: string | null;
  participants: Participant[];
};
