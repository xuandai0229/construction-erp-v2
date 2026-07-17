import assert from "node:assert/strict";
import test from "node:test";
import { CoreTaskExecutor, type CoreTaskAggregate, type WorkManagementActorContext } from "../application/core-task-executor";
import { canonicalIdempotencyFingerprint, type IdempotencyRequest } from "../application/core-task-idempotency";
import { resolveTransitionPolicy } from "../domain/transition-policies";
import { WorkManagementDomainError } from "../errors/codes";
import { InMemoryIdempotencyStore } from "../infrastructure/in-memory-idempotency";
import { InMemoryWorkManagementOutbox } from "../infrastructure/in-memory-outbox";
import { InMemoryCoreTaskUnitOfWork } from "../infrastructure/in-memory-core-task-unit-of-work";
import type { WorkManagementActorRelation } from "../application/actor-policy";
import type { WorkManagementPermission, WorkManagementScope } from "../permissions/contract";

const now = new Date("2026-07-17T08:00:00.000Z");
const task = (patch: Partial<CoreTaskAggregate> = {}): CoreTaskAggregate => ({
  id: "task-1", creatorId: "creator", assignedById: "creator", primaryAssigneeId: "assignee-a", projectId: "project-1", confidentiality: "NORMAL", requiresIndependentReviewer: false, reviewerId: null, approverId: "approver", participants: [],
  state: { lifecycle: "IN_PROGRESS", acceptance: "ACCEPTED", execution: "ACTIVE", review: "NOT_SUBMITTED", handover: "NONE", waitingReason: null }, deadlineAt: new Date("2026-07-25T00:00:00.000Z"), progressPercent: 100, version: 3, activeBlockerId: null,
  submissions: [], reviewDecisions: [], completionHistory: [], archiveHistory: [], restoreHistory: [], reopenHistory: [], cancellationHistory: [], activeArchiveId: null, archiveGeneration: 0, preArchiveStateSnapshot: null, handoverGeneration: 0, activeHandoverId: null, activeHandoverReceiverId: null, handoverRequests: [], handoverDecisions: [], handoverExecutions: [], ...patch, assignmentHistory: patch.assignmentHistory ?? [],
});
const actor = (actorId: string, permission: WorkManagementPermission, options: { type?: "USER" | "SYSTEM"; scopes?: readonly WorkManagementScope[] } = {}): WorkManagementActorContext => ({ actorType: options.type ?? "USER", actorId, companyId: null, permissionSet: new Set([permission]), resolvedScopes: options.scopes ?? ["OWN"], correlationId: "correlation", causationId: "cause", requestId: "request" });

class Transaction extends InMemoryCoreTaskUnitOfWork {
  get failStage(): boolean { return this.failEffectStage; }
  set failStage(value: boolean) { this.failEffectStage = value; }
  get failFinalCommit(): boolean { return this.failFinalization; }
  set failFinalCommit(value: boolean) { this.failFinalization = value; }
  get failIdempotencyFinalization(): boolean { return this.failIdempotencyPublication; }
  set failIdempotencyFinalization(value: boolean) { this.failIdempotencyPublication = value; }
  get beforeFinalCommit(): (() => Promise<void>) | null { return this.beforeFinalization; }
  set beforeFinalCommit(value: (() => Promise<void>) | null) { this.beforeFinalization = value; }
}

