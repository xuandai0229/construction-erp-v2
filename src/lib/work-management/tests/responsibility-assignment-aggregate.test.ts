import assert from "node:assert/strict";
import test from "node:test";

import {
  assignResponsibility,
  replaceResponsibility,
  revokeResponsibility,
  type ResponsibilityAssignmentSnapshot,
} from "../application/responsibility-assignment";
import { WorkManagementDomainError } from "../errors/codes";

const at = (day = 20): Date => new Date(`2026-07-${String(day).padStart(2, "0")}T00:00:00.000Z`);
const empty = (): ResponsibilityAssignmentSnapshot => ({ taskId: "task-1", version: 0, assignments: [] });
const command = (
  snapshot: ResponsibilityAssignmentSnapshot,
  id = "ra-1",
  responsibilityCode = "TASK_OWNER",
  responsibleUserId = "user-1",
  date = at(),
) => ({ snapshot, id, responsibilityCode, responsibleUserId, actorId: "manager", at: date, reason: "explicit" });
const hasCode = (error: unknown, expected: string): boolean =>
  error instanceof WorkManagementDomainError && error.code === expected;

test("registered responsibility can be explicitly assigned to one user", () => {
  const source = empty();
  const result = assignResponsibility(command(source));
  const record = result.snapshot.assignments[0];
  const effect = result.effects[0];

  assert.equal(source.version, 0);
  assert.equal(result.snapshot.version, 1);
  assert.equal(result.snapshot.assignments.length, 1);
  assert.equal(record?.id, "ra-1");
  assert.equal(record?.taskId, "task-1");
  assert.equal(record?.responsibilityCode, "TASK_OWNER");
  assert.equal(record?.responsibleUserId, "user-1");
  assert.equal(record?.assignedById, "manager");
  assert.equal(record?.generation, 1);
  assert.equal(record?.status, "ACTIVE");
  assert.deepEqual(record?.effectiveAt, at());
  assert.equal(record?.endedAt, null);
  assert.equal(record?.reason, "explicit");
  assert.equal(record?.supersedesAssignmentId, null);
  assert.equal(result.effects.length, 1);
  assert.equal(effect?.type, "RESPONSIBILITY_ASSIGNED");
  assert.equal(effect?.assignmentId, "ra-1");
  assert.equal(effect?.responsibilityCode, "TASK_OWNER");
  assert.equal(effect?.responsibleUserId, "user-1");
  assert.equal(effect?.assignedById, "manager");
  assert.equal(effect?.actorId, "manager");
  assert.equal(effect?.generation, 1);
  assert.equal(effect?.previousAssignmentId, null);
  assert.deepEqual(effect?.occurredAt, at());
});

test("unregistered responsibility code fails closed", () => {
  const source = empty();
  const raw = command(source, "ra-1", "UNKNOWN");
  assert.throws(() => assignResponsibility(raw), (error: unknown) => hasCode(error, "TASK_RESPONSIBILITY_CODE_INVALID"));
  assert.deepEqual(source, empty());
  assert.equal(raw.responsibilityCode, "UNKNOWN");
});

test("single-holder responsibility rejects a second active assignment without replacement", () => {
  const first = assignResponsibility(command(empty()));
  const raw = command(first.snapshot, "ra-2", "TASK_OWNER", "user-2");
  const before = structuredClone(first.snapshot);
  assert.throws(() => assignResponsibility(raw), (error: unknown) => hasCode(error, "TASK_RESPONSIBILITY_CARDINALITY_CONFLICT"));
  assert.deepEqual(first.snapshot, before);
});

test("single-holder replacement supersedes exactly one assignment and appends one generation", () => {
  const first = assignResponsibility(command(empty()));
  const result = replaceResponsibility(command(first.snapshot, "ra-2", "TASK_OWNER", "user-2", at(21)));
  const old = result.snapshot.assignments[0];
  const current = result.snapshot.assignments[1];
  const effect = result.effects[0];

  assert.equal(result.snapshot.version, 2);
  assert.equal(result.snapshot.assignments.length, 2);
  assert.equal(old?.id, "ra-1");
  assert.equal(old?.generation, 1);
  assert.equal(old?.status, "SUPERSEDED");
  assert.deepEqual(old?.endedAt, at(21));
  assert.equal(old?.responsibleUserId, "user-1");
  assert.equal(current?.id, "ra-2");
  assert.equal(current?.status, "ACTIVE");
  assert.equal(current?.generation, 2);
  assert.equal(current?.supersedesAssignmentId, "ra-1");
  assert.equal(current?.responsibleUserId, "user-2");
  assert.equal(effect?.type, "RESPONSIBILITY_REPLACED");
  assert.equal(effect?.previousAssignmentId, "ra-1");
  assert.equal(effect?.previousResponsibleUserId, "user-1");
  assert.equal(effect?.responsibleUserId, "user-2");
  assert.equal(effect?.actorId, "manager");
  assert.equal(effect?.generation, 2);
});

test("assignment rejects an assignment ID already present in history", () => {
  const first = assignResponsibility(command(empty()));
  const before = structuredClone(first.snapshot);
  assert.throws(() => assignResponsibility(command(first.snapshot, "ra-1", "TASK_CONTRIBUTOR", "user-2")), (error: unknown) => hasCode(error, "TASK_RESPONSIBILITY_HISTORY_INVALID"));
  assert.deepEqual(first.snapshot, before);
});

