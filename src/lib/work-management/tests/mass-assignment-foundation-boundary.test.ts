import assert from "node:assert/strict";
import test from "node:test";
import { assignResponsibility } from "../application/responsibility-assignment";
import { acceptResponsibilityDelegation, createResponsibilityDelegationSnapshot, requestResponsibilityDelegation } from "../application/responsibility-delegation";
import { acceptResponsibilityCollaboration, createResponsibilityCollaborationSnapshot, inviteResponsibilityCollaborator } from "../application/responsibility-collaboration";
import { WorkManagementDomainError } from "../errors/codes";

const at = (): Date => new Date("2026-10-20T00:00:00.000Z");
const assignmentSnapshot = () => ({ taskId: "task-1", version: 0, assignments: [] });
const source = () => ({ id: "assignment-source", taskId: "task-1", responsibilityCode: "TASK_OWNER", responsibleUserId: "owner", assignedById: "manager", generation: 1, status: "ACTIVE", effectiveAt: at(), endedAt: null, reason: null, supersedesAssignmentId: null });
const code = (error: unknown, expected: string): boolean => error instanceof WorkManagementDomainError && error.code === expected;

test("assignment commands reject unknown own fields and server-owned lifecycle fields", () => {
  const command = { snapshot: assignmentSnapshot(), id: "assignment-1", responsibilityCode: "TASK_OWNER", responsibleUserId: "owner", actorId: "manager", at: at(), status: "ACTIVE" };
  const before = structuredClone(command);
  assert.throws(() => assignResponsibility(command), (error: unknown) => code(error, "TASK_RESPONSIBILITY_ASSIGNMENT_INVALID"));
  assert.deepEqual(command, before);
});

test("delegation accept and expire style commands reject reason injection", () => {
  const requested = requestResponsibilityDelegation({ snapshot: createResponsibilityDelegationSnapshot(source()), id: "delegation-1", delegateUserId: "delegate", actorId: "owner", requestedAt: at(), startsAt: new Date("2026-10-21T00:00:00.000Z"), expiresAt: new Date("2026-10-30T00:00:00.000Z"), reason: null });
  assert.throws(() => acceptResponsibilityDelegation({ snapshot: requested.snapshot, delegationId: "delegation-1", actorId: "delegate", at: at(), reason: null }), (error: unknown) => code(error, "TASK_DELEGATION_INVALID"));
});

test("collaboration accept rejects reason and invite rejects ownership lifecycle injection", () => {
  const invited = inviteResponsibilityCollaborator({ snapshot: createResponsibilityCollaborationSnapshot(source()), id: "collaboration-1", collaboratorUserId: "collaborator", actorId: "owner", at: at(), reason: null });
  assert.throws(() => acceptResponsibilityCollaboration({ snapshot: invited.snapshot, collaborationId: "collaboration-1", actorId: "collaborator", at: at(), reason: null }), (error: unknown) => code(error, "TASK_COLLABORATION_INVALID"));
  assert.throws(() => inviteResponsibilityCollaborator({ snapshot: createResponsibilityCollaborationSnapshot(source()), id: "collaboration-2", collaboratorUserId: "other", actorId: "owner", at: at(), ownerUserId: "other" }), (error: unknown) => code(error, "TASK_COLLABORATION_INVALID"));
});
