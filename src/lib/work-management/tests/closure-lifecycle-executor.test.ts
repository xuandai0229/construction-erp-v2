import assert from "node:assert/strict";
import test from "node:test";
import { CoreTaskExecutor, resolveCurrentArchiveRecord, type CoreTaskAggregate, type CoreTaskAction, type WorkManagementActorContext } from "../application/core-task-executor";
import type { CoreTaskEffects } from "../application/core-task-effects";
import type { CoreTaskTransactionContext, CoreTaskUnitOfWork } from "../application/core-task-ports";
import type { IdempotencyInspection, IdempotencyRequest, StableCoreTaskExecutionResult } from "../application/core-task-idempotency";
import { resolveTransitionPolicy } from "../domain/transition-policies";
import { WorkManagementDomainError } from "../errors/codes";
import type { WorkManagementPermission, WorkManagementScope } from "../permissions/contract";
import type { WorkManagementActorRelation } from "../application/actor-policy";

const now = new Date("2026-07-15T08:00:00.000Z");
const state = (patch: Partial<CoreTaskAggregate["state"]> = {}): CoreTaskAggregate["state"] => ({ lifecycle: "IN_PROGRESS", acceptance: "ACCEPTED", execution: "ACTIVE", review: "NOT_SUBMITTED", handover: "NONE", waitingReason: null, ...patch });
const actor = (id = "creator", permissionSet: readonly WorkManagementPermission[] = ["task.reopen", "task.cancel", "task.archive", "task.restore"]): WorkManagementActorContext => ({ actorType: "USER", actorId: id, companyId: null, permissionSet: new Set(permissionSet), resolvedScopes: ["OWN"], correlationId: "corr", causationId: "cause", requestId: "request" });
const task = (patch: Partial<CoreTaskAggregate> = {}): CoreTaskAggregate => ({ id: "task-1", creatorId: "creator", assignedById: "manager", primaryAssigneeId: "assignee", projectId: "project", confidentiality: "NORMAL", requiresIndependentReviewer: false, reviewerId: null, approverId: "approver", participants: [], state: state(), deadlineAt: new Date("2026-07-20"), progressPercent: 100, version: 3, activeBlockerId: null, submissions: [{ id: "submission-1", taskId: "task-1", sequence: 1, previousSubmissionId: null, submittedById: "assignee", submittedAt: now, summary: "result", note: null }], reviewDecisions: [{ id: "review-1", submissionId: "submission-1", decision: "RESULT_APPROVED", reason: null, decidedById: "approver", decidedAt: now }], currentSubmissionId: "submission-1", currentSubmissionSequence: 1, completedById: "approver", completedAt: now, completionSubmissionId: "submission-1", activeArchiveId: null, archiveGeneration: 0, preArchiveStateSnapshot: null, archiveHistory: [], reopenHistory: [], cancellationHistory: [], ...patch, assignmentHistory: patch.assignmentHistory ?? [] });
const effects = (): CoreTaskEffects => ({ domainEvents: [], activities: [], audits: [], notifications: [], assignmentIntents: [], deadlineHistoryIntents: [], blockerIntents: [], clarificationIntents: [], extensionRequestIntents: [], executionHistoryIntents: [], submissionIntents: [], reviewDecisionIntents: [], completionIntents: [], reopenIntents: [], cancellationIntents: [], archiveIntents: [], restoreIntents: [], handoverRequestIntents: [], handoverDecisionIntents: [], handoverExecutionIntents: [] });

