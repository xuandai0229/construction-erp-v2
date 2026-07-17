import type { CoreTaskAction } from "./core-task-executor";
import type { CoreTaskEffects } from "./core-task-effects";
import { getWorkManagementActionDefinition } from "./action-registry";
import { WorkManagementDomainError } from "../errors/codes";

export type WorkManagementOutboxMessage = Readonly<{
  id: string;
  messageType: string;
  aggregateType: "CORE_TASK";
  aggregateId: string;
  action: CoreTaskAction;
  actorId: string;
  companyId: string | null;
  projectId: string | null;
  aggregateVersion: number;
  sequence: number;
  occurredAt: Date;
  correlationId: string;
  causationId: string | null;
  idempotencyKey: string;
  payload: Readonly<Record<string, unknown>>;
}>;

export type OutboxMappingContext = Readonly<{
  action: CoreTaskAction;
  aggregateId: string;
  aggregateVersion: number;
  actorId: string;
  companyId: string | null;
  projectId: string | null;
  occurredAt: Date;
  correlationId: string;
  causationId: string | null;
  idempotencyKey: string;
}>;

export type OutboxIdGenerator = { next(): string };

const families = [
  ["domainEvents", "WORK_MANAGEMENT_DOMAIN_EVENT"], ["activities", "WORK_MANAGEMENT_ACTIVITY"],
  ["audits", "WORK_MANAGEMENT_AUDIT"], ["notifications", "WORK_MANAGEMENT_NOTIFICATION"],
  ["assignmentIntents", "WORK_MANAGEMENT_ASSIGNMENT_INTENT"], ["deadlineHistoryIntents", "WORK_MANAGEMENT_DEADLINE_HISTORY_INTENT"],
  ["blockerIntents", "WORK_MANAGEMENT_BLOCKER_INTENT"], ["clarificationIntents", "WORK_MANAGEMENT_CLARIFICATION_INTENT"],
  ["extensionRequestIntents", "WORK_MANAGEMENT_EXTENSION_REQUEST_INTENT"], ["executionHistoryIntents", "WORK_MANAGEMENT_EXECUTION_HISTORY_INTENT"],
  ["submissionIntents", "WORK_MANAGEMENT_SUBMISSION_INTENT"], ["reviewDecisionIntents", "WORK_MANAGEMENT_REVIEW_DECISION_INTENT"],
  ["completionIntents", "WORK_MANAGEMENT_COMPLETION_INTENT"], ["reopenIntents", "WORK_MANAGEMENT_REOPEN_INTENT"],
  ["cancellationIntents", "WORK_MANAGEMENT_CANCELLATION_INTENT"], ["archiveIntents", "WORK_MANAGEMENT_ARCHIVE_INTENT"],
  ["restoreIntents", "WORK_MANAGEMENT_RESTORE_INTENT"], ["handoverRequestIntents", "WORK_MANAGEMENT_HANDOVER_REQUEST_INTENT"],
  ["handoverDecisionIntents", "WORK_MANAGEMENT_HANDOVER_DECISION_INTENT"], ["handoverExecutionIntents", "WORK_MANAGEMENT_HANDOVER_EXECUTION_INTENT"],
] as const satisfies readonly [keyof CoreTaskEffects, string][];

export const OUTBOX_EFFECT_FAMILIES = families;

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isNullableIdentifier = (value: unknown): value is string | null =>
  value === null || isNonEmptyString(value);

const invalidMessage = (): never => {
  throw new WorkManagementDomainError("TASK_OUTBOX_MESSAGE_INVALID");
};

const isRuntimeRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

