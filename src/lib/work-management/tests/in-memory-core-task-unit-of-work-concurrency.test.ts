import assert from "node:assert/strict";
import test from "node:test";
import { CoreTaskExecutor, type CoreTaskAggregate, type WorkManagementActorContext } from "../application/core-task-executor";
import type { StableCoreTaskExecutionResult } from "../application/core-task-idempotency";
import { resolveTransitionPolicy } from "../domain/transition-policies";
import { WorkManagementDomainError } from "../errors/codes";
import { InMemoryCoreTaskUnitOfWork } from "../infrastructure/in-memory-core-task-unit-of-work";
import { InMemoryIdempotencyStore } from "../infrastructure/in-memory-idempotency";
import { InMemoryWorkManagementOutbox } from "../infrastructure/in-memory-outbox";
import type { WorkManagementPermission, WorkManagementScope } from "../permissions/contract";

const now = new Date("2026-07-17T08:00:00.000Z");
const task = (patch: Partial<CoreTaskAggregate> = {}): CoreTaskAggregate => ({
  id: "task-1", creatorId: "creator", assignedById: null, primaryAssigneeId: null, projectId: "project-1", confidentiality: "NORMAL", requiresIndependentReviewer: false, reviewerId: null, approverId: "approver", participants: [],
  state: { lifecycle: "DRAFT", acceptance: "NOT_REQUIRED", execution: "ACTIVE", review: "NOT_SUBMITTED", handover: "NONE", waitingReason: null }, deadlineAt: new Date("2026-07-25T00:00:00.000Z"), progressPercent: 100, version: 3, activeBlockerId: null,
  submissions: [], reviewDecisions: [], completionHistory: [], archiveHistory: [], restoreHistory: [], reopenHistory: [], cancellationHistory: [], activeArchiveId: null, archiveGeneration: 0, preArchiveStateSnapshot: null, handoverGeneration: 0, activeHandoverId: null, activeHandoverReceiverId: null, handoverRequests: [], handoverDecisions: [], handoverExecutions: [], ...patch, assignmentHistory: patch.assignmentHistory ?? [],
});
const actor = (actorId: string, permission: WorkManagementPermission, scopes: readonly WorkManagementScope[] = ["OWN"]): WorkManagementActorContext => ({ actorType: "USER", actorId, companyId: null, permissionSet: new Set([permission]), resolvedScopes: scopes, correlationId: "correlation", causationId: "cause", requestId: "request" });
const deferred = (): { promise: Promise<void>; resolve(): void } => { let resolve = () => {}; const promise = new Promise<void>((done) => { resolve = done; }); return { promise, resolve }; };
const isDomainError = (error: unknown, code: string): boolean => error instanceof WorkManagementDomainError && error.code === code;

type Fixture = { tasks: Map<string, CoreTaskAggregate>; store: InMemoryIdempotencyStore; outbox: InMemoryWorkManagementOutbox; uow: InMemoryCoreTaskUnitOfWork; executor: CoreTaskExecutor };
const fixture = (seed: readonly CoreTaskAggregate[], id = (() => { let value = 0; return () => `generated-${++value}`; })()): Fixture => {
  const tasks = new Map(seed.map((value) => [value.id, structuredClone(value)]));
  const store = new InMemoryIdempotencyStore(); const outbox = new InMemoryWorkManagementOutbox(); const uow = new InMemoryCoreTaskUnitOfWork(tasks, store, outbox);
  const executor = new CoreTaskExecutor({
    tasks: { findById: async (taskId) => structuredClone(tasks.get(taskId) ?? null) },
    users: { evaluateAssignee: async () => ({ eligible: true, projectAccess: true }) },
    scopes: { resolve: async () => ({ scopes: ["OWN", "PARTICIPATING", "PROJECT", "HANDOVER_SCOPE"], relations: ["CREATOR"], confidentialAllowed: true }), resolveCreate: async () => ({ projectExists: true, projectAccessible: true, scopes: ["OWN"], confidentialAllowed: true }) },
    unitOfWork: uow, idempotency: store, clock: { now: () => now }, idGenerator: { next: id }, transitionPolicies: { resolve: resolveTransitionPolicy }, completionReadiness: { evaluate: async () => ({ ready: true }) },
  });
  return { tasks, store, outbox, uow, executor };
};
const assign = (run: Fixture, taskId: string, assignee: string, key: string) => run.executor.execute({ action: "ASSIGN", rawCommand: { taskId, primaryAssigneeId: assignee, expectedVersion: 3, reason: "assignment" }, actor: actor("creator", "task.update.assignee"), idempotencyKey: key });

