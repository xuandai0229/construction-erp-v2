import assert from "node:assert/strict";
import test from "node:test";
import { CoreTaskExecutor, type CoreTaskAggregate, type WorkManagementActorContext } from "../application/core-task-executor";
import type { CoreTaskEffects } from "../application/core-task-effects";
import type { CoreTaskTransactionContext, CoreTaskUnitOfWork } from "../application/core-task-ports";
import type { IdempotencyInspection, IdempotencyRequest, StableCoreTaskExecutionResult } from "../application/core-task-idempotency";
import { resolveTransitionPolicy } from "../domain/transition-policies";
import { WorkManagementDomainError } from "../errors/codes";
import type { WorkManagementPermission, WorkManagementScope } from "../permissions/contract";
import type { WorkManagementActorRelation } from "../application/actor-policy";

const now = new Date("2026-07-14T08:00:00.000Z");
const state = (patch: Partial<CoreTaskAggregate["state"]> = {}): CoreTaskAggregate["state"] => ({ lifecycle: "IN_PROGRESS", acceptance: "ACCEPTED", execution: "ACTIVE", review: "NOT_SUBMITTED", handover: "NONE", waitingReason: null, ...patch });
const permissions: readonly WorkManagementPermission[] = ["task.submit", "task.review", "task.approve", "task.complete"];
const actor = (actorId: string, permissionSet = permissions): WorkManagementActorContext => ({ actorType: "USER", actorId, companyId: null, permissionSet: new Set(permissionSet), resolvedScopes: ["PARTICIPATING"], correlationId: "corr", causationId: "cause", requestId: "request" });
const aggregate = (patch: Partial<CoreTaskAggregate> = {}): CoreTaskAggregate => ({ id: "task-1", creatorId: "creator", assignedById: "manager", primaryAssigneeId: "assignee", projectId: "project", confidentiality: "NORMAL", requiresIndependentReviewer: true, reviewerId: "reviewer", approverId: "approver", participants: [], state: state(), deadlineAt: new Date("2026-07-20"), progressPercent: 100, version: 3, activeBlockerId: null, submissions: [], reviewDecisions: [], currentSubmissionId: null, currentSubmissionSequence: 0, completedById: null, completedAt: null, completionSubmissionId: null, ...patch, assignmentHistory: patch.assignmentHistory ?? [] });
const emptyEffects = (): CoreTaskEffects => ({ domainEvents: [], activities: [], audits: [], notifications: [], assignmentIntents: [], deadlineHistoryIntents: [], blockerIntents: [], clarificationIntents: [], extensionRequestIntents: [], executionHistoryIntents: [], submissionIntents: [], reviewDecisionIntents: [], completionIntents: [], reopenIntents: [], cancellationIntents: [], archiveIntents: [], restoreIntents: [], handoverRequestIntents: [], handoverDecisionIntents: [], handoverExecutionIntents: [] });

