import assert from "node:assert/strict";
import test from "node:test";
import {
  requireCurrentTaskAssignee,
  resolveCurrentTaskAssignment,
} from "../application/assignment-source-of-truth";
import type { CoreTaskAggregate } from "../application/core-task-executor";
import { WorkManagementDomainError } from "../errors/codes";
import { isPrimaryAssignee } from "../permissions/scope-evaluator";
import { activeState, task } from "./fixtures";

const assertCode = (operation: () => void, code: string): void => {
  assert.throws(
    operation,
    (error: unknown) =>
      error instanceof WorkManagementDomainError && error.code === code,
  );
};

test("primaryAssigneeId is the sole current assignment projection", () => {
  const value = task();
  const assignment = resolveCurrentTaskAssignment(value);

  assert.deepEqual(assignment, {
    status: "ASSIGNED",
    assigneeId: "assignee",
    assignedById: "manager",
    source: "TASK_PRIMARY_ASSIGNEE_PROJECTION",
  });
});

test("each non-projection candidate remains non-assignment evidence", async (t) => {
  const cases: readonly {
    readonly name: string;
    readonly mutate: (value: CoreTaskAggregate) => void;
  }[] = [
    { name: "creator is not assignment fallback", mutate: (value) => { value.creatorId = "creator-only"; } },
    { name: "assignedBy is provenance and not assignment fallback", mutate: (value) => { value.assignedById = "manager-only"; } },
    { name: "participant is not assignment fallback", mutate: (value) => { value.participants = [{ userId: "participant-only", role: "PRIMARY_ASSIGNEE" }]; } },
    { name: "reviewer is not assignment fallback", mutate: (value) => { value.reviewerId = "reviewer-only"; } },
    { name: "approver is not assignment fallback", mutate: (value) => { value.approverId = "approver-only"; } },
    { name: "ProjectMember evidence is not assignment fallback", mutate: (value) => { value.projectId = "project-member-only"; } },
    { name: "active handover receiver is not assignment fallback before execution", mutate: (value) => { value.activeHandoverReceiverId = "receiver-only"; } },
    { name: "assignment intent is not assignment fallback", mutate: (value) => { value.handoverExecutions = [{ id: "execution-1", taskId: value.id, handoverId: "handover-1", generation: 1, previousAssigneeId: "source", newAssigneeId: "intent-only", executedById: "system", executedAt: new Date("2026-07-18T00:00:00.000Z"), aggregateVersion: 2 }]; } },
    { name: "handover execution intent is not assignment fallback", mutate: (value) => { value.handoverRequests = [{ id: "handover-1", taskId: value.id, generation: 1, fromAssigneeId: "source", toAssigneeId: "intent-only", requestedById: "source", requestedAt: new Date("2026-07-18T00:00:00.000Z"), reason: "intent", scope: "HANDOVER_SCOPE", aggregateVersion: 2 }]; } },
  ];

  for (const item of cases) {
    await t.test(item.name, () => {
      const value: CoreTaskAggregate = {
        ...task(activeState()),
        primaryAssigneeId: null,
        version: 1,
        deadlineAt: null,
        progressPercent: 0,
        activeBlockerId: null,
        assignmentHistory: [],
      };
      item.mutate(value);
      assert.equal(resolveCurrentTaskAssignment(value).status, "UNASSIGNED");
      assert.equal(resolveCurrentTaskAssignment(value).assigneeId, null);
    });
  }
});

test("privileged and SYSTEM actors do not become assignment fallback sources", () => {
  const value = task(activeState());
  value.primaryAssigneeId = null;

  assert.equal(resolveCurrentTaskAssignment(value).status, "UNASSIGNED");
  assert.equal(isPrimaryAssignee(value, "company-admin"), false);
  assert.equal(isPrimaryAssignee(value, "system"), false);
});

test("participant role cannot bypass the canonical primary-assignee relation", () => {
  const value = task(activeState());
  value.primaryAssigneeId = null;
  value.participants = [{ userId: "participant-only", role: "PRIMARY_ASSIGNEE" }];

  assert.equal(isPrimaryAssignee(value, "participant-only"), false);
});

test("missing assignment remains readable but assignee-required behavior fails closed", () => {
  const lifecycles = ["DRAFT", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "ARCHIVED"] as const;
  for (const lifecycle of lifecycles) {
    const value = task({ ...activeState(), lifecycle });
    value.primaryAssigneeId = null;
    assert.equal(resolveCurrentTaskAssignment(value).status, "UNASSIGNED", lifecycle);
    assertCode(() => requireCurrentTaskAssignee(value), "TASK_ASSIGNMENT_REQUIRED");
  }
});

test("invalid assignment projections fail closed without normalization or fallback", () => {
  for (const primaryAssigneeId of ["", "   ", 42] as const) {
    const malformed: unknown = { ...task(), primaryAssigneeId };
    assertCode(
      () => resolveCurrentTaskAssignment(malformed as Pick<CoreTaskAggregate, "primaryAssigneeId" | "assignedById">),
      "TASK_ASSIGNMENT_PROJECTION_INVALID",
    );
  }

  const malformedAssignedBy: unknown = { ...task(), assignedById: "" };
  assertCode(
    () => resolveCurrentTaskAssignment(malformedAssignedBy as Pick<CoreTaskAggregate, "primaryAssigneeId" | "assignedById">),
    "TASK_ASSIGNMENT_PROJECTION_INVALID",
  );
});
