import {
  type WorkManagementOutboxMessage,
  validateWorkManagementOutboxBatch,
} from "../application/core-task-outbox";
import { WorkManagementDomainError } from "../errors/codes";
import {
  type CommittedOutboxBatchToken,
  InMemoryWorkManagementOutbox,
} from "./in-memory-outbox";

export class InMemoryOutboxTransactionStage {
  private staged: WorkManagementOutboxMessage[] = [];
  private state: "OPEN" | "PUBLISHED" | "DISCARDED" = "OPEN";
  constructor(private readonly outbox: InMemoryWorkManagementOutbox) {}
  stage(messages: readonly WorkManagementOutboxMessage[]): void {
    if (this.state !== "OPEN") throw new WorkManagementDomainError("TASK_OUTBOX_STAGE_CLOSED");
    validateWorkManagementOutboxBatch(messages);
    this.staged.push(...structuredClone(messages));
  }
  publish(): CommittedOutboxBatchToken {
    if (this.state !== "OPEN") throw new WorkManagementDomainError("TASK_OUTBOX_STAGE_CLOSED");
    const token = this.outbox.commitBatch(this.staged);
    this.state = "PUBLISHED";
    return token;
  }
  discard(): void {
    if (this.state !== "OPEN") throw new WorkManagementDomainError("TASK_OUTBOX_STAGE_CLOSED");
    this.staged = [];
    this.state = "DISCARDED";
  }
}
