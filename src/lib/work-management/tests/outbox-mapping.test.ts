import assert from "node:assert/strict";
import test from "node:test";
import { emptyCoreTaskEffects } from "../application/core-task-effects";
import {
  mapCoreTaskEffectsToOutbox,
  OUTBOX_EFFECT_FAMILIES,
  validateWorkManagementOutboxBatch,
  validateWorkManagementOutboxMessage,
} from "../application/core-task-outbox";
import { CLOSURE_LIFECYCLE_ACTIONS, CORE_TASK_ACTIONS, HANDOVER_ACTIONS, RESULT_REVIEW_ACTIONS, type CoreTaskAction } from "../application/core-task-executor";
import { WorkManagementDomainError } from "../errors/codes";

const at = new Date("2026-07-16T09:00:00.000Z");
const context = { action: "ASSIGN" as const, aggregateId: "task-1", aggregateVersion: 4, actorId: "manager", companyId: null, projectId: "project-1", occurredAt: at, correlationId: "corr", causationId: "cause", idempotencyKey: "key" };
const ids = () => { let value = 0; return { next: () => `outbox-${++value}` }; };

test("empty typed effects produce no outbox messages", () => assert.deepEqual(mapCoreTaskEffectsToOutbox(emptyCoreTaskEffects(), context, ids()), []));

test("every typed effect variant has one explicit outbox decision", () => {
  assert.equal(OUTBOX_EFFECT_FAMILIES.length, Object.keys(emptyCoreTaskEffects()).length);
  assert.equal(new Set(OUTBOX_EFFECT_FAMILIES.map(([family]) => family)).size, OUTBOX_EFFECT_FAMILIES.length);
});

test("outbox messages use stable deterministic sequence", () => {
  const effects = emptyCoreTaskEffects();
  const value = { taskId: "task-1", previousAssigneeId: null, newAssigneeId: "member", assignedById: "manager", reason: null, effectiveAt: at, occurredAt: at };
  const changed = { type: "TaskAssigned" as const, aggregateId: "task-1", aggregateVersion: 4, actorId: "manager", occurredAt: at, correlationId: "corr", causationId: "cause", payload: { taskId: "task-1" } };
  const messages = mapCoreTaskEffectsToOutbox({ ...effects, domainEvents: [changed], assignmentIntents: [value] }, context, ids());
  assert.deepEqual(messages.map((message) => [message.messageType, message.sequence]), [["WORK_MANAGEMENT_DOMAIN_EVENT", 1], ["WORK_MANAGEMENT_ASSIGNMENT_INTENT", 2]]);
});

test("outbox staging and committed reads are isolated from caller mutation", () => {
  const effects = emptyCoreTaskEffects(); const payload = { taskId: "task-1", progress: { value: 50 } };
  const event = { type: "TaskProgressUpdated" as const, aggregateId: "task-1", aggregateVersion: 4, actorId: "manager", occurredAt: at, correlationId: "corr", causationId: null, payload };
  const messages = mapCoreTaskEffectsToOutbox({ ...effects, domainEvents: [event] }, context, ids());
  payload.progress.value = 100; at.setTime(at.getTime() + 60_000);
  assert.equal(((messages[0]?.payload.payload as { progress: { value: number } }).progress).value, 50);
  assert.equal(messages[0]?.occurredAt.getTime(), new Date("2026-07-16T09:00:00.000Z").getTime());
});

test("unknown typed effect fails closed without committed state", () => {
  const malformed: unknown = { ...emptyCoreTaskEffects(), unknownEffects: [] };
  assert.throws(() => mapCoreTaskEffectsToOutbox(malformed as ReturnType<typeof emptyCoreTaskEffects>, context, ids()), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_OUTBOX_EFFECT_UNMAPPED");
});

test("runtime envelope validation rejects invalid fields, duplicate ids, noncontiguous sequences, and unclonable payloads", () => {
  const valid = mapCoreTaskEffectsToOutbox({ ...emptyCoreTaskEffects(), domainEvents: [{ type: "TaskAssigned", aggregateId: "task-1", aggregateVersion: 4, actorId: "manager", occurredAt: at, correlationId: "corr", causationId: null, payload: { taskId: "task-1" } }] }, context, ids())[0];
  assert.ok(valid);
  validateWorkManagementOutboxMessage(valid);
  assert.throws(() => validateWorkManagementOutboxMessage({ ...valid, aggregateId: "" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_OUTBOX_MESSAGE_INVALID");
  assert.throws(() => validateWorkManagementOutboxMessage({ ...valid, action: "UNKNOWN" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_OUTBOX_MESSAGE_INVALID");
  assert.throws(() => validateWorkManagementOutboxBatch([{ ...valid }, { ...valid, sequence: 2 }]), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_OUTBOX_MESSAGE_DUPLICATE");
  assert.throws(() => validateWorkManagementOutboxBatch([{ ...valid, sequence: 2 }]), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_OUTBOX_MESSAGE_INVALID");
  assert.throws(() => validateWorkManagementOutboxMessage({ ...valid, payload: { function: () => undefined } }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_OUTBOX_MESSAGE_INVALID");
});

test("clone-safe non-record payloads fail closed at the outbox boundary", () => {
  const valid = mapCoreTaskEffectsToOutbox({ ...emptyCoreTaskEffects(), domainEvents: [{ type: "TaskAssigned", aggregateId: "task-1", aggregateVersion: 4, actorId: "manager", occurredAt: at, correlationId: "corr", causationId: null, payload: { taskId: "task-1" } }] }, context, ids())[0];
  assert.ok(valid);
  for (const payload of [undefined, null, 1, true, "payload", [], () => undefined]) {
    assert.throws(() => validateWorkManagementOutboxMessage({ ...valid, payload }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_OUTBOX_MESSAGE_INVALID");
  }
});

test("execution batch consistency fails closed without mutating input", () => {
  const base = mapCoreTaskEffectsToOutbox({ ...emptyCoreTaskEffects(), domainEvents: [{ type: "TaskAssigned", aggregateId: "task-1", aggregateVersion: 4, actorId: "manager", occurredAt: at, correlationId: "corr", causationId: null, payload: { taskId: "task-1" } }, { type: "TaskAssigned", aggregateId: "task-1", aggregateVersion: 4, actorId: "manager", occurredAt: at, correlationId: "corr", causationId: null, payload: { taskId: "task-1", second: true } }] }, context, ids());
  const changes: readonly [string, unknown][] = [
    ["aggregateId", "other-task"], ["action", "CANCEL"], ["correlationId", "other-correlation"], ["idempotencyKey", "other-key"], ["aggregateVersion", 9],
  ];
  for (const [field, value] of changes) {
    const input = structuredClone(base);
    const before = structuredClone(input);
    const second = { ...input[1], [field]: value };
    assert.throws(() => validateWorkManagementOutboxBatch([input[0], second]), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_OUTBOX_BATCH_INVALID");
    assert.deepEqual(input, before);
  }
});

test("all twenty-five registered actions have one explicit mapper decision", () => {
  const actions: readonly CoreTaskAction[] = [...CORE_TASK_ACTIONS, ...RESULT_REVIEW_ACTIONS, ...CLOSURE_LIFECYCLE_ACTIONS, ...HANDOVER_ACTIONS];
  assert.equal(actions.length, 25);
  for (const action of actions) {
    const messages = mapCoreTaskEffectsToOutbox(emptyCoreTaskEffects(), { ...context, action }, ids());
    assert.deepEqual(messages, []);
  }
});
