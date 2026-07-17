import assert from "node:assert/strict";
import test from "node:test";
import {
  acceptResponsibilityCollaboration,
  createResponsibilityCollaborationSnapshot,
  inviteResponsibilityCollaborator,
  leaveResponsibilityCollaboration,
  rejectResponsibilityCollaboration,
  removeResponsibilityCollaborator,
  validateResponsibilityCollaborationEffects,
  validateResponsibilityCollaborationRecord,
  validateResponsibilityCollaborationSnapshot,
} from "../application/responsibility-collaboration";
import { WorkManagementDomainError } from "../errors/codes";

const at = (day = 20): Date =>
  new Date(`2026-09-${String(day).padStart(2, "0")}T00:00:00.000Z`);

const source = () => ({
  id: "assignment-1",
  taskId: "task-1",
  responsibilityCode: "TASK_OWNER",
  responsibleUserId: "owner-1",
  assignedById: "manager-1",
  generation: 1,
  status: "ACTIVE",
  effectiveAt: at(1),
  endedAt: null,
  reason: null,
  supersedesAssignmentId: null,
});

const snapshot = () => createResponsibilityCollaborationSnapshot(source());

const invitedSnapshot = () =>
  inviteResponsibilityCollaborator({
    snapshot: snapshot(),
    id: "collaboration-1",
    collaboratorUserId: "collaborator-1",
    actorId: "owner-1",
    at: at(20),
    reason: null,
  }).snapshot;

const hasCode = (error: unknown, expected: string): boolean =>
  error instanceof WorkManagementDomainError && error.code === expected;

test("collaboration source factory rejects malformed active responsibility assignments", () => {
  for (const bad of [
    null,
    {},
    { ...source(), generation: 0 },
    { ...source(), effectiveAt: new Date("invalid") },
    { ...source(), reason: "" },
    { ...source(), status: "REVOKED", endedAt: at(2) },
  ]) {
    assert.throws(
      () => createResponsibilityCollaborationSnapshot(bad),
      (error: unknown) => hasCode(error, "TASK_COLLABORATION_INVALID"),
    );
  }
});

test("collaboration history rejects malformed runtime records and lifecycle timestamps", () => {
  const valid = invitedSnapshot();
  const record = valid.collaborations[0];
  assert.ok(record);
  const badStatus = { ...valid, collaborations: [{ ...record, status: "INVALID" }] };
  const badDate = {
    ...valid,
    collaborations: [{ ...record, invitedAt: new Date("invalid") }],
  };
  const badProvenance = { ...valid, collaborations: [{ ...record, invitedById: "other" }] };
  for (const candidate of [badStatus, badDate, badProvenance]) {
    assert.throws(
      () => validateResponsibilityCollaborationSnapshot(candidate),
      (error: unknown) => hasCode(error, "TASK_COLLABORATION_HISTORY_INVALID"),
    );
  }
});

test("collaboration history rejects duplicate IDs broken generations and duplicate open collaborator records", () => {
  const valid = invitedSnapshot();
  const record = valid.collaborations[0];
  assert.ok(record);
  const duplicateId = {
    ...valid,
    collaborations: [record, { ...record, generation: 2 }],
  };
  const gap = { ...valid, collaborations: [{ ...record, generation: 2 }] };
  const duplicateOpen = {
    ...valid,
    collaborations: [record, { ...record, id: "collaboration-2", generation: 2 }],
  };
  for (const candidate of [duplicateId, gap]) {
    assert.throws(
      () => validateResponsibilityCollaborationSnapshot(candidate),
      (error: unknown) => hasCode(error, "TASK_COLLABORATION_HISTORY_INVALID"),
    );
  }
  assert.throws(
    () => validateResponsibilityCollaborationSnapshot(duplicateOpen),
    (error: unknown) => hasCode(error, "TASK_COLLABORATION_ALREADY_OPEN"),
  );
});

test("standalone collaboration record validation rejects invalid lifecycle shape", () => {
  const record = invitedSnapshot().collaborations[0];
  assert.ok(record);
  const invalid = { ...record, status: "ACTIVE", acceptedAt: null };
  assert.throws(
    () => validateResponsibilityCollaborationRecord(invalid),
    (error: unknown) => hasCode(error, "TASK_COLLABORATION_INVALID"),
  );
});

