import {
  type WorkManagementOutboxMessage,
  validateWorkManagementOutboxBatch,
} from "../application/core-task-outbox";
import { WorkManagementDomainError } from "../errors/codes";

const clone = (message: WorkManagementOutboxMessage): WorkManagementOutboxMessage =>
  structuredClone(message);

export type CommittedOutboxBatchToken = Readonly<{
  storeId: symbol;
  batchId: string;
}>;

export class InMemoryWorkManagementOutbox {
  private readonly committed: WorkManagementOutboxMessage[] = [];
  private readonly storeId = Symbol("outbox-store");
  private readonly committedBatches = new Map<string, readonly string[]>();
  private nextBatch = 1;
  failNextCommit = false;
  private sealedBatchCount = 0;

  commitBatch(messages: readonly WorkManagementOutboxMessage[]): CommittedOutboxBatchToken {
    if (this.failNextCommit) {
      this.failNextCommit = false;
      throw new WorkManagementDomainError("TASK_OUTBOX_PUBLICATION_FAILED");
    }
    validateWorkManagementOutboxBatch(messages);
    const ids = new Set(this.committed.map((message) => message.id));
    for (const message of messages) {
      if (ids.has(message.id)) {
        throw new WorkManagementDomainError("TASK_OUTBOX_MESSAGE_DUPLICATE");
      }
      ids.add(message.id);
    }
    const batchId = `outbox-batch-${this.nextBatch++}`;
    const idsInBatch = messages.map((message) => message.id);
    this.committed.push(...messages.map(clone));
    this.committedBatches.set(batchId, idsInBatch);
    return { storeId: this.storeId, batchId };
  }

  rollbackCommittedBatch(token: CommittedOutboxBatchToken): void {
    if (token.storeId !== this.storeId) {
      throw new WorkManagementDomainError("TASK_OUTBOX_BATCH_ROLLBACK_INVALID");
    }
    const ids = this.committedBatches.get(token.batchId);
    if (!ids) {
      throw new WorkManagementDomainError("TASK_OUTBOX_BATCH_ROLLBACK_INVALID");
    }
    const target = new Set(ids);
    this.committed.splice(0, this.committed.length, ...this.committed.filter((message) => !target.has(message.id)));
    this.committedBatches.delete(token.batchId);
  }

  sealCommittedBatch(token: CommittedOutboxBatchToken): void {
    if (token.storeId !== this.storeId || !this.committedBatches.has(token.batchId)) {
      throw new WorkManagementDomainError("TASK_OUTBOX_BATCH_ROLLBACK_INVALID");
    }
    this.committedBatches.delete(token.batchId);
    this.sealedBatchCount += 1;
  }

  /** Test-only observability for proving that sealed rollback metadata does not grow. */
  getOpenCommittedBatchCount(): number { return this.committedBatches.size; }
  getSealedBatchCount(): number { return this.sealedBatchCount; }

  readCommitted(): readonly WorkManagementOutboxMessage[] {
    return this.committed.map(clone);
  }
}
