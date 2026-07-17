import assert from "node:assert/strict";
import test from "node:test";
import {
  CoreTaskExecutor,
  resolveActiveHandover,
  type CoreTaskAggregate,
  type WorkManagementActorContext,
} from "../application/core-task-executor";
import { emptyCoreTaskEffects, type CoreTaskEffects } from "../application/core-task-effects";
import type { WorkManagementActorRelation } from "../application/actor-policy";
import type { CoreTaskTransactionContext, CoreTaskUnitOfWork } from "../application/core-task-ports";
import type { IdempotencyInspection, IdempotencyRequest, StableCoreTaskExecutionResult } from "../application/core-task-idempotency";
import { resolveTransitionPolicy } from "../domain/transition-policies";
import { WorkManagementDomainError } from "../errors/codes";
import type { WorkManagementPermission, WorkManagementScope } from "../permissions/contract";

const now = new Date("2026-07-16T08:00:00.000Z");
const actions = ["REQUEST_HANDOVER", "ACCEPT_HANDOVER", "REJECT_HANDOVER", "APPROVE_HANDOVER", "EXECUTE_HANDOVER"] as const;
type HandoverAction = (typeof actions)[number];
const permissions: Record<HandoverAction, WorkManagementPermission> = {
  REQUEST_HANDOVER: "task.handover.request", ACCEPT_HANDOVER: "task.handover.accept", REJECT_HANDOVER: "task.handover.reject", APPROVE_HANDOVER: "task.handover.approve", EXECUTE_HANDOVER: "task.handover.execute",
};
const state = (patch: Partial<CoreTaskAggregate["state"]> = {}): CoreTaskAggregate["state"] => ({ lifecycle: "IN_PROGRESS", acceptance: "ACCEPTED", execution: "ACTIVE", review: "NOT_SUBMITTED", handover: "NONE", waitingReason: null, ...patch });
const task = (patch: Partial<CoreTaskAggregate> = {}): CoreTaskAggregate => ({
  id: "task-1", creatorId: "manager", assignedById: "manager", primaryAssigneeId: "assignee-a", projectId: "project-1", confidentiality: "NORMAL", requiresIndependentReviewer: false, reviewerId: null, approverId: "manager", participants: [],
  state: state(), deadlineAt: new Date("2026-07-20"), progressPercent: 40, version: 3, activeBlockerId: null,
  submissions: [], reviewDecisions: [], completionHistory: [], archiveHistory: [], restoreHistory: [], reopenHistory: [], cancellationHistory: [], activeArchiveId: null, archiveGeneration: 0, preArchiveStateSnapshot: null,
  handoverGeneration: 0, activeHandoverId: null, activeHandoverReceiverId: null, handoverRequests: [], handoverDecisions: [], handoverExecutions: [],
  ...patch, assignmentHistory: patch.assignmentHistory ?? [],
});
const actor = (action: HandoverAction, actorId: string, options: { type?: "USER" | "SYSTEM"; scopes?: readonly WorkManagementScope[]; permissions?: readonly WorkManagementPermission[] } = {}): WorkManagementActorContext => ({
  actorType: options.type ?? "USER", actorId, companyId: null, permissionSet: new Set(options.permissions ?? [permissions[action]]), resolvedScopes: options.scopes ?? [], correlationId: "corr", causationId: "cause", requestId: "request",
});
const command = (action: HandoverAction, version = 3, suffix = "A") => {
  if (action === "REQUEST_HANDOVER") return { taskId: "task-1", receiverId: "assignee-b", reason: `Coverage ${suffix}`, expectedVersion: version };
  if (action === "REJECT_HANDOVER") return { taskId: "task-1", handoverId: "handover:1", reason: `Unavailable ${suffix}`, expectedVersion: version };
  return { taskId: "task-1", handoverId: "handover:1", expectedVersion: version };
};

