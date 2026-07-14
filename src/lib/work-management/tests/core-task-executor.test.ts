import assert from "node:assert/strict";
import test from "node:test";
import { CORE_TASK_ACTIONS, CoreTaskExecutor, type CoreTaskAggregate, type WorkManagementActorContext } from "../application/core-task-executor";
import type { CoreTaskEffects } from "../application/core-task-effects";
import type { CoreTaskTransactionContext, CoreTaskTransitionPolicyResolver, CoreTaskUnitOfWork } from "../application/core-task-ports";
import type { IdempotencyInspection, IdempotencyRequest, StableCoreTaskExecutionResult } from "../application/core-task-idempotency";
import type { WorkManagementActorRelation } from "../application/actor-policy";
import { WorkManagementDomainError } from "../errors/codes";
import { resolveTransitionPolicy } from "../domain/transition-policies";
import type { TaskState } from "../domain/types";
import type { WorkManagementPermission, WorkManagementScope } from "../permissions/contract";

const now = new Date("2026-07-14T08:00:00.000Z");
const permissions: readonly WorkManagementPermission[] = ["task.create.personal", "task.update.assignee", "task.accept", "task.request_clarification", "task.update_progress", "task.request_extension", "task.update.deadline", "task.pause", "task.resume"];
const actor = (permissionSet = permissions, actorId = "actor-1", companyId: string | null = null): WorkManagementActorContext => ({ actorType: "USER", actorId, companyId, permissionSet: new Set(permissionSet), resolvedScopes: ["OWN"], correlationId: "correlation-1", causationId: "cause-1", requestId: "request-1" });
const state = (patch: Partial<TaskState> = {}): TaskState => ({ lifecycle: "IN_PROGRESS", acceptance: "ACCEPTED", execution: "ACTIVE", review: "NOT_SUBMITTED", handover: "NONE", waitingReason: null, ...patch });
const task = (patch: Partial<CoreTaskAggregate> = {}): CoreTaskAggregate => ({ id: "task-1", creatorId: "actor-1", assignedById: "manager-1", primaryAssigneeId: "actor-1", projectId: "project-1", confidentiality: "NORMAL", requiresIndependentReviewer: false, reviewerId: null, approverId: null, participants: [], state: state(), deadlineAt: new Date("2026-07-20"), progressPercent: 20, version: 3, activeBlockerId: null, ...patch });