class Idempotency {
  inspection: IdempotencyInspection = { status: "PROCEED" }; replay: StableCoreTaskExecutionResult | null = null; requests: IdempotencyRequest[] = []; completions: IdempotencyRequest[] = []; begins = 0; aborts = 0;
  async inspect(request: IdempotencyRequest): Promise<IdempotencyInspection> { this.requests.push(request); return this.replay ? { status: "REPLAY", identity: request, result: this.replay } : this.inspection; }
  async begin(): Promise<void> { this.begins += 1; }
  async complete(request: IdempotencyRequest): Promise<void> { this.completions.push(request); }
  async abort(): Promise<void> { this.aborts += 1; }
}
class Uow implements CoreTaskUnitOfWork {
  effects: CoreTaskEffects[] = []; commits = 0; rollbacks = 0; failStage = false;
  constructor(readonly tasks: Map<string, CoreTaskAggregate>, readonly idempotency: Idempotency) {}
  async run<T>(operation: (transaction: CoreTaskTransactionContext) => Promise<T>): Promise<T> {
    const taskSnapshot = structuredClone([...this.tasks.entries()]); const effectsSnapshot = structuredClone(this.effects); const completionCount = this.idempotency.completions.length;
    try {
      const result = await operation({ tasks: { create: async (value) => { if (this.tasks.has(value.id)) return false; this.tasks.set(value.id, structuredClone(value)); return true; }, compareAndSave: async (id, version, value) => { const old = this.tasks.get(id); if (!old || old.version !== version) return false; this.tasks.set(id, structuredClone(value)); return true; } }, effects: { stage: async (effects) => { if (this.failStage) throw new WorkManagementDomainError("TASK_CONCURRENCY_CONFLICT"); this.effects.push(structuredClone(effects)); } }, outbox: { stage: async () => {} }, idempotency: this.idempotency });
      this.commits += 1; return result;
    } catch (error) { this.tasks.clear(); for (const [id, value] of taskSnapshot) this.tasks.set(id, value); this.effects = effectsSnapshot; this.idempotency.completions.splice(completionCount); this.rollbacks += 1; throw error; }
  }
}
type Options = { relations?: readonly WorkManagementActorRelation[]; scopes?: readonly WorkManagementScope[]; ready?: boolean; readinessReason?: "PROGRESS_INCOMPLETE" | "CHECKLIST_INCOMPLETE" | "ACTIVE_BLOCKER" | "REVIEW_NOT_APPROVED" | "HANDOVER_PENDING" };
function fixture(current: CoreTaskAggregate, options: Options = {}) {
  const tasks = new Map([[current.id, structuredClone(current)]]); const idempotency = new Idempotency(); const uow = new Uow(tasks, idempotency);
  let resolvedScopes = options.scopes ?? ["PARTICIPATING"];
  let resolvedRelations = options.relations ?? ["PRIMARY_ASSIGNEE"];
  let idCalls = 0;
  let clockCalls = 0;
  const executor = new CoreTaskExecutor({ tasks: { findById: async (id) => structuredClone(tasks.get(id) ?? null) }, users: { evaluateAssignee: async () => ({ eligible: true, projectAccess: true }) }, scopes: { resolve: async () => ({ scopes: resolvedScopes, relations: resolvedRelations, confidentialAllowed: true }), resolveCreate: async () => ({ projectExists: true, projectAccessible: true, scopes: ["OWN"], confidentialAllowed: true }) }, unitOfWork: uow, idempotency, clock: { now: () => { clockCalls += 1; return now; } }, idGenerator: { next: () => String(++idCalls) }, transitionPolicies: { resolve: resolveTransitionPolicy }, completionReadiness: { evaluate: async () => options.ready === false ? { ready: false, reason: options.readinessReason ?? "CHECKLIST_INCOMPLETE" } : { ready: true } } });
  return { executor, tasks, uow, idempotency, idCalls: () => idCalls, clockCalls: () => clockCalls, setAuthorization: (relations: readonly WorkManagementActorRelation[], scopes: readonly WorkManagementScope[]) => { resolvedRelations = relations; resolvedScopes = scopes; } };
}
const submitted = (): CoreTaskAggregate => aggregate({ state: state({ lifecycle: "SUBMITTED", review: "PENDING" }), submissions: [{ id: "submission-1", taskId: "task-1", sequence: 1, previousSubmissionId: null, submittedById: "assignee", submittedAt: now, summary: "Result", note: null }], currentSubmissionId: "submission-1", currentSubmissionSequence: 1 });
const approved = (): CoreTaskAggregate => aggregate({ ...submitted(), state: state({ lifecycle: "SUBMITTED", review: "RESULT_APPROVED" }), reviewDecisions: [{ id: "review-1", submissionId: "submission-1", decision: "RESULT_APPROVED", reason: null, decidedById: "approver", decidedAt: now }] });

test("SUBMIT appends immutable submission and does not approve or complete", async () => {
  const current = aggregate(); const run = fixture(current, { relations: ["PRIMARY_ASSIGNEE"], scopes: ["ASSIGNED_SCOPE"] });
  const result = await run.executor.execute({ action: "SUBMIT", rawCommand: { taskId: "task-1", summary: "First result", expectedVersion: 3 }, actor: actor("assignee"), idempotencyKey: "submit" });
  assert.equal(result.task.state.lifecycle, "SUBMITTED"); assert.equal(result.task.state.review, "PENDING"); assert.equal(result.task.currentSubmissionSequence, 1); assert.equal(result.task.completedAt, null);
  assert.equal(result.effects.submissionIntents[0]?.sequence, 1); assert.equal(result.effects.domainEvents[0]?.type, "TaskSubmitted"); assert.equal(result.effects.notifications.length, 1); assert.deepEqual(result.task.assignmentHistory, current.assignmentHistory);
  const resubmit = fixture(aggregate({ state: state({ review: "CHANGES_REQUESTED" }), submissions: [{ id: "old", taskId: "task-1", sequence: 1, previousSubmissionId: null, submittedById: "assignee", submittedAt: now, summary: "Old", note: null }], currentSubmissionId: "old", currentSubmissionSequence: 1 }), { relations: ["PRIMARY_ASSIGNEE"], scopes: ["ASSIGNED_SCOPE"] });
  const newer = await resubmit.executor.execute({ action: "SUBMIT", rawCommand: { taskId: "task-1", summary: "New", expectedVersion: 3 }, actor: actor("assignee"), idempotencyKey: "resubmit" });
  assert.equal(newer.task.submissions?.length, 2); assert.equal(newer.task.submissions?.[0]?.summary, "Old"); assert.equal(newer.task.currentSubmissionSequence, 2);
});

