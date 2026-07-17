import assert from "node:assert/strict";
import test from "node:test";
import {
  acceptResponsibilityCollaboration,
  createResponsibilityCollaborationSnapshot,
  inviteResponsibilityCollaborator,
  leaveResponsibilityCollaboration,
  rejectResponsibilityCollaboration,
  removeResponsibilityCollaborator,
} from "../application/responsibility-collaboration";
import { WorkManagementDomainError } from "../errors/codes";

const at = (day = 20): Date =>
  new Date(`2026-09-${String(day).padStart(2, "0")}T00:00:00.000Z`);

type MutableSource = {
  id: string;
  taskId: string;
  responsibilityCode: string;
  responsibleUserId: string;
  assignedById: string;
  generation: number;
  status: string;
  effectiveAt: Date;
  endedAt: Date | null;
  reason: string | null;
  supersedesAssignmentId: string | null;
};

const source = (): MutableSource => ({
  id: "assignment-1",
  taskId: "task-1",
  responsibilityCode: "TASK_OWNER",
  responsibleUserId: "owner-1",
  assignedById: "manager-1",
  generation: 2,
  status: "ACTIVE",
  effectiveAt: at(1),
  endedAt: null,
  reason: null,
  supersedesAssignmentId: "assignment-0",
});

const snapshot = () => createResponsibilityCollaborationSnapshot(source());

const invite = (
  value = snapshot(),
  overrides: Readonly<Record<string, unknown>> = {},
) => ({
  snapshot: value,
  id: "collaboration-1",
  collaboratorUserId: "collaborator-1",
  actorId: "owner-1",
  at: at(20),
  reason: "review together",
  ...overrides,
});

const hasCode = (error: unknown, expected: string): boolean =>
  error instanceof WorkManagementDomainError && error.code === expected;

test("an active responsibility assignment creates an empty collaboration snapshot", () => {
  assert.deepEqual(snapshot(), {
    taskId: "task-1",
    sourceAssignmentId: "assignment-1",
    responsibilityCode: "TASK_OWNER",
    ownerUserId: "owner-1",
    version: 0,
    collaborations: [],
  });
});

test("a closed responsibility assignment cannot initialize collaboration history", () => {
  const closed = source();
  closed.status = "REVOKED";
  closed.endedAt = at(2);
  assert.throws(
    () => createResponsibilityCollaborationSnapshot(closed),
    (error: unknown) => hasCode(error, "TASK_COLLABORATION_INVALID"),
  );
});

test("owner can explicitly invite a collaborator with trusted source metadata", () => {
  const input = invite();
  const result = inviteResponsibilityCollaborator(input);
  const record = result.snapshot.collaborations[0];
  const effect = result.effects[0];
  assert.equal(result.snapshot.version, 1);
  assert.equal(record?.id, "collaboration-1");
  assert.equal(record?.generation, 1);
  assert.equal(record?.status, "INVITED");
  assert.equal(record?.invitedById, "owner-1");
  assert.equal(record?.sourceAssignmentId, "assignment-1");
  assert.deepEqual(record?.invitedAt, at(20));
  assert.equal(effect?.type, "RESPONSIBILITY_COLLABORATION_INVITED");
  assert.equal(effect?.actorId, "owner-1");
  assert.equal(effect?.invitationReason, "review together");
});

test("only the responsibility owner can invite and collaborators cannot create chains", () => {
  const first = inviteResponsibilityCollaborator(invite());
  for (const command of [
    invite(snapshot(), { actorId: "other" }),
    invite(first.snapshot, {
      id: "collaboration-2",
      actorId: "collaborator-1",
      collaboratorUserId: "collaborator-2",
    }),
  ]) {
    assert.throws(
      () => inviteResponsibilityCollaborator(command),
      (error: unknown) => hasCode(error, "TASK_COLLABORATION_ACTOR_INVALID"),
    );
  }
});

test("self collaboration is forbidden and one collaborator cannot have two open records", () => {
  assert.throws(
    () => inviteResponsibilityCollaborator(invite(snapshot(), { collaboratorUserId: "owner-1" })),
    (error: unknown) => hasCode(error, "TASK_COLLABORATION_SELF_FORBIDDEN"),
  );
  const first = inviteResponsibilityCollaborator(invite());
  assert.throws(
    () => inviteResponsibilityCollaborator(invite(first.snapshot, { id: "collaboration-2" })),
    (error: unknown) => hasCode(error, "TASK_COLLABORATION_ALREADY_OPEN"),
  );
});

test("a named collaborator accepts an invitation without changing responsibility ownership", () => {
  const invited = inviteResponsibilityCollaborator(invite());
  const accepted = acceptResponsibilityCollaboration({
    snapshot: invited.snapshot,
    collaborationId: "collaboration-1",
    actorId: "collaborator-1",
    at: at(21),
  });
  const record = accepted.snapshot.collaborations[0];
  assert.equal(accepted.snapshot.ownerUserId, "owner-1");
  assert.equal(record?.status, "ACTIVE");
  assert.deepEqual(record?.acceptedAt, at(21));
  assert.equal(accepted.effects[0]?.type, "RESPONSIBILITY_COLLABORATION_ACCEPTED");
});