class FakeIdempotency {
  inspection: IdempotencyInspection = { status: "PROCEED" };
  replayResult: StableCoreTaskExecutionResult | null = null; replayIdentityPatch: Partial<IdempotencyRequest> = {};
  requests: IdempotencyRequest[] = [];
  begins = 0; aborts = 0; completions: StableCoreTaskExecutionResult[] = []; completionRequests: IdempotencyRequest[] = []; failComplete = false; failAbort = false;
  async inspect(request: IdempotencyRequest): Promise<IdempotencyInspection> { this.requests.push(request); if (this.replayResult) return { status: "REPLAY", identity: { ...request, ...this.replayIdentityPatch }, result: this.replayResult }; return this.inspection; }
  async begin(): Promise<void> { this.begins += 1; }
  async complete(request: IdempotencyRequest, result: StableCoreTaskExecutionResult): Promise<void> { if (this.failComplete) throw new WorkManagementDomainError("TASK_CONCURRENCY_CONFLICT"); this.completionRequests.push(request); this.completions.push(result); }
  async abort(): Promise<void> { this.aborts += 1; if (this.failAbort) throw new Error("abort failure"); }
}
class FakeUow implements CoreTaskUnitOfWork {
  commits = 0; rollbacks = 0; effects: CoreTaskEffects[] = []; failStage = false; saves = 0; creates = 0; saveAllowed = true;
  constructor(readonly tasks: Map<string, CoreTaskAggregate>, readonly idempotency: FakeIdempotency) {}
  async run<T>(operation: (transaction: CoreTaskTransactionContext) => Promise<T>): Promise<T> {
    const taskSnapshot = structuredClone([...this.tasks.entries()]);
    const effectsSnapshot = structuredClone(this.effects);
    const completionCount = this.idempotency.completions.length;
    const completionRequestCount = this.idempotency.completionRequests.length;
    try {
      const transaction: CoreTaskTransactionContext = {
        tasks: {
          create: async (value) => { this.creates += 1; if (this.tasks.has(value.id)) return false; this.tasks.set(value.id, structuredClone(value)); return true; },
          compareAndSave: async (id, expectedVersion, value) => { this.saves += 1; const existing = this.tasks.get(id); if (!this.saveAllowed || !existing || existing.version !== expectedVersion) return false; this.tasks.set(id, structuredClone(value)); return true; },
        },
        effects: { stage: async (effects) => { if (this.failStage) throw new WorkManagementDomainError("TASK_CONCURRENCY_CONFLICT"); this.effects.push(structuredClone(effects)); } },
        idempotency: this.idempotency,
      };
      const result = await operation(transaction); this.commits += 1; return result;
    } catch (error) {
      this.tasks.clear(); for (const [id, value] of taskSnapshot) this.tasks.set(id, value);
      this.effects = effectsSnapshot; this.idempotency.completions.splice(completionCount); this.idempotency.completionRequests.splice(completionRequestCount); this.rollbacks += 1; throw error;
    }
  }
}
type Options = { relations?: readonly WorkManagementActorRelation[]; scopes?: readonly WorkManagementScope[]; confidential?: boolean; eligibility?: "eligible" | "inactive" | "project" | "reviewer" | "approver" | "not-found" | "not-assignable"; projectExists?: boolean; projectAccessible?: boolean; transitionPolicies?: CoreTaskTransitionPolicyResolver; clock?: { now(): Date } };
function fixture(current: CoreTaskAggregate | null, options: Options = {}) {
  const tasks = new Map<string, CoreTaskAggregate>(); if (current) tasks.set(current.id, structuredClone(current));
  const idempotency = new FakeIdempotency(); const uow = new FakeUow(tasks, idempotency);
  const executor = new CoreTaskExecutor({
    tasks: { findById: async (id) => structuredClone(tasks.get(id) ?? null) },
    users: { evaluateAssignee: async () => {
      if (options.eligibility === "inactive") return { eligible: false, reason: "INACTIVE" } as const;
      if (options.eligibility === "project") return { eligible: false, reason: "NO_PROJECT_ACCESS" } as const;
      if (options.eligibility === "reviewer") return { eligible: false, reason: "REVIEWER_CONFLICT" } as const;
      if (options.eligibility === "approver") return { eligible: false, reason: "APPROVER_CONFLICT" } as const;
      if (options.eligibility === "not-found") return { eligible: false, reason: "NOT_FOUND" } as const;
      if (options.eligibility === "not-assignable") return { eligible: false, reason: "NOT_ASSIGNABLE" } as const;
      return { eligible: true, projectAccess: true } as const;
    } },
    scopes: {
      resolve: async () => ({ scopes: options.scopes ?? ["OWN"], relations: options.relations ?? ["PRIMARY_ASSIGNEE"], confidentialAllowed: options.confidential ?? true }),
      resolveCreate: async () => ({ projectExists: options.projectExists ?? true, projectAccessible: options.projectAccessible ?? true, scopes: options.scopes ?? ["OWN"], confidentialAllowed: options.confidential ?? true }),
    },
    unitOfWork: uow, idempotency, clock: options.clock ?? { now: () => now }, idGenerator: { next: () => "new-task" }, transitionPolicies: options.transitionPolicies ?? { resolve: resolveTransitionPolicy }, completionReadiness: { evaluate: async () => ({ ready: true }) },
  });
  return { executor, uow, tasks, idempotency };
}
type SliceAAction = (typeof CORE_TASK_ACTIONS)[number];
const commands: Record<SliceAAction, Record<string, unknown>> = {
  CREATE_DRAFT: { title: "New task" }, ASSIGN: { taskId: "task-1", primaryAssigneeId: "user-2", expectedVersion: 3, reason: "New owner" }, ACCEPT: { taskId: "task-1", expectedVersion: 3 }, REQUEST_CLARIFICATION: { taskId: "task-1", reason: "Need detail", expectedVersion: 3 }, START: { taskId: "task-1", expectedVersion: 3 }, UPDATE_PROGRESS: { taskId: "task-1", progressPercent: 100, expectedVersion: 3 }, REQUEST_EXTENSION: { taskId: "task-1", requestedDueAt: new Date("2026-07-25"), reason: "Need time", expectedVersion: 3 }, CHANGE_DEADLINE: { taskId: "task-1", currentDueAt: new Date("2026-07-25"), reason: "Approved", expectedVersion: 3 }, PAUSE: { taskId: "task-1", reason: "Wait", expectedVersion: 3 }, RESUME: { taskId: "task-1", reason: "Ready", expectedVersion: 3 }, BLOCK: { taskId: "task-1", reason: "Blocked", expectedVersion: 3 }, UNBLOCK: { taskId: "task-1", resolution: "Resolved", expectedVersion: 3 },
};
const success: Record<SliceAAction, CoreTaskAggregate | null> = {
  CREATE_DRAFT: null, ASSIGN: task({ primaryAssigneeId: null, assignedById: null, state: state({ lifecycle: "DRAFT", acceptance: "NOT_REQUIRED" }) }), ACCEPT: task({ state: state({ lifecycle: "ASSIGNED", acceptance: "PENDING" }) }), REQUEST_CLARIFICATION: task({ state: state({ lifecycle: "ASSIGNED", acceptance: "PENDING" }) }), START: task({ state: state({ lifecycle: "ASSIGNED", acceptance: "ACCEPTED" }) }), UPDATE_PROGRESS: task(), REQUEST_EXTENSION: task(), CHANGE_DEADLINE: task(), PAUSE: task(), RESUME: task({ state: state({ execution: "PAUSED" }) }), BLOCK: task(), UNBLOCK: task({ state: state({ execution: "BLOCKED" }), activeBlockerId: "blocker-existing" }),
};
const expectedEvent: Record<SliceAAction, string> = { CREATE_DRAFT: "TaskCreated", ASSIGN: "TaskAssigned", ACCEPT: "TaskAccepted", REQUEST_CLARIFICATION: "TaskClarificationRequested", START: "TaskStarted", UPDATE_PROGRESS: "TaskProgressUpdated", REQUEST_EXTENSION: "TaskExtensionRequested", CHANGE_DEADLINE: "TaskDeadlineChanged", PAUSE: "TaskPaused", RESUME: "TaskResumed", BLOCK: "TaskBlocked", UNBLOCK: "TaskUnblocked" };
const expectedActivity: Record<SliceAAction, string> = { CREATE_DRAFT: "TASK_CREATED", ASSIGN: "TASK_ASSIGNED", ACCEPT: "TASK_ACCEPTED", REQUEST_CLARIFICATION: "TASK_CLARIFICATION_REQUESTED", START: "TASK_STARTED", UPDATE_PROGRESS: "TASK_PROGRESS_UPDATED", REQUEST_EXTENSION: "TASK_EXTENSION_REQUESTED", CHANGE_DEADLINE: "TASK_DEADLINE_CHANGED", PAUSE: "TASK_PAUSED", RESUME: "TASK_RESUMED", BLOCK: "TASK_BLOCKED", UNBLOCK: "TASK_UNBLOCKED" };
const expectedAudit: Record<SliceAAction, string> = { CREATE_DRAFT: "TASK_CREATE", ASSIGN: "TASK_ASSIGN", ACCEPT: "TASK_ACCEPT", REQUEST_CLARIFICATION: "TASK_REQUEST_CLARIFICATION", START: "TASK_START", UPDATE_PROGRESS: "TASK_UPDATE_PROGRESS", REQUEST_EXTENSION: "TASK_REQUEST_EXTENSION", CHANGE_DEADLINE: "TASK_CHANGE_DEADLINE", PAUSE: "TASK_PAUSE", RESUME: "TASK_RESUME", BLOCK: "TASK_BLOCK", UNBLOCK: "TASK_UNBLOCK" };
const expectedState: Record<SliceAAction, TaskState> = {
  CREATE_DRAFT: state({ lifecycle: "DRAFT", acceptance: "NOT_REQUIRED" }), ASSIGN: state({ lifecycle: "ASSIGNED", acceptance: "PENDING" }), ACCEPT: state({ lifecycle: "ASSIGNED", acceptance: "ACCEPTED" }), REQUEST_CLARIFICATION: state({ lifecycle: "ASSIGNED", acceptance: "CLARIFICATION_REQUESTED" }), START: state(), UPDATE_PROGRESS: state(), REQUEST_EXTENSION: state(), CHANGE_DEADLINE: state(), PAUSE: state({ execution: "PAUSED" }), RESUME: state(), BLOCK: state({ execution: "BLOCKED" }), UNBLOCK: state(),
};
const payloadKeys: Record<SliceAAction, readonly string[]> = {
  CREATE_DRAFT: ["title", "projectId", "confidentiality"], ASSIGN: ["previousAssigneeId", "newAssigneeId", "assignedById"], ACCEPT: ["assigneeId", "previousAcceptance", "newAcceptance"], REQUEST_CLARIFICATION: ["reason"], START: ["previousLifecycle", "newLifecycle", "previousExecution", "newExecution"], UPDATE_PROGRESS: ["oldProgressPercent", "newProgressPercent"], REQUEST_EXTENSION: ["currentDeadlineAt", "requestedDeadlineAt", "reason"], CHANGE_DEADLINE: ["oldDeadlineAt", "newDeadlineAt", "reason"], PAUSE: ["previousExecution", "newExecution", "reason"], RESUME: ["previousExecution", "newExecution", "reason"], BLOCK: ["blockerId", "reason", "previousExecution", "newExecution"], UNBLOCK: ["blockerId", "resolution", "previousExecution", "newExecution"],
};