class Idempotency {
  inspection: IdempotencyInspection = { status: "PROCEED" };
  inspectionFactory: ((request: IdempotencyRequest) => IdempotencyInspection) | null = null;
  lastRequest: IdempotencyRequest | null = null;
  begins = 0; completions = 0; aborts = 0; beginFails = false;
  async inspect(request: IdempotencyRequest): Promise<IdempotencyInspection> { this.lastRequest = structuredClone(request); return this.inspectionFactory ? this.inspectionFactory(request) : this.inspection; }
  async begin(): Promise<void> { this.begins += 1; if (this.beginFails) throw new WorkManagementDomainError("TASK_CONCURRENCY_CONFLICT"); }
  async complete(): Promise<void> { this.completions += 1; }
  async abort(): Promise<void> { this.aborts += 1; }
}
class Uow implements CoreTaskUnitOfWork {
  runs = 0; effects: CoreTaskEffects[] = []; failStage = false;
  private tail: Promise<void> = Promise.resolve();
  constructor(readonly store: Map<string, CoreTaskAggregate>, readonly idempotency: Idempotency) {}
  async run<T>(operation: (transaction: CoreTaskTransactionContext) => Promise<T>): Promise<T> {
    let release!: () => void;
    const previous = this.tail;
    this.tail = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    this.runs += 1;
    const before = structuredClone([...this.store.entries()]); const staged = structuredClone(this.effects); const complete = this.idempotency.completions;
    try {
      const result = await operation({
        tasks: { create: async () => false, compareAndSave: async (id, expected, next) => { const value = this.store.get(id); if (!value || value.version !== expected) return false; this.store.set(id, structuredClone(next)); return true; } },
        effects: { stage: async (effects) => { if (this.failStage) throw new WorkManagementDomainError("TASK_CONCURRENCY_CONFLICT"); this.effects.push(structuredClone(effects)); } },
        outbox: { stage: async () => {} },
        idempotency: this.idempotency,
      });
      return result;
    } catch (error) { this.store.clear(); for (const [id, value] of before) this.store.set(id, value); this.effects = staged; this.idempotency.completions = complete; throw error; }
    finally { release(); }
  }
}
function relationsFor(current: CoreTaskAggregate, actorId: string): readonly WorkManagementActorRelation[] {
  if (actorId === current.activeHandoverReceiverId) return ["HANDOVER_RECEIVER"];
  if (actorId === current.primaryAssigneeId) return ["PRIMARY_ASSIGNEE"];
  if (actorId === current.creatorId) return ["CREATOR"];
  if (actorId === current.assignedById) return ["ASSIGNED_BY"];
  return [];
}
function fixture(current: CoreTaskAggregate, options: { eligible?: "OK" | "INACTIVE" | "NO_PROJECT_ACCESS"; scopes?: readonly WorkManagementScope[]; relations?: readonly WorkManagementActorRelation[]; confidential?: boolean } = {}) {
  const store = new Map([[current.id, structuredClone(current)]]); const idempotency = new Idempotency(); const uow = new Uow(store, idempotency); let ids = 0; let clocks = 0; let finds = 0;
  const executor = new CoreTaskExecutor({
    tasks: { findById: async (id) => { finds += 1; return structuredClone(store.get(id) ?? null); } },
    users: { evaluateAssignee: async () => options.eligible === "INACTIVE" ? { eligible: false as const, reason: "INACTIVE" as const } : options.eligible === "NO_PROJECT_ACCESS" ? { eligible: false as const, reason: "NO_PROJECT_ACCESS" as const } : { eligible: true as const, projectAccess: true as const } },
    scopes: { resolve: async (value, principal) => ({ scopes: options.scopes ?? (principal.actorId === value.activeHandoverReceiverId ? ["HANDOVER_SCOPE"] : principal.actorType === "SYSTEM" ? [] : ["PROJECT"]), relations: options.relations ?? relationsFor(value, principal.actorId), confidentialAllowed: options.confidential ?? true }), resolveCreate: async () => ({ projectExists: true, projectAccessible: true, scopes: ["OWN"], confidentialAllowed: true }) },
    unitOfWork: uow, idempotency, clock: { now: () => { clocks += 1; return now; } }, idGenerator: { next: () => String(++ids) }, transitionPolicies: { resolve: resolveTransitionPolicy }, completionReadiness: { evaluate: async () => ({ ready: true }) },
  });
  return { executor, store, idempotency, uow, ids: () => ids, clocks: () => clocks, finds: () => finds };
}
async function reject(run: ReturnType<typeof fixture>, action: HandoverAction, raw: unknown, principal: WorkManagementActorContext, code: string): Promise<void> {
  const before = structuredClone(run.store.get("task-1"));
  await assert.rejects(() => run.executor.execute({ action, rawCommand: raw, actor: principal, idempotencyKey: `${action}-deny` }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === code);
  assert.deepEqual(run.store.get("task-1"), before); assert.equal(run.uow.runs, 0); assert.equal(run.uow.effects.length, 0); assert.equal(run.idempotency.begins, 0); assert.equal(run.ids(), 0);
}
async function requested(): Promise<CoreTaskAggregate> {
  const run = fixture(task());
  return (await run.executor.execute({ action: "REQUEST_HANDOVER", rawCommand: command("REQUEST_HANDOVER"), actor: actor("REQUEST_HANDOVER", "assignee-a"), idempotencyKey: "request" })).task;
}
async function accepted(): Promise<CoreTaskAggregate> {
  const run = fixture(await requested());
  return (await run.executor.execute({ action: "ACCEPT_HANDOVER", rawCommand: command("ACCEPT_HANDOVER", 4), actor: actor("ACCEPT_HANDOVER", "assignee-b"), idempotencyKey: "accept" })).task;
}
async function approved(): Promise<CoreTaskAggregate> {
  const run = fixture(await accepted());
  return (await run.executor.execute({ action: "APPROVE_HANDOVER", rawCommand: command("APPROVE_HANDOVER", 5), actor: actor("APPROVE_HANDOVER", "manager"), idempotencyKey: "approve" })).task;
}
const validFor = async (action: HandoverAction): Promise<CoreTaskAggregate> => action === "REQUEST_HANDOVER" ? task() : action === "ACCEPT_HANDOVER" || action === "REJECT_HANDOVER" ? requested() : action === "APPROVE_HANDOVER" ? accepted() : approved();
const principalFor = (action: HandoverAction, options: { scopes?: readonly WorkManagementScope[]; relations?: readonly WorkManagementActorRelation[]; permissions?: readonly WorkManagementPermission[] } = {}): WorkManagementActorContext => actor(
  action,
  action === "REQUEST_HANDOVER" ? "assignee-a" : action === "ACCEPT_HANDOVER" || action === "REJECT_HANDOVER" ? "assignee-b" : action === "APPROVE_HANDOVER" ? "manager" : "system",
  { type: action === "EXECUTE_HANDOVER" ? "SYSTEM" : "USER", scopes: options.scopes, permissions: options.permissions },
);

test("REQUEST_HANDOVER appends generation one without transferring the assignee", async () => {
  const source = task(); const run = fixture(source); const result = await run.executor.execute({ action: "REQUEST_HANDOVER", rawCommand: command("REQUEST_HANDOVER"), actor: actor("REQUEST_HANDOVER", "assignee-a"), idempotencyKey: "request" });
  assert.equal(result.task.primaryAssigneeId, "assignee-a"); assert.equal(result.task.handoverGeneration, 1); assert.equal(result.task.activeHandoverReceiverId, "assignee-b"); assert.equal(result.task.handoverRequests?.length, 1); assert.equal(result.effects.handoverRequestIntents.length, 1); assert.equal(result.effects.assignmentIntents.length, 0); assert.deepEqual(result.task.assignmentHistory, []); assert.equal(result.effects.domainEvents[0]?.type, "TaskHandoverRequested");
});
test("ACCEPT_HANDOVER appends an immutable accepted decision for only the designated receiver", async () => {
  const source = await requested(); const run = fixture(source); const result = await run.executor.execute({ action: "ACCEPT_HANDOVER", rawCommand: command("ACCEPT_HANDOVER", 4), actor: actor("ACCEPT_HANDOVER", "assignee-b"), idempotencyKey: "accept" });
  assert.equal(result.task.state.handover, "PENDING_APPROVAL"); assert.equal(result.task.handoverDecisions?.[0]?.decision, "ACCEPTED"); assert.equal(result.task.activeHandoverId, "handover:1"); assert.equal(result.effects.handoverDecisionIntents[0]?.decision, "ACCEPTED");
});
test("REJECT_HANDOVER closes only the current projection and preserves history for a new generation", async () => {
  const source = await requested(); const run = fixture(source); const rejected = await run.executor.execute({ action: "REJECT_HANDOVER", rawCommand: command("REJECT_HANDOVER", 4), actor: actor("REJECT_HANDOVER", "assignee-b"), idempotencyKey: "reject" }); const old = structuredClone(rejected.task.handoverRequests?.[0]);
  const retry = fixture(rejected.task); const next = await retry.executor.execute({ action: "REQUEST_HANDOVER", rawCommand: { ...command("REQUEST_HANDOVER", 5), receiverId: "assignee-c" }, actor: actor("REQUEST_HANDOVER", "assignee-a"), idempotencyKey: "request-2" });
  assert.equal(rejected.task.activeHandoverId, null); assert.equal(rejected.task.handoverDecisions?.[0]?.decision, "REJECTED"); assert.equal(next.task.handoverGeneration, 2); assert.deepEqual(next.task.handoverRequests?.[0], old); assert.equal(next.task.handoverRequests?.[1]?.toAssigneeId, "assignee-c");
});
test("APPROVE_HANDOVER and EXECUTE_HANDOVER transfer the assignee atomically only at execution", async () => {
  const source = await approved(); const before = structuredClone(source); const run = fixture(source); const result = await run.executor.execute({ action: "EXECUTE_HANDOVER", rawCommand: command("EXECUTE_HANDOVER", 6), actor: actor("EXECUTE_HANDOVER", "system", { type: "SYSTEM" }), idempotencyKey: "execute" });
  assert.equal(before.primaryAssigneeId, "assignee-a"); assert.equal(result.task.primaryAssigneeId, "assignee-b"); assert.equal(result.task.assignedById, "system"); assert.equal(result.task.activeHandoverId, null); assert.equal(result.task.handoverExecutions?.length, 1); assert.equal(result.effects.assignmentIntents.length, 1); assert.equal(result.effects.handoverExecutionIntents.length, 1); assert.deepEqual(result.task.assignmentHistory, [{ id: "assignment:2", taskId: "task-1", generation: 1, previousAssigneeId: "assignee-a", newAssigneeId: "assignee-b", assignedById: "system", sourceAction: "EXECUTE_HANDOVER", sourceHandoverId: "handover:1", reason: "handover:handover:1", effectiveAt: now }]); assert.equal(result.effects.domainEvents[0]?.type, "TaskHandoverEffective");
});

test("SYSTEM EXECUTE_HANDOVER records the trusted effective actor in assignment history", async () => {
  const run = fixture(await approved());
  const result = await run.executor.execute({ action: "EXECUTE_HANDOVER", rawCommand: command("EXECUTE_HANDOVER", 6), actor: actor("EXECUTE_HANDOVER", "system", { type: "SYSTEM" }), idempotencyKey: "system-provenance" });
  assert.equal(result.task.assignmentHistory[0]?.assignedById, "system");
  assert.equal(result.effects.domainEvents[0]?.actorId, "system");
  assert.equal(result.effects.activities[0]?.actorId, "system");
  assert.equal(result.effects.audits[0]?.actorId, "system");
});

test("privileged EXECUTE_HANDOVER records the frozen effective actor provenance", async () => {
  const run = fixture(await approved(), { scopes: ["COMPANY"] });
  const result = await run.executor.execute({ action: "EXECUTE_HANDOVER", rawCommand: command("EXECUTE_HANDOVER", 6), actor: actor("EXECUTE_HANDOVER", "privileged-human", { scopes: ["COMPANY"] }), idempotencyKey: "human-provenance" });
  assert.equal(result.task.assignmentHistory[0]?.assignedById, "privileged-human");
  assert.equal(result.effects.domainEvents[0]?.actorId, "privileged-human");
  assert.equal(result.effects.activities[0]?.actorId, "privileged-human");
  assert.equal(result.effects.audits[0]?.actorId, "privileged-human");
});

test("ASSIGN and EXECUTE_HANDOVER competing from the same projection commit one assignment generation", async () => {
  const source = { ...(await approved()), state: state({ lifecycle: "DRAFT", acceptance: "NOT_REQUIRED", handover: "APPROVED" }) };
  const run = fixture(source, { scopes: ["COMPANY"], relations: ["CREATOR"] });
  const assign = run.executor.execute({ action: "ASSIGN", rawCommand: { taskId: "task-1", primaryAssigneeId: "assignee-c", expectedVersion: 6, reason: "Rebalance" }, actor: actor("EXECUTE_HANDOVER", "manager", { permissions: ["task.update.assignee"], scopes: ["COMPANY"] }), idempotencyKey: "race-assign" });
  const handover = run.executor.execute({ action: "EXECUTE_HANDOVER", rawCommand: command("EXECUTE_HANDOVER", 6), actor: actor("EXECUTE_HANDOVER", "system", { type: "SYSTEM" }), idempotencyKey: "race-handover" });
  const outcomes = await Promise.allSettled([assign, handover]);
  const success = outcomes.filter((item): item is PromiseFulfilledResult<{ task: CoreTaskAggregate; effects: CoreTaskEffects }> => item.status === "fulfilled");
  const failure = outcomes.filter((item): item is PromiseRejectedResult => item.status === "rejected");
  assert.equal(success.length, 1);
  assert.equal(failure.length, 1);
  assert.ok(failure[0]?.reason instanceof WorkManagementDomainError);
  assert.equal(failure[0].reason.code, "TASK_CONCURRENCY_CONFLICT");
  const committed = run.store.get("task-1");
  assert.equal(committed?.assignmentHistory.length, 1);
  assert.equal(committed?.assignmentHistory[0]?.generation, 1);
  assert.equal(committed?.primaryAssigneeId, committed?.assignmentHistory[0]?.newAssigneeId);
  assert.equal(committed?.assignedById, committed?.assignmentHistory[0]?.assignedById);
  assert.equal(run.uow.effects.length, 1);
  assert.equal(run.uow.effects[0]?.assignmentIntents.length, 1);
  assert.equal(run.uow.effects[0]?.handoverExecutionIntents.length, committed?.primaryAssigneeId === "assignee-b" ? 1 : 0);
});

test("handover pre-execution actions preserve assignment history", async () => {
  assert.deepEqual((await requested()).assignmentHistory, []);
  assert.deepEqual((await accepted()).assignmentHistory, []);
  const rejected = await fixture(await requested()).executor.execute({ action: "REJECT_HANDOVER", rawCommand: command("REJECT_HANDOVER", 4), actor: actor("REJECT_HANDOVER", "assignee-b"), idempotencyKey: "history-reject" });
  assert.deepEqual(rejected.task.assignmentHistory, []);
  assert.deepEqual((await approved()).assignmentHistory, []);
});

test("handover authorization matrix denies all five actions before mutation", async (t) => {
  const valid: Record<HandoverAction, () => Promise<CoreTaskAggregate>> = { REQUEST_HANDOVER: async () => task(), ACCEPT_HANDOVER: requested, REJECT_HANDOVER: requested, APPROVE_HANDOVER: accepted, EXECUTE_HANDOVER: approved };
  for (const action of actions) {
    await t.test(`${action} missing permission`, async () => reject(fixture(await valid[action]()), action, command(action, action === "REQUEST_HANDOVER" ? 3 : action === "ACCEPT_HANDOVER" || action === "REJECT_HANDOVER" ? 4 : action === "APPROVE_HANDOVER" ? 5 : 6), actor(action, action === "ACCEPT_HANDOVER" || action === "REJECT_HANDOVER" ? "assignee-b" : action === "EXECUTE_HANDOVER" ? "system" : action === "REQUEST_HANDOVER" ? "assignee-a" : "manager", { type: action === "EXECUTE_HANDOVER" ? "SYSTEM" : "USER", permissions: [] }), "TASK_ACCESS_DENIED"));
    await t.test(`${action} confidentiality denied`, async () => { const value = await valid[action](); value.confidentiality = "CONFIDENTIAL"; const principal = actor(action, action === "ACCEPT_HANDOVER" || action === "REJECT_HANDOVER" ? "assignee-b" : action === "EXECUTE_HANDOVER" ? "system" : action === "REQUEST_HANDOVER" ? "assignee-a" : "manager", { type: action === "EXECUTE_HANDOVER" ? "SYSTEM" : "USER" }); return reject(fixture(value, { confidential: false }), action, command(action, value.version), principal, "TASK_CONFIDENTIAL_ACCESS_DENIED"); });
  }
});
test("receiver relation, privileged non-bypass, separation, and currentness fail closed", async () => {
  const source = await requested();
  await reject(fixture(source, { scopes: ["HANDOVER_SCOPE"], relations: [] }), "ACCEPT_HANDOVER", command("ACCEPT_HANDOVER", 4), actor("ACCEPT_HANDOVER", "project-member", { scopes: ["HANDOVER_SCOPE"] }), "TASK_ACCESS_DENIED");
  await reject(fixture(source, { scopes: ["PROJECT"], relations: [] }), "ACCEPT_HANDOVER", command("ACCEPT_HANDOVER", 4), actor("ACCEPT_HANDOVER", "manager", { scopes: ["PROJECT"] }), "TASK_PROJECT_ACCESS_REQUIRED");
  const independent = await accepted(); independent.requiresIndependentReviewer = true;
  await reject(fixture(independent), "APPROVE_HANDOVER", command("APPROVE_HANDOVER", 5), actor("APPROVE_HANDOVER", "assignee-a"), "TASK_HANDOVER_DECISION_CONFLICT");
  const changed = await approved(); changed.primaryAssigneeId = "other";
  await reject(fixture(changed), "EXECUTE_HANDOVER", command("EXECUTE_HANDOVER", 6), actor("EXECUTE_HANDOVER", "system", { type: "SYSTEM" }), "TASK_HANDOVER_SOURCE_CHANGED");
});
test("handover scope, relation, and expected-version matrices follow the registered actor policies", async (t) => {
  for (const action of actions) {
    await t.test(`${action} denied scope`, async () => {
      const current = await validFor(action);
      const principal = action === "EXECUTE_HANDOVER" ? actor(action, "operator", { scopes: ["PARTICIPATING"] }) : principalFor(action);
      await reject(fixture(current, { scopes: ["PARTICIPATING"] }), action, command(action, current.version), principal, "TASK_PROJECT_ACCESS_REQUIRED");
    });
    await t.test(`${action} registered relation policy`, async () => {
      const current = await validFor(action);
      if (action === "EXECUTE_HANDOVER") {
        const run = fixture(current, { scopes: [], relations: [] });
        const result = await run.executor.execute({ action, rawCommand: command(action, current.version), actor: actor(action, "system", { type: "SYSTEM" }), idempotencyKey: "system-no-relation" });
        assert.equal(result.task.primaryAssigneeId, "assignee-b");
        return;
      }
      const scopes: readonly WorkManagementScope[] = action === "ACCEPT_HANDOVER" || action === "REJECT_HANDOVER" ? ["HANDOVER_SCOPE"] : ["OWN"];
      await reject(fixture(current, { scopes, relations: [] }), action, command(action, current.version), principalFor(action), "TASK_ACCESS_DENIED");
    });
    await t.test(`${action} version conflict`, async () => {
      const current = await validFor(action);
      await reject(fixture(current), action, command(action, current.version - 1), principalFor(action), "TASK_CONCURRENCY_CONFLICT");
    });
  }
});
test("receiver eligibility and active request currentness are server validated", async () => {
  await reject(fixture(task(), { eligible: "INACTIVE" }), "REQUEST_HANDOVER", command("REQUEST_HANDOVER"), actor("REQUEST_HANDOVER", "assignee-a"), "TASK_HANDOVER_RECEIVER_INACTIVE");
  await reject(fixture(task(), { eligible: "NO_PROJECT_ACCESS" }), "REQUEST_HANDOVER", command("REQUEST_HANDOVER"), actor("REQUEST_HANDOVER", "assignee-a"), "TASK_HANDOVER_RECEIVER_PROJECT_ACCESS");
  const source = await requested(); await reject(fixture(source), "ACCEPT_HANDOVER", { ...command("ACCEPT_HANDOVER", 4), handoverId: "other" }, actor("ACCEPT_HANDOVER", "assignee-b"), "TASK_HANDOVER_NOT_CURRENT");
  assert.throws(() => resolveActiveHandover(task({ activeHandoverId: "missing", activeHandoverReceiverId: "assignee-b" })), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_HANDOVER_RECORD_NOT_FOUND");
});
test("active handover resolver rejects stale, cross-task, rejected, mismatched, and ambiguous projections", async () => {
  const source = await requested(); const record = source.handoverRequests?.[0]; assert.ok(record);
  const cases = [
    { name: "stale generation", value: task({ ...source, handoverGeneration: 2 }), code: "TASK_HANDOVER_NOT_CURRENT" },
    { name: "cross task request", value: task({ ...source, handoverRequests: [{ ...record, taskId: "other-task" }] }), code: "TASK_HANDOVER_NOT_CURRENT" },
    { name: "receiver projection mismatch", value: task({ ...source, activeHandoverReceiverId: "other" }), code: "TASK_HANDOVER_RECEIVER_INVALID" },
    { name: "rejected active request", value: task({ ...source, handoverDecisions: [{ id: "decision-1", taskId: "task-1", handoverId: record.id, generation: record.generation, decision: "REJECTED", reason: "No", decidedById: "assignee-b", decidedAt: now, aggregateVersion: 4 }] }), code: "TASK_HANDOVER_NOT_CURRENT" },
    { name: "multiple current records", value: task({ ...source, handoverRequests: [record, { ...record }] }), code: "TASK_HANDOVER_NOT_CURRENT" },
  ];
  for (const item of cases) assert.throws(() => resolveActiveHandover(item.value), (error: unknown) => error instanceof WorkManagementDomainError && error.code === item.code, item.name);
});
test("handover actions preserve B1 and B2 histories while changing only handover projections", async () => {
  const source = task({ submissions: [{ id: "submission-1", taskId: "task-1", sequence: 1, previousSubmissionId: null, submittedById: "assignee-a", submittedAt: now, summary: "result", note: null }], reviewDecisions: [{ id: "review-1", submissionId: "submission-1", decision: "RESULT_APPROVED", reason: null, decidedById: "manager", decidedAt: now }], completionHistory: [{ id: "completion-1", taskId: "task-1", submissionId: "submission-1", completedById: "manager", completedAt: now, lifecycleBeforeCompletion: "SUBMITTED", lifecycleAfterCompletion: "COMPLETED", aggregateVersion: 2 }], archiveHistory: [{ id: "archive-1", taskId: "task-1", generation: 1, archivedById: "manager", archivedAt: now, reason: null, preArchiveState: state() }], restoreHistory: [], });
  const originals = { submissions: structuredClone(source.submissions), reviews: structuredClone(source.reviewDecisions), completions: structuredClone(source.completionHistory), archives: structuredClone(source.archiveHistory) };
  const requestRun = fixture(source); const requestedResult = await requestRun.executor.execute({ action: "REQUEST_HANDOVER", rawCommand: command("REQUEST_HANDOVER"), actor: actor("REQUEST_HANDOVER", "assignee-a"), idempotencyKey: "preserve-request" });
  const acceptRun = fixture(requestedResult.task); const acceptedResult = await acceptRun.executor.execute({ action: "ACCEPT_HANDOVER", rawCommand: command("ACCEPT_HANDOVER", 4), actor: actor("ACCEPT_HANDOVER", "assignee-b"), idempotencyKey: "preserve-accept" });
  const approveRun = fixture(acceptedResult.task); const approvedResult = await approveRun.executor.execute({ action: "APPROVE_HANDOVER", rawCommand: command("APPROVE_HANDOVER", 5), actor: actor("APPROVE_HANDOVER", "manager"), idempotencyKey: "preserve-approve" });
  const executeRun = fixture(approvedResult.task); const finalResult = await executeRun.executor.execute({ action: "EXECUTE_HANDOVER", rawCommand: command("EXECUTE_HANDOVER", 6), actor: actor("EXECUTE_HANDOVER", "system", { type: "SYSTEM" }), idempotencyKey: "preserve-execute" });
  for (const value of [requestedResult.task, acceptedResult.task, approvedResult.task, finalResult.task]) { assert.deepEqual(value.submissions, originals.submissions); assert.deepEqual(value.reviewDecisions, originals.reviews); assert.deepEqual(value.completionHistory, originals.completions); assert.deepEqual(value.archiveHistory, originals.archives); }
});
test("handover strict schemas reject server metadata before inspection", async (t) => {
  const fields = ["fromAssigneeId", "requestedById", "acceptedById", "rejectedById", "approvedById", "executedById", "generation", "activeHandoverId", "handoverState", "primaryAssigneeId", "handoverRequests", "handoverDecisions", "handoverExecutions"];
  for (const action of actions) for (const field of fields) await t.test(`${action} rejects ${field}`, async () => {
    const current = action === "REQUEST_HANDOVER" ? task() : action === "ACCEPT_HANDOVER" || action === "REJECT_HANDOVER" ? await requested() : action === "APPROVE_HANDOVER" ? await accepted() : await approved(); const run = fixture(current); const principal = actor(action, action === "REQUEST_HANDOVER" ? "assignee-a" : action === "ACCEPT_HANDOVER" || action === "REJECT_HANDOVER" ? "assignee-b" : action === "APPROVE_HANDOVER" ? "manager" : "system", { type: action === "EXECUTE_HANDOVER" ? "SYSTEM" : "USER" });
    await assert.rejects(() => run.executor.execute({ action, rawCommand: { ...command(action, current.version), [field]: field.includes("History") || field.includes("Requests") || field.includes("Decisions") || field.includes("Executions") ? [] : "server" }, actor: principal, idempotencyKey: `${action}-${field}` }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_COMMAND_INVALID");
    assert.equal(run.finds(), 0); assert.equal(run.idempotency.begins, 0); assert.equal(run.ids(), 0); assert.equal(run.uow.runs, 0);
  });
});
test("handover idempotency conflicts isolate identity fields and real commands", async (t) => {
  for (const action of actions) {
    for (const field of ["actorId", "companyId", "taskId", "fingerprint"] as const) await t.test(`${action} ${field}-only conflict`, async () => {
      const current = await validFor(action); const run = fixture(current); const stored: StableCoreTaskExecutionResult = { task: current, effects: emptyCoreTaskEffects() };
      run.idempotency.inspectionFactory = (incoming) => {
        const identity: IdempotencyRequest = field === "actorId" ? { ...incoming, actorId: "other-actor" } : field === "companyId" ? { ...incoming, companyId: "other-company" } : field === "taskId" ? { ...incoming, taskId: "other-task" } : { ...incoming, fingerprint: "other-fingerprint" };
        for (const key of ["key", "action", "actorId", "companyId", "taskId", "projectId", "fingerprint"] as const) assert.equal(identity[key] === incoming[key], key === field ? false : true);
        return { status: "REPLAY", identity, result: stored };
      };
      await reject(run, action, command(action, current.version), principalFor(action), "TASK_IDEMPOTENCY_CONFLICT");
    });
    await t.test(`${action} real command fingerprint conflict`, async () => {
      const current = await validFor(action); const run = fixture(current); const first = await run.executor.execute({ action, rawCommand: command(action, current.version, "A"), actor: principalFor(action), idempotencyKey: "same-key" }); const identity = run.idempotency.lastRequest; assert.ok(identity); run.idempotency.inspectionFactory = () => ({ status: "REPLAY", identity, result: first });
      const second = action === "REQUEST_HANDOVER" ? command(action, current.version, "B") : action === "REJECT_HANDOVER" ? command(action, current.version, "B") : command(action, current.version + 1, "B"); const before = structuredClone(run.store.get("task-1"));
      await assert.rejects(() => run.executor.execute({ action, rawCommand: second, actor: principalFor(action), idempotencyKey: "same-key" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_IDEMPOTENCY_CONFLICT"); assert.deepEqual(run.store.get("task-1"), before); assert.equal(run.uow.runs, 1);
    });
    await t.test(`${action} idempotency in progress`, async () => { const current = await validFor(action); const run = fixture(current); run.idempotency.inspection = { status: "IN_PROGRESS" }; await reject(run, action, command(action, current.version), principalFor(action), "TASK_IDEMPOTENCY_IN_PROGRESS"); });
    await t.test(`${action} begin failure generates no ID`, async () => { const current = await validFor(action); const run = fixture(current); run.idempotency.beginFails = true; const before = structuredClone(run.store.get("task-1")); await assert.rejects(() => run.executor.execute({ action, rawCommand: command(action, current.version), actor: principalFor(action), idempotencyKey: "begin" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_CONCURRENCY_CONFLICT"); assert.equal(run.ids(), 0); assert.equal(run.uow.runs, 0); assert.deepEqual(run.store.get("task-1"), before); });
  }
});
test("all handover actions roll back, replay, use one clock, and preserve inputs", async (t) => {
  const source: Record<HandoverAction, () => Promise<CoreTaskAggregate>> = { REQUEST_HANDOVER: async () => task(), ACCEPT_HANDOVER: requested, REJECT_HANDOVER: requested, APPROVE_HANDOVER: accepted, EXECUTE_HANDOVER: approved };
  for (const action of actions) {
    const principal = () => actor(action, action === "REQUEST_HANDOVER" ? "assignee-a" : action === "ACCEPT_HANDOVER" || action === "REJECT_HANDOVER" ? "assignee-b" : action === "APPROVE_HANDOVER" ? "manager" : "system", { type: action === "EXECUTE_HANDOVER" ? "SYSTEM" : "USER" });
    await t.test(`${action} rollback`, async () => { const current = await source[action](); const run = fixture(current); run.uow.failStage = true; await assert.rejects(() => run.executor.execute({ action, rawCommand: command(action, current.version), actor: principal(), idempotencyKey: `${action}-rollback` })); assert.deepEqual(run.store.get("task-1"), current); assert.equal(run.idempotency.completions, 0); });
    await t.test(`${action} replay`, async () => { const current = await source[action](); const run = fixture(current); const result: StableCoreTaskExecutionResult = { task: task({ id: "replay" }), effects: emptyCoreTaskEffects() }; run.idempotency.inspectionFactory = (request) => ({ status: "REPLAY", identity: structuredClone(request), result }); const replay = await run.executor.execute({ action, rawCommand: command(action, current.version), actor: principal(), idempotencyKey: `${action}-replay` }); assert.equal(replay.task.id, "replay"); assert.equal(run.ids(), 0); assert.equal(run.uow.runs, 0); });
    await t.test(`${action} clock and immutability`, async () => { const current = await source[action](); const original = structuredClone(current); const raw = command(action, current.version); Object.freeze(current); const run = fixture(current); const result = await run.executor.execute({ action, rawCommand: raw, actor: principal(), idempotencyKey: `${action}-clock` }); assert.equal(run.clocks(), 1); assert.deepEqual(current, original); assert.notEqual(result.task, current); assert.equal(result.effects.domainEvents[0]?.occurredAt.getTime(), now.getTime()); });
  }
});