class Idempotency {
  inspection: IdempotencyInspection = { status: "PROCEED" }; replay: StableCoreTaskExecutionResult | null = null; begins = 0; completions = 0; aborts = 0;
  async inspect(request: IdempotencyRequest): Promise<IdempotencyInspection> { return this.replay ? { status: "REPLAY", identity: request, result: this.replay } : this.inspection; }
  async begin(): Promise<void> { this.begins += 1; }
  async complete(): Promise<void> { this.completions += 1; }
  async abort(): Promise<void> { this.aborts += 1; }
}
class Uow implements CoreTaskUnitOfWork {
  staged: CoreTaskEffects[] = []; commits = 0; rollbacks = 0; failStage = false;
  constructor(readonly tasks: Map<string, CoreTaskAggregate>, readonly idempotency: Idempotency) {}
  async run<T>(operation: (transaction: CoreTaskTransactionContext) => Promise<T>): Promise<T> {
    const oldTasks = structuredClone([...this.tasks.entries()]); const oldStaged = structuredClone(this.staged); const oldCompletions = this.idempotency.completions;
    try { const result = await operation({ tasks: { create: async (value) => { if (this.tasks.has(value.id)) return false; this.tasks.set(value.id, structuredClone(value)); return true; }, compareAndSave: async (id, version, value) => { const found = this.tasks.get(id); if (!found || found.version !== version) return false; this.tasks.set(id, structuredClone(value)); return true; } }, effects: { stage: async (value) => { if (this.failStage) throw new WorkManagementDomainError("TASK_CONCURRENCY_CONFLICT"); this.staged.push(structuredClone(value)); } }, outbox: { stage: async () => {} }, idempotency: this.idempotency }); this.commits += 1; return result; }
    catch (error) { this.tasks.clear(); for (const [key, value] of oldTasks) this.tasks.set(key, value); this.staged = oldStaged; this.idempotency.completions = oldCompletions; this.rollbacks += 1; throw error; }
  }
}
function fixture(current: CoreTaskAggregate, options: { scopes?: readonly WorkManagementScope[]; relations?: readonly WorkManagementActorRelation[]; confidentialAllowed?: boolean } = {}) {
  const tasks = new Map([[current.id, structuredClone(current)]]); const idempotency = new Idempotency(); const uow = new Uow(tasks, idempotency); let ids = 0; let clocks = 0;
  const executor = new CoreTaskExecutor({ tasks: { findById: async (id) => structuredClone(tasks.get(id) ?? null) }, users: { evaluateAssignee: async () => ({ eligible: true, projectAccess: true }) }, scopes: { resolve: async () => ({ scopes: options.scopes ?? ["OWN"], relations: options.relations ?? ["CREATOR"], confidentialAllowed: options.confidentialAllowed ?? true }), resolveCreate: async () => ({ projectExists: true, projectAccessible: true, scopes: ["OWN"], confidentialAllowed: true }) }, unitOfWork: uow, idempotency, clock: { now: () => { clocks += 1; return now; } }, idGenerator: { next: () => String(++ids) }, transitionPolicies: { resolve: resolveTransitionPolicy }, completionReadiness: { evaluate: async () => ({ ready: true }) } });
  return { executor, tasks, uow, idempotency, ids: () => ids, clocks: () => clocks };
}
const command = (action: CoreTaskAction, version = 3) => action === "REOPEN" ? { taskId: "task-1", reason: "Need correction", expectedVersion: version } : action === "CANCEL" ? { taskId: "task-1", reason: "Scope withdrawn", expectedVersion: version } : action === "RESTORE" ? { taskId: "task-1", reason: "Retention required", expectedVersion: version } : { taskId: "task-1", expectedVersion: version };
const completed = () => task({ state: state({ lifecycle: "COMPLETED", review: "RESULT_APPROVED" }) });
const cancelled = () => task({ state: state({ lifecycle: "CANCELLED" }), completedAt: null, completionSubmissionId: null, completedById: null });

test("REOPEN creates append-only closure history while retaining B1 result and completion history", async () => {
  const current = completed(); const run = fixture(current); const result = await run.executor.execute({ action: "REOPEN", rawCommand: command("REOPEN"), actor: actor(), idempotencyKey: "reopen" });
  assert.equal(result.task.state.lifecycle, "IN_PROGRESS"); assert.equal(result.task.state.review, "NOT_SUBMITTED"); assert.equal(result.task.reopenHistory?.length, 1); assert.equal(result.effects.reopenIntents?.[0]?.reason, "Need correction");
  assert.deepEqual(result.task.submissions, current.submissions); assert.deepEqual(result.task.reviewDecisions, current.reviewDecisions); assert.deepEqual(result.task.assignmentHistory, current.assignmentHistory); assert.equal(result.task.completedAt, null); assert.equal(result.task.completedById, null); assert.equal(result.task.completionSubmissionId, null); assert.equal(result.task.completionHistory?.length ?? 0, 0); assert.equal(result.effects.domainEvents[0]?.type, "TaskReopened"); assert.equal(result.effects.notifications.length, 1);
});