test("replacement rejects an assignment ID already present in history", () => {
  const first = assignResponsibility(command(empty()));
  const before = structuredClone(first.snapshot);
  assert.throws(() => replaceResponsibility(command(first.snapshot, "ra-1", "TASK_OWNER", "user-2", at(21))), (error: unknown) => hasCode(error, "TASK_RESPONSIBILITY_HISTORY_INVALID"));
  assert.deepEqual(first.snapshot, before);
});

test("replacing a responsibility with the current user fails closed", () => {
  const first = assignResponsibility(command(empty()));
  assert.throws(() => replaceResponsibility(command(first.snapshot, "ra-2")), (error: unknown) => hasCode(error, "TASK_RESPONSIBILITY_ALREADY_ACTIVE"));
});

test("multiple-holder responsibility permits distinct active users", () => {
  const first = assignResponsibility(command(empty(), "ra-1", "TASK_CONTRIBUTOR", "u1"));
  const second = assignResponsibility(command(first.snapshot, "ra-2", "TASK_CONTRIBUTOR", "u2"));
  assert.equal(second.snapshot.assignments.filter((item) => item.status === "ACTIVE").length, 2);
});

test("multiple-holder responsibility rejects a duplicate active user", () => {
  const first = assignResponsibility(command(empty(), "ra-1", "TASK_CONTRIBUTOR", "u1"));
  assert.throws(() => assignResponsibility(command(first.snapshot, "ra-2", "TASK_CONTRIBUTOR", "u1")), (error: unknown) => hasCode(error, "TASK_RESPONSIBILITY_ALREADY_ACTIVE"));
});

test("revoking an active responsibility closes it exactly once", () => {
  const first = assignResponsibility(command(empty()));
  const result = revokeResponsibility({ snapshot: first.snapshot, assignmentId: "ra-1", actorId: "revoker", at: at(21), reason: "withdrawn" });
  const record = result.snapshot.assignments[0];
  const effect = result.effects[0];
  assert.equal(result.snapshot.version, 2);
  assert.equal(result.snapshot.assignments.length, 1);
  assert.equal(record?.generation, 1);
  assert.equal(record?.status, "REVOKED");
  assert.deepEqual(record?.endedAt, at(21));
  assert.equal(record?.reason, "withdrawn");
  assert.equal(effect?.type, "RESPONSIBILITY_REVOKED");
  assert.equal(effect?.assignmentId, "ra-1");
  assert.equal(effect?.responsibleUserId, "user-1");
  assert.equal(effect?.originalAssignedById, "manager");
  assert.equal(effect?.actorId, "revoker");
  assert.equal(effect?.generation, 1);
  assert.deepEqual(effect?.occurredAt, at(21));
  assert.throws(() => revokeResponsibility({ snapshot: result.snapshot, assignmentId: "ra-1", actorId: "revoker", at: at(21), reason: "withdrawn" }), (error: unknown) => hasCode(error, "TASK_RESPONSIBILITY_NOT_ACTIVE"));
});

test("revoking a missing or closed assignment fails closed", () => {
  const first = assignResponsibility(command(empty()));
  assert.throws(() => revokeResponsibility({ snapshot: first.snapshot, assignmentId: "missing", actorId: "m", at: at(), reason: "x" }), (error: unknown) => hasCode(error, "TASK_RESPONSIBILITY_NOT_ACTIVE"));
  const revoked = revokeResponsibility({ snapshot: first.snapshot, assignmentId: "ra-1", actorId: "m", at: at(), reason: "x" });
  assert.throws(() => revokeResponsibility({ snapshot: revoked.snapshot, assignmentId: "ra-1", actorId: "m", at: at(), reason: "x" }), (error: unknown) => hasCode(error, "TASK_RESPONSIBILITY_NOT_ACTIVE"));
});

test("replace and revoke reject timestamps before the active assignment effective time", () => {
  const first = assignResponsibility(command(empty(), "ra-1", "TASK_OWNER", "u1", at(21)));
  assert.throws(() => replaceResponsibility(command(first.snapshot, "ra-2", "TASK_OWNER", "u2", at(20))), (error: unknown) => hasCode(error, "TASK_RESPONSIBILITY_ASSIGNMENT_INVALID"));
  assert.throws(() => revokeResponsibility({ snapshot: first.snapshot, assignmentId: "ra-1", actorId: "m", at: at(20), reason: "x" }), (error: unknown) => hasCode(error, "TASK_RESPONSIBILITY_ASSIGNMENT_INVALID"));
});

test("replace and revoke permit an operation at the exact effective timestamp", () => {
  const first = assignResponsibility(command(empty(), "ra-1", "TASK_OWNER", "u1", at()));
  const replaced = replaceResponsibility(command(first.snapshot, "ra-2", "TASK_OWNER", "u2", at()));
  assert.equal(replaced.snapshot.assignments[1]?.status, "ACTIVE");
  const contributor = assignResponsibility(command(empty(), "c1", "TASK_CONTRIBUTOR", "u1", at()));
  const revoked = revokeResponsibility({ snapshot: contributor.snapshot, assignmentId: "c1", actorId: "m", at: at(), reason: "x" });
  assert.equal(revoked.snapshot.assignments[0]?.status, "REVOKED");
});