type Fixture = { executor: CoreTaskExecutor; store: InMemoryIdempotencyStore; tasks: Map<string, CoreTaskAggregate>; transaction: Transaction; outbox: InMemoryWorkManagementOutbox; ids: () => number };
const fixture = (current: CoreTaskAggregate | null, relations: readonly WorkManagementActorRelation[], sharedOutbox?: InMemoryWorkManagementOutbox): Fixture => {
  const tasks = new Map<string, CoreTaskAggregate>(); if (current) tasks.set(current.id, structuredClone(current));
  const store = new InMemoryIdempotencyStore(); const outbox = sharedOutbox ?? new InMemoryWorkManagementOutbox(); const transaction = new Transaction(tasks, store, outbox); let ids = 0;
  return {
    executor: new CoreTaskExecutor({
      tasks: { findById: async (id) => structuredClone(tasks.get(id) ?? null) },
      users: { evaluateAssignee: async () => ({ eligible: true, projectAccess: true }) },
      scopes: { resolve: async () => ({ scopes: ["OWN", "PARTICIPATING", "PROJECT", "HANDOVER_SCOPE"], relations, confidentialAllowed: true }), resolveCreate: async () => ({ projectExists: true, projectAccessible: true, scopes: ["OWN"], confidentialAllowed: true }) },
      unitOfWork: transaction, idempotency: store, clock: { now: () => now }, idGenerator: { next: () => `generated-${++ids}` }, transitionPolicies: { resolve: resolveTransitionPolicy }, completionReadiness: { evaluate: async () => ({ ready: true }) },
    }), store, tasks, transaction, outbox, ids: () => ids,
  };
};

const scenarios = [
  { name: "Slice A CREATE_DRAFT", action: "CREATE_DRAFT" as const, current: null, relation: [] as readonly WorkManagementActorRelation[], principal: actor("creator", "task.create.personal"), command: { title: "Draft A" }, changed: { title: "Draft B" } },
  { name: "Slice A ASSIGN", action: "ASSIGN" as const, current: task({ primaryAssigneeId: null, assignedById: null, state: { lifecycle: "DRAFT", acceptance: "NOT_REQUIRED", execution: "ACTIVE", review: "NOT_SUBMITTED", handover: "NONE", waitingReason: null } }), relation: ["CREATOR"] as readonly WorkManagementActorRelation[], principal: actor("creator", "task.update.assignee"), command: { taskId: "task-1", primaryAssigneeId: "assignee-b", expectedVersion: 3, reason: "assign" }, changed: { taskId: "task-1", primaryAssigneeId: "assignee-c", expectedVersion: 3, reason: "assign" } },
  { name: "Slice B1 CONFIRM_COMPLETION", action: "CONFIRM_COMPLETION" as const, current: task({ state: { lifecycle: "SUBMITTED", acceptance: "ACCEPTED", execution: "ACTIVE", review: "RESULT_APPROVED", handover: "NONE", waitingReason: null }, currentSubmissionId: "submission-1", currentSubmissionSequence: 1, submissions: [{ id: "submission-1", taskId: "task-1", sequence: 1, previousSubmissionId: null, submittedById: "assignee-a", submittedAt: now, summary: "complete", note: null }], reviewDecisions: [{ id: "decision-1", submissionId: "submission-1", decision: "RESULT_APPROVED", reason: null, decidedById: "approver", decidedAt: now }] }), relation: ["APPROVER"] as readonly WorkManagementActorRelation[], principal: actor("approver", "task.complete", { scopes: ["PARTICIPATING"] }), command: { taskId: "task-1", expectedVersion: 3 }, changed: { taskId: "task-1", expectedVersion: 4 } },
  { name: "Slice B2 ARCHIVE", action: "ARCHIVE" as const, current: task({ state: { lifecycle: "CANCELLED", acceptance: "ACCEPTED", execution: "ACTIVE", review: "NOT_SUBMITTED", handover: "NONE", waitingReason: null } }), relation: ["CREATOR"] as readonly WorkManagementActorRelation[], principal: actor("creator", "task.archive"), command: { taskId: "task-1", expectedVersion: 3 }, changed: { taskId: "task-1", expectedVersion: 4 } },
  { name: "Slice C EXECUTE_HANDOVER", action: "EXECUTE_HANDOVER" as const, current: task({ state: { lifecycle: "IN_PROGRESS", acceptance: "ACCEPTED", execution: "ACTIVE", review: "NOT_SUBMITTED", handover: "APPROVED", waitingReason: null }, handoverGeneration: 1, activeHandoverId: "handover-1", activeHandoverReceiverId: "assignee-b", handoverRequests: [{ id: "handover-1", taskId: "task-1", generation: 1, fromAssigneeId: "assignee-a", toAssigneeId: "assignee-b", requestedById: "assignee-a", requestedAt: now, reason: "handover", scope: "HANDOVER_SCOPE", aggregateVersion: 4 }], handoverDecisions: [{ id: "decision-1", taskId: "task-1", handoverId: "handover-1", generation: 1, decision: "ACCEPTED", reason: null, decidedById: "assignee-b", decidedAt: now, aggregateVersion: 5 }, { id: "decision-2", taskId: "task-1", handoverId: "handover-1", generation: 1, decision: "APPROVED", reason: null, decidedById: "creator", decidedAt: now, aggregateVersion: 6 }] }), relation: [] as readonly WorkManagementActorRelation[], principal: actor("system", "task.handover.execute", { type: "SYSTEM", scopes: [] }), command: { taskId: "task-1", handoverId: "handover-1", expectedVersion: 3 }, changed: { taskId: "task-1", handoverId: "handover-1", expectedVersion: 4 } },
] as const;