test("CANCEL records reason without destroying result history", async () => {
  const current = task(); const run = fixture(current); const result = await run.executor.execute({ action: "CANCEL", rawCommand: command("CANCEL"), actor: actor(), idempotencyKey: "cancel" });
  assert.equal(result.task.state.lifecycle, "CANCELLED"); assert.equal(result.task.cancellationHistory?.length, 1); assert.equal(result.task.cancellationReason, "Scope withdrawn"); assert.equal(result.effects.cancellationIntents?.[0]?.previousLifecycle, "IN_PROGRESS"); assert.deepEqual(result.task.submissions, current.submissions); assert.deepEqual(result.task.reviewDecisions, current.reviewDecisions); assert.deepEqual(result.task.assignmentHistory, current.assignmentHistory); assert.equal(result.effects.domainEvents[0]?.type, "TaskCancelled");
});

test("Complete, reopen, and complete again separates the current projection from append-only completion history", async () => {
  const approved = task({ state: state({ lifecycle: "SUBMITTED", review: "RESULT_APPROVED" }) });
  const completeOne = await fixture(approved, { relations: ["APPROVER"], scopes: ["PARTICIPATING"] }).executor.execute({ action: "CONFIRM_COMPLETION", rawCommand: { taskId: "task-1", expectedVersion: 3 }, actor: actor("approver", ["task.complete"]), idempotencyKey: "complete-one" });
  const first = structuredClone(completeOne.task.completionHistory?.[0]);
  assert.equal(completeOne.task.completionHistory?.length, 1);
  const reopened = await fixture(completeOne.task).executor.execute({ action: "REOPEN", rawCommand: { taskId: "task-1", reason: "Correction", expectedVersion: 4 }, actor: actor("creator", ["task.reopen"]), idempotencyKey: "reopen-one" });
  assert.equal(reopened.task.completedAt, null); assert.equal(reopened.task.completionSubmissionId, null); assert.deepEqual(reopened.task.completionHistory?.[0], first);
  const resubmitted = await fixture(reopened.task, { relations: ["PRIMARY_ASSIGNEE"], scopes: ["ASSIGNED_SCOPE"] }).executor.execute({ action: "SUBMIT", rawCommand: { taskId: "task-1", summary: "Corrected", expectedVersion: 5 }, actor: actor("assignee", ["task.submit"]), idempotencyKey: "submit-two" });
  const approvedTwo = await fixture(resubmitted.task, { relations: ["APPROVER"], scopes: ["PARTICIPATING"] }).executor.execute({ action: "APPROVE_RESULT", rawCommand: { taskId: "task-1", submissionId: resubmitted.task.currentSubmissionId, expectedVersion: 6 }, actor: actor("approver", ["task.approve"]), idempotencyKey: "approve-two" });
  const completeTwo = await fixture(approvedTwo.task, { relations: ["APPROVER"], scopes: ["PARTICIPATING"] }).executor.execute({ action: "CONFIRM_COMPLETION", rawCommand: { taskId: "task-1", expectedVersion: 7 }, actor: actor("approver", ["task.complete"]), idempotencyKey: "complete-two" });
  assert.equal(completeTwo.task.completionHistory?.length, 2); assert.deepEqual(completeTwo.task.completionHistory?.[0], first); assert.equal(completeTwo.task.completionHistory?.[1]?.submissionId, resubmitted.task.currentSubmissionId); assert.equal(completeTwo.task.completionSubmissionId, resubmitted.task.currentSubmissionId);
});