test("actual Unit of Work commits one of two overlapping writers from the same task version", async () => {
  const run = fixture([task()]); const reached = deferred(); const release = deferred(); let staged = 0;
  run.uow.afterStagingBeforeFinalization = async () => { staged += 1; if (staged === 2) reached.resolve(); await release.promise; };
  const first = assign(run, "task-1", "assignee-b", "writer-b"); const second = assign(run, "task-1", "assignee-c", "writer-c");
  await reached.promise;
  assert.equal(staged, 2); assert.equal(run.tasks.get("task-1")?.version, 3); assert.equal(run.uow.effects.length, 0); assert.deepEqual(run.outbox.readCommitted(), []);
  assert.equal(run.store.getRecordState("writer-b"), "IN_PROGRESS"); assert.equal(run.store.getRecordState("writer-c"), "IN_PROGRESS");
  release.resolve(); const results = await Promise.allSettled([first, second]);
  const fulfilled = results.filter((result): result is PromiseFulfilledResult<StableCoreTaskExecutionResult> => result.status === "fulfilled");
  const rejected = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
  assert.equal(fulfilled.length, 1); assert.equal(rejected.length, 1); assert.ok(isDomainError(rejected[0]?.reason, "TASK_CONCURRENCY_CONFLICT"));
  const winner = fulfilled[0]?.value.task; assert.ok(winner); const winnerKey = winner.primaryAssigneeId === "assignee-b" ? "writer-b" : "writer-c"; const loserKey = winnerKey === "writer-b" ? "writer-c" : "writer-b";
  assert.equal(winner.version, 4); assert.equal(winner.assignmentHistory.length, 1); assert.equal(run.uow.effects.length, 1); assert.equal(run.store.getRecordState(winnerKey), "COMPLETED"); assert.equal(run.store.getRecordState(loserKey), null);
  const messages = run.outbox.readCommitted(); assert.ok(messages.length > 0); assert.ok(messages.every((message) => message.aggregateId === "task-1" && message.action === "ASSIGN" && message.idempotencyKey === winnerKey && message.actorId === "creator"));
  assert.ok(messages.some((message) => JSON.stringify(message.payload).includes(winner.primaryAssigneeId ?? "")));
});

test("two overlapping CREATE_DRAFT operations for the same task ID commit only once", async () => {
  const run = fixture([], () => "same-task-id"); const reached = deferred(); const release = deferred(); let staged = 0;
  run.uow.afterStagingBeforeFinalization = async () => { staged += 1; if (staged === 2) reached.resolve(); await release.promise; };
  const one = run.executor.execute({ action: "CREATE_DRAFT", rawCommand: { title: "Draft A", projectId: "project-1" }, actor: actor("creator", "task.create.personal"), idempotencyKey: "create-a" });
  const two = run.executor.execute({ action: "CREATE_DRAFT", rawCommand: { title: "Draft B", projectId: "project-1" }, actor: actor("creator", "task.create.personal"), idempotencyKey: "create-b" });
  await reached.promise; assert.equal(staged, 2); assert.equal(run.tasks.size, 0); assert.equal(run.uow.effects.length, 0); assert.deepEqual(run.outbox.readCommitted(), []); release.resolve();
  const results = await Promise.allSettled([one, two]); const success = results.find((result): result is PromiseFulfilledResult<StableCoreTaskExecutionResult> => result.status === "fulfilled"); const failure = results.find((result): result is PromiseRejectedResult => result.status === "rejected");
  assert.ok(success); assert.ok(failure); assert.ok(isDomainError(failure.reason, "TASK_CONCURRENCY_CONFLICT")); const created = run.tasks.get("same-task-id"); assert.ok(created);
  const winnerKey = created.title === "Draft A" ? "create-a" : "create-b"; const loserKey = winnerKey === "create-a" ? "create-b" : "create-a";
  assert.equal(run.tasks.size, 1); assert.equal(run.uow.effects.length, 1); assert.equal(run.store.getRecordState(winnerKey), "COMPLETED"); assert.equal(run.store.getRecordState(loserKey), null);
  const messages = run.outbox.readCommitted(); assert.ok(messages.length > 0); assert.ok(messages.every((message) => message.aggregateId === "same-task-id" && message.action === "CREATE_DRAFT" && message.idempotencyKey === winnerKey && message.actorId === "creator"));
});

test("a staged failing transaction preserves an unrelated transaction committed before its finalization", async () => {
  const run = fixture([task({ id: "task-a" }), task({ id: "task-b" })]); const t1Staged = deferred(); const releaseT1 = deferred();
  run.uow.afterStagingBeforeFinalization = async (transactionId) => { if (transactionId === 1) { t1Staged.resolve(); await releaseT1.promise; } };
  const t1 = assign(run, "task-a", "assignee-a", "key-a"); await t1Staged.promise;
  const t2 = assign(run, "task-b", "assignee-b", "key-b"); await t2;
  const taskBBefore = structuredClone(run.tasks.get("task-b")); const effectsBefore = structuredClone(run.uow.effects); const outboxBefore = run.outbox.readCommitted(); assert.equal(run.store.getRecordState("key-b"), "COMPLETED");
  run.uow.failFinalization = true; releaseT1.resolve(); await assert.rejects(t1, (error: unknown) => isDomainError(error, "TASK_CONCURRENCY_CONFLICT"));
  assert.equal(run.tasks.get("task-a")?.version, 3); assert.equal(run.store.getRecordState("key-a"), null); assert.deepEqual(run.tasks.get("task-b"), taskBBefore); assert.deepEqual(run.uow.effects, effectsBefore); assert.deepEqual(run.outbox.readCommitted(), outboxBefore); assert.equal(run.store.getRecordState("key-b"), "COMPLETED");
});

