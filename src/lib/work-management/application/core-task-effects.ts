import type { WorkManagementAuditAction } from "../events/audit-actions";
import type { WorkManagementActivityType } from "../events/activity-types";
import type { WorkManagementDomainEvent } from "../events/domain-events";
import type { ArchivedTaskStateSnapshot, TaskLifecycle } from "../domain/types";

export type WorkManagementDomainEventEnvelope = {
  type: WorkManagementDomainEvent;
  aggregateId: string;
  aggregateVersion: number;
  actorId: string;
  occurredAt: Date;
  correlationId: string;
  causationId: string | null;
  payload: Readonly<Record<string, unknown>>;
};

export type WorkManagementActivityIntent = {
  type: WorkManagementActivityType;
  taskId: string;
  actorId: string;
  occurredAt: Date;
  payload: Readonly<Record<string, unknown>>;
};

export type WorkManagementAuditIntent = {
  action: WorkManagementAuditAction;
  taskId: string;
  actorId: string;
  occurredAt: Date;
  correlationId: string;
  causationId: string | null;
  payload: Readonly<Record<string, unknown>>;
};

export type WorkManagementNotificationIntent = {
  eventType: WorkManagementDomainEvent;
  taskId: string;
  aggregateVersion: number;
  correlationId: string;
  confidentiality: string;
  preview: null;
};

export type AssignmentMutationIntent = {
  taskId: string;
  previousAssigneeId: string | null;
  newAssigneeId: string;
  assignedById: string;
  reason: string | null;
  effectiveAt: Date;
  occurredAt: Date;
};

export type DeadlineHistoryIntent = {
  taskId: string;
  oldDeadlineAt: Date | null;
  newDeadlineAt: Date;
  reason: string;
  changedById: string;
  changedAt: Date;
};

export type BlockerIntent = {
  blockerId: string;
  taskId: string;
  status: "OPEN" | "RESOLVED";
  reason: string;
  actorId: string;
  occurredAt: Date;
};

export type ClarificationIntent = { taskId: string; reason: string; actorId: string; occurredAt: Date };
export type ExtensionRequestIntent = { taskId: string; requestedDueAt: Date; reason: string; actorId: string; occurredAt: Date };

export type ExecutionHistoryIntent = {
  taskId: string;
  previousExecution: "ACTIVE" | "PAUSED" | "BLOCKED";
  newExecution: "ACTIVE" | "PAUSED" | "BLOCKED";
  reason: string | null;
  actorId: string;
  occurredAt: Date;
};
export type ResultSubmissionIntent = { submissionId: string; taskId: string; sequence: number; submittedById: string; submittedAt: Date; summary: string; note: string | null; previousSubmissionId: string | null; aggregateVersion: number };
export type ReviewDecisionIntent = { decisionId: string; taskId: string; submissionId: string; decision: "CHANGES_REQUESTED" | "RESULT_APPROVED"; reason: string | null; decidedById: string; decidedAt: Date; aggregateVersion: number };
export type CompletionIntent = { taskId: string; submissionId: string; completedById: string; completedAt: Date; previousLifecycle: TaskLifecycle; newLifecycle: "COMPLETED"; aggregateVersion: number };
export type ReopenIntent = { reopenId: string; taskId: string; reason: string; reopenedById: string; reopenedAt: Date; previousLifecycle: TaskLifecycle; newLifecycle: TaskLifecycle; aggregateVersion: number };
export type CancellationIntent = { cancellationId: string; taskId: string; reason: string; cancelledById: string; cancelledAt: Date; previousLifecycle: TaskLifecycle; newLifecycle: "CANCELLED"; aggregateVersion: number };
export type ArchiveIntent = { archiveId: string; taskId: string; generation: number; reason: string | null; archivedById: string; archivedAt: Date; preArchiveState: ArchivedTaskStateSnapshot; aggregateVersion: number };
export type RestoreIntent = { restoreId: string; taskId: string; archiveId: string; generation: number; reason: string | null; restoredById: string; restoredAt: Date; previousLifecycle: "ARCHIVED"; newLifecycle: TaskLifecycle; restoredState: ArchivedTaskStateSnapshot; aggregateVersion: number };
export type HandoverRequestIntent = { handoverId: string; taskId: string; generation: number; fromAssigneeId: string; toAssigneeId: string; requestedById: string; requestedAt: Date; reason: string; aggregateVersion: number };
export type HandoverDecisionIntent = { decisionId: string; handoverId: string; taskId: string; generation: number; decision: "ACCEPTED" | "REJECTED" | "APPROVED"; reason: string | null; decidedById: string; decidedAt: Date; aggregateVersion: number };
export type HandoverExecutionIntent = { executionId: string; handoverId: string; taskId: string; generation: number; previousAssigneeId: string; newAssigneeId: string; executedById: string; executedAt: Date; aggregateVersion: number };

export type CoreTaskEffects = {
  domainEvents: readonly WorkManagementDomainEventEnvelope[];
  activities: readonly WorkManagementActivityIntent[];
  audits: readonly WorkManagementAuditIntent[];
  notifications: readonly WorkManagementNotificationIntent[];
  assignmentIntents: readonly AssignmentMutationIntent[];
  deadlineHistoryIntents: readonly DeadlineHistoryIntent[];
  blockerIntents: readonly BlockerIntent[];
  clarificationIntents: readonly ClarificationIntent[];
  extensionRequestIntents: readonly ExtensionRequestIntent[];
  executionHistoryIntents: readonly ExecutionHistoryIntent[];
  submissionIntents: readonly ResultSubmissionIntent[];
  reviewDecisionIntents: readonly ReviewDecisionIntent[];
  completionIntents: readonly CompletionIntent[];
  reopenIntents: readonly ReopenIntent[];
  cancellationIntents: readonly CancellationIntent[];
  archiveIntents: readonly ArchiveIntent[];
  restoreIntents: readonly RestoreIntent[];
  handoverRequestIntents: readonly HandoverRequestIntent[];
  handoverDecisionIntents: readonly HandoverDecisionIntent[];
  handoverExecutionIntents: readonly HandoverExecutionIntent[];
};

export const emptyCoreTaskEffects = (): CoreTaskEffects => ({
  domainEvents: [], activities: [], audits: [], notifications: [], assignmentIntents: [],
  deadlineHistoryIntents: [], blockerIntents: [], clarificationIntents: [], extensionRequestIntents: [],
  executionHistoryIntents: [],
  submissionIntents: [], reviewDecisionIntents: [], completionIntents: [],
  reopenIntents: [], cancellationIntents: [], archiveIntents: [], restoreIntents: [],
  handoverRequestIntents: [], handoverDecisionIntents: [], handoverExecutionIntents: [],
});
