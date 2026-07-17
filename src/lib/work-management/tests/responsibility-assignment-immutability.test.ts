import assert from "node:assert/strict";
import test from "node:test";

import {
  assignResponsibility,
  replaceResponsibility,
  revokeResponsibility,
  RESPONSIBILITY_REGISTRY,
} from "../application/responsibility-assignment";

const at = (day = 20): Date => new Date(`2026-07-${String(day).padStart(2, "0")}T00:00:00.000Z`);
const base = () => ({ taskId: "task-1", version: 0, assignments: [] });
const command = (snapshot: unknown, id = "a1", user = "u1", date = at()) => ({ snapshot, id, responsibilityCode: "TASK_OWNER", responsibleUserId: user, actorId: "manager", at: date, reason: "reason" });

test("responsibility operation outputs are isolated from mutable source records and dates", () => {
  const sourceDate = at();
  const sourceRecord = {
    id: "a1", taskId: "task-1", responsibilityCode: "TASK_OWNER", responsibleUserId: "u1", assignedById: "manager", generation: 1, status: "ACTIVE" as const, effectiveAt: sourceDate, endedAt: null, reason: "source", supersedesAssignmentId: null,
  };
  const source = { taskId: "task-1", version: 1, assignments: [sourceRecord] };
  const result = replaceResponsibility(command(source, "a2", "u2", at(21)));
  sourceRecord.responsibleUserId = "mutated-source";
  sourceDate.setFullYear(2030);
  assert.equal(result.snapshot.assignments[0]?.responsibleUserId, "u1");
  assert.deepEqual(result.snapshot.assignments[0]?.effectiveAt, at());
});

test("later responsibility operations do not mutate prior snapshots", () => {
  const first = assignResponsibility(command(base()));
  const before = structuredClone(first.snapshot);
  const later = replaceResponsibility(command(first.snapshot, "a2", "u2", at(21)));
  assert.deepEqual(first.snapshot, before);
  assert.equal(later.snapshot.assignments.length, 2);
});

test("responsibility effects are isolated from caller mutation", () => {
  const inputDate = at();
  const result = assignResponsibility(command(base(), "a1", "u1", inputDate));
  const effect = result.effects[0];
  assert.notEqual(effect, undefined);
  if (effect === undefined) return;
  effect.occurredAt.setFullYear(2030);
  assert.deepEqual(result.snapshot.assignments[0]?.effectiveAt, at());
  assert.deepEqual(inputDate, at());
});

test("assign replace and revoke preserve command snapshot date and registry inputs", () => {
  const source = base();
  const assignDate = at();
  const assignCommand = command(source, "a1", "u1", assignDate);
  const registryBefore = structuredClone(RESPONSIBILITY_REGISTRY);
  const assigned = assignResponsibility(assignCommand);
  assert.deepEqual(source, base());
  assert.deepEqual(assignDate, at());
  assert.deepEqual(assignCommand.at, at());
  assert.deepEqual(RESPONSIBILITY_REGISTRY, registryBefore);
  const replaceDate = at(21);
  const replaceCommand = command(assigned.snapshot, "a2", "u2", replaceDate);
  const beforeReplace = structuredClone(assigned.snapshot);
  const replaced = replaceResponsibility(replaceCommand);
  assert.deepEqual(assigned.snapshot, beforeReplace);
  assert.deepEqual(replaceDate, at(21));
  const revokeDate = at(22);
  const revokeCommand = { snapshot: replaced.snapshot, assignmentId: "a2", actorId: "m", at: revokeDate, reason: "revoked" };
  const beforeRevoke = structuredClone(replaced.snapshot);
  revokeResponsibility(revokeCommand);
  assert.deepEqual(replaced.snapshot, beforeRevoke);
  assert.deepEqual(revokeDate, at(22));
  assert.ok(Object.isFrozen(RESPONSIBILITY_REGISTRY));
});