test("stale finalization never restores an older task version over a committed writer", async () => {
  const run = fixture([task()]); const t1Staged = deferred(); const releaseT1 = deferred();
  run.uow.afterStagingBeforeFinalization = async (transactionId) => { if (transactionId === 1) { t1Staged.resolve(); await releaseT1.promise; } };
  const stale = assign(run, "task-1", "assignee-stale", "stale-key"); await t1Staged.promise;
  const winner = await assign(run, "task-1", "assignee-winner", "winner-key"); const stateAfterWinner = structuredClone(run.tasks.get("task-1")); const effectsAfterWinner = structuredClone(run.uow.effects); const outboxAfterWinner = run.outbox.readCommitted();
  releaseT1.resolve(); await assert.rejects(stale, (error: unknown) => isDomainError(error, "TASK_CONCURRENCY_CONFLICT"));
  assert.equal(winner.task.primaryAssigneeId, "assignee-winner"); assert.equal(run.tasks.get("task-1")?.version, 4); assert.deepEqual(run.tasks.get("task-1"), stateAfterWinner); assert.deepEqual(run.uow.effects, effectsAfterWinner); assert.deepEqual(run.outbox.readCommitted(), outboxAfterWinner); assert.equal(run.store.getRecordState("winner-key"), "COMPLETED"); assert.equal(run.store.getRecordState("stale-key"), null);
});

test("actual Unit of Work exposes only pre-commit or fully committed state", async () => {
  const run = fixture([task()]); const reached = deferred(); const release = deferred();
  run.uow.beforeVisibleCommit = async () => { reached.resolve(); await release.promise; };
  const execution = assign(run, "task-1", "assignee-b", "visibility-key"); await reached.promise;
  assert.equal(run.tasks.get("task-1")?.version, 3); assert.equal(run.uow.effects.length, 0); assert.deepEqual(run.outbox.readCommitted(), []); assert.equal(run.store.getRecordState("visibility-key"), "IN_PROGRESS");
  release.resolve(); await execution; assert.equal(run.tasks.get("task-1")?.version, 4); assert.equal(run.uow.effects.length, 1); assert.ok(run.outbox.readCommitted().length > 0); assert.equal(run.store.getRecordState("visibility-key"), "COMPLETED");
});

test("actual idempotency completion failure leaves all transaction resources unchanged", async () => {
  const run = fixture([task()]); run.uow.failIdempotencyPublication = true;
  await assert.rejects(assign(run, "task-1", "assignee-b", "publication-key"), (error: unknown) => isDomainError(error, "TASK_IDEMPOTENCY_PUBLICATION_FAILED"));
  assert.equal(run.tasks.get("task-1")?.version, 3); assert.equal(run.uow.effects.length, 0); assert.deepEqual(run.outbox.readCommitted(), []); assert.equal(run.store.getRecordState("publication-key"), null);
  const retry = await assign(run, "task-1", "assignee-b", "publication-key"); const messages = run.outbox.readCommitted(); const replay = await assign(run, "task-1", "assignee-b", "publication-key");
  assert.deepEqual(replay, retry); assert.deepEqual(run.outbox.readCommitted(), messages);
});

test("finalization mutex releases after validation and idempotency-publication failures", async () => {
  const run = fixture([task()]); run.uow.failFinalization = true;
  await assert.rejects(assign(run, "task-1", "assignee-b", "validation-key"), (error: unknown) => isDomainError(error, "TASK_CONCURRENCY_CONFLICT"));
  run.uow.failFinalization = false; run.uow.failIdempotencyPublication = true;
  await assert.rejects(assign(run, "task-1", "assignee-b", "publication-key"), (error: unknown) => isDomainError(error, "TASK_IDEMPOTENCY_PUBLICATION_FAILED"));
  const committed = await assign(run, "task-1", "assignee-c", "success-key"); assert.equal(committed.task.version, 4);
});

test("winner replay bypasses Unit of Work and deep-preserves committed resources", async () => {
  const run = fixture([task()]); const first = await assign(run, "task-1", "assignee-b", "replay-key"); const runs = run.uow.runs; const taskBefore = structuredClone(run.tasks.get("task-1")); const effectsBefore = structuredClone(run.uow.effects); const messagesBefore = run.outbox.readCommitted();
  const replay = await assign(run, "task-1", "assignee-b", "replay-key");
  assert.deepEqual(replay, first); assert.equal(run.uow.runs, runs); assert.deepEqual(run.tasks.get("task-1"), taskBefore); assert.deepEqual(run.uow.effects, effectsBefore); assert.deepEqual(run.outbox.readCommitted(), messagesBefore); assert.equal(run.store.getRecordState("replay-key"), "COMPLETED");
});
