import assert from "node:assert/strict";
import test from "node:test";

import {
  validateResponsibilityAssignmentSnapshot,
} from "../application/responsibility-assignment";
import { WorkManagementDomainError } from "../errors/codes";

const at = (day = 20): Date => new Date(`2026-07-${String(day).padStart(2, "0")}T00:00:00.000Z`);
const fail = (run: () => unknown, expected: string): void => {
  assert.throws(run, (error: unknown) =>
    error instanceof WorkManagementDomainError && error.code === expected,
  );
};
const record = (overrides: Readonly<Record<string, unknown>> = {}) => ({
  id: "a1",
  taskId: "task-1",
  responsibilityCode: "TASK_OWNER",
  responsibleUserId: "user-1",
  assignedById: "manager",
  generation: 1,
  status: "ACTIVE",
  effectiveAt: at(),
  endedAt: null,
  reason: null,
  supersedesAssignmentId: null,
  ...overrides,
});
const snapshot = (assignments: readonly unknown[]) => ({ taskId: "task-1", version: assignments.length, assignments });

test("responsibility history rejects duplicate IDs and broken generations", () => {
  fail(() => validateResponsibilityAssignmentSnapshot(snapshot([record({ id: "same" }), record({ id: "same", responsibilityCode: "TASK_CONTRIBUTOR", responsibleUserId: "u2", generation: 2 })])), "TASK_RESPONSIBILITY_HISTORY_INVALID");
  fail(() => validateResponsibilityAssignmentSnapshot(snapshot([record({ generation: 2 })])), "TASK_RESPONSIBILITY_HISTORY_INVALID");
});

test("responsibility history rejects zero negative fractional duplicate gap and out-of-order generations", () => {
  for (const generations of [[0], [-1], [1.5], [1, 1], [1, 3], [2, 1]]) {
    const assignments = generations.map((generation, index) => record({ id: `a${index}`, responsibilityCode: "TASK_CONTRIBUTOR", responsibleUserId: `u${index}`, generation }));
    fail(() => validateResponsibilityAssignmentSnapshot(snapshot(assignments)), "TASK_RESPONSIBILITY_HISTORY_INVALID");
  }
});

test("snapshot validation rejects multiple active holders for a single responsibility", () => {
  fail(() => validateResponsibilityAssignmentSnapshot(snapshot([
    record({ id: "a1", responsibleUserId: "u1" }),
    record({ id: "a2", responsibleUserId: "u2", generation: 2 }),
  ])), "TASK_RESPONSIBILITY_CARDINALITY_CONFLICT");
});

test("snapshot validation rejects a duplicate active user for a multiple responsibility", () => {
  fail(() => validateResponsibilityAssignmentSnapshot(snapshot([
    record({ id: "a1", responsibilityCode: "TASK_CONTRIBUTOR" }),
    record({ id: "a2", responsibilityCode: "TASK_CONTRIBUTOR", generation: 2 }),
  ])), "TASK_RESPONSIBILITY_ALREADY_ACTIVE");
});

test("responsibility history rejects self supersede links", () => {
  fail(() => validateResponsibilityAssignmentSnapshot(snapshot([
    record({ status: "SUPERSEDED", endedAt: at(21), supersedesAssignmentId: "a1" }),
  ])), "TASK_RESPONSIBILITY_HISTORY_INVALID");
});

test("responsibility history rejects missing supersede links", () => {
  fail(() => validateResponsibilityAssignmentSnapshot(snapshot([
    record({ status: "ACTIVE", supersedesAssignmentId: "missing" }),
  ])), "TASK_RESPONSIBILITY_HISTORY_INVALID");
});

test("responsibility history rejects future supersede links", () => {
  fail(() => validateResponsibilityAssignmentSnapshot(snapshot([
    record({ id: "a1", status: "SUPERSEDED", endedAt: at(21) }),
    record({ id: "a2", generation: 2, supersedesAssignmentId: "a3" }),
    record({ id: "a3", responsibilityCode: "TASK_CONTRIBUTOR", responsibleUserId: "u3", generation: 3 }),
  ])), "TASK_RESPONSIBILITY_HISTORY_INVALID");
});

test("responsibility history rejects cross-responsibility supersede links", () => {
  fail(() => validateResponsibilityAssignmentSnapshot(snapshot([
    record({ id: "a1", status: "SUPERSEDED", endedAt: at(21) }),
    record({ id: "a2", responsibilityCode: "TASK_CONTRIBUTOR", responsibleUserId: "u2", generation: 2, supersedesAssignmentId: "a1" }),
  ])), "TASK_RESPONSIBILITY_HISTORY_INVALID");
});

test("responsibility history rejects a superseded record without a replacement", () => {
  fail(() => validateResponsibilityAssignmentSnapshot(snapshot([
    record({ status: "SUPERSEDED", endedAt: at(21) }),
  ])), "TASK_RESPONSIBILITY_HISTORY_INVALID");
});

test("responsibility history rejects two replacements of the same assignment", () => {
  fail(() => validateResponsibilityAssignmentSnapshot(snapshot([
    record({ id: "a1", status: "SUPERSEDED", endedAt: at(21) }),
    record({ id: "a2", responsibleUserId: "u2", generation: 2, status: "REVOKED", endedAt: at(22), supersedesAssignmentId: "a1" }),
    record({ id: "a3", responsibleUserId: "u3", generation: 3, status: "REVOKED", endedAt: at(23), supersedesAssignmentId: "a1" }),
  ])), "TASK_RESPONSIBILITY_HISTORY_INVALID");
});
