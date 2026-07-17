import assert from "node:assert/strict";
import test from "node:test";
import { InMemoryWorkManagementOutbox } from "../infrastructure/in-memory-outbox";
import { InMemoryOutboxTransactionStage } from "../infrastructure/in-memory-outbox-transaction";
import type { WorkManagementOutboxMessage } from "../application/core-task-outbox";
import { WorkManagementDomainError } from "../errors/codes";

const message = (id = "m-1"): WorkManagementOutboxMessage => ({ id, messageType: "TEST", aggregateType: "CORE_TASK", aggregateId: "task-1", action: "ASSIGN", actorId: "actor", companyId: null, projectId: null, aggregateVersion: 1, sequence: 1, occurredAt: new Date(0), correlationId: "c", causationId: null, idempotencyKey: "k", payload: { nested: { value: 1 } } });

test("transaction-local outbox messages are not visible before final commit", () => { const outbox = new InMemoryWorkManagementOutbox(); const stage = new InMemoryOutboxTransactionStage(outbox); stage.stage([message()]); assert.deepEqual(outbox.readCommitted(), []); stage.publish(); assert.equal(outbox.readCommitted().length, 1); });
test("discarded transaction-local outbox stage publishes no messages", () => { const outbox = new InMemoryWorkManagementOutbox(); const failed = new InMemoryOutboxTransactionStage(outbox); failed.stage([message()]); failed.discard(); assert.deepEqual(outbox.readCommitted(), []); const retry = new InMemoryOutboxTransactionStage(outbox); retry.stage([message("m-2")]); retry.publish(); assert.equal(outbox.readCommitted().length, 1); });
test("outbox mapping staging and committed reads are isolated from caller mutation", () => { const outbox = new InMemoryWorkManagementOutbox(); const stage = new InMemoryOutboxTransactionStage(outbox); const input = message(); stage.stage([input]); (input.payload.nested as { value: number }).value = 2; stage.publish(); const read = outbox.readCommitted(); (read[0]?.payload.nested as { value: number }).value = 3; assert.equal(((outbox.readCommitted()[0]?.payload.nested) as { value: number }).value, 1); });

test("exact batch rollback removes only the owning transaction batch", () => {
  const outbox = new InMemoryWorkManagementOutbox();
  const first = new InMemoryOutboxTransactionStage(outbox); first.stage([message("batch-a")]); first.publish();
  const second = new InMemoryOutboxTransactionStage(outbox); second.stage([message("batch-b")]); const token = second.publish();
  outbox.rollbackCommittedBatch(token);
  assert.deepEqual(outbox.readCommitted().map((value) => value.id), ["batch-a"]);
  assert.throws(() => outbox.rollbackCommittedBatch(token), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_OUTBOX_BATCH_ROLLBACK_INVALID");
});

test("closed stage and duplicate committed message ids fail with stable outbox errors", () => {
  const outbox = new InMemoryWorkManagementOutbox(); const stage = new InMemoryOutboxTransactionStage(outbox); stage.stage([message()]); stage.publish();
  assert.throws(() => stage.stage([message("m-2")]), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_OUTBOX_STAGE_CLOSED");
  const duplicate = new InMemoryOutboxTransactionStage(outbox); duplicate.stage([message()]);
  assert.throws(() => duplicate.publish(), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_OUTBOX_MESSAGE_DUPLICATE");
});

test("successful Unit-of-Work finalization seals its outbox rollback token", () => {
  const outbox = new InMemoryWorkManagementOutbox();
  const first = new InMemoryOutboxTransactionStage(outbox); first.stage([message("sealed-a")]); const token = first.publish();
  const unrelated = new InMemoryOutboxTransactionStage(outbox); unrelated.stage([message("sealed-b")]); unrelated.publish();
  outbox.sealCommittedBatch(token);
  assert.deepEqual(outbox.readCommitted().map((value) => value.id), ["sealed-a", "sealed-b"]);
  assert.throws(() => outbox.rollbackCommittedBatch(token), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_OUTBOX_BATCH_ROLLBACK_INVALID");
  assert.deepEqual(outbox.readCommitted().map((value) => value.id), ["sealed-a", "sealed-b"]);
});

test("sealing releases rollback metadata after many successful batches", () => {
  const outbox = new InMemoryWorkManagementOutbox();
  for (let index = 0; index < 8; index += 1) {
    const stage = new InMemoryOutboxTransactionStage(outbox); stage.stage([message(`sealed-${index}`)]); outbox.sealCommittedBatch(stage.publish());
  }
  assert.equal(outbox.getOpenCommittedBatchCount(), 0);
  assert.equal(outbox.getSealedBatchCount(), 8);
  assert.equal(outbox.readCommitted().length, 8);
});
