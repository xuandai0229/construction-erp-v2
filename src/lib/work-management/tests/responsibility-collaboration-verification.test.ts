import assert from "node:assert/strict";
import test from "node:test";
import {
  acceptResponsibilityCollaboration,
  createResponsibilityCollaborationSnapshot,
  inviteResponsibilityCollaborator,
  leaveResponsibilityCollaboration,
  rejectResponsibilityCollaboration,
  removeResponsibilityCollaborator,
  validateResponsibilityCollaborationSnapshot,
} from "../application/responsibility-collaboration";
import { WorkManagementDomainError } from "../errors/codes";

const at = (day = 20): Date =>
  new Date(`2026-09-${String(day).padStart(2, "0")}T00:00:00.000Z`);

const source = (generation = 1) => ({
  id: "assignment-1",
  taskId: "task-1",
  responsibilityCode: "TASK_OWNER",
  responsibleUserId: "owner-1",
  assignedById: "manager-1",
  generation,
  status: "ACTIVE",
  effectiveAt: at(1),
  endedAt: null,
  reason: null,
  supersedesAssignmentId: generation === 1 ? null : "assignment-previous",
});

const initial = () => createResponsibilityCollaborationSnapshot(source());
const command = (
  snapshot = initial(),
  overrides: Readonly<Record<string, unknown>> = {},
) => ({
  snapshot,
  id: "collaboration-1",
  collaboratorUserId: "collaborator-1",
  actorId: "owner-1",
  at: at(20),
  reason: null,
  ...overrides,
});

const hasCode = (error: unknown, expected: string): boolean =>
  error instanceof WorkManagementDomainError && error.code === expected;

test("a valid later-generation active responsibility assignment can initialize collaboration history", () => {
  const result = createResponsibilityCollaborationSnapshot(source(5));
  assert.equal(result.sourceAssignmentId, "assignment-1");
  assert.equal(result.ownerUserId, "owner-1");
  assert.equal(result.collaborations.length, 0);
});

test("distinct collaborators can be invited independently", () => {
  const first = inviteResponsibilityCollaborator(command());
  const second = inviteResponsibilityCollaborator(
    command(first.snapshot, {
      id: "collaboration-2",
      collaboratorUserId: "collaborator-2",
      at: at(21),
    }),
  );
  assert.deepEqual(
    second.snapshot.collaborations.map((record) => record.collaboratorUserId),
    ["collaborator-1", "collaborator-2"],
  );
});

test("an accepted collaboration cannot be accepted again", () => {
  const invited = inviteResponsibilityCollaborator(command());
  const accepted = acceptResponsibilityCollaboration({
    snapshot: invited.snapshot,
    collaborationId: "collaboration-1",
    actorId: "collaborator-1",
    at: at(21),
  });
  assert.throws(
    () =>
      acceptResponsibilityCollaboration({
        snapshot: accepted.snapshot,
        collaborationId: "collaboration-1",
        actorId: "collaborator-1",
        at: at(22),
      }),
    (error: unknown) => hasCode(error, "TASK_COLLABORATION_NOT_INVITED"),
  );
});

test("a rejected collaboration cannot later be accepted", () => {
  const invited = inviteResponsibilityCollaborator(command());
  const rejected = rejectResponsibilityCollaboration({
    snapshot: invited.snapshot,
    collaborationId: "collaboration-1",
    actorId: "collaborator-1",
    at: at(21),
    reason: null,
  });
  assert.throws(
    () =>
      acceptResponsibilityCollaboration({
        snapshot: rejected.snapshot,
        collaborationId: "collaboration-1",
        actorId: "collaborator-1",
        at: at(22),
      }),
    (error: unknown) => hasCode(error, "TASK_COLLABORATION_NOT_INVITED"),
  );
});

test("an unrelated actor cannot remove a collaborator", () => {
  const invited = inviteResponsibilityCollaborator(command());
  assert.throws(
    () =>
      removeResponsibilityCollaborator({
        snapshot: invited.snapshot,
        collaborationId: "collaboration-1",
        actorId: "other",
        at: at(21),
        reason: null,
      }),
    (error: unknown) => hasCode(error, "TASK_COLLABORATION_ACTOR_INVALID"),
  );
});

