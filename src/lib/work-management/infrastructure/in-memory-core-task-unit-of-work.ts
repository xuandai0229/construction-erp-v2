import { AsyncLocalStorage } from "node:async_hooks";
import type { CoreTaskAggregate } from "../application/core-task-executor";
import type { CoreTaskEffects } from "../application/core-task-effects";
import type { CoreTaskTransactionContext, CoreTaskUnitOfWork } from "../application/core-task-ports";
import { WorkManagementDomainError } from "../errors/codes";
import { InMemoryIdempotencyCompletionStage } from "./in-memory-idempotency-transaction";
import { InMemoryIdempotencyStore } from "./in-memory-idempotency";
import { type CommittedOutboxBatchToken, InMemoryWorkManagementOutbox } from "./in-memory-outbox";
import { InMemoryOutboxTransactionStage } from "./in-memory-outbox-transaction";

class InMemoryFinalizationMutex {
  private queue: Promise<void> = Promise.resolve();

  async runExclusive<T>(operation: () => Promise<T> | T): Promise<T> {
    const next = this.queue.then(() => operation());
    this.queue = next.then(
      () => {},
      () => {},
    );
    return next;
  }
}

type StagedTaskMutation =
  | {
      kind: "CREATE";
      id: string;
      value: CoreTaskAggregate;
    }
  | {
      kind: "COMPARE_AND_SAVE";
      id: string;
      expectedVersion: number;
      value: CoreTaskAggregate;
    };

/**
 * Process-local composition of task, effects, outbox and idempotency stages.
 * It is intentionally an infrastructure adapter: the shared executor still only
 * depends on `CoreTaskUnitOfWork` and transaction-scoped ports.
 */
export class InMemoryCoreTaskUnitOfWork implements CoreTaskUnitOfWork {
  effects: CoreTaskEffects[] = [];
  runs = 0;
  failEffectStage = false;
  failFinalization = false;
  failIdempotencyPublication = false;
  beforeFinalization: (() => Promise<void>) | null = null;
  /** Process-local test hook: called after all resources staged and before mutex acquisition. */
  afterStagingBeforeFinalization: ((transactionId: number) => Promise<void>) | null = null;
  /** Process-local test hook: called inside the mutex immediately before synchronous visible apply. */
  beforeVisibleCommit: (() => Promise<void>) | null = null;
  private readonly mutex = new InMemoryFinalizationMutex();
  private readonly activeStorage = new AsyncLocalStorage<string>();
  private nextTransactionId = 1;

  constructor(
    readonly tasks: Map<string, CoreTaskAggregate>,
    readonly idempotency: InMemoryIdempotencyStore,
    readonly outbox: InMemoryWorkManagementOutbox,
  ) {}

  async run<T>(operation: (context: CoreTaskTransactionContext) => Promise<T>): Promise<T> {
    if (this.activeStorage.getStore()) {
      throw new WorkManagementDomainError("TASK_COMMAND_INVALID");
    }
    return this.activeStorage.run("active", async () => {
      this.runs += 1;
      const transactionId = this.nextTransactionId++;
      const stagedTasks = new Map<string, StagedTaskMutation>();
      const stagedEffects: CoreTaskEffects[] = [];
      const completion = new InMemoryIdempotencyCompletionStage(this.idempotency, this);
      const outboxStage = new InMemoryOutboxTransactionStage(this.outbox);
      let token: CommittedOutboxBatchToken | null = null;
      const rollbackTasks = new Map<string, CoreTaskAggregate | undefined>();
      let rollbackEffectsCount = 0;

      try {
        const result = await operation({
          tasks: {
            create: async (value) => {
              if (this.tasks.has(value.id) || stagedTasks.has(value.id)) return false;
              stagedTasks.set(value.id, {
                kind: "CREATE",
                id: value.id,
                value: structuredClone(value),
              });
              return true;
            },
            compareAndSave: async (id, expectedVersion, value) => {
              const current = stagedTasks.get(id);
              const currentTask = current ? current.value : this.tasks.get(id);
              if (!currentTask || currentTask.version !== expectedVersion) return false;

              if (current && current.kind === "CREATE") {
                stagedTasks.set(id, {
                  kind: "CREATE",
                  id,
                  value: structuredClone(value),
                });
              } else {
                const firstExpectedVersion = current && current.kind === "COMPARE_AND_SAVE"
                  ? current.expectedVersion
                  : expectedVersion;

                stagedTasks.set(id, {
                  kind: "COMPARE_AND_SAVE",
                  id,
                  expectedVersion: firstExpectedVersion,
                  value: structuredClone(value),
                });
              }
              return true;
            },
          },
          effects: {
            stage: async (value) => {
              if (this.failEffectStage) throw new WorkManagementDomainError("TASK_CONCURRENCY_CONFLICT");
              stagedEffects.push(structuredClone(value));
            },
          },
          outbox: { stage: async (messages) => outboxStage.stage(messages) },
          idempotency: completion,
        });

        await this.afterStagingBeforeFinalization?.(transactionId);

        return await this.mutex.runExclusive(async () => {
          await this.beforeFinalization?.();
          if (this.failFinalization) throw new WorkManagementDomainError("TASK_CONCURRENCY_CONFLICT");

          // Commit-time Revalidation
          for (const mutation of stagedTasks.values()) {
            if (mutation.kind === "CREATE") {
              if (this.tasks.has(mutation.id)) {
                throw new WorkManagementDomainError("TASK_CONCURRENCY_CONFLICT");
              }
            } else if (mutation.kind === "COMPARE_AND_SAVE") {
              const committed = this.tasks.get(mutation.id);
              if (!committed || committed.version !== mutation.expectedVersion) {
                throw new WorkManagementDomainError("TASK_CONCURRENCY_CONFLICT");
              }
            }
          }

          // Synchronous, non-yielding visible apply
          try {
            await this.beforeVisibleCommit?.();
            token = outboxStage.publish();

            for (const [id, mutation] of stagedTasks) {
              rollbackTasks.set(id, this.tasks.get(id));
              this.tasks.set(id, mutation.value);
            }

            rollbackEffectsCount = stagedEffects.length;
            this.effects.push(...stagedEffects);

            completion.publishSync();

            this.outbox.sealCommittedBatch(token);

            return result;
          } catch (error) {
            if (token) {
              try { this.outbox.rollbackCommittedBatch(token); } catch {}
            } else {
              try { outboxStage.discard(); } catch {}
            }

            for (const [id, prevValue] of rollbackTasks) {
              if (prevValue === undefined) {
                this.tasks.delete(id);
              } else {
                this.tasks.set(id, prevValue);
              }
            }

            if (rollbackEffectsCount > 0) {
              this.effects.splice(this.effects.length - rollbackEffectsCount, rollbackEffectsCount);
            }

            completion.discard();
            throw error;
          }
        });
      } catch (error) {
        if (!token) {
          try { outboxStage.discard(); } catch {}
        }
        completion.discard();
        throw error;
      }
    });
  }
}
