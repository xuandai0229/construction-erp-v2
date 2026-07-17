import assert from "node:assert/strict";
import test from "node:test";

import { createResponsibilityDelegationSnapshot, isResponsibilityDelegationEffectiveAt, validateResponsibilityDelegationEffects, validateResponsibilityDelegationSnapshot } from "../application/responsibility-delegation";
import { WorkManagementDomainError } from "../errors/codes";

const at = (day: number): Date => new Date(`2026-08-${String(day).padStart(2, "0")}T00:00:00.000Z`);
const accepted = (generation: number) => ({ id: `dg-${generation}`, taskId: "task-1", sourceAssignmentId: "ra-1", responsibilityCode: "TASK_OWNER", delegatorUserId: "holder", delegateUserId: "delegate", requestedById: "holder", generation, status: "ACCEPTED" as const, requestedAt: at(20), startsAt: at(21), expiresAt: at(30), acceptedAt: at(21), endedAt: null, requestReason: null, decisionReason: null, endReason: null });

test("delegation effectiveness supports accepted records from later generations", () => {
  assert.equal(isResponsibilityDelegationEffectiveAt(accepted(2), at(21)), true);
  assert.equal(isResponsibilityDelegationEffectiveAt(accepted(5), at(29)), true);
});

test("delegation effectiveness validates standalone records without assuming generation one", () => {
  assert.equal(isResponsibilityDelegationEffectiveAt(accepted(1), at(21)), true);
  assert.equal(isResponsibilityDelegationEffectiveAt(accepted(5), at(30)), false);
});

test("malformed standalone delegation records fail with TASK_DELEGATION_INVALID", () => {
  for (const value of [null, {}, accepted(2)]) {
    if (value !== null && typeof value === "object" && "acceptedAt" in value) value.acceptedAt = new Date("invalid");
    assert.throws(() => isResponsibilityDelegationEffectiveAt(value, at(21)), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_DELEGATION_INVALID");
  }
});

test("delegation source factory rejects structurally incomplete active responsibility assignments", () => {
  assert.throws(() => createResponsibilityDelegationSnapshot({ id: "ra", taskId: "t", responsibilityCode: "TASK_OWNER", responsibleUserId: "u", status: "ACTIVE" }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_DELEGATION_INVALID");
});

test("delegation source factory rejects malformed active assignment dates generations and reasons", () => {
  const source = () => ({ id: "ra", taskId: "t", responsibilityCode: "TASK_OWNER", responsibleUserId: "u", assignedById: "m", generation: 2, status: "ACTIVE", effectiveAt: at(1), endedAt: null, reason: null, supersedesAssignmentId: "old" });
  for (const patch of [{ generation: 0 }, { effectiveAt: new Date("invalid") }, { reason: " " }]) assert.throws(() => createResponsibilityDelegationSnapshot({ ...source(), ...patch }), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_DELEGATION_INVALID");
});

test("delegation source factory accepts a valid later-generation active responsibility assignment", () => {
  const result = createResponsibilityDelegationSnapshot({ id: "ra-2", taskId: "task", responsibilityCode: "TASK_OWNER", responsibleUserId: "holder", assignedById: "m", generation: 2, status: "ACTIVE", effectiveAt: at(2), endedAt: null, reason: "replacement", supersedesAssignmentId: "ra-1" });
  assert.equal(result.sourceAssignmentId, "ra-2");
});

test("delegation history requires requestedById to equal the original responsibility holder", () => {
  const value = accepted(1); const snapshot = { taskId: "task-1", sourceAssignmentId: "ra-1", responsibilityCode: "TASK_OWNER", delegatorUserId: "holder", version: 1, delegations: [{ ...value, status: "REQUESTED", acceptedAt: null, requestedById: "delegate" }] };
  assert.throws(() => validateResponsibilityDelegationSnapshot(snapshot), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_DELEGATION_HISTORY_INVALID");
});

test("revoked and expired histories enforce acceptedAt chronology", () => {
  const snapshot = (record: unknown) => ({ taskId: "task-1", sourceAssignmentId: "ra-1", responsibilityCode: "TASK_OWNER", delegatorUserId: "holder", version: 1, delegations: [record] });
  for (const status of ["REVOKED", "EXPIRED"] as const) for (const acceptedAt of [at(19), at(30)]) { const record = { ...accepted(1), status, endedAt: status === "REVOKED" ? at(22) : at(30), acceptedAt }; assert.throws(() => validateResponsibilityDelegationSnapshot(snapshot(record)), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_DELEGATION_HISTORY_INVALID"); }
  for (const status of ["REVOKED", "EXPIRED"] as const) { const record = { ...accepted(1), status, endedAt: status === "REVOKED" ? at(22) : at(30) }; assert.doesNotThrow(() => validateResponsibilityDelegationSnapshot(snapshot(record))); }
});

test("delegation effect validation rejects invalid time windows", () => {
  assert.throws(() => validateResponsibilityDelegationEffects([{ type: "RESPONSIBILITY_DELEGATION_REQUESTED", delegationId: "d", taskId: "t", sourceAssignmentId: "s", responsibilityCode: "TASK_OWNER", delegatorUserId: "u", delegateUserId: "v", actorId: "u", generation: 1, occurredAt: at(21), startsAt: at(22), expiresAt: at(22), requestReason: null }]), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_DELEGATION_INVALID");
});

test("delegation effect validation rejects mismatched accepted and expired timestamps", () => {
  const base = { delegationId: "d", taskId: "t", sourceAssignmentId: "s", responsibilityCode: "TASK_OWNER", delegatorUserId: "u", delegateUserId: "v", actorId: "u", generation: 1, startsAt: at(21), expiresAt: at(30) };
  assert.throws(() => validateResponsibilityDelegationEffects([{ ...base, type: "RESPONSIBILITY_DELEGATION_ACCEPTED", occurredAt: at(22), acceptedAt: at(21) }]), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_DELEGATION_INVALID");
  assert.throws(() => validateResponsibilityDelegationEffects([{ ...base, type: "RESPONSIBILITY_DELEGATION_EXPIRED", occurredAt: at(30), endedAt: at(29) }]), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_DELEGATION_INVALID");
});

test("delegation effect validation rejects malformed cross-type metadata", () => {
  const value = { type: "RESPONSIBILITY_DELEGATION_REQUESTED", delegationId: "d", taskId: "t", sourceAssignmentId: "s", responsibilityCode: "TASK_OWNER", delegatorUserId: "u", delegateUserId: "v", actorId: "u", generation: 1, occurredAt: at(20), startsAt: at(21), expiresAt: at(30), requestReason: null, acceptedAt: at(20) };
  assert.throws(() => validateResponsibilityDelegationEffects([value]), (error: unknown) => error instanceof WorkManagementDomainError && error.code === "TASK_DELEGATION_INVALID");
});