test("only the invited collaborator can accept or reject an invited record", () => {
  const invited = inviteResponsibilityCollaborator(invite());
  for (const run of [
    () =>
      acceptResponsibilityCollaboration({
        snapshot: invited.snapshot,
        collaborationId: "collaboration-1",
        actorId: "owner-1",
        at: at(21),
      }),
    () =>
      rejectResponsibilityCollaboration({
        snapshot: invited.snapshot,
        collaborationId: "collaboration-1",
        actorId: "other",
        at: at(21),
        reason: "no",
      }),
  ]) {
    assert.throws(run, (error: unknown) =>
      hasCode(error, "TASK_COLLABORATION_ACTOR_INVALID"),
    );
  }
});

test("a named collaborator rejects an invitation and can be reinvited with a new generation", () => {
  const invited = inviteResponsibilityCollaborator(invite());
  const rejected = rejectResponsibilityCollaboration({
    snapshot: invited.snapshot,
    collaborationId: "collaboration-1",
    actorId: "collaborator-1",
    at: at(21),
    reason: "not available",
  });
  assert.equal(rejected.snapshot.collaborations[0]?.status, "REJECTED");
  assert.equal(rejected.effects[0]?.type, "RESPONSIBILITY_COLLABORATION_REJECTED");
  const reinvited = inviteResponsibilityCollaborator(
    invite(rejected.snapshot, { id: "collaboration-2", at: at(22) }),
  );
  assert.equal(reinvited.snapshot.collaborations[1]?.generation, 2);
});

test("the owner can remove an invited or active collaborator with wasActive effect metadata", () => {
  const invited = inviteResponsibilityCollaborator(invite());
  const removedInvite = removeResponsibilityCollaborator({
    snapshot: invited.snapshot,
    collaborationId: "collaboration-1",
    actorId: "owner-1",
    at: at(21),
    reason: "scope changed",
  });
  assert.equal(removedInvite.snapshot.collaborations[0]?.status, "REMOVED");
  const inviteEffect = removedInvite.effects[0];
  assert.equal(inviteEffect?.type, "RESPONSIBILITY_COLLABORATION_REMOVED");
  if (inviteEffect?.type === "RESPONSIBILITY_COLLABORATION_REMOVED") {
    assert.equal(inviteEffect.wasActive, false);
  }
  const active = acceptResponsibilityCollaboration({
    snapshot: inviteResponsibilityCollaborator(invite()).snapshot,
    collaborationId: "collaboration-1",
    actorId: "collaborator-1",
    at: at(21),
  });
  const removedActive = removeResponsibilityCollaborator({
    snapshot: active.snapshot,
    collaborationId: "collaboration-1",
    actorId: "owner-1",
    at: at(22),
    reason: null,
  });
  const activeEffect = removedActive.effects[0];
  assert.equal(activeEffect?.type, "RESPONSIBILITY_COLLABORATION_REMOVED");
  if (activeEffect?.type === "RESPONSIBILITY_COLLABORATION_REMOVED") {
    assert.equal(activeEffect.wasActive, true);
  }
});

test("only an active collaborator can leave and leaving preserves responsibility ownership", () => {
  const invited = inviteResponsibilityCollaborator(invite());
  assert.throws(
    () =>
      leaveResponsibilityCollaboration({
        snapshot: invited.snapshot,
        collaborationId: "collaboration-1",
        actorId: "collaborator-1",
        at: at(21),
        reason: null,
      }),
    (error: unknown) => hasCode(error, "TASK_COLLABORATION_NOT_ACTIVE"),
  );
  const active = acceptResponsibilityCollaboration({
    snapshot: invited.snapshot,
    collaborationId: "collaboration-1",
    actorId: "collaborator-1",
    at: at(21),
  });
  const left = leaveResponsibilityCollaboration({
    snapshot: active.snapshot,
    collaborationId: "collaboration-1",
    actorId: "collaborator-1",
    at: at(22),
    reason: "finished",
  });
  assert.equal(left.snapshot.ownerUserId, "owner-1");
  assert.equal(left.snapshot.collaborations[0]?.status, "LEFT");
  assert.equal(left.effects[0]?.type, "RESPONSIBILITY_COLLABORATION_LEFT");
});

test("multiple distinct collaborators can be active invited and active at the same time", () => {
  const first = inviteResponsibilityCollaborator(invite());
  const activeFirst = acceptResponsibilityCollaboration({
    snapshot: first.snapshot,
    collaborationId: "collaboration-1",
    actorId: "collaborator-1",
    at: at(21),
  });
  const second = inviteResponsibilityCollaborator(
    invite(activeFirst.snapshot, {
      id: "collaboration-2",
      collaboratorUserId: "collaborator-2",
      at: at(22),
    }),
  );
  const third = inviteResponsibilityCollaborator(
    invite(second.snapshot, {
      id: "collaboration-3",
      collaboratorUserId: "collaborator-3",
      at: at(23),
    }),
  );
  const activeThird = acceptResponsibilityCollaboration({
    snapshot: third.snapshot,
    collaborationId: "collaboration-3",
    actorId: "collaborator-3",
    at: at(24),
  });
  assert.deepEqual(
    activeThird.snapshot.collaborations.map((record) => record.status),
    ["ACTIVE", "INVITED", "ACTIVE"],
  );
});