test("collaboration effects expose typed trusted metadata and reject malformed effects", () => {
  const result = inviteResponsibilityCollaborator({
    snapshot: snapshot(),
    id: "collaboration-1",
    collaboratorUserId: "collaborator-1",
    actorId: "owner-1",
    at: at(20),
    reason: "help",
  });
  validateResponsibilityCollaborationEffects(result.effects);
  const effect = result.effects[0];
  assert.ok(effect);
  const malformed = [{ ...effect, occurredAt: new Date("invalid") }];
  assert.throws(
    () => validateResponsibilityCollaborationEffects(malformed),
    (error: unknown) => hasCode(error, "TASK_COLLABORATION_INVALID"),
  );
});

test("collaboration outputs and effects are isolated from mutable source values", () => {
  const sourceRecord = source();
  const sourceDate = sourceRecord.effectiveAt;
  const initial = createResponsibilityCollaborationSnapshot(sourceRecord);
  const commandDate = at(20);
  const result = inviteResponsibilityCollaborator({
    snapshot: initial,
    id: "collaboration-1",
    collaboratorUserId: "collaborator-1",
    actorId: "owner-1",
    at: commandDate,
    reason: null,
  });
  sourceRecord.responsibleUserId = "changed-owner";
  sourceDate.setDate(10);
  commandDate.setDate(25);
  assert.equal(result.snapshot.ownerUserId, "owner-1");
  assert.deepEqual(result.snapshot.collaborations[0]?.invitedAt, at(20));
  assert.deepEqual(result.effects[0]?.occurredAt, at(20));
  const returnedDate = result.effects[0]?.occurredAt;
  assert.ok(returnedDate);
  returnedDate.setDate(26);
  assert.deepEqual(result.snapshot.collaborations[0]?.invitedAt, at(20));
});

test("collaboration foundation remains independent from the operational assignee projection", () => {
  const result = inviteResponsibilityCollaborator({
    snapshot: snapshot(),
    id: "collaboration-1",
    collaboratorUserId: "collaborator-1",
    actorId: "owner-1",
    at: at(20),
    reason: null,
  });
  assert.equal("primaryAssigneeId" in result.snapshot, false);
  assert.equal("delegations" in result.snapshot, false);
  assert.equal(result.snapshot.collaborations[0]?.ownerUserId, "owner-1");
});

test("removed collaboration history rejects acceptedAt before invitedAt", () => {
  const invited = invitedSnapshot();
  const record = invited.collaborations[0];
  assert.ok(record);
  const malformed = {
    ...invited,
    collaborations: [
      {
        ...record,
        status: "REMOVED",
        acceptedAt: at(19),
        endedAt: at(21),
        endReason: null,
      },
    ],
  };
  const before = structuredClone(malformed);
  assert.throws(
    () => validateResponsibilityCollaborationSnapshot(malformed),
    (error: unknown) => hasCode(error, "TASK_COLLABORATION_HISTORY_INVALID"),
  );
  assert.deepEqual(malformed, before);
});

test("removed collaboration history accepts a valid prior acceptance timestamp", () => {
  const invited = inviteResponsibilityCollaborator({
    snapshot: snapshot(),
    id: "collaboration-1",
    collaboratorUserId: "collaborator-1",
    actorId: "owner-1",
    at: at(20),
    reason: null,
  });
  const active = acceptResponsibilityCollaboration({
    snapshot: invited.snapshot,
    collaborationId: "collaboration-1",
    actorId: "collaborator-1",
    at: at(21),
  });
  const removed = removeResponsibilityCollaborator({
    snapshot: active.snapshot,
    collaborationId: "collaboration-1",
    actorId: "owner-1",
    at: at(22),
    reason: null,
  });
  validateResponsibilityCollaborationSnapshot(removed.snapshot);
  assert.deepEqual(removed.snapshot.collaborations[0]?.acceptedAt, at(21));
  assert.deepEqual(removed.snapshot.collaborations[0]?.endedAt, at(22));
});

