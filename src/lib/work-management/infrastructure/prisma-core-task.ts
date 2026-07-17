import { Prisma, WorkTaskIdempotencyState, type PrismaClient } from "@prisma/client";
import type { CoreTaskAggregate } from "../application/core-task-executor";
import type { CoreTaskEffects } from "../application/core-task-effects";
import type {
  CoreTaskReadRepository,
  CoreTaskTransactionContext,
  CoreTaskUnitOfWork,
} from "../application/core-task-ports";
import type {
  IdempotencyInspection,
  IdempotencyIntegrationPort,
  IdempotencyRequest,
  StableCoreTaskExecutionResult,
} from "../application/core-task-idempotency";
import type { WorkManagementOutboxMessage } from "../application/core-task-outbox";
import { sameIdempotencyIdentity } from "../application/core-task-idempotency";
import { WorkManagementDomainError } from "../errors/codes";

const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const dateKeys = new Set([
  "deadlineAt", "effectiveAt", "occurredAt", "submittedAt", "decidedAt", "completedAt",
  "reopenedAt", "cancelledAt", "archivedAt", "restoredAt", "requestedAt", "executedAt",
  "changedAt", "requestedDueAt", "oldDeadlineAt", "newDeadlineAt", "createdAt", "updatedAt",
]);

const restoreDates = (value: unknown, key?: string): unknown => {
  if (typeof value === "string" && key && dateKeys.has(key)) {
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : value;
  }
  if (Array.isArray(value)) return value.map((item) => restoreDates(item));
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, restoreDates(entryValue, entryKey)]));
  }
  return value;
};

const aggregateFromJson = (value: Prisma.JsonValue): CoreTaskAggregate =>
  restoreDates(value) as CoreTaskAggregate;

const identityFromRow = (row: {
  key: string; action: string; actorId: string; projectId: string | null; taskId: string | null; fingerprint: string;
}): IdempotencyRequest => ({
  key: row.key,
  action: row.action as IdempotencyRequest["action"],
  actorId: row.actorId,
  companyId: null,
  projectId: row.projectId,
  taskId: row.taskId,
  fingerprint: row.fingerprint,
});

const scopeKey = (request: IdempotencyRequest): string =>
  [request.actorId, request.projectId ?? "", request.taskId ?? "", request.action].join("\u001f");

export class PrismaCoreTaskRepository implements CoreTaskReadRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(taskId: string): Promise<CoreTaskAggregate | null> {
    const row = await this.prisma.workTask.findUnique({ where: { id: taskId }, select: { snapshot: true } });
    return row ? aggregateFromJson(row.snapshot) : null;
  }
}

/** Real database idempotency boundary used by the single CoreTaskExecutor pipeline. */
export class PrismaCoreTaskIdempotency implements IdempotencyIntegrationPort {
  constructor(private readonly prisma: PrismaClient) {}

  async inspect(request: IdempotencyRequest): Promise<IdempotencyInspection> {
    const row = await this.prisma.workTaskIdempotency.findUnique({
      where: { key_scopeKey: { key: request.key, scopeKey: scopeKey(request) } },
    });
    if (!row) return { status: "PROCEED" };
    const identity = identityFromRow(row);
    if (!sameIdempotencyIdentity(request, identity)) return { status: "CONFLICT" };
    if (row.state === WorkTaskIdempotencyState.IN_PROGRESS) return { status: "IN_PROGRESS" };
    if (!row.result) throw new WorkManagementDomainError("TASK_IDEMPOTENCY_RESERVATION_REQUIRED");
    return { status: "REPLAY", identity, result: restoreDates(row.result) as StableCoreTaskExecutionResult };
  }

