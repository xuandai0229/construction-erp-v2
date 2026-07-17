import assert from "node:assert/strict";
import test from "node:test";
import { emptyCoreTaskEffects } from "../application/core-task-effects";
import type { CoreTaskAggregate } from "../application/core-task-executor";
import type { IdempotencyRequest, StableCoreTaskExecutionResult } from "../application/core-task-idempotency";
import { InMemoryIdempotencyStore } from "../infrastructure/in-memory-idempotency";

const request = (): IdempotencyRequest => ({ action: "SUBMIT", key: "immutable", fingerprint: "fingerprint", actorId: "actor", companyId: null, taskId: "task", projectId: "project" });
const result = (): StableCoreTaskExecutionResult => ({
  task: { id: "task", creatorId: "actor", assignedById: "actor", primaryAssigneeId: "actor", projectId: "project", confidentiality: "NORMAL", requiresIndependentReviewer: false, reviewerId: null, approverId: null, participants: [], state: { lifecycle: "SUBMITTED", acceptance: "ACCEPTED", execution: "ACTIVE", review: "PENDING", handover: "NONE", waitingReason: null }, deadlineAt: new Date("2026-07-20T00:00:00.000Z"), progressPercent: 100, version: 4, activeBlockerId: null, submissions: [{ id: "submission", taskId: "task", sequence: 1, previousSubmissionId: null, submittedById: "actor", submittedAt: new Date("2026-07-16T00:00:00.000Z"), summary: "original", note: null }], reviewDecisions: [], completionHistory: [], archiveHistory: [], restoreHistory: [], reopenHistory: [], cancellationHistory: [], handoverRequests: [], handoverDecisions: [], handoverExecutions: [], assignmentHistory: [] } satisfies CoreTaskAggregate,
  effects: { ...emptyCoreTaskEffects(), submissionIntents: [{ submissionId: "submission", taskId: "task", sequence: 1, submittedById: "actor", submittedAt: new Date("2026-07-16T00:00:00.000Z"), summary: "original", note: null, previousSubmissionId: null, aggregateVersion: 4 }] },
});

test("store and replay use defensive clones for identity, dates, histories, and nested effects", async () => {
  const store = new InMemoryIdempotencyStore();
  const originalRequest = request();
  const originalResult = result();
  const snapshot = structuredClone(originalResult);
  await store.begin(originalRequest);
  originalRequest.actorId = "mutated-actor";
  await store.complete(request(), originalResult);
  originalResult.task.progressPercent = 0;
  if (originalResult.task.submissions?.[0]) originalResult.task.submissions[0].summary = "mutated";
  if (originalResult.effects.submissionIntents[0]) originalResult.effects.submissionIntents[0].summary = "mutated";
  const first = await store.inspect(request());
  assert.equal(first.status, "REPLAY");
  if (first.status !== "REPLAY") throw new Error("expected replay");
  assert.deepEqual(first.result, snapshot);
  first.identity.actorId = "mutated-replay-identity";
  first.result.task.progressPercent = 1;
  if (first.result.task.submissions?.[0]) first.result.task.submissions[0].summary = "mutated-replay-history";
  if (first.result.effects.submissionIntents[0]) first.result.effects.submissionIntents[0].summary = "mutated-replay-effect";
  const second = await store.inspect(request());
  assert.equal(second.status, "REPLAY");
  if (second.status !== "REPLAY") throw new Error("expected replay");
  assert.deepEqual(second.result, snapshot);
  assert.equal(second.identity.actorId, "actor");
  assert.notEqual(second.result.task, first.result.task);
  assert.notEqual(second.result.task.submissions, first.result.task.submissions);
  assert.notEqual(second.result.effects.submissionIntents, first.result.effects.submissionIntents);
});