const requestFor = (scenario: (typeof scenarios)[number], command: Record<string, unknown>, key: string): IdempotencyRequest => {
  const taskId = typeof command.taskId === "string" ? command.taskId : null;
  const projectId = typeof command.projectId === "string" ? command.projectId : null;
  return { action: scenario.action, key, actorId: scenario.principal.actorId, companyId: scenario.principal.companyId, taskId, projectId, fingerprint: canonicalIdempotencyFingerprint({ action: scenario.action, command, actorId: scenario.principal.actorId, companyId: scenario.principal.companyId, taskId, projectId }) };
};

test("concrete store integrates replay and canonical command conflicts across Slice A, B1, B2, and C", async (t) => {
  for (const scenario of scenarios) await t.test(`${scenario.name} replay and conflict`, async () => {
    const run = fixture(scenario.current, scenario.relation);
    const key = `${scenario.action}-key`;
    const first = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key });
    const tasksAfterFirst = structuredClone([...run.tasks.entries()]);
    const outboxAfterFirst = run.outbox.readCommitted();
    assert.ok(outboxAfterFirst.length > 0);
    const replay = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key });
    assert.deepEqual(replay, first); assert.deepEqual([...run.tasks.entries()], tasksAfterFirst); assert.deepEqual(run.outbox.readCommitted(), outboxAfterFirst); assert.equal(run.transaction.runs, 1);
    await assert.rejects(() => run.executor.execute({ action: scenario.action, rawCommand: scenario.changed, actor: scenario.principal, idempotencyKey: key }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_IDEMPOTENCY_CONFLICT");
    assert.deepEqual([...run.tasks.entries()], tasksAfterFirst); assert.equal(run.transaction.runs, 1);
  });
});

test("transaction failure aborts reservations so every slice can retry with the same key", async (t) => {
  for (const scenario of scenarios) await t.test(`${scenario.name} abort then retry`, async () => {
    const run = fixture(scenario.current, scenario.relation);
    const key = `${scenario.action}-abort`;
    run.transaction.failStage = true;
    await assert.rejects(() => run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key }));
    const request = requestFor(scenario, scenario.command, key);
    assert.deepEqual(await run.store.inspect(request), { status: "PROCEED" });
    run.transaction.failStage = false;
    const success = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key });
    const replay = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key });
    assert.deepEqual(replay, success);
  });
});