test("an unrelated actor cannot leave another collaborator membership", () => {
  const invited = inviteResponsibilityCollaborator(command());
  const active = acceptResponsibilityCollaboration({
    snapshot: invited.snapshot,
    collaborationId: "collaboration-1",
    actorId: "collaborator-1",
    at: at(21),
  });
  assert.throws(
    () =>
      leaveResponsibilityCollaboration({
        snapshot: active.snapshot,
        collaborationId: "collaboration-1",
        actorId: "other",
        at: at(22),
        reason: null,
      }),
    (error: unknown) => hasCode(error, "TASK_COLLABORATION_ACTOR_INVALID"),
  );
});

test("collaboration history requires invitedById to equal the original responsibility owner", () => {
  const invited = inviteResponsibilityCollaborator(command()).snapshot;
  const record = invited.collaborations[0];
  assert.ok(record);
  const malformed = { ...invited, collaborations: [{ ...record, invitedById: "system" }] };
  assert.throws(
    () => validateResponsibilityCollaborationSnapshot(malformed),
    (error: unknown) => hasCode(error, "TASK_COLLABORATION_HISTORY_INVALID"),
  );
});

test("collaboration history rejects broken source-assignment anchors", () => {
  const invited = inviteResponsibilityCollaborator(command()).snapshot;
  const record = invited.collaborations[0];
  assert.ok(record);
  const malformed = { ...invited, collaborations: [{ ...record, sourceAssignmentId: "foreign" }] };
  assert.throws(
    () => validateResponsibilityCollaborationSnapshot(malformed),
    (error: unknown) => hasCode(error, "TASK_COLLABORATION_HISTORY_INVALID"),
  );
});

test("collaboration lifecycle rejects malformed command objects", () => {
  for (const malformed of [null, undefined, 1, "command", [], {}, { snapshot: initial() }]) {
    assert.throws(
      () => inviteResponsibilityCollaborator(malformed),
      (error: unknown) => hasCode(error, "TASK_COLLABORATION_INVALID"),
    );
  }
});

test("empty whitespace and non-string collaboration reasons fail closed", () => {
  for (const reason of ["", "   ", 1, false, [], {}, () => undefined]) {
    assert.throws(
      () => inviteResponsibilityCollaborator(command(initial(), { reason })),
      (error: unknown) => hasCode(error, "TASK_COLLABORATION_INVALID"),
    );
  }
});

test("collaboration lifecycle rejects timestamps before invitation or acceptance", () => {
  const invited = inviteResponsibilityCollaborator(command());
  assert.throws(
    () =>
      acceptResponsibilityCollaboration({
        snapshot: invited.snapshot,
        collaborationId: "collaboration-1",
        actorId: "collaborator-1",
        at: at(19),
      }),
    (error: unknown) => hasCode(error, "TASK_COLLABORATION_TIME_INVALID"),
  );
  const active = acceptResponsibilityCollaboration({
    snapshot: invited.snapshot,
    collaborationId: "collaboration-1",
    actorId: "collaborator-1",
    at: at(21),
  });
  assert.throws(
    () =>
      leaveResponsibilityCollaboration({
        snapshot: active.snapshot,
        collaborationId: "collaboration-1",
        actorId: "collaborator-1",
        at: at(20),
        reason: null,
      }),
    (error: unknown) => hasCode(error, "TASK_COLLABORATION_TIME_INVALID"),
  );
});

test("collaboration lifecycle preserves command snapshot date and source-assignment inputs", () => {
  const sourceRecord = source();
  const sourceBefore = structuredClone(sourceRecord);
  const snapshot = createResponsibilityCollaborationSnapshot(sourceRecord);
  const input = command(snapshot);
  const commandBefore = structuredClone(input);
  inviteResponsibilityCollaborator(input);
  assert.deepEqual(sourceRecord, sourceBefore);
  assert.deepEqual(input, commandBefore);
});

test("collaboration never creates responsibility or delegation records", () => {
  const result = inviteResponsibilityCollaborator(command());
  const serialized = JSON.stringify(result.snapshot);
  assert.equal(serialized.includes("assignments"), false);
  assert.equal(serialized.includes("delegations"), false);
});

test("ProjectMember participant reviewer approver notification recipient and delegate are not implicit collaborators", () => {
  const result = createResponsibilityCollaborationSnapshot(source());
  assert.deepEqual(result.collaborations, []);
  assert.equal("participants" in result, false);
  assert.equal("reviewerId" in result, false);
  assert.equal("approverId" in result, false);
});
