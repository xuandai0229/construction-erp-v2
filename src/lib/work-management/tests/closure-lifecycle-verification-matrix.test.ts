import assert from "node:assert/strict";
import test from "node:test";
import { CoreTaskExecutor, type CoreTaskAggregate, type WorkManagementActorContext } from "../application/core-task-executor";
import { emptyCoreTaskEffects, type CoreTaskEffects } from "../application/core-task-effects";
import type { CoreTaskTransactionContext, CoreTaskUnitOfWork } from "../application/core-task-ports";
import type { IdempotencyInspection, IdempotencyRequest, StableCoreTaskExecutionResult } from "../application/core-task-idempotency";
import { resolveTransitionPolicy } from "../domain/transition-policies";
import { WorkManagementDomainError } from "../errors/codes";
import type { WorkManagementActorRelation } from "../application/actor-policy";
import type { WorkManagementPermission, WorkManagementScope } from "../permissions/contract";

const now = new Date("2026-07-15T08:00:00.000Z");
const actions = ["REOPEN", "CANCEL", "ARCHIVE", "RESTORE"] as const;
type ClosureAction = (typeof actions)[number];
const permission: Record<ClosureAction, WorkManagementPermission> = { REOPEN: "task.reopen", CANCEL: "task.cancel", ARCHIVE: "task.archive", RESTORE: "task.restore" };
const state = (patch: Partial<CoreTaskAggregate["state"]> = {}): CoreTaskAggregate["state"] => ({ lifecycle: "IN_PROGRESS", acceptance: "ACCEPTED", execution: "ACTIVE", review: "NOT_SUBMITTED", handover: "NONE", waitingReason: null, ...patch });
const task = (patch: Partial<CoreTaskAggregate> = {}): CoreTaskAggregate => ({ id: "task-1", creatorId: "creator", assignedById: "manager", primaryAssigneeId: "assignee", projectId: "project", confidentiality: "NORMAL", requiresIndependentReviewer: false, reviewerId: null, approverId: null, participants: [], state: state(), deadlineAt: new Date("2026-07-20"), progressPercent: 50, version: 3, activeBlockerId: null, submissions: [], reviewDecisions: [], completionHistory: [], archiveHistory: [], restoreHistory: [], reopenHistory: [], cancellationHistory: [], activeArchiveId: null, archiveGeneration: 0, preArchiveStateSnapshot: null, ...patch, assignmentHistory: patch.assignmentHistory ?? [] });
const valid = (action: ClosureAction): CoreTaskAggregate => {
  if (action === "REOPEN") return task({ state: state({ lifecycle: "COMPLETED", review: "RESULT_APPROVED" }), completedById: "approver", completedAt: now, completionSubmissionId: "submission-1" });
  if (action === "CANCEL") return task();
  if (action === "ARCHIVE") return task({ state: state({ lifecycle: "CANCELLED" }) });
  const snapshot = state({ lifecycle: "CANCELLED" }); const record = { id: "archive-1", taskId: "task-1", generation: 1, archivedById: "creator", archivedAt: now, reason: null, preArchiveState: snapshot };
  return task({ state: state({ lifecycle: "ARCHIVED" }), activeArchiveId: "archive-1", archiveGeneration: 1, preArchiveStateSnapshot: snapshot, archiveHistory: [record] });
};
const command = (action: ClosureAction, version = 3, suffix = "A") => action === "REOPEN" ? { taskId: "task-1", reason: `Reopen ${suffix}`, expectedVersion: version } : action === "CANCEL" ? { taskId: "task-1", reason: `Cancel ${suffix}`, expectedVersion: version } : action === "RESTORE" ? { taskId: "task-1", reason: `Restore ${suffix}`, expectedVersion: version } : { taskId: "task-1", expectedVersion: version };
const actor = (action: ClosureAction, id = "creator", permissions: readonly WorkManagementPermission[] = [permission[action]], companyId: string | null = null): WorkManagementActorContext => ({ actorType: "USER", actorId: id, companyId, permissionSet: new Set(permissions), resolvedScopes: ["OWN"], correlationId: "corr", causationId: "cause", requestId: "request" });
class Idempotency {
  inspection: IdempotencyInspection = { status: "PROCEED" }; inspectionFactory: ((request: IdempotencyRequest) => IdempotencyInspection) | null = null; storedIdentity: IdempotencyRequest | null = null; storedResult: StableCoreTaskExecutionResult | null = null; lastInspectedRequest: IdempotencyRequest | null = null; inspects = 0; beginFails = false; begins = 0; completes = 0;
  async inspect(request: IdempotencyRequest): Promise<IdempotencyInspection> { this.inspects += 1; this.lastInspectedRequest = structuredClone(request); if (this.inspectionFactory) return this.inspectionFactory(request); if (this.storedIdentity && this.storedResult) return { status: "REPLAY", identity: structuredClone(this.storedIdentity), result: structuredClone(this.storedResult) }; return this.inspection; }
  async begin(): Promise<void> { this.begins += 1; if (this.beginFails) throw new WorkManagementDomainError("TASK_CONCURRENCY_CONFLICT"); }
  async complete(): Promise<void> { this.completes += 1; }
  async abort(): Promise<void> {}
}
const identityWithOnly = (request: IdempotencyRequest, patch: Partial<IdempotencyRequest>): IdempotencyRequest => ({ ...structuredClone(request), ...patch });
class Uow implements CoreTaskUnitOfWork {
  runs = 0; effects: CoreTaskEffects[] = [];
  constructor(readonly store: Map<string, CoreTaskAggregate>, readonly idempotency: Idempotency) {}
  async run<T>(operation: (transaction: CoreTaskTransactionContext) => Promise<T>): Promise<T> { this.runs += 1; return operation({ tasks: { create: async () => false, compareAndSave: async (id, version, next) => { const current = this.store.get(id); if (!current || current.version !== version) return false; this.store.set(id, structuredClone(next)); return true; } }, effects: { stage: async (effects) => { this.effects.push(structuredClone(effects)); } }, outbox: { stage: async () => {} }, idempotency: this.idempotency }); }
}
function fixture(current: CoreTaskAggregate, options: { scopes?: readonly WorkManagementScope[]; relations?: readonly WorkManagementActorRelation[]; confidential?: boolean } = {}) {
  const store = new Map([[current.id, structuredClone(current)]]); const idempotency = new Idempotency(); const uow = new Uow(store, idempotency); let ids = 0; let finds = 0;
  const executor = new CoreTaskExecutor({ tasks: { findById: async (id) => { finds += 1; return structuredClone(store.get(id) ?? null); } }, users: { evaluateAssignee: async () => ({ eligible: true, projectAccess: true }) }, scopes: { resolve: async () => ({ scopes: options.scopes ?? ["OWN"], relations: options.relations ?? ["CREATOR"], confidentialAllowed: options.confidential ?? true }), resolveCreate: async () => ({ projectExists: true, projectAccessible: true, scopes: ["OWN"], confidentialAllowed: true }) }, unitOfWork: uow, idempotency, clock: { now: () => now }, idGenerator: { next: () => String(++ids) }, transitionPolicies: { resolve: resolveTransitionPolicy }, completionReadiness: { evaluate: async () => ({ ready: true }) } });
  return { executor, store, uow, idempotency, ids: () => ids, finds: () => finds };
}
async function rejects(run: ReturnType<typeof fixture>, action: ClosureAction, raw: unknown, principal: WorkManagementActorContext, code: string, key: string): Promise<void> {
  const before = structuredClone(run.store.get("task-1"));
  await assert.rejects(() => run.executor.execute({ action, rawCommand: raw, actor: principal, idempotencyKey: key }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === code);
  assert.deepEqual(run.store.get("task-1"), before); assert.equal(run.uow.runs, 0); assert.equal(run.uow.effects.length, 0); assert.equal(run.idempotency.begins, 0); assert.equal(run.ids(), 0);
}

test("B2 authorization matrix uses each registered action policy", async (t) => {
  for (const action of actions) {
    await t.test(`${action} missing permission`, async () => rejects(fixture(valid(action)), action, command(action), actor(action, "creator", []), "TASK_ACCESS_DENIED", `${action}-permission`));
    await t.test(`${action} denied scope`, async () => rejects(fixture(valid(action), { scopes: ["PARTICIPATING"] }), action, command(action), actor(action), "TASK_PROJECT_ACCESS_REQUIRED", `${action}-scope`));
    await t.test(`${action} missing actor relation`, async () => rejects(fixture(valid(action), { relations: [] }), action, command(action), actor(action), "TASK_ACCESS_DENIED", `${action}-relation`));
    await t.test(`${action} confidential access denied`, async () => { const sensitive = valid(action); sensitive.confidentiality = "CONFIDENTIAL"; return rejects(fixture(sensitive, { confidential: false }), action, command(action), actor(action), "TASK_CONFIDENTIAL_ACCESS_DENIED", `${action}-confidential`); });
  }
});

test("B2 expected-version matrix rejects before begin and ID generation", async (t) => {
  for (const action of actions) await t.test(`${action} version conflict`, async () => rejects(fixture(valid(action)), action, command(action, 2), actor(action), "TASK_CONCURRENCY_CONFLICT", `${action}-version`));
});

test("B2 strict-schema matrix rejects all four server-owned metadata groups before inspect", async (t) => {
  const groups = [
    { name: "system metadata", fields: { actorId: "evil", reopenedById: "evil", cancelledById: "evil", archivedById: "evil", restoredById: "evil" } },
    { name: "timestamp and generated ID", fields: { reopenedAt: now, cancelledAt: now, archivedAt: now, restoredAt: now, activeArchiveId: "evil", archiveGeneration: 99 } },
    { name: "target state", fields: { nextLifecycle: "CANCELLED", restoreLifecycle: "DRAFT", restoreState: state(), nextState: state(), preArchiveState: state() } },
    { name: "history projection", fields: { completionHistory: [], archiveHistory: [], restoreHistory: [], completedAt: now, completionSubmissionId: "evil", preArchiveStateSnapshot: state() } },
  ];
  for (const action of actions) for (const group of groups) await t.test(`${action} rejects ${group.name}`, async () => {
    const run = fixture(valid(action)); const before = structuredClone(run.store.get("task-1"));
    await assert.rejects(() => run.executor.execute({ action, rawCommand: { ...command(action), ...group.fields }, actor: actor(action), idempotencyKey: `${action}-${group.name}` }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_COMMAND_INVALID");
    assert.equal(run.idempotency.inspects, 0); assert.equal(run.finds(), 0); assert.equal(run.idempotency.begins, 0); assert.equal(run.ids(), 0); assert.equal(run.uow.runs, 0); assert.deepEqual(run.store.get("task-1"), before);
  });
});

test("B2 strict-schema security fields are individually rejected before inspect", async (t) => {
  const fields: Record<ClosureAction, readonly string[]> = {
    REOPEN: ["actorId", "reopenedById", "reopenedAt", "nextLifecycle", "completedAt", "completionHistory"],
    CANCEL: ["actorId", "cancelledById", "cancelledAt", "nextLifecycle", "completedAt", "completionHistory"],
    ARCHIVE: ["archivedById", "archivedAt", "activeArchiveId", "archiveGeneration", "nextLifecycle", "preArchiveState", "preArchiveStateSnapshot", "archiveHistory"],
    RESTORE: ["actorId", "restoredById", "restoredAt", "activeArchiveId", "archiveGeneration", "nextLifecycle", "restoreLifecycle", "restoreState", "nextState", "preArchiveState", "preArchiveStateSnapshot", "archiveHistory", "restoreHistory", "completedAt", "completionSubmissionId"],
  };
  for (const action of actions) for (const field of fields[action]) await t.test(`${action} rejects individual ${field}`, async () => {
    const run = fixture(valid(action)); const before = structuredClone(run.store.get("task-1"));
    await assert.rejects(() => run.executor.execute({ action, rawCommand: { ...command(action), [field]: field.endsWith("At") ? now : field.includes("History") ? [] : field.includes("State") || field === "preArchiveState" ? state() : "server-owned" }, actor: actor(action), idempotencyKey: `${action}-${field}` }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_COMMAND_INVALID");
    assert.equal(run.idempotency.inspects, 0); assert.equal(run.finds(), 0); assert.equal(run.ids(), 0); assert.equal(run.uow.runs, 0); assert.deepEqual(run.store.get("task-1"), before);
  });
});

test("B2 idempotency identity conflicts alter exactly one field", async (t) => {
  for (const action of actions) {
    for (const [name, patch] of [["actor-only", { actorId: "other-actor" }], ["company-only", { companyId: "other-company" }], ["task-only", { taskId: "task-other" }], ["fingerprint-only", { fingerprint: "different-fingerprint" }]] as const) await t.test(`${action} ${name} idempotency conflict`, async () => {
      const run = fixture(valid(action)); const result: StableCoreTaskExecutionResult = { task: valid(action), effects: emptyCoreTaskEffects() };
      run.idempotency.inspectionFactory = (incoming) => { const identity = identityWithOnly(incoming, patch); for (const key of ["key", "action", "actorId", "companyId", "taskId", "projectId", "fingerprint"] as const) assert.equal(identity[key] === incoming[key], key in patch ? false : true, `${action} ${name} changed only ${key}`); return { status: "REPLAY", identity, result }; };
      await rejects(run, action, command(action), actor(action), "TASK_IDEMPOTENCY_CONFLICT", `${action}-single-${name}`); assert.equal(run.idempotency.inspects, 1);
    });
  }
});

test("B2 real valid-command fingerprint conflicts and exact replay controls", async (t) => {
  for (const action of actions) {
    await t.test(`${action} real command fingerprint conflict`, async () => {
      const run = fixture(valid(action)); const first = await run.executor.execute({ action, rawCommand: command(action, 3, "A"), actor: actor(action), idempotencyKey: "same-key" }); const stored = run.idempotency.lastInspectedRequest; assert.ok(stored); run.idempotency.storedIdentity = stored; run.idempotency.storedResult = first;
      const before = structuredClone(run.store.get("task-1")); const second = command(action, action === "ARCHIVE" ? 4 : 3, "B");
      await assert.rejects(() => run.executor.execute({ action, rawCommand: second, actor: actor(action), idempotencyKey: "same-key" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_IDEMPOTENCY_CONFLICT"); const incoming = run.idempotency.lastInspectedRequest; assert.ok(incoming); assert.equal(stored.key, incoming.key); assert.equal(stored.action, incoming.action); assert.equal(stored.actorId, incoming.actorId); assert.equal(stored.companyId, incoming.companyId); assert.equal(stored.taskId, incoming.taskId); assert.equal(stored.projectId, incoming.projectId); assert.notEqual(stored.fingerprint, incoming.fingerprint); assert.deepEqual(run.store.get("task-1"), before); assert.equal(run.idempotency.begins, 1); assert.equal(run.uow.runs, 1);
    });
    await t.test(`${action} exact identity replay control`, async () => { const run = fixture(valid(action)); const stored: StableCoreTaskExecutionResult = { task: task({ id: "replayed" }), effects: emptyCoreTaskEffects() }; run.idempotency.inspectionFactory = (request) => ({ status: "REPLAY", identity: structuredClone(request), result: stored }); const result = await run.executor.execute({ action, rawCommand: command(action), actor: actor(action), idempotencyKey: "same-key" }); assert.equal(result.task.id, "replayed"); assert.equal(run.idempotency.begins, 0); assert.equal(run.ids(), 0); assert.equal(run.uow.runs, 0); });
  }
});

test("B2 idempotency in-progress and begin-order matrices are side-effect free", async (t) => {
  for (const action of actions) {
    await t.test(`${action} idempotency in progress`, async () => { const run = fixture(valid(action)); run.idempotency.inspection = { status: "IN_PROGRESS" }; await rejects(run, action, command(action), actor(action), "TASK_IDEMPOTENCY_IN_PROGRESS", `${action}-progress`); });
    await t.test(`${action} begin failure generates no ID`, async () => { const run = fixture(valid(action)); run.idempotency.beginFails = true; const before = structuredClone(run.store.get("task-1")); await assert.rejects(() => run.executor.execute({ action, rawCommand: command(action), actor: actor(action), idempotencyKey: `${action}-begin` }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_CONCURRENCY_CONFLICT"); assert.equal(run.idempotency.begins, 1); assert.equal(run.ids(), 0); assert.equal(run.uow.runs, 0); assert.deepEqual(run.store.get("task-1"), before); });
  }
});
