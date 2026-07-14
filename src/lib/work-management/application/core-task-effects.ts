import type { WorkManagementAuditAction } from "../events/audit-actions";
import type { WorkManagementActivityType } from "../events/activity-types";
import type { WorkManagementDomainEvent } from "../events/domain-events";

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
export type CompletionIntent = { taskId: string; submissionId: string; completedById: string; completedAt: Date; previousLifecycle: "SUBMITTED"; newLifecycle: "COMPLETED"; aggregateVersion: number };

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
};

export const emptyCoreTaskEffects = (): CoreTaskEffects => ({
  domainEvents: [], activities: [], audits: [], notifications: [], assignmentIntents: [],
  deadlineHistoryIntents: [], blockerIntents: [], clarificationIntents: [], extensionRequestIntents: [],
  executionHistoryIntents: [],
  submissionIntents: [], reviewDecisionIntents: [], completionIntents: [],
});
