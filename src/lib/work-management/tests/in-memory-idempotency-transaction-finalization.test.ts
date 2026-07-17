import assert from "node:assert/strict";
import test from "node:test";
import { emptyCoreTaskEffects } from "../application/core-task-effects";
import type { CoreTaskAggregate } from "../application/core-task-executor";
import type { IdempotencyRequest, StableCoreTaskExecutionResult } from "../application/core-task-idempotency";
import { InMemoryIdempotencyStore } from "../infrastructure/in-memory-idempotency";
import { InMemoryIdempotencyCompletionStage } from "../infrastructure/in-memory-idempotency-transaction";

const request = (key: string): IdempotencyRequest => ({ action: "START", key, fingerprint: `fingerprint-${key}`, actorId: "actor", companyId: null, taskId: "task", projectId: "project" });
const result = (id: string): StableCoreTaskExecutionResult => ({ task: { id, creatorId: "actor", assignedById: "actor", primaryAssigneeId: "actor", projectId: "project", confidentiality: "NORMAL", requiresIndependentReviewer: false, reviewerId: null, approverId: null, participants: [], state: { lifecycle: "IN_PROGRESS", acceptance: "ACCEPTED", execution: "ACTIVE", review: "NOT_SUBMITTED", handover: "NONE", waitingReason: null }, deadlineAt: null, progressPercent: 0, version: 1, activeBlockerId: null, assignmentHistory: [] } satisfies CoreTaskAggregate, effects: emptyCoreTaskEffects() });

test("completion staged not published remains IN_PROGRESS until final commit", async () => {
  const store = new InMemoryIdempotencyStore(); const identity = request("stage"); const stage = new InMemoryIdempotencyCompletionStage(store);
  await store.begin(identity); await stage.complete(identity, result("task-stage"));
  assert.deepEqual(await store.inspect(identity), { status: "IN_PROGRESS" });
  stage.discard(); await store.abort(identity, "rollback");
  assert.deepEqual(await store.inspect(identity), { status: "PROCEED" });
});

test("successful final commit publishes a completed replay record exactly once", async () => {
  const store = new InMemoryIdempotencyStore(); const identity = request("commit"); const stage = new InMemoryIdempotencyCompletionStage(store); const committed = result("task-commit");
  await store.begin(identity); await stage.complete(identity, committed); await stage.publish();
  const replay = await store.inspect(identity); assert.equal(replay.status, "REPLAY");
  await store.abort(identity, "must not remove committed record");
  assert.equal((await store.inspect(identity)).status, "REPLAY");
});

test("post-complete rollback does not alter unrelated completed records", async () => {
  const store = new InMemoryIdempotencyStore(); const completed = request("completed"); const pending = request("pending");
  await store.begin(completed); await store.complete(completed, result("task-completed"));
  const stage = new InMemoryIdempotencyCompletionStage(store); await store.begin(pending); await stage.complete(pending, result("task-pending"));
  stage.discard(); await store.abort(pending, "final commit failed");
  const replay = await store.inspect(completed); assert.equal(replay.status, "REPLAY");
  assert.deepEqual(await store.inspect(pending), { status: "PROCEED" });
});