test("REQUEST_CHANGES records append-only review decision and preserves submission", async () => {
  const current = submitted(); const run = fixture(current, { relations: ["REVIEWER"] });
  const result = await run.executor.execute({ action: "REQUEST_CHANGES", rawCommand: { taskId: "task-1", submissionId: "submission-1", reason: "Add evidence", expectedVersion: 3 }, actor: actor("reviewer"), idempotencyKey: "changes" });
  assert.equal(result.task.state.lifecycle, "IN_PROGRESS"); assert.equal(result.task.state.review, "CHANGES_REQUESTED"); assert.equal(result.task.submissions?.[0]?.summary, "Result"); assert.equal(result.effects.reviewDecisionIntents[0]?.decision, "CHANGES_REQUESTED"); assert.deepEqual(result.task.assignmentHistory, current.assignmentHistory);
});

test("APPROVE_RESULT records approval without completion", async () => {
  const current = submitted(); const run = fixture(current, { relations: ["APPROVER"] });
  const result = await run.executor.execute({ action: "APPROVE_RESULT", rawCommand: { taskId: "task-1", submissionId: "submission-1", expectedVersion: 3 }, actor: actor("approver"), idempotencyKey: "approve" });
  assert.equal(result.task.state.lifecycle, "SUBMITTED"); assert.equal(result.task.state.review, "RESULT_APPROVED"); assert.equal(result.task.completedAt, null); assert.equal(result.effects.completionIntents.length, 0); assert.equal(result.effects.reviewDecisionIntents[0]?.decision, "RESULT_APPROVED"); assert.deepEqual(result.task.assignmentHistory, current.assignmentHistory);
});

test("CONFIRM_COMPLETION completes only current approved submission with readiness", async () => {
  const current = approved(); const run = fixture(current, { relations: ["APPROVER"] });
  const result = await run.executor.execute({ action: "CONFIRM_COMPLETION", rawCommand: { taskId: "task-1", expectedVersion: 3 }, actor: actor("approver"), idempotencyKey: "complete" });
  assert.equal(result.task.state.lifecycle, "COMPLETED"); assert.equal(result.task.state.review, "RESULT_APPROVED"); assert.equal(result.task.completionSubmissionId, "submission-1"); assert.equal(result.effects.completionIntents[0]?.submissionId, "submission-1"); assert.deepEqual(result.task.assignmentHistory, current.assignmentHistory);
});