/** Validates a trusted envelope before it crosses an outbox boundary. */
export function validateWorkManagementOutboxMessage(
  message: unknown,
): asserts message is WorkManagementOutboxMessage {
  if (typeof message !== "object" || message === null || Array.isArray(message)) invalidMessage();
  const candidate = message as Record<string, unknown>;
  if (
    !isNonEmptyString(candidate.id) ||
    !isNonEmptyString(candidate.messageType) ||
    candidate.aggregateType !== "CORE_TASK" ||
    !isNonEmptyString(candidate.aggregateId) ||
    !isNonEmptyString(candidate.actorId) ||
    !isNullableIdentifier(candidate.companyId) ||
    !isNullableIdentifier(candidate.projectId) ||
    typeof candidate.aggregateVersion !== "number" || !Number.isInteger(candidate.aggregateVersion) || candidate.aggregateVersion < 0 ||
    typeof candidate.sequence !== "number" || !Number.isInteger(candidate.sequence) || candidate.sequence < 1 ||
    !(candidate.occurredAt instanceof Date) ||
    !Number.isFinite(candidate.occurredAt.getTime()) ||
    !isNonEmptyString(candidate.correlationId) ||
    !isNullableIdentifier(candidate.causationId) ||
    !isNonEmptyString(candidate.idempotencyKey)
  ) {
    invalidMessage();
  }

  try {
    getWorkManagementActionDefinition(candidate.action as CoreTaskAction);
  } catch {
    invalidMessage();
  }

  if (!isRuntimeRecord(candidate.payload)) invalidMessage();

  try {
    structuredClone(candidate.payload);
  } catch {
    invalidMessage();
  }
}

/** Validates uniqueness and exact ordering inside one execution batch. */
export function validateWorkManagementOutboxBatch(
  messages: readonly unknown[],
): void {
  const ids = new Set<string>();
  let first: WorkManagementOutboxMessage | null = null;
  for (const [index, candidate] of messages.entries()) {
    const message = candidate;
    validateWorkManagementOutboxMessage(message);
    first ??= message;
    if (ids.has(message.id)) {
      throw new WorkManagementDomainError("TASK_OUTBOX_MESSAGE_DUPLICATE");
    }
    if (message.sequence !== index + 1) invalidMessage();
    if (first && (
      message.aggregateType !== first.aggregateType ||
      message.aggregateId !== first.aggregateId ||
      message.action !== first.action ||
      message.actorId !== first.actorId ||
      message.companyId !== first.companyId ||
      message.projectId !== first.projectId ||
      message.aggregateVersion !== first.aggregateVersion ||
      message.occurredAt.getTime() !== first.occurredAt.getTime() ||
      message.correlationId !== first.correlationId ||
      message.causationId !== first.causationId ||
      message.idempotencyKey !== first.idempotencyKey
    )) {
      throw new WorkManagementDomainError("TASK_OUTBOX_BATCH_INVALID");
    }
    ids.add(message.id);
  }
}

export function mapCoreTaskEffectsToOutbox(
  effects: CoreTaskEffects,
  context: OutboxMappingContext,
  ids: OutboxIdGenerator,
): readonly WorkManagementOutboxMessage[] {
  const known = new Set(families.map(([family]) => family));
  for (const [key, value] of Object.entries(effects)) {
    if (!known.has(key as keyof CoreTaskEffects) || !Array.isArray(value)) {
      throw new WorkManagementDomainError("TASK_OUTBOX_EFFECT_UNMAPPED");
    }
  }
  const messages: WorkManagementOutboxMessage[] = [];
  for (const [family, messageType] of families) {
    for (const payload of effects[family]) {
      messages.push({
        id: ids.next(), messageType, aggregateType: "CORE_TASK", aggregateId: context.aggregateId,
        action: context.action, actorId: context.actorId, companyId: context.companyId, projectId: context.projectId,
        aggregateVersion: context.aggregateVersion, sequence: messages.length + 1,
        occurredAt: new Date(context.occurredAt.getTime()), correlationId: context.correlationId,
        causationId: context.causationId, idempotencyKey: context.idempotencyKey,
        payload: structuredClone(payload) as Readonly<Record<string, unknown>>,
      });
    }
  }
  validateWorkManagementOutboxBatch(messages);
  return messages;
}
