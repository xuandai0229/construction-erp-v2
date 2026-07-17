import type { CoreTaskIdempotencyCompletionStore } from "../application/core-task-ports";
import type { IdempotencyRequest, StableCoreTaskExecutionResult } from "../application/core-task-idempotency";
import { WorkManagementDomainError } from "../errors/codes";
import { InMemoryIdempotencyStore } from "./in-memory-idempotency";

const clone = <T>(value: T): T => structuredClone(value);

/**
 * Transaction-scoped completion adapter. It stages the executor's existing
 * `complete` call and publishes it only after the enclosing business commit.
 */
export class InMemoryIdempotencyCompletionStage implements CoreTaskIdempotencyCompletionStore {
  private staged: { request: IdempotencyRequest; result: StableCoreTaskExecutionResult } | null = null;

  constructor(
    private readonly store: InMemoryIdempotencyStore,
    private readonly uow?: { failIdempotencyPublication: boolean },
  ) {}

  async complete(request: IdempotencyRequest, result: StableCoreTaskExecutionResult): Promise<void> {
    if (this.staged) throw new WorkManagementDomainError("TASK_IDEMPOTENCY_ALREADY_COMPLETED");
    const inspection = await this.store.inspect(request);
    if (inspection.status === "CONFLICT") throw new WorkManagementDomainError("TASK_IDEMPOTENCY_CONFLICT");
    if (inspection.status === "PROCEED") throw new WorkManagementDomainError("TASK_IDEMPOTENCY_RESERVATION_REQUIRED");
    if (inspection.status === "REPLAY") throw new WorkManagementDomainError("TASK_IDEMPOTENCY_ALREADY_COMPLETED");
    this.staged = { request: clone(request), result: clone(result) };
  }

  publishSync(): void {
    if (!this.staged) return;
    if (this.uow?.failIdempotencyPublication) {
      this.uow.failIdempotencyPublication = false;
      throw new WorkManagementDomainError("TASK_IDEMPOTENCY_PUBLICATION_FAILED");
    }
    this.store.completeSync(this.staged.request, this.staged.result);
    this.staged = null;
  }

  async publish(): Promise<void> {
    this.publishSync();
  }

  discard(): void {
    this.staged = null;
  }
}