test("all twelve Slice A actions save exact policy state and typed effects", async (t) => {
  for (const action of CORE_TASK_ACTIONS) await t.test(`${action}: success`, async () => {
    const run = fixture(success[action], { relations: action === "ASSIGN" || action === "CHANGE_DEADLINE" ? ["CREATOR"] : ["PRIMARY_ASSIGNEE"] });
    const result = await run.executor.execute({ action, rawCommand: commands[action], actor: actor(), idempotencyKey: " key " });
    assert.equal(result.task.version, (success[action]?.version ?? 0) + 1); assert.deepEqual(result.task.state, expectedState[action]);
    assert.equal(result.effects.domainEvents[0]?.type, expectedEvent[action]); assert.equal(result.effects.activities[0]?.type, expectedActivity[action]); assert.equal(result.effects.audits[0]?.action, expectedAudit[action]);
    assert.equal(result.effects.notifications.length, ["CREATE_DRAFT", "START", "UPDATE_PROGRESS"].includes(action) ? 0 : 1);
    assert.equal(result.effects.domainEvents[0]?.payload.action, action); assert.equal(result.effects.domainEvents[0]?.payload.taskId, result.task.id);
    for (const key of payloadKeys[action]) assert.equal(Object.hasOwn(result.effects.domainEvents[0]?.payload ?? {}, key), true);
    assert.equal(run.uow.commits, 1); assert.equal(run.uow.rollbacks, 0); assert.equal(run.idempotency.completions.length, 1);
    assert.equal(run.idempotency.requests[0]?.key, "key");
    assert.deepEqual(run.idempotency.completionRequests[0], run.idempotency.requests[0]);
  });
});

