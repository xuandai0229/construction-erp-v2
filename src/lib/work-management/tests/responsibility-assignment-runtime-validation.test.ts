import assert from "node:assert/strict";
import test from "node:test";

import {
  assignResponsibility,
  replaceResponsibility,
  revokeResponsibility,
  validateResponsibilityAssignmentSnapshot,
  validateResponsibilityRegistry,
  RESPONSIBILITY_REGISTRY,
} from "../application/responsibility-assignment";
import { WorkManagementDomainError } from "../errors/codes";

const at = (): Date => new Date("2026-07-20T00:00:00.000Z");
const base = () => ({ taskId: "task-1", version: 0, assignments: [] });
const fail = (run: () => unknown, expected: string): void => {
  assert.throws(run, (error: unknown) =>
    error instanceof WorkManagementDomainError && error.code === expected,
  );
};
const invalidCommands: readonly unknown[] = [null, undefined, 1, true, "bad", [], {}];
const assign = (snapshot: unknown, overrides: Readonly<Record<string, unknown>> = {}) => ({ snapshot, id: "a1", responsibilityCode: "TASK_OWNER", responsibleUserId: "u1", actorId: "m", at: at(), reason: "reason", ...overrides });
const revoke = (snapshot: unknown, overrides: Readonly<Record<string, unknown>> = {}) => ({ snapshot, assignmentId: "a1", actorId: "m", at: at(), reason: "reason", ...overrides });
const activeRecord = (overrides: Readonly<Record<string, unknown>> = {}) => ({ id: "a1", taskId: "task-1", responsibilityCode: "TASK_OWNER", responsibleUserId: "u1", assignedById: "m", generation: 1, status: "ACTIVE", effectiveAt: at(), endedAt: null, reason: null, supersedesAssignmentId: null, ...overrides });

test("responsibility registry is closed unique runtime-safe and immutable", () => {
  validateResponsibilityRegistry(RESPONSIBILITY_REGISTRY);
  assert.ok(Object.isFrozen(RESPONSIBILITY_REGISTRY));
  assert.ok(RESPONSIBILITY_REGISTRY.every((definition) => Object.isFrozen(definition)));
  assert.equal(RESPONSIBILITY_REGISTRY[0]?.code, "TASK_OWNER");
  assert.equal(RESPONSIBILITY_REGISTRY[0]?.cardinality, "SINGLE");
  assert.equal(RESPONSIBILITY_REGISTRY[1]?.code, "TASK_CONTRIBUTOR");
  assert.equal(RESPONSIBILITY_REGISTRY[1]?.cardinality, "MULTIPLE");
  for (const registry of [null, {}, [null], [1], [{ code: "", description: "x", cardinality: "SINGLE" }], [{ code: "A", description: "", cardinality: "SINGLE" }], [{ code: "A", description: "x", cardinality: "BAD" }], [{ code: "A", description: "x", cardinality: "SINGLE" }, { code: "A", description: "y", cardinality: "SINGLE" }]]) {
    fail(() => validateResponsibilityRegistry(registry), "TASK_RESPONSIBILITY_CODE_INVALID");
  }
});

test("malformed assign replace and revoke commands fail closed with stable domain errors", () => {
  for (const value of invalidCommands) {
    fail(() => assignResponsibility(value), "TASK_RESPONSIBILITY_ASSIGNMENT_INVALID");
    fail(() => replaceResponsibility(value), "TASK_RESPONSIBILITY_ASSIGNMENT_INVALID");
    fail(() => revokeResponsibility(value), "TASK_RESPONSIBILITY_ASSIGNMENT_INVALID");
  }
  for (const command of [assign(base(), { snapshot: undefined }), assign(base(), { id: undefined }), assign(base(), { actorId: undefined }), assign(base(), { at: undefined }), assign(base(), { at: new Date("invalid") })]) {
    fail(() => assignResponsibility(command), "TASK_RESPONSIBILITY_ASSIGNMENT_INVALID");
  }
});

test("non-record responsibility history elements fail with a stable domain error", () => {
  for (const value of [null, undefined, 123, true, "invalid", [], () => undefined]) {
    fail(() => validateResponsibilityAssignmentSnapshot({ taskId: "task-1", version: 1, assignments: [value] }), "TASK_RESPONSIBILITY_HISTORY_INVALID");
  }
});

test("malformed effectiveAt values fail closed without JavaScript runtime errors", () => {
  for (const effectiveAt of ["", 123, true, [], {}, new Date("invalid")]) {
    fail(() => validateResponsibilityAssignmentSnapshot({ taskId: "task-1", version: 1, assignments: [activeRecord({ effectiveAt })] }), "TASK_RESPONSIBILITY_HISTORY_INVALID");
  }
});

test("malformed endedAt values fail closed without JavaScript runtime errors", () => {
  for (const endedAt of ["", 123, true, [], {}, new Date("invalid")]) {
    fail(() => validateResponsibilityAssignmentSnapshot({ taskId: "task-1", version: 1, assignments: [activeRecord({ status: "REVOKED", endedAt })] }), "TASK_RESPONSIBILITY_HISTORY_INVALID");
  }
});

test("malformed lifecycle operation dates fail closed with a stable domain error", () => {
  const first = assignResponsibility(assign(base()));
  for (const value of ["", 123, true, [], {}, new Date("invalid")]) {
    fail(() => replaceResponsibility(assign(first.snapshot, { id: "a2", responsibleUserId: "u2", at: value })), "TASK_RESPONSIBILITY_ASSIGNMENT_INVALID");
    fail(() => revokeResponsibility(revoke(first.snapshot, { at: value })), "TASK_RESPONSIBILITY_ASSIGNMENT_INVALID");
  }
});

test("empty whitespace and non-string responsibility reasons fail closed", () => {
  const first = assignResponsibility(assign(base()));
  for (const reason of ["", "  ", 1, true, [], {}, () => undefined]) {
    fail(() => assignResponsibility(assign(base(), { reason })), "TASK_RESPONSIBILITY_ASSIGNMENT_INVALID");
    fail(() => replaceResponsibility(assign(first.snapshot, { id: "a2", responsibleUserId: "u2", reason })), "TASK_RESPONSIBILITY_ASSIGNMENT_INVALID");
    fail(() => revokeResponsibility(revoke(first.snapshot, { reason })), "TASK_RESPONSIBILITY_ASSIGNMENT_INVALID");
  }
  const preserved = assignResponsibility(assign(base(), { reason: "  retained exactly  " }));
  assert.equal(preserved.snapshot.assignments[0]?.reason, "  retained exactly  ");
});

test("responsibility history rejects invalid runtime statuses", () => {
  for (const status of ["INVALID", "active", "", null, undefined, 1]) {
    fail(() => validateResponsibilityAssignmentSnapshot({ taskId: "task-1", version: 1, assignments: [activeRecord({ status })] }), "TASK_RESPONSIBILITY_HISTORY_INVALID");
  }
});