  async begin(request: IdempotencyRequest): Promise<void> {
    try {
      await this.prisma.workTaskIdempotency.create({
        data: {
          key: request.key, action: request.action, actorId: request.actorId,
          scopeKey: scopeKey(request),
          projectId: request.projectId, taskId: request.taskId, fingerprint: request.fingerprint,
          state: WorkTaskIdempotencyState.IN_PROGRESS,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const inspection = await this.inspect(request);
        if (inspection.status === "IN_PROGRESS") throw new WorkManagementDomainError("TASK_IDEMPOTENCY_IN_PROGRESS");
        throw new WorkManagementDomainError("TASK_IDEMPOTENCY_CONFLICT");
      }
      throw error;
    }
  }

  async complete(request: IdempotencyRequest, result: StableCoreTaskExecutionResult): Promise<void> {
    await this.prisma.workTaskIdempotency.updateMany({
      where: { key: request.key, scopeKey: scopeKey(request), fingerprint: request.fingerprint, state: WorkTaskIdempotencyState.IN_PROGRESS },
      data: { state: WorkTaskIdempotencyState.COMPLETED, result: json(result), completedAt: new Date() },
    });
  }

  async abort(request: IdempotencyRequest): Promise<void> {
    await this.prisma.workTaskIdempotency.deleteMany({ where: { key: request.key, scopeKey: scopeKey(request), state: WorkTaskIdempotencyState.IN_PROGRESS } });
  }
}

const projection = (task: CoreTaskAggregate) => ({
  projectId: task.projectId ?? "",
  creatorId: task.creatorId,
  primaryAssigneeId: task.primaryAssigneeId,
  reviewerId: task.reviewerId,
  approverId: task.approverId,
  title: task.title ?? "",
  description: task.description ?? null,
  priority: task.priority ?? "NORMAL",
  confidentiality: task.confidentiality,
  lifecycle: task.state.lifecycle,
  acceptance: task.state.acceptance,
  execution: task.state.execution,
  review: task.state.review,
  handover: task.state.handover,
  waitingReason: task.state.waitingReason,
  deadlineAt: task.deadlineAt,
  progressPercent: task.progressPercent,
  version: task.version,
  snapshot: json(task),
});

export class PrismaCoreTaskUnitOfWork implements CoreTaskUnitOfWork {
  constructor(private readonly prisma: PrismaClient) {}

  async run<T>(operation: (context: CoreTaskTransactionContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      const actionRows: Array<{ taskId: string; actorId: string; action: string; version: number; occurredAt: Date; effects: CoreTaskEffects }> = [];
      const outboxRows: WorkManagementOutboxMessage[] = [];
      const stagedCompletion: { value: { request: IdempotencyRequest; result: StableCoreTaskExecutionResult } | null } = { value: null };
      const context: CoreTaskTransactionContext = {
        tasks: {
          create: async (task) => {
            if (!task.projectId) return false;
            try {
              await tx.workTask.create({ data: { id: task.id, ...projection(task) } });
              return true;
            } catch (error) {
              if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return false;
              throw error;
            }
          },
          compareAndSave: async (taskId, expectedVersion, next) => {
            const changed = await tx.workTask.updateMany({ where: { id: taskId, version: expectedVersion }, data: projection(next) });
            return changed.count === 1;
          },
        },
        effects: { stage: async (effects) => {
          const event = effects.domainEvents[0];
          if (!event) throw new WorkManagementDomainError("TASK_COMMAND_INVALID");
          actionRows.push({ taskId: event.aggregateId, actorId: event.actorId, action: String(event.payload.action), version: event.aggregateVersion, occurredAt: event.occurredAt, effects });
        } },
        outbox: { stage: async (messages) => { outboxRows.push(...structuredClone(messages)); } },
        idempotency: { complete: async (request, result) => { stagedCompletion.value = { request, result }; } },
      };

      const result = await operation(context);
      const completion = stagedCompletion.value;
      if (!completion) throw new WorkManagementDomainError("TASK_IDEMPOTENCY_RESERVATION_REQUIRED");
      await tx.workTaskAction.createMany({ data: actionRows.map((row) => ({ taskId: row.taskId, actorId: row.actorId, action: row.action, version: row.version, occurredAt: row.occurredAt, effects: json(row.effects) })) });
      await tx.workTaskOutboxMessage.createMany({ data: outboxRows.map((message) => ({ id: message.id, taskId: message.aggregateId, action: message.action, aggregateVersion: message.aggregateVersion, idempotencyKey: message.idempotencyKey, message: json(message), occurredAt: message.occurredAt })) });
      await tx.workTaskIdempotency.updateMany({ where: { key: completion.request.key, scopeKey: scopeKey(completion.request), state: WorkTaskIdempotencyState.IN_PROGRESS }, data: { state: WorkTaskIdempotencyState.COMPLETED, result: json(completion.result), completedAt: new Date() } });
      return result;
    });
  }
}