test("all twelve Slice A actions reject invalid transitions before mutation", async (t) => {
  for (const action of CORE_TASK_ACTIONS) await t.test(`${action}: invalid lifecycle`, async () => {
    const run = fixture(action === "CREATE_DRAFT" ? null : task({ state: state({ lifecycle: "COMPLETED" }) }), { relations: ["CREATOR", "PRIMARY_ASSIGNEE"] });
    if (action === "CREATE_DRAFT") run.tasks.set("new-task", task({ id: "new-task" }));
    await assert.rejects(
      () => run.executor.execute({ action, rawCommand: commands[action], actor: actor(), idempotencyKey: "key" }),
      (error: unknown) => error instanceof WorkManagementDomainError && error.code === (action === "CREATE_DRAFT" ? "TASK_CONCURRENCY_CONFLICT" : "TASK_INVALID_TRANSITION"),
    );
    assert.equal(run.uow.saves, 0); assert.equal(run.uow.effects.length, 0); assert.equal(run.idempotency.completions.length, 0);
  });
});

test("authorization, scope, confidentiality, concurrency and eligibility deny without begin", async () => {
  const cases = [
    { name: "permission", action: "START" as const, permissions: [] as readonly WorkManagementPermission[], options: {} },
    { name: "scope", action: "CHANGE_DEADLINE" as const, permissions: ["task.update.deadline"] as const, options: { scopes: ["PARTICIPATING"] as const, relations: [] as const } },
    { name: "relation", action: "START" as const, permissions: ["task.update_progress"] as const, options: { relations: [] as const } },
    { name: "confidential", action: "START" as const, permissions: ["task.update_progress"] as const, options: { confidential: false }, current: success.START! },
    { name: "version", action: "START" as const, permissions: ["task.update_progress"] as const, options: {}, command: { taskId: "task-1", expectedVersion: 2 } },
    { name: "inactive", action: "ASSIGN" as const, permissions: ["task.update.assignee"] as const, options: { relations: ["CREATOR"] as const, eligibility: "inactive" as const }, current: success.ASSIGN! },
  ];
  for (const item of cases) {
    const current = item.name === "confidential" ? task({ ...item.current, confidentiality: "CONFIDENTIAL" }) : item.current ?? success[item.action]!;
    const run = fixture(current, item.options);
    await assert.rejects(() => run.executor.execute({ action: item.action, rawCommand: item.command ?? commands[item.action], actor: actor(item.permissions), idempotencyKey: "key" }));
    assert.equal(run.uow.saves, 0); assert.equal(run.uow.effects.length, 0); assert.equal(run.idempotency.begins, 0);
  }
});