test("removing an active collaborator preserves a chronologically valid acceptedAt", () => {
  const invited = inviteResponsibilityCollaborator({
    snapshot: snapshot(),
    id: "collaboration-1",
    collaboratorUserId: "collaborator-1",
    actorId: "owner-1",
    at: at(20),
    reason: null,
  });
  const active = acceptResponsibilityCollaboration({
    snapshot: invited.snapshot,
    collaborationId: "collaboration-1",
    actorId: "collaborator-1",
    at: at(21),
  });
  const removed = removeResponsibilityCollaborator({
    snapshot: active.snapshot,
    collaborationId: "collaboration-1",
    actorId: "owner-1",
    at: at(22),
    reason: "closed",
  });
  const record = removed.snapshot.collaborations[0];
  assert.ok(record?.acceptedAt);
  assert.ok(record?.endedAt);
  assert.ok(record.acceptedAt >= record.invitedAt);
  assert.ok(record.endedAt >= record.acceptedAt);
});

test("collaboration effect validation enforces owner actor provenance for invite and remove", () => {
  const invited = inviteResponsibilityCollaborator({
    snapshot: snapshot(),
    id: "collaboration-1",
    collaboratorUserId: "collaborator-1",
    actorId: "owner-1",
    at: at(20),
    reason: null,
  });
  const inviteEffect = invited.effects[0];
  assert.ok(inviteEffect);
  const active = acceptResponsibilityCollaboration({
    snapshot: invited.snapshot,
    collaborationId: "collaboration-1",
    actorId: "collaborator-1",
    at: at(21),
  });
  const removed = removeResponsibilityCollaborator({
    snapshot: active.snapshot,
    collaborationId: "collaboration-1",
    actorId: "owner-1",
    at: at(22),
    reason: null,
  });
  const removeEffect = removed.effects[0];
  assert.ok(removeEffect);
  for (const effect of [
    { ...inviteEffect, actorId: "other" },
    { ...removeEffect, actorId: "other" },
  ]) {
    assert.throws(
      () => validateResponsibilityCollaborationEffects([effect]),
      (error: unknown) => hasCode(error, "TASK_COLLABORATION_INVALID"),
    );
  }
});

test("collaboration effect validation enforces collaborator actor provenance for accept reject and leave", () => {
  const invited = inviteResponsibilityCollaborator({ snapshot: snapshot(), id: "collaboration-1", collaboratorUserId: "collaborator-1", actorId: "owner-1", at: at(20), reason: null });
  const accepted = acceptResponsibilityCollaboration({ snapshot: invited.snapshot, collaborationId: "collaboration-1", actorId: "collaborator-1", at: at(21) });
  const rejected = rejectResponsibilityCollaboration({ snapshot: inviteResponsibilityCollaborator({ snapshot: snapshot(), id: "collaboration-2", collaboratorUserId: "collaborator-2", actorId: "owner-1", at: at(20), reason: null }).snapshot, collaborationId: "collaboration-2", actorId: "collaborator-2", at: at(21), reason: null });
  const left = leaveResponsibilityCollaboration({ snapshot: accepted.snapshot, collaborationId: "collaboration-1", actorId: "collaborator-1", at: at(22), reason: null });
  for (const item of [accepted.effects[0], rejected.effects[0], left.effects[0]]) {
    assert.ok(item);
    assert.throws(
      () => validateResponsibilityCollaborationEffects([{ ...item, actorId: "owner-1" }]),
      (error: unknown) => hasCode(error, "TASK_COLLABORATION_INVALID"),
    );
  }
});

test("collaboration effect validation rejects self collaboration metadata and conflicting cross-type lifecycle metadata", () => {
  const invited = inviteResponsibilityCollaborator({ snapshot: snapshot(), id: "collaboration-1", collaboratorUserId: "collaborator-1", actorId: "owner-1", at: at(20), reason: null });
  const effect = invited.effects[0];
  assert.ok(effect);
  for (const malformed of [
    { ...effect, collaboratorUserId: "owner-1" },
    { ...effect, acceptedAt: at(21) },
  ]) {
    assert.throws(
      () => validateResponsibilityCollaborationEffects([malformed]),
      (error: unknown) => hasCode(error, "TASK_COLLABORATION_INVALID"),
    );
  }
});