test("post-complete commit failure leaves no replay record and permits retry", async () => {
  const scenario = scenarios[0];
  const run = fixture(scenario.current, scenario.relation);
  const key = "post-complete-final-commit-failure";
  run.transaction.failFinalCommit = true;
  await assert.rejects(() => run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_CONCURRENCY_CONFLICT");
  assert.equal(run.tasks.size, 0); assert.equal(run.transaction.effects.length, 0);
  run.transaction.failFinalCommit = false;
  const retry = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key });
  const replay = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key });
  assert.deepEqual(replay, retry); assert.equal(run.transaction.runs, 2); assert.equal(run.tasks.size, 1); assert.equal(run.ids(), 2);
});

test("staged completion remains IN_PROGRESS until final commit", async () => {
  const scenario = scenarios[0];
  const run = fixture(scenario.current, scenario.relation);
  const key = "staged-before-commit";
  run.transaction.beforeFinalCommit = async () => {
    assert.deepEqual(run.outbox.readCommitted(), []);
    await assert.rejects(
      () => run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key }),
      (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_IDEMPOTENCY_IN_PROGRESS",
    );
  };
  const success = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key });
  const replay = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key });
  assert.deepEqual(replay, success);
});

test("four slices discard staged completion on final commit failure, retry once, and replay", async (t) => {
  for (const scenario of scenarios) await t.test(`${scenario.name} post-complete rollback`, async () => {
    const run = fixture(scenario.current, scenario.relation);
    const original = structuredClone(scenario.current);
    const key = `${scenario.action}-post-complete`;
    run.transaction.failFinalCommit = true;
    await assert.rejects(() => run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_CONCURRENCY_CONFLICT");
    assert.equal(run.transaction.effects.length, 0);
    if (original) assert.deepEqual(run.tasks.get(original.id), original);
    else assert.equal(run.tasks.size, 0);
    run.transaction.failFinalCommit = false;
    const committed = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key });
    const replay = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key });
    assert.deepEqual(replay, committed); assert.equal(run.transaction.runs, 2); assert.equal(run.transaction.effects.length, 1);
    if (scenario.action === "CREATE_DRAFT") assert.equal(run.tasks.size, 1);
    if (scenario.action === "ASSIGN") assert.equal(committed.task.assignmentHistory.length, 1);
    if (scenario.action === "CONFIRM_COMPLETION") assert.equal(committed.task.state.lifecycle, "COMPLETED");
    if (scenario.action === "ARCHIVE") assert.equal(committed.task.state.lifecycle, "ARCHIVED");
    if (scenario.action === "EXECUTE_HANDOVER") assert.equal(committed.task.primaryAssigneeId, "assignee-b");
  });
});

test("ASSIGN post-complete rollback preserves assignment history then retry appends once and replay appends nothing", async () => {
  const scenario = scenarios[1];
  const original = structuredClone(scenario.current);
  const run = fixture(scenario.current, scenario.relation);
  const key = "assign-history-finalization";
  run.transaction.failFinalCommit = true;
  await assert.rejects(() => run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key }));
  assert.deepEqual(run.tasks.get("task-1")?.assignmentHistory, original?.assignmentHistory);
  run.transaction.failFinalCommit = false;
  const retry = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key });
  const idCount = run.ids();
  const replay = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key });
  assert.equal(retry.task.assignmentHistory.length, (original?.assignmentHistory.length ?? 0) + 1);
  assert.equal(replay.task.assignmentHistory.length, retry.task.assignmentHistory.length);
  assert.equal(run.ids(), idCount);
  assert.equal(run.transaction.effects.length, 1);
});