test("action invariants retain extension deadline, history, blocker identity and progress boundary", async () => {
  const extension = fixture(success.REQUEST_EXTENSION); const extensionResult = await extension.executor.execute({ action: "REQUEST_EXTENSION", rawCommand: commands.REQUEST_EXTENSION, actor: actor(), idempotencyKey: "extension" });
  assert.equal(extensionResult.task.deadlineAt?.toISOString(), success.REQUEST_EXTENSION?.deadlineAt?.toISOString()); assert.equal(extensionResult.effects.deadlineHistoryIntents.length, 0);
  const deadline = fixture(success.CHANGE_DEADLINE, { relations: ["CREATOR"] }); const deadlineResult = await deadline.executor.execute({ action: "CHANGE_DEADLINE", rawCommand: commands.CHANGE_DEADLINE, actor: actor(), idempotencyKey: "deadline" });
  assert.equal(deadlineResult.effects.deadlineHistoryIntents[0]?.oldDeadlineAt?.toISOString(), "2026-07-20T00:00:00.000Z");
  const block = fixture(success.BLOCK); const blockResult = await block.executor.execute({ action: "BLOCK", rawCommand: commands.BLOCK, actor: actor(), idempotencyKey: "block" });
  assert.equal(blockResult.task.activeBlockerId, blockResult.effects.blockerIntents[0]?.blockerId);
  const unblock = fixture(success.UNBLOCK); const unblockResult = await unblock.executor.execute({ action: "UNBLOCK", rawCommand: commands.UNBLOCK, actor: actor(), idempotencyKey: "unblock" });
  assert.equal(unblockResult.effects.blockerIntents[0]?.blockerId, "blocker-existing"); assert.equal(unblockResult.task.progressPercent, success.UNBLOCK?.progressPercent);
});

