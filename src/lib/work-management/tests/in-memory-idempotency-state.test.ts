import assert from "node:assert/strict";
import test from "node:test";
import { emptyCoreTaskEffects } from "../application/core-task-effects";
import type { CoreTaskAggregate } from "../application/core-task-executor";
import type { IdempotencyRequest, StableCoreTaskExecutionResult } from "../application/core-task-idempotency";
import { WorkManagementDomainError } from "../errors/codes";
import { InMemoryIdempotencyStore } from "../infrastructure/in-memory-idempotency";

const identity = (patch: Partial<IdempotencyRequest> = {}): IdempotencyRequest => ({
  action: "START", key: "same-key", fingerprint: "fingerprint-a", actorId: "actor-a",
  companyId: null, taskId: "task-a", projectId: "project-a", ...patch,
});

const result = (): StableCoreTaskExecutionResult => ({
  task: {
    id: "task-a", creatorId: "actor-a", assignedById: "actor-a", primaryAssigneeId: "actor-a",
    projectId: "project-a", confidentiality: "NORMAL", requiresIndependentReviewer: false,
    reviewerId: null, approverId: null, participants: [],
    state: { lifecycle: "IN_PROGRESS", acceptance: "ACCEPTED", execution: "ACTIVE", review: "NOT_SUBMITTED", handover: "NONE", waitingReason: null },
    deadlineAt: new Date("2026-07-20T00:00:00.000Z"), progressPercent: 20, version: 3,
    activeBlockerId: null, submissions: [], reviewDecisions: [], completionHistory: [], archiveHistory: [],
    restoreHistory: [], reopenHistory: [], cancellationHistory: [], activeArchiveId: null, archiveGeneration: 0,
    preArchiveStateSnapshot: null, handoverGeneration: 0, activeHandoverId: null,
    activeHandoverReceiverId: null, handoverRequests: [], handoverDecisions: [], handoverExecutions: [], assignmentHistory: [],
  } satisfies CoreTaskAggregate,
  effects: emptyCoreTaskEffects(),
});

const rejectsCode = async (operation: () => Promise<unknown>, code: string): Promise<void> => {
  await assert.rejects(operation, (error: unknown) => error instanceof WorkManagementDomainError && error.code === code);
};

test("empty inspect returns PROCEED without reservation", async () => {
  const store = new InMemoryIdempotencyStore();
  assert.deepEqual(await store.inspect(identity()), { status: "PROCEED" });
  assert.deepEqual(await store.inspect(identity()), { status: "PROCEED" });
});

test("successful lifecycle reserves, completes, and replays the exact identity", async () => {
  const store = new InMemoryIdempotencyStore();
  const request = identity();
  await store.begin(request);
  assert.deepEqual(await store.inspect(request), { status: "IN_PROGRESS" });
  const stored = result();
  await store.complete(request, stored);
  const inspection = await store.inspect(request);
  assert.equal(inspection.status, "REPLAY");
  if (inspection.status !== "REPLAY") throw new Error("expected replay");
  assert.deepEqual(inspection.identity, request);
  assert.deepEqual(inspection.result, stored);
  await rejectsCode(() => store.begin(request), "TASK_IDEMPOTENCY_CONFLICT");
  await rejectsCode(() => store.complete(request, stored), "TASK_IDEMPOTENCY_ALREADY_COMPLETED");
});

test("abort releases only a matching in-progress reservation and permits retry", async () => {
  const store = new InMemoryIdempotencyStore();
  const request = identity();
  await store.begin(request);
  await rejectsCode(() => store.abort(identity({ actorId: "actor-b" }), "denied"), "TASK_IDEMPOTENCY_CONFLICT");
  assert.deepEqual(await store.inspect(request), { status: "IN_PROGRESS" });
  await store.abort(request, "transaction failed");
  assert.deepEqual(await store.inspect(request), { status: "PROCEED" });
  await store.abort(request, "duplicate abort is a no-op");
  await store.begin(request);
  await store.complete(request, result());
  await store.abort(request, "completed results remain immutable");
  assert.equal((await store.inspect(request)).status, "REPLAY");
});

test("complete requires the exact in-progress reservation owner", async () => {
  const store = new InMemoryIdempotencyStore();
  const request = identity();
  await rejectsCode(() => store.complete(request, result()), "TASK_IDEMPOTENCY_RESERVATION_REQUIRED");
  await store.begin(request);
  await rejectsCode(() => store.complete(identity({ taskId: "task-b" }), result()), "TASK_IDEMPOTENCY_CONFLICT");
  assert.deepEqual(await store.inspect(request), { status: "IN_PROGRESS" });
});