test("EXECUTE_HANDOVER post-complete rollback preserves assignment history then retry appends once and replay appends nothing", async () => {
  const scenario = scenarios[4];
  const original = structuredClone(scenario.current);
  const run = fixture(scenario.current, scenario.relation);
  const key = "handover-history-finalization";
  run.transaction.failFinalCommit = true;
  await assert.rejects(() => run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key }));
  assert.equal(run.tasks.get("task-1")?.primaryAssigneeId, "assignee-a");
  assert.deepEqual(run.tasks.get("task-1")?.assignmentHistory, original?.assignmentHistory);
  assert.equal(run.tasks.get("task-1")?.activeHandoverId, "handover-1");
  assert.equal(run.transaction.effects.length, 0);
  run.transaction.failFinalCommit = false;
  const retry = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key });
  const idCount = run.ids();
  const replay = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key });
  assert.equal(retry.task.assignmentHistory.length, (original?.assignmentHistory.length ?? 0) + 1);
  assert.equal(retry.task.assignmentHistory[0]?.previousAssigneeId, "assignee-a");
  assert.equal(retry.task.assignmentHistory[0]?.newAssigneeId, "assignee-b");
  assert.equal(replay.task.assignmentHistory.length, retry.task.assignmentHistory.length);
  assert.equal(run.ids(), idCount);
  assert.equal(run.transaction.effects.length, 1);
});

test("idempotency finalization failure rolls back aggregate and effects", async () => {
  const scenario = scenarios[2];
  const run = fixture(scenario.current, scenario.relation);
  const original = structuredClone(scenario.current);
  run.transaction.failIdempotencyFinalization = true;
  await assert.rejects(() => run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: "finalization-failure" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_IDEMPOTENCY_PUBLICATION_FAILED");
  assert.deepEqual(run.tasks.get("task-1"), original); assert.equal(run.transaction.effects.length, 0); assert.deepEqual(run.outbox.readCommitted(), []);
  run.transaction.failIdempotencyFinalization = false;
  await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: "finalization-failure" });
  assert.equal(run.transaction.effects.length, 1);
});

test("outbox publication failure rolls back aggregate effects and idempotency completion, then permits one retry and replay", async () => {
  const scenario = scenarios[0]; const run = fixture(scenario.current, scenario.relation); const key = "outbox-publication-failure";
  run.outbox.failNextCommit = true;
  await assert.rejects(() => run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_OUTBOX_PUBLICATION_FAILED");
  assert.equal(run.tasks.size, 0); assert.equal(run.transaction.effects.length, 0); assert.deepEqual(run.outbox.readCommitted(), []);
  const retry = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key });
  const committed = run.outbox.readCommitted(); const replay = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: key });
  assert.deepEqual(replay, retry); assert.deepEqual(run.outbox.readCommitted(), committed);
});

test("actual process-local Unit-of-Work composition seals outbox rollback metadata after success", async () => {
  const scenario = scenarios[0]; const run = fixture(scenario.current, scenario.relation);
  await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: "seal-after-success" });
  assert.ok(run.outbox.readCommitted().length > 0);
  assert.equal(run.outbox.getOpenCommittedBatchCount(), 0);
  assert.equal(run.outbox.getSealedBatchCount(), 1);
});

test("idempotency completion publication failure rolls back only its exact outbox batch and preserves unrelated committed messages", async () => {
  const first = fixture(scenarios[0].current, scenarios[0].relation);
  await first.executor.execute({ action: scenarios[0].action, rawCommand: scenarios[0].command, actor: scenarios[0].principal, idempotencyKey: "unrelated-batch" });
  const unrelated = first.outbox.readCommitted();
  const scenario = scenarios[2]; const run = fixture(scenario.current, scenario.relation, first.outbox);
  run.transaction.failIdempotencyFinalization = true;
  await assert.rejects(() => run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: "completion-publication-failure" }));
  assert.deepEqual(first.outbox.readCommitted(), unrelated); assert.deepEqual(run.tasks.get("task-1"), scenario.current); assert.equal(run.transaction.effects.length, 0);
  run.transaction.failIdempotencyFinalization = false;
  const retry = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: "completion-publication-failure" });
  const afterRetry = first.outbox.readCommitted(); const replay = await run.executor.execute({ action: scenario.action, rawCommand: scenario.command, actor: scenario.principal, idempotencyKey: "completion-publication-failure" });
  assert.deepEqual(replay, retry); assert.deepEqual(first.outbox.readCommitted(), afterRetry);
});
