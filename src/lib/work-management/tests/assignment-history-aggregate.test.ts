import assert from "node:assert/strict";
import test from "node:test";
import {
  appendAssignmentHistoryRecord,
  getNextAssignmentGeneration,
  validateAssignmentHistory,
  type AssignmentHistorySnapshot,
  type TaskAssignmentHistoryRecord,
} from "../application/assignment-history";
import { resolveCurrentTaskAssignment } from "../application/assignment-source-of-truth";
import { WorkManagementDomainError } from "../errors/codes";

const at = new Date("2026-07-19T08:00:00.000Z");
const record = (patch: Partial<TaskAssignmentHistoryRecord> = {}): TaskAssignmentHistoryRecord => ({
  id: "assignment-1",
  taskId: "task-1",
  generation: 1,
  previousAssigneeId: null,
  newAssigneeId: "assignee-a",
  assignedById: "manager",
  sourceAction: "ASSIGN",
  sourceHandoverId: null,
  reason: "Initial allocation",
  effectiveAt: at,
  ...patch,
});
const snapshot = (patch: Partial<AssignmentHistorySnapshot> = {}): AssignmentHistorySnapshot => ({
  id: "task-1",
  primaryAssigneeId: null,
  assignmentHistory: [],
  ...patch,
});

test("legacy assigned projection appends the first tracked reassignment without fabricating bootstrap history", () => {
  const legacy = snapshot({ primaryAssigneeId: "assignee-a" });
  validateAssignmentHistory(legacy);
  assert.equal(getNextAssignmentGeneration(legacy), 1);

  const appended = appendAssignmentHistoryRecord(legacy, record({
    previousAssigneeId: "assignee-a",
    newAssigneeId: "assignee-b",
  }));

  assert.equal(legacy.assignmentHistory.length, 0);
  assert.equal(appended.length, 1);
  assert.deepEqual(appended[0], record({ previousAssigneeId: "assignee-a", newAssigneeId: "assignee-b" }));
});

test("initial ASSIGN appends generation one from null to the validated assignee", () => {
  const current = snapshot();
  const appended = appendAssignmentHistoryRecord(current, record());

  assert.equal(appended[0]?.generation, 1);
  assert.equal(appended[0]?.previousAssigneeId, null);
  assert.equal(appended[0]?.newAssigneeId, "assignee-a");
  assert.equal(appended[0]?.sourceAction, "ASSIGN");
  assert.equal(appended[0]?.sourceHandoverId, null);
});

test("legacy assigned projection rejects a fabricated previous assignee", () => {
  const legacy = snapshot({ primaryAssigneeId: "assignee-a" });
  const before = structuredClone(legacy);
  assert.throws(
    () => appendAssignmentHistoryRecord(legacy, record({ previousAssigneeId: "fabricated", newAssigneeId: "assignee-b" })),
    (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_ASSIGNMENT_HISTORY_SOURCE_MISMATCH",
  );
  assert.deepEqual(legacy, before);
});

test("unassigned projection rejects a non-null previous assignee", () => {
  const current = snapshot();
  assert.throws(
    () => appendAssignmentHistoryRecord(current, record({ previousAssigneeId: "fabricated" })),
    (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_ASSIGNMENT_HISTORY_SOURCE_MISMATCH",
  );
});

test("valid first tracked reassignment binds previous assignee to the current projection", () => {
  const current = snapshot({ primaryAssigneeId: "assignee-a" });
  const appended = appendAssignmentHistoryRecord(current, record({ previousAssigneeId: "assignee-a", newAssigneeId: "assignee-b" }));
  assert.equal(appended[0]?.previousAssigneeId, "assignee-a");
  assert.equal(appended[0]?.newAssigneeId, "assignee-b");
});

test("appended assignment record and effectiveAt are isolated from caller mutation", () => {
  const current = snapshot();
  const input = record();
  const originalTime = input.effectiveAt.getTime();
  const appended = appendAssignmentHistoryRecord(current, input);
  Reflect.set(input, "reason", "mutated after append");
  input.effectiveAt.setTime(originalTime + 60_000);
  assert.equal(appended[0]?.reason, "Initial allocation");
  assert.equal(appended[0]?.effectiveAt.getTime(), originalTime);
  assert.notEqual(appended[0], input);
  assert.notEqual(appended[0]?.effectiveAt, input.effectiveAt);
  assert.deepEqual(current.assignmentHistory, []);
});

test("reassignment appends one immutable history record and advances generation", () => {
  const first = record();
  const current = snapshot({ primaryAssigneeId: "assignee-a", assignmentHistory: [first] });
  const before = structuredClone(first);
  const second = record({
    id: "assignment-2",
    generation: 2,
    previousAssigneeId: "assignee-a",
    newAssigneeId: "assignee-b",
    effectiveAt: new Date("2026-07-19T09:00:00.000Z"),
  });
  const appended = appendAssignmentHistoryRecord(current, second);

  assert.deepEqual(current.assignmentHistory, [before]);
  assert.deepEqual(appended[0], before);
  assert.deepEqual(appended[1], second);
  assert.equal(getNextAssignmentGeneration({ ...current, assignmentHistory: appended, primaryAssigneeId: "assignee-b" }), 3);
});

test("assignment history never replaces the primary-assignee projection", () => {
  const task = {
    primaryAssigneeId: null,
    assignedById: "manager",
    assignmentHistory: [record()],
  };
  assert.equal(resolveCurrentTaskAssignment(task).status, "UNASSIGNED");
});
