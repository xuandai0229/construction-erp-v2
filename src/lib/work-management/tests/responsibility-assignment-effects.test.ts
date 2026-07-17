import assert from "node:assert/strict";
import test from "node:test";

import {
  assignResponsibility,
  replaceResponsibility,
  revokeResponsibility,
  validateResponsibilityEffects,
} from "../application/responsibility-assignment";
import { WorkManagementDomainError } from "../errors/codes";

const at = (day = 20): Date => new Date(`2026-07-${String(day).padStart(2, "0")}T00:00:00.000Z`);
const base = () => ({ taskId: "task-1", version: 0, assignments: [] });
const command = (snapshot: unknown, id = "a1", user = "u1", date = at()) => ({ snapshot, id, responsibilityCode: "TASK_OWNER", responsibleUserId: user, actorId: "manager", at: date, reason: "reason" });
const fail = (run: () => unknown): void => {
  assert.throws(run, (error: unknown) =>
    error instanceof WorkManagementDomainError && error.code === "TASK_RESPONSIBILITY_ASSIGNMENT_INVALID",
  );
};

test("responsibility effects expose exact type-specific trusted metadata", () => {
  const assigned = assignResponsibility(command(base()));
  const replaced = replaceResponsibility(command(assigned.snapshot, "a2", "u2", at(21)));
  const revoked = revokeResponsibility({ snapshot: replaced.snapshot, assignmentId: "a2", actorId: "revoker", at: at(22), reason: "revoked" });
  const assignEffect = assigned.effects[0];
  const replaceEffect = replaced.effects[0];
  const revokeEffect = revoked.effects[0];
  assert.equal(assignEffect?.type, "RESPONSIBILITY_ASSIGNED");
  assert.equal(assignEffect?.assignedById, "manager");
  assert.equal(assignEffect?.previousAssignmentId, null);
  assert.equal(replaceEffect?.type, "RESPONSIBILITY_REPLACED");
  assert.equal(replaceEffect?.previousAssignmentId, "a1");
  assert.equal(replaceEffect?.previousResponsibleUserId, "u1");
  assert.equal(replaceEffect?.assignedById, "manager");
  assert.equal(revokeEffect?.type, "RESPONSIBILITY_REVOKED");
  assert.equal(revokeEffect?.originalAssignedById, "manager");
  assert.equal(revokeEffect?.actorId, "revoker");
  assert.equal(revokeEffect?.previousAssignmentId, null);
});

test("malformed responsibility effects fail closed", () => {
  for (const value of [null, {}, [null], [{ type: "UNKNOWN" }], [{ type: "RESPONSIBILITY_ASSIGNED", assignmentId: "a", taskId: "t", responsibilityCode: "TASK_OWNER", responsibleUserId: "u", assignedById: "m", actorId: "m", generation: 0, previousAssignmentId: null, occurredAt: at() }], [{ type: "RESPONSIBILITY_REPLACED", assignmentId: "a", taskId: "t", responsibilityCode: "TASK_OWNER", responsibleUserId: "u", assignedById: "m", actorId: "m", generation: 1, previousAssignmentId: null, occurredAt: at() }]]) {
    fail(() => validateResponsibilityEffects(value));
  }
});