test("ARCHIVE and RESTORE preserve the trusted pre-archive state and append generations", async () => {
  const source = cancelled(); const run = fixture(source);
  const archived = await run.executor.execute({ action: "ARCHIVE", rawCommand: command("ARCHIVE"), actor: actor(), idempotencyKey: "archive-1" });
  const oldArchive = structuredClone(archived.task.archiveHistory?.[0]); assert.equal(archived.task.state.lifecycle, "ARCHIVED"); assert.equal(archived.task.archiveGeneration, 1); assert.deepEqual(archived.task.preArchiveStateSnapshot, source.state); assert.equal(archived.effects.archiveIntents?.[0]?.generation, 1); assert.equal(archived.effects.notifications.length, 0);
  assert.deepEqual(archived.task.assignmentHistory, source.assignmentHistory);
  const restored = await run.executor.execute({ action: "RESTORE", rawCommand: command("RESTORE", 4), actor: actor(), idempotencyKey: "restore-1" });
  assert.deepEqual(restored.task.state, source.state); assert.equal(restored.task.activeArchiveId, null); assert.equal(restored.task.preArchiveStateSnapshot, null); assert.deepEqual(restored.task.archiveHistory?.[0], oldArchive); assert.equal(restored.task.restoreHistory?.[0]?.restoredById, "creator"); assert.equal(restored.effects.restoreIntents[0]?.archiveId, oldArchive?.id); assert.deepEqual(restored.task.submissions, source.submissions); assert.deepEqual(restored.task.reviewDecisions, source.reviewDecisions); assert.deepEqual(restored.task.assignmentHistory, source.assignmentHistory);
  const archivedAgain = await run.executor.execute({ action: "ARCHIVE", rawCommand: command("ARCHIVE", 5), actor: actor(), idempotencyKey: "archive-2" });
  assert.equal(archivedAgain.task.archiveGeneration, 2); assert.equal(archivedAgain.task.archiveHistory?.length, 2); assert.deepEqual(archivedAgain.task.archiveHistory?.[0]?.preArchiveState, oldArchive?.preArchiveState);
});

test("archive currentness fails closed for missing, foreign, stale, malformed, and projection-mismatched records", () => {
  const archivedState = state({ lifecycle: "ARCHIVED" }); const snapshot = state({ lifecycle: "CANCELLED" });
  const record = { id: "archive-1", taskId: "task-1", generation: 1, archivedById: "creator", archivedAt: now, reason: null, preArchiveState: snapshot };
  const base = task({ state: archivedState, activeArchiveId: "archive-1", archiveGeneration: 1, preArchiveStateSnapshot: snapshot, archiveHistory: [record] });
  assert.equal(resolveCurrentArchiveRecord(base).id, "archive-1");
  const cases = [
    { name: "missing active id", value: task({ ...base, activeArchiveId: null }), code: "TASK_ARCHIVE_REQUIRED" },
    { name: "missing record", value: task({ ...base, archiveHistory: [] }), code: "TASK_ARCHIVE_RECORD_NOT_FOUND" },
    { name: "foreign record", value: task({ ...base, archiveHistory: [{ ...record, taskId: "other" }] }), code: "TASK_ARCHIVE_NOT_CURRENT" },
    { name: "generation mismatch", value: task({ ...base, archiveGeneration: 2 }), code: "TASK_ARCHIVE_NOT_CURRENT" },
    { name: "projection mismatch", value: task({ ...base, preArchiveStateSnapshot: state({ lifecycle: "IN_PROGRESS" }) }), code: "TASK_ARCHIVE_SNAPSHOT_MISMATCH" },
    { name: "invalid combination", value: task({ ...base, archiveHistory: [{ ...record, preArchiveState: state({ lifecycle: "COMPLETED", review: "NOT_SUBMITTED" }) }] }), code: "TASK_ARCHIVE_SNAPSHOT_INVALID" },
  ];
  for (const item of cases) assert.throws(() => resolveCurrentArchiveRecord(item.value), (error: unknown) => error instanceof WorkManagementDomainError && error.code === item.code, item.name);
});

