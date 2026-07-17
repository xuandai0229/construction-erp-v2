import {
  sameIdempotencyIdentity,
  type IdempotencyInspection,
  type IdempotencyIntegrationPort,
  type IdempotencyRequest,
  type StableCoreTaskExecutionResult,
} from "../application/core-task-idempotency";
import { WorkManagementDomainError } from "../errors/codes";

type InMemoryIdempotencyRecord =
  | {
      state: "IN_PROGRESS";
      identity: IdempotencyRequest;
      startedAtSequence: number;
    }
  | {
      state: "COMPLETED";
      identity: IdempotencyRequest;
      result: StableCoreTaskExecutionResult;
      completedAtSequence: number;
    };

const clone = <T>(value: T): T => structuredClone(value);

/**
 * Process-local test/application composition store. It intentionally has no
 * TTL, database, Redis, worker, or distributed-lock behavior.
 */
export class InMemoryIdempotencyStore implements IdempotencyIntegrationPort {
  private readonly records = new Map<string, InMemoryIdempotencyRecord>();
  private sequence = 0;

  /** Test-only helper to inspect the raw record state. */
  getRecordState(key: string): "IN_PROGRESS" | "COMPLETED" | null {
    const record = this.records.get(key);
    return record ? record.state : null;
  }

  async inspect(request: IdempotencyRequest): Promise<IdempotencyInspection> {
    const record = this.records.get(request.key);
    if (!record) return { status: "PROCEED" };
    if (!sameIdempotencyIdentity(record.identity, request)) return { status: "CONFLICT" };
    if (record.state === "IN_PROGRESS") return { status: "IN_PROGRESS" };
    return {
      status: "REPLAY",
      identity: clone(record.identity),
      result: clone(record.result),
    };
  }

  async begin(request: IdempotencyRequest): Promise<void> {
    // No await occurs between read and write: Map reservation is atomic per JS runtime.
    const record = this.records.get(request.key);
    if (!record) {
      this.records.set(request.key, {
        state: "IN_PROGRESS",
        identity: clone(request),
        startedAtSequence: ++this.sequence,
      });
      return;
    }
    if (!sameIdempotencyIdentity(record.identity, request)) {
      throw new WorkManagementDomainError("TASK_IDEMPOTENCY_CONFLICT");
    }
    if (record.state === "IN_PROGRESS") {
      throw new WorkManagementDomainError("TASK_IDEMPOTENCY_IN_PROGRESS");
    }
    throw new WorkManagementDomainError("TASK_IDEMPOTENCY_CONFLICT");
  }

  completeSync(request: IdempotencyRequest, result: StableCoreTaskExecutionResult): void {
    const record = this.records.get(request.key);
    if (!record) {
      throw new WorkManagementDomainError("TASK_IDEMPOTENCY_RESERVATION_REQUIRED");
    }
    if (!sameIdempotencyIdentity(record.identity, request)) {
      throw new WorkManagementDomainError("TASK_IDEMPOTENCY_CONFLICT");
    }
    if (record.state === "COMPLETED") {
      throw new WorkManagementDomainError("TASK_IDEMPOTENCY_ALREADY_COMPLETED");
    }
    this.records.set(request.key, {
      state: "COMPLETED",
      identity: clone(record.identity),
      result: clone(result),
      completedAtSequence: ++this.sequence,
    });
  }

  async complete(request: IdempotencyRequest, result: StableCoreTaskExecutionResult): Promise<void> {
    this.completeSync(request, result);
  }

  async abort(request: IdempotencyRequest, reason: string): Promise<void> {
    void reason;
    const record = this.records.get(request.key);
    if (!record || record.state === "COMPLETED") return;
    if (!sameIdempotencyIdentity(record.identity, request)) {
      throw new WorkManagementDomainError("TASK_IDEMPOTENCY_CONFLICT");
    }
    this.records.delete(request.key);
  }
}