test("result-review guards use exact errors and do not mutate", async () => {
  const cases = [
    { name: "submit pending", task: aggregate({ state: state({ review: "PENDING" }) }), action: "SUBMIT" as const, command: { taskId: "task-1", summary: "Again", expectedVersion: 3 }, relation: "PRIMARY_ASSIGNEE" as const, actorId: "assignee", code: "TASK_SUBMISSION_ALREADY_PENDING" },
    { name: "changes missing submission", task: aggregate({ state: state({ lifecycle: "SUBMITTED", review: "PENDING" }) }), action: "REQUEST_CHANGES" as const, command: { taskId: "task-1", submissionId: "none", reason: "Fix", expectedVersion: 3 }, relation: "REVIEWER" as const, actorId: "reviewer", code: "TASK_SUBMISSION_REQUIRED" },
    { name: "approval old", task: submitted(), action: "APPROVE_RESULT" as const, command: { taskId: "task-1", submissionId: "old", expectedVersion: 3 }, relation: "APPROVER" as const, actorId: "approver", code: "TASK_SUBMISSION_REQUIRED" },
    { name: "completion progress", task: aggregate({ ...approved(), progressPercent: 90 }), action: "CONFIRM_COMPLETION" as const, command: { taskId: "task-1", expectedVersion: 3 }, relation: "APPROVER" as const, actorId: "approver", code: "TASK_COMPLETION_PROGRESS_INCOMPLETE" },
  ] as const;
  for (const item of cases) {
    const current = item.task; const run = fixture(current, { relations: [item.relation], scopes: item.action === "SUBMIT" ? ["ASSIGNED_SCOPE"] : ["PARTICIPATING"] });
    await assert.rejects(() => run.executor.execute({ action: item.action, rawCommand: item.command, actor: actor(item.actorId), idempotencyKey: item.name }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === item.code);
    assert.deepEqual(run.tasks.get("task-1"), current); assert.equal(run.uow.effects.length, 0); assert.equal(run.idempotency.completions.length, 0);
  }
});

test("rollback and replay prevent duplicate B1 history", async () => {
  const failing = fixture(aggregate(), { relations: ["PRIMARY_ASSIGNEE"], scopes: ["ASSIGNED_SCOPE"] }); failing.uow.failStage = true;
  await assert.rejects(() => failing.executor.execute({ action: "SUBMIT", rawCommand: { taskId: "task-1", summary: "Result", expectedVersion: 3 }, actor: actor("assignee"), idempotencyKey: "fail" }));
  assert.equal(failing.tasks.get("task-1")?.currentSubmissionId, null); assert.equal(failing.uow.effects.length, 0); assert.equal(failing.idempotency.completions.length, 0);
  const replay = fixture(aggregate(), { relations: ["PRIMARY_ASSIGNEE"], scopes: ["ASSIGNED_SCOPE"] }); const stored: StableCoreTaskExecutionResult = { task: aggregate({ id: "replayed" }), effects: emptyEffects() }; replay.idempotency.replay = stored;
  assert.equal((await replay.executor.execute({ action: "SUBMIT", rawCommand: { taskId: "task-1", summary: "Result", expectedVersion: 3 }, actor: actor("assignee"), idempotencyKey: "replay" })).task.id, "replayed"); assert.equal(replay.uow.effects.length, 0); assert.equal(replay.idempotency.begins, 0);
});

test("each B1 action has rollback, replay, and immutable-input proof", async (t) => {
  const cases = [
    { action: "SUBMIT" as const, current: aggregate(), command: { taskId: "task-1", summary: "Result", expectedVersion: 3 }, relation: "PRIMARY_ASSIGNEE" as const, scope: "ASSIGNED_SCOPE" as const, actorId: "assignee" },
    { action: "REQUEST_CHANGES" as const, current: submitted(), command: { taskId: "task-1", submissionId: "submission-1", reason: "Fix", expectedVersion: 3 }, relation: "REVIEWER" as const, scope: "PARTICIPATING" as const, actorId: "reviewer" },
    { action: "APPROVE_RESULT" as const, current: submitted(), command: { taskId: "task-1", submissionId: "submission-1", expectedVersion: 3 }, relation: "APPROVER" as const, scope: "PARTICIPATING" as const, actorId: "approver" },
    { action: "CONFIRM_COMPLETION" as const, current: approved(), command: { taskId: "task-1", expectedVersion: 3 }, relation: "APPROVER" as const, scope: "PARTICIPATING" as const, actorId: "approver" },
  ];
  for (const item of cases) {
    await t.test(`${item.action} rollback`, async () => {
      const run = fixture(item.current, { relations: [item.relation], scopes: [item.scope] }); run.uow.failStage = true;
      await assert.rejects(() => run.executor.execute({ action: item.action, rawCommand: item.command, actor: actor(item.actorId), idempotencyKey: `${item.action}-rollback` }));
      assert.deepEqual(run.tasks.get("task-1"), item.current); assert.equal(run.uow.effects.length, 0); assert.equal(run.idempotency.completions.length, 0);
    });
    await t.test(`${item.action} replay`, async () => {
      const run = fixture(item.current, { relations: [item.relation], scopes: [item.scope] }); run.idempotency.replay = { task: aggregate({ id: "replayed" }), effects: emptyEffects() };
      assert.equal((await run.executor.execute({ action: item.action, rawCommand: item.command, actor: actor(item.actorId), idempotencyKey: `${item.action}-replay` })).task.id, "replayed"); assert.equal(run.uow.effects.length, 0); assert.equal(run.idempotency.begins, 0);
    });
    await t.test(`${item.action} immutability`, async () => {
      const current = structuredClone(item.current); const raw = structuredClone(item.command); const original = structuredClone(current); const principal = actor(item.actorId);
      Object.freeze(current.state); Object.freeze(current); Object.freeze(principal);
      const run = fixture(current, { relations: [item.relation], scopes: [item.scope] }); const result = await run.executor.execute({ action: item.action, rawCommand: raw, actor: principal, idempotencyKey: `${item.action}-immutable` });
      assert.deepEqual(current, original); assert.deepEqual(raw, item.command); assert.notEqual(result.task, current);
    });
  }
});

test("B1 submission and review histories are append-only across resubmission", async () => {
  const first = fixture(aggregate(), { relations: ["PRIMARY_ASSIGNEE"], scopes: ["ASSIGNED_SCOPE"] });
  const firstResult = await first.executor.execute({ action: "SUBMIT", rawCommand: { taskId: "task-1", summary: "submission-1", expectedVersion: 3 }, actor: actor("assignee"), idempotencyKey: "append-first" });
  const submissionOne = structuredClone(firstResult.task.submissions?.[0]);
  assert.equal(submissionOne?.sequence, 1);
  assert.equal(submissionOne?.previousSubmissionId, null);
  assert.equal(first.uow.effects[0]?.submissionIntents.length, 1);

  first.setAuthorization(["REVIEWER"], ["PARTICIPATING"]);
  const changesResult = await first.executor.execute({ action: "REQUEST_CHANGES", rawCommand: { taskId: "task-1", submissionId: submissionOne?.id, reason: "Clarify", expectedVersion: 4 }, actor: actor("reviewer"), idempotencyKey: "append-changes" });
  const decisionOne = structuredClone(changesResult.task.reviewDecisions?.[0]);
  assert.equal(decisionOne?.submissionId, submissionOne?.id);

  first.setAuthorization(["PRIMARY_ASSIGNEE"], ["ASSIGNED_SCOPE"]);
  const secondResult = await first.executor.execute({ action: "SUBMIT", rawCommand: { taskId: "task-1", summary: "submission-2", expectedVersion: 5 }, actor: actor("assignee"), idempotencyKey: "append-second" });
  const submissionTwo = secondResult.task.submissions?.[1];
  assert.equal(secondResult.task.submissions?.length, 2);
  assert.deepEqual(secondResult.task.submissions?.[0], submissionOne);
  assert.notEqual(submissionTwo?.id, submissionOne?.id);
  assert.equal(submissionTwo?.previousSubmissionId, submissionOne?.id);
  assert.equal(submissionTwo?.sequence, (submissionOne?.sequence ?? 0) + 1);
  assert.equal(secondResult.task.currentSubmissionId, submissionTwo?.id);
  assert.equal(first.uow.effects[2]?.submissionIntents[0]?.previousSubmissionId, submissionOne?.id);

  first.setAuthorization(["APPROVER"], ["PARTICIPATING"]);
  const approvalResult = await first.executor.execute({ action: "APPROVE_RESULT", rawCommand: { taskId: "task-1", submissionId: submissionTwo?.id, expectedVersion: 6 }, actor: actor("approver"), idempotencyKey: "append-approval" });
  const decisionTwo = approvalResult.task.reviewDecisions?.[1];
  assert.equal(approvalResult.task.reviewDecisions?.length, 2);
  assert.deepEqual(approvalResult.task.reviewDecisions?.[0], decisionOne);
  assert.notEqual(decisionTwo?.id, decisionOne?.id);
  assert.equal(decisionTwo?.submissionId, submissionTwo?.id);
  assert.equal(first.uow.effects[3]?.reviewDecisionIntents.length, 1);
});

test("REQUEST_CHANGES and APPROVE_RESULT reject stale, cross-task, and missing submissions without mutation", async () => {
  const current = submitted();
  const old = { id: "submission-old", taskId: "task-1", sequence: 0, previousSubmissionId: null, submittedById: "assignee", submittedAt: now, summary: "old", note: null };
  const stale = aggregate({ ...current, submissions: [old, ...(current.submissions ?? [])] });
  const cases = [
    { name: "REQUEST_CHANGES previous submission", action: "REQUEST_CHANGES" as const, command: { taskId: "task-1", submissionId: "submission-old", reason: "Fix", expectedVersion: 3 }, relation: "REVIEWER" as const, actorId: "reviewer", code: "TASK_SUBMISSION_NOT_CURRENT" },
    { name: "APPROVE_RESULT previous submission", action: "APPROVE_RESULT" as const, command: { taskId: "task-1", submissionId: "submission-old", expectedVersion: 3 }, relation: "APPROVER" as const, actorId: "approver", code: "TASK_SUBMISSION_NOT_CURRENT" },
    { name: "REQUEST_CHANGES missing submission", action: "REQUEST_CHANGES" as const, command: { taskId: "task-1", submissionId: "missing", reason: "Fix", expectedVersion: 3 }, relation: "REVIEWER" as const, actorId: "reviewer", code: "TASK_SUBMISSION_REQUIRED" },
    { name: "APPROVE_RESULT missing submission", action: "APPROVE_RESULT" as const, command: { taskId: "task-1", submissionId: "missing", expectedVersion: 3 }, relation: "APPROVER" as const, actorId: "approver", code: "TASK_SUBMISSION_REQUIRED" },
  ] as const;
  for (const item of cases) {
    const run = fixture(stale, { relations: [item.relation] });
    await assert.rejects(() => run.executor.execute({ action: item.action, rawCommand: item.command, actor: actor(item.actorId), idempotencyKey: item.name }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === item.code);
    assert.deepEqual(run.tasks.get("task-1"), stale); assert.equal(run.uow.effects.length, 0); assert.equal(run.idempotency.begins, 0);
  }
  const foreignSubmission = submitted().submissions?.[0];
  assert.ok(foreignSubmission);
  const foreign = aggregate({ ...submitted(), submissions: [{ ...foreignSubmission, taskId: "task-other" }] });
  const foreignRun = fixture(foreign, { relations: ["APPROVER"] });
  await assert.rejects(() => foreignRun.executor.execute({ action: "APPROVE_RESULT", rawCommand: { taskId: "task-1", submissionId: "submission-1", expectedVersion: 3 }, actor: actor("approver"), idempotencyKey: "foreign" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_SUBMISSION_NOT_CURRENT");
  assert.deepEqual(foreignRun.tasks.get("task-1"), foreign); assert.equal(foreignRun.uow.effects.length, 0);
});

test("B1 separation of duties requires reviewer or approver relation and does not allow privileged scope bypass", async () => {
  const authorSeparateFromPrimary = aggregate({ ...submitted(), primaryAssigneeId: "other" });
  const cases = [
    { name: "REQUEST_CHANGES primary conflict", action: "REQUEST_CHANGES" as const, task: submitted(), command: { taskId: "task-1", submissionId: "submission-1", reason: "Fix", expectedVersion: 3 }, relation: "REVIEWER" as const, actorId: "assignee", code: "TASK_REVIEW_ACTOR_CONFLICT" },
    { name: "REQUEST_CHANGES submission author conflict", action: "REQUEST_CHANGES" as const, task: authorSeparateFromPrimary, command: { taskId: "task-1", submissionId: "submission-1", reason: "Fix", expectedVersion: 3 }, relation: "REVIEWER" as const, actorId: "assignee", code: "TASK_REVIEW_ACTOR_CONFLICT" },
    { name: "APPROVE_RESULT primary conflict", action: "APPROVE_RESULT" as const, task: submitted(), command: { taskId: "task-1", submissionId: "submission-1", expectedVersion: 3 }, relation: "APPROVER" as const, actorId: "assignee", code: "TASK_REVIEW_ACTOR_CONFLICT" },
    { name: "APPROVE_RESULT submission author conflict", action: "APPROVE_RESULT" as const, task: authorSeparateFromPrimary, command: { taskId: "task-1", submissionId: "submission-1", expectedVersion: 3 }, relation: "APPROVER" as const, actorId: "assignee", code: "TASK_REVIEW_ACTOR_CONFLICT" },
    { name: "CONFIRM_COMPLETION primary is not approver", action: "CONFIRM_COMPLETION" as const, task: approved(), command: { taskId: "task-1", expectedVersion: 3 }, relation: "PRIMARY_ASSIGNEE" as const, actorId: "assignee", code: "TASK_ACCESS_DENIED" },
    { name: "CONFIRM_COMPLETION reviewer is not approver", action: "CONFIRM_COMPLETION" as const, task: approved(), command: { taskId: "task-1", expectedVersion: 3 }, relation: "REVIEWER" as const, actorId: "reviewer", code: "TASK_ACCESS_DENIED" },
  ] as const;
  for (const item of cases) {
    const run = fixture(item.task, { relations: [item.relation] });
    await assert.rejects(() => run.executor.execute({ action: item.action, rawCommand: item.command, actor: actor(item.actorId), idempotencyKey: item.name }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === item.code);
    assert.equal(run.uow.effects.length, 0); assert.equal(run.idempotency.begins, 0);
  }
  const privileged = fixture(submitted(), { relations: [], scopes: ["COMPANY"] });
  await assert.rejects(() => privileged.executor.execute({ action: "APPROVE_RESULT", rawCommand: { taskId: "task-1", submissionId: "submission-1", expectedVersion: 3 }, actor: actor("executive"), idempotencyKey: "privileged-bypass" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_ACCESS_DENIED");
  assert.equal(privileged.uow.effects.length, 0); assert.equal(privileged.idempotency.begins, 0);
});

test("CONFIRM_COMPLETION maps each concrete readiness guard to a stable error without mutation", async () => {
  const cases = [
    { name: "current submission missing", task: aggregate({ state: state({ lifecycle: "SUBMITTED", review: "RESULT_APPROVED" }) }), options: {}, code: "TASK_SUBMISSION_REQUIRED" },
    { name: "review not approved", task: submitted(), options: {}, code: "TASK_REVIEW_NOT_APPROVED" },
    { name: "progress incomplete", task: aggregate({ ...approved(), progressPercent: 99 }), options: {}, code: "TASK_COMPLETION_PROGRESS_INCOMPLETE" },
    { name: "checklist incomplete", task: approved(), options: { ready: false, readinessReason: "CHECKLIST_INCOMPLETE" as const }, code: "TASK_COMPLETION_CHECKLIST_INCOMPLETE" },
    { name: "active blocker", task: aggregate({ ...approved(), activeBlockerId: "blocker-1" }), options: {}, code: "TASK_COMPLETION_BLOCKED" },
    { name: "execution paused", task: aggregate({ ...approved(), state: state({ lifecycle: "SUBMITTED", review: "RESULT_APPROVED", execution: "PAUSED" }) }), options: {}, code: "TASK_COMPLETION_EXECUTION_NOT_ACTIVE" },
    { name: "execution blocked", task: aggregate({ ...approved(), state: state({ lifecycle: "SUBMITTED", review: "RESULT_APPROVED", execution: "BLOCKED" }) }), options: {}, code: "TASK_COMPLETION_EXECUTION_NOT_ACTIVE" },
    { name: "handover pending", task: aggregate({ ...approved(), state: state({ lifecycle: "SUBMITTED", review: "RESULT_APPROVED", handover: "PENDING_APPROVAL" }) }), options: {}, code: "TASK_COMPLETION_HANDOVER_PENDING" },
    { name: "approval belongs to old submission", task: aggregate({ ...approved(), submissions: [{ id: "submission-old", taskId: "task-1", sequence: 1, previousSubmissionId: null, submittedById: "assignee", submittedAt: now, summary: "old", note: null }, { id: "submission-2", taskId: "task-1", sequence: 2, previousSubmissionId: "submission-old", submittedById: "assignee", submittedAt: now, summary: "new", note: null }], currentSubmissionId: "submission-2", currentSubmissionSequence: 2, reviewDecisions: [{ id: "approval-old", submissionId: "submission-old", decision: "RESULT_APPROVED", reason: null, decidedById: "approver", decidedAt: now }] }), options: {}, code: "TASK_REVIEW_NOT_APPROVED" },
    { name: "already completed", task: aggregate({ ...approved(), state: state({ lifecycle: "COMPLETED", review: "RESULT_APPROVED" }) }), options: {}, code: "TASK_ALREADY_COMPLETED" },
    { name: "cancelled", task: aggregate({ ...approved(), state: state({ lifecycle: "CANCELLED", review: "RESULT_APPROVED" }) }), options: {}, code: "TASK_INVALID_TRANSITION" },
    { name: "archived", task: aggregate({ ...approved(), state: state({ lifecycle: "ARCHIVED", review: "RESULT_APPROVED" }) }), options: {}, code: "TASK_INVALID_TRANSITION" },
  ] as const;
  for (const item of cases) {
    const run = fixture(item.task, { relations: ["APPROVER"], ...item.options });
    await assert.rejects(() => run.executor.execute({ action: "CONFIRM_COMPLETION", rawCommand: { taskId: "task-1", expectedVersion: 3 }, actor: actor("approver"), idempotencyKey: item.name }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === item.code);
    assert.deepEqual(run.tasks.get("task-1"), item.task); assert.equal(run.uow.effects.length, 0); assert.equal(run.idempotency.begins, 0);
  }
  const conflictTask = approved();
  const conflict = fixture(conflictTask, { relations: ["APPROVER"] });
  await assert.rejects(() => conflict.executor.execute({ action: "CONFIRM_COMPLETION", rawCommand: { taskId: "task-1", expectedVersion: 2 }, actor: actor("approver"), idempotencyKey: "completion-version-conflict" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_CONCURRENCY_CONFLICT");
  assert.deepEqual(conflict.tasks.get("task-1"), conflictTask); assert.equal(conflict.uow.effects.length, 0); assert.equal(conflict.idempotency.begins, 0);
});

test("B1 effect payloads carry the exact typed action facts and no confidential preview", async () => {
  const submitRun = fixture(aggregate(), { relations: ["PRIMARY_ASSIGNEE"], scopes: ["ASSIGNED_SCOPE"] });
  const submit = await submitRun.executor.execute({ action: "SUBMIT", rawCommand: { taskId: "task-1", summary: "Result", expectedVersion: 3 }, actor: actor("assignee"), idempotencyKey: "payload-submit" });
  const submitPayload = submit.effects.domainEvents[0]?.payload;
  assert.equal(submitPayload?.submissionId, submit.task.currentSubmissionId); assert.equal(submitPayload?.submissionSequence, 1); assert.equal(submitPayload?.previousSubmissionId, null); assert.equal(submitPayload?.submittedById, "assignee");
  assert.equal(submit.effects.notifications[0]?.preview, null);
  const changesRun = fixture(submitted(), { relations: ["REVIEWER"] });
  const changes = await changesRun.executor.execute({ action: "REQUEST_CHANGES", rawCommand: { taskId: "task-1", submissionId: "submission-1", reason: "Evidence", expectedVersion: 3 }, actor: actor("reviewer"), idempotencyKey: "payload-changes" });
  const changesPayload = changes.effects.domainEvents[0]?.payload;
  assert.equal(changesPayload?.submissionId, "submission-1"); assert.equal(changesPayload?.reason, "Evidence"); assert.equal(changesPayload?.decidedById, "reviewer");
  const approvalRun = fixture(submitted(), { relations: ["APPROVER"] });
  const approval = await approvalRun.executor.execute({ action: "APPROVE_RESULT", rawCommand: { taskId: "task-1", submissionId: "submission-1", expectedVersion: 3 }, actor: actor("approver"), idempotencyKey: "payload-approval" });
  assert.equal(approval.effects.domainEvents[0]?.payload.approvedById, "approver"); assert.equal(approval.effects.domainEvents[0]?.payload.newReviewState, "RESULT_APPROVED");
  const completionRun = fixture(approved(), { relations: ["APPROVER"] });
  const completion = await completionRun.executor.execute({ action: "CONFIRM_COMPLETION", rawCommand: { taskId: "task-1", expectedVersion: 3 }, actor: actor("approver"), idempotencyKey: "payload-complete" });
  const completionPayload = completion.effects.domainEvents[0]?.payload;
  assert.equal(completionPayload?.submissionId, "submission-1"); assert.equal(completionPayload?.completedById, "approver"); assert.equal(completionPayload?.newLifecycle, "COMPLETED"); assert.equal(completionPayload?.reviewState, "RESULT_APPROVED"); assert.equal(completionPayload?.progressPercent, 100);
});

test("B1 replay is side-effect free and identity conflicts reject different actor company or command", async () => {
  const replayCases = [
    { action: "SUBMIT" as const, current: aggregate(), command: { taskId: "task-1", summary: "Result", expectedVersion: 3 }, relation: "PRIMARY_ASSIGNEE" as const, scope: "ASSIGNED_SCOPE" as const, actorId: "assignee" },
    { action: "REQUEST_CHANGES" as const, current: submitted(), command: { taskId: "task-1", submissionId: "submission-1", reason: "Fix", expectedVersion: 3 }, relation: "REVIEWER" as const, scope: "PARTICIPATING" as const, actorId: "reviewer" },
    { action: "APPROVE_RESULT" as const, current: submitted(), command: { taskId: "task-1", submissionId: "submission-1", expectedVersion: 3 }, relation: "APPROVER" as const, scope: "PARTICIPATING" as const, actorId: "approver" },
    { action: "CONFIRM_COMPLETION" as const, current: approved(), command: { taskId: "task-1", expectedVersion: 3 }, relation: "APPROVER" as const, scope: "PARTICIPATING" as const, actorId: "approver" },
  ];
  for (const item of replayCases) {
    const run = fixture(item.current, { relations: [item.relation], scopes: [item.scope] }); run.idempotency.replay = { task: aggregate({ id: "stored" }), effects: emptyEffects() };
    const result = await run.executor.execute({ action: item.action, rawCommand: item.command, actor: actor(item.actorId), idempotencyKey: `replay-${item.action}` });
    assert.equal(result.task.id, "stored"); assert.equal(run.idCalls(), 0); assert.equal(run.uow.effects.length, 0); assert.equal(run.idempotency.begins, 0);
  }
  const conflict = fixture(submitted(), { relations: ["APPROVER"] });
  conflict.idempotency.inspection = { status: "CONFLICT" };
  await assert.rejects(() => conflict.executor.execute({ action: "APPROVE_RESULT", rawCommand: { taskId: "task-1", submissionId: "submission-1", expectedVersion: 3 }, actor: { ...actor("other"), companyId: "other-company" }, idempotencyKey: "same-key" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_IDEMPOTENCY_CONFLICT");
  assert.equal(conflict.uow.effects.length, 0); assert.equal(conflict.idempotency.begins, 0);
});

test("SUBMIT REQUEST_CHANGES APPROVE_RESULT and CONFIRM_COMPLETION each use one clock instant", async () => {
  const cases = [
    { action: "SUBMIT" as const, current: aggregate(), command: { taskId: "task-1", summary: "Result", expectedVersion: 3 }, relation: "PRIMARY_ASSIGNEE" as const, scope: "ASSIGNED_SCOPE" as const, actorId: "assignee" },
    { action: "REQUEST_CHANGES" as const, current: submitted(), command: { taskId: "task-1", submissionId: "submission-1", reason: "Fix", expectedVersion: 3 }, relation: "REVIEWER" as const, scope: "PARTICIPATING" as const, actorId: "reviewer" },
    { action: "APPROVE_RESULT" as const, current: submitted(), command: { taskId: "task-1", submissionId: "submission-1", expectedVersion: 3 }, relation: "APPROVER" as const, scope: "PARTICIPATING" as const, actorId: "approver" },
    { action: "CONFIRM_COMPLETION" as const, current: approved(), command: { taskId: "task-1", expectedVersion: 3 }, relation: "APPROVER" as const, scope: "PARTICIPATING" as const, actorId: "approver" },
  ];
  for (const item of cases) {
    const run = fixture(item.current, { relations: [item.relation], scopes: [item.scope] });
    const result = await run.executor.execute({ action: item.action, rawCommand: item.command, actor: actor(item.actorId), idempotencyKey: `clock-${item.action}` });
    assert.equal(run.clockCalls(), 1);
    assert.equal(result.effects.domainEvents[0]?.occurredAt.getTime(), now.getTime());
    assert.equal(result.effects.activities[0]?.occurredAt.getTime(), now.getTime());
    assert.equal(result.effects.audits[0]?.occurredAt.getTime(), now.getTime());
  }
});