test("each B2 action rejects invalid lifecycle, authorization, scope, version, and raw server metadata without mutation", async (t) => {
  const cases = [
    { action: "REOPEN" as const, current: task(), code: "TASK_INVALID_TRANSITION" },
    { action: "CANCEL" as const, current: cancelled(), code: "TASK_ALREADY_CANCELLED" },
    { action: "ARCHIVE" as const, current: task(), code: "TASK_INVALID_TRANSITION" },
    { action: "RESTORE" as const, current: task(), code: "TASK_ARCHIVE_REQUIRED" },
  ];
  for (const item of cases) await t.test(`${item.action} invalid lifecycle`, async () => { const run = fixture(item.current); await assert.rejects(() => run.executor.execute({ action: item.action, rawCommand: command(item.action), actor: actor(), idempotencyKey: `invalid-${item.action}` }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === item.code); assert.deepEqual(run.tasks.get("task-1"), item.current); assert.equal(run.uow.staged.length, 0); assert.equal(run.idempotency.begins, 0); });
  await t.test("permission, scope, relation, confidentiality, version and malicious metadata deny before mutation", async () => {
    const base = completed();
    const denialCases = [
      { name: "permission", options: {}, principal: actor("creator", []), raw: command("REOPEN"), code: "TASK_ACCESS_DENIED" },
      { name: "scope", options: { scopes: ["PARTICIPATING"] as const }, principal: actor(), raw: command("REOPEN"), code: "TASK_PROJECT_ACCESS_REQUIRED" },
      { name: "relation", options: { relations: [] as const }, principal: actor(), raw: command("REOPEN"), code: "TASK_ACCESS_DENIED" },
      { name: "confidential", task: task({ ...completed(), confidentiality: "CONFIDENTIAL" }), options: { confidentialAllowed: false }, principal: actor(), raw: command("REOPEN"), code: "TASK_CONFIDENTIAL_ACCESS_DENIED" },
      { name: "version", options: {}, principal: actor(), raw: command("REOPEN", 2), code: "TASK_CONCURRENCY_CONFLICT" },
      { name: "metadata", options: {}, principal: actor(), raw: { ...command("REOPEN"), lifecycle: "CANCELLED" }, code: "TASK_COMMAND_INVALID" },
    ];
    for (const item of denialCases) { const current = item.task ?? base; const run = fixture(current, item.options); await assert.rejects(() => run.executor.execute({ action: "REOPEN", rawCommand: item.raw, actor: item.principal, idempotencyKey: item.name }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === item.code); assert.deepEqual(run.tasks.get("task-1"), current); assert.equal(run.uow.staged.length, 0); }
  });
});

test("each B2 action rolls back, replays without side effects, uses one clock, and preserves inputs", async (t) => {
  const archiveRecord = { id: "archive-1", taskId: "task-1", generation: 1, archivedById: "creator", archivedAt: now, reason: null, preArchiveState: state({ lifecycle: "CANCELLED" }), restoredById: null, restoredAt: null };
  const cases = [
    { action: "REOPEN" as const, current: completed() }, { action: "CANCEL" as const, current: task() }, { action: "ARCHIVE" as const, current: cancelled() },
    { action: "RESTORE" as const, current: task({ state: state({ lifecycle: "ARCHIVED" }), activeArchiveId: "archive-1", archiveGeneration: 1, preArchiveStateSnapshot: state({ lifecycle: "CANCELLED" }), archiveHistory: [archiveRecord] }) },
  ];
  for (const item of cases) {
    await t.test(`${item.action} rollback`, async () => { const run = fixture(item.current); run.uow.failStage = true; await assert.rejects(() => run.executor.execute({ action: item.action, rawCommand: command(item.action), actor: actor(), idempotencyKey: `rollback-${item.action}` })); assert.deepEqual(run.tasks.get("task-1"), item.current); assert.equal(run.uow.staged.length, 0); assert.equal(run.idempotency.completions, 0); });
    await t.test(`${item.action} replay`, async () => { const run = fixture(item.current); run.idempotency.replay = { task: task({ id: "stored" }), effects: effects() }; const result = await run.executor.execute({ action: item.action, rawCommand: command(item.action), actor: actor(), idempotencyKey: `replay-${item.action}` }); assert.equal(result.task.id, "stored"); assert.equal(run.ids(), 0); assert.equal(run.uow.staged.length, 0); assert.equal(run.idempotency.begins, 0); });
    await t.test(`${item.action} clock and immutability`, async () => { const immutable = structuredClone(item.current); const original = structuredClone(immutable); const raw = structuredClone(command(item.action)); Object.freeze(immutable.state); Object.freeze(immutable); const run = fixture(immutable); const result = await run.executor.execute({ action: item.action, rawCommand: raw, actor: actor(), idempotencyKey: `clock-${item.action}` }); assert.equal(run.clocks(), 1); assert.deepEqual(immutable, original); assert.deepEqual(raw, command(item.action)); assert.notEqual(result.task, immutable); assert.equal(result.effects.domainEvents[0]?.occurredAt.getTime(), now.getTime()); });
  }
});