test("transaction rollback restores task, effects and idempotency completion", async () => {
  const original = success.START!; const conflict = fixture(original); conflict.uow.saveAllowed = false;
  await assert.rejects(() => conflict.executor.execute({ action: "START", rawCommand: commands.START, actor: actor(), idempotencyKey: "conflict" }));
  assert.deepEqual(conflict.tasks.get("task-1"), original); assert.equal(conflict.uow.effects.length, 0); assert.equal(conflict.idempotency.completions.length, 0); assert.equal(conflict.uow.rollbacks, 1);
  const staging = fixture(original); staging.uow.failStage = true;
  await assert.rejects(() => staging.executor.execute({ action: "START", rawCommand: commands.START, actor: actor(), idempotencyKey: "stage" }));
  assert.deepEqual(staging.tasks.get("task-1"), original); assert.equal(staging.uow.effects.length, 0); assert.equal(staging.idempotency.completions.length, 0);
  const completion = fixture(original); completion.idempotency.failComplete = true;
  await assert.rejects(() => completion.executor.execute({ action: "START", rawCommand: commands.START, actor: actor(), idempotencyKey: "complete" }));
  assert.deepEqual(completion.tasks.get("task-1"), original); assert.equal(completion.uow.effects.length, 0); assert.equal(completion.idempotency.completions.length, 0);
  const create = fixture(null); create.uow.failStage = true;
  await assert.rejects(() => create.executor.execute({ action: "CREATE_DRAFT", rawCommand: commands.CREATE_DRAFT, actor: actor(), idempotencyKey: "create-stage" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_CONCURRENCY_CONFLICT");
  assert.equal(create.tasks.has("new-task"), false); assert.equal(create.uow.effects.length, 0); assert.equal(create.idempotency.completions.length, 0);
  const abort = fixture(original); abort.uow.saveAllowed = false; abort.idempotency.failAbort = true;
  await assert.rejects(() => abort.executor.execute({ action: "START", rawCommand: commands.START, actor: actor(), idempotencyKey: "abort" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_CONCURRENCY_CONFLICT");
  assert.equal(abort.idempotency.aborts, 1);
});

test("idempotency replay, conflict and in-progress do not load or mutate", async () => {
  const replay = fixture(success.START); const stored: StableCoreTaskExecutionResult = { task: task({ id: "stored", version: 9 }), effects: { domainEvents: [], activities: [], audits: [], notifications: [], assignmentIntents: [], deadlineHistoryIntents: [], blockerIntents: [], clarificationIntents: [], extensionRequestIntents: [], executionHistoryIntents: [], submissionIntents: [], reviewDecisionIntents: [], completionIntents: [] } };
  replay.idempotency.replayResult = stored;
  assert.equal((await replay.executor.execute({ action: "START", rawCommand: commands.START, actor: actor(), idempotencyKey: "replay" })).task.id, "stored"); assert.equal(replay.uow.saves, 0);
  for (const status of ["CONFLICT", "IN_PROGRESS"] as const) {
    const run = fixture(success.START); run.idempotency.inspection = { status };
    await assert.rejects(() => run.executor.execute({ action: "START", rawCommand: commands.START, actor: actor(), idempotencyKey: "key" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === (status === "CONFLICT" ? "TASK_IDEMPOTENCY_CONFLICT" : "TASK_IDEMPOTENCY_IN_PROGRESS"));
    assert.equal(run.uow.saves, 0); assert.equal(run.idempotency.begins, 0);
  }
});

test("create validates project access and confidentiality without losing parsed fields", async () => {
  const personal = fixture(null);
  const personalResult = await personal.executor.execute({ action: "CREATE_DRAFT", rawCommand: { title: "Personal task", confidentiality: "NORMAL", priority: "HIGH" }, actor: actor(), idempotencyKey: "personal" });
  assert.equal(personalResult.task.confidentiality, "NORMAL"); assert.equal(personalResult.task.priority, "HIGH"); assert.equal(personalResult.effects.domainEvents[0]?.payload.title, "Personal task");
  const project = fixture(null);
  assert.equal((await project.executor.execute({ action: "CREATE_DRAFT", rawCommand: { title: "Project task", projectId: "project-1" }, actor: actor(), idempotencyKey: "project" })).task.projectId, "project-1");
  const unavailable = fixture(null, { projectExists: false });
  await assert.rejects(() => unavailable.executor.execute({ action: "CREATE_DRAFT", rawCommand: { title: "Missing project", projectId: "missing" }, actor: actor(), idempotencyKey: "missing" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_PROJECT_NOT_FOUND");
  const unauthorized = fixture(null, { projectAccessible: false });
  await assert.rejects(() => unauthorized.executor.execute({ action: "CREATE_DRAFT", rawCommand: { title: "Foreign project", projectId: "foreign" }, actor: actor(), idempotencyKey: "foreign" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_PROJECT_ACCESS_REQUIRED");
  for (const confidentiality of ["RESTRICTED", "CONFIDENTIAL", "EXECUTIVE"] as const) {
    const denied = fixture(null, { confidential: false });
    await assert.rejects(() => denied.executor.execute({ action: "CREATE_DRAFT", rawCommand: { title: `${confidentiality} task`, confidentiality }, actor: actor(), idempotencyKey: confidentiality }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_CONFIDENTIAL_ACCESS_DENIED");
    assert.equal(denied.uow.creates, 0); assert.equal(denied.idempotency.begins, 0);
  }
  const confidential = fixture(null, { confidential: true });
  const result = await confidential.executor.execute({ action: "CREATE_DRAFT", rawCommand: { title: "Restricted task", confidentiality: "RESTRICTED" }, actor: actor(), idempotencyKey: "restricted" });
  assert.equal(result.task.confidentiality, "RESTRICTED"); assert.equal(result.effects.audits[0]?.payload.confidentiality, "RESTRICTED");
});

test("assign emits exact history and all structured eligibility failures are stable and non-mutating", async () => {
  const eligible = fixture(success.ASSIGN!, { relations: ["CREATOR"] });
  const assigned = await eligible.executor.execute({ action: "ASSIGN", rawCommand: commands.ASSIGN, actor: actor(), idempotencyKey: "assign" });
  assert.deepEqual(assigned.effects.assignmentIntents[0], { taskId: "task-1", previousAssigneeId: null, newAssigneeId: "user-2", assignedById: "actor-1", reason: "New owner", effectiveAt: now, occurredAt: now });
  const cases = [
    ["inactive", "TASK_ASSIGNEE_INACTIVE"], ["project", "TASK_ASSIGNEE_PROJECT_ACCESS"], ["reviewer", "TASK_REVIEWER_CONFLICT"], ["approver", "TASK_APPROVER_CONFLICT"], ["not-found", "TASK_ASSIGNEE_NOT_FOUND"], ["not-assignable", "TASK_ASSIGNEE_NOT_ASSIGNABLE"],
  ] as const;
  for (const [eligibility, code] of cases) {
    const run = fixture(success.ASSIGN!, { relations: ["CREATOR"], eligibility });
    await assert.rejects(() => run.executor.execute({ action: "ASSIGN", rawCommand: commands.ASSIGN, actor: actor(), idempotencyKey: eligibility }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === code);
    assert.equal(run.uow.saves, 0); assert.equal(run.uow.effects.length, 0);
  }
  const reviewer = fixture(task({ ...success.ASSIGN!, requiresIndependentReviewer: true, reviewerId: "user-2" }), { relations: ["CREATOR"] });
  await assert.rejects(() => reviewer.executor.execute({ action: "ASSIGN", rawCommand: commands.ASSIGN, actor: actor(), idempotencyKey: "reviewer" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_REVIEWER_CONFLICT");
  const approver = fixture(task({ ...success.ASSIGN!, approverId: "user-2" }), { relations: ["CREATOR"] });
  await assert.rejects(() => approver.executor.execute({ action: "ASSIGN", rawCommand: commands.ASSIGN, actor: actor(), idempotencyKey: "approver" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_APPROVER_CONFLICT");
});

test("execution history and blocker identifiers propagate through every relevant effect", async () => {
  const paused = fixture(success.PAUSE); const pause = await paused.executor.execute({ action: "PAUSE", rawCommand: commands.PAUSE, actor: actor(), idempotencyKey: "pause" });
  assert.deepEqual(pause.effects.executionHistoryIntents[0], { taskId: "task-1", previousExecution: "ACTIVE", newExecution: "PAUSED", reason: "Wait", actorId: "actor-1", occurredAt: now });
  assert.equal(pause.task.deadlineAt?.toISOString(), success.PAUSE?.deadlineAt?.toISOString()); assert.equal(pause.task.primaryAssigneeId, "actor-1");
  const resumed = fixture(success.RESUME); const resume = await resumed.executor.execute({ action: "RESUME", rawCommand: commands.RESUME, actor: actor(), idempotencyKey: "resume" });
  assert.equal(resume.effects.executionHistoryIntents[0]?.previousExecution, "PAUSED"); assert.equal(resume.effects.executionHistoryIntents[0]?.newExecution, "ACTIVE");
  const blocked = fixture(success.BLOCK); const block = await blocked.executor.execute({ action: "BLOCK", rawCommand: commands.BLOCK, actor: actor(), idempotencyKey: "block" });
  const blockerId = block.task.activeBlockerId;
  assert.equal(block.effects.blockerIntents[0]?.blockerId, blockerId); assert.equal(block.effects.domainEvents[0]?.payload.blockerId, blockerId); assert.equal(block.effects.activities[0]?.payload.blockerId, blockerId);
  const unblocked = fixture(success.UNBLOCK); const unblock = await unblocked.executor.execute({ action: "UNBLOCK", rawCommand: commands.UNBLOCK, actor: actor(), idempotencyKey: "unblock" });
  assert.equal(unblock.task.activeBlockerId, null); assert.equal(unblock.effects.blockerIntents[0]?.blockerId, "blocker-existing"); assert.equal(unblock.effects.domainEvents[0]?.payload.blockerId, "blocker-existing");
});

test("replay identity is isolated by actor, company, and target while the policy resolver controls next state", async () => {
  const stored: StableCoreTaskExecutionResult = { task: task({ id: "stored" }), effects: { domainEvents: [], activities: [], audits: [], notifications: [], assignmentIntents: [], deadlineHistoryIntents: [], blockerIntents: [], clarificationIntents: [], extensionRequestIntents: [], executionHistoryIntents: [], submissionIntents: [], reviewDecisionIntents: [], completionIntents: [] } };
  for (const patch of [{ actorId: "other" }, { companyId: "other-company" }, { taskId: "other-task" }]) {
    const run = fixture(success.START); run.idempotency.replayResult = stored; run.idempotency.replayIdentityPatch = patch;
    await assert.rejects(() => run.executor.execute({ action: "START", rawCommand: commands.START, actor: actor(), idempotencyKey: "same" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_IDEMPOTENCY_CONFLICT");
    assert.equal(run.uow.saves, 0);
  }
  const customState = state({ lifecycle: "IN_PROGRESS", execution: "PAUSED" });
  const resolver: CoreTaskTransitionPolicyResolver = { resolve: () => ({ ...resolveTransitionPolicy("START_EXECUTION"), evaluate: () => ({ allowed: true, nextState: customState, errorCode: null, intents: [{ type: "TaskStarted", taskId: "task-1" }] }) }) };
  const run = fixture(success.START, { transitionPolicies: resolver });
  assert.deepEqual((await run.executor.execute({ action: "START", rawCommand: commands.START, actor: actor(), idempotencyKey: "custom" })).task.state, customState);
});

test("executor uses one clock value and does not mutate command, aggregate, or actor inputs", async () => {
  let clockCalls = 0; const clock = { now: () => { clockCalls += 1; return new Date(`2026-07-14T08:00:0${clockCalls}.000Z`); } };
  const current = success.START!; const raw = structuredClone(commands.START); const inputActor = actor();
  Object.freeze(current.state); Object.freeze(current); Object.freeze(inputActor);
  const run = fixture(current, { clock }); const result = await run.executor.execute({ action: "START", rawCommand: raw, actor: inputActor, idempotencyKey: "immutability" });
  assert.equal(clockCalls, 1); assert.deepEqual(raw, commands.START); assert.equal(current.state.lifecycle, "ASSIGNED"); assert.notEqual(result.task, current); assert.notEqual(result.task.state, current.state);
});
