import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateActorPolicy,
  type WorkManagementActorRelation,
} from "../application/actor-policy";
import {
  WORK_MANAGEMENT_ACTION_REGISTRY,
  type WorkManagementCommandSchemaKey,
} from "../application/action-registry";
import { resolveTransitionPolicy } from "../domain/transition-policies";
import { TASK_ACTIONS, type TaskAction } from "../domain/types";
import {
  acceptTaskSchema,
  archiveTaskSchema,
  handoverDecisionSchema,
  pauseTaskSchema,
} from "../validation/schemas";

type ExpectedActionSemantic = {
  actorPolicyMode: string;
  relations?: readonly WorkManagementActorRelation[];
  scopes?: readonly string[];
  schemaKey: WorkManagementCommandSchemaKey;
};

const EXPECTED_ACTION_SEMANTICS = {
  CREATE_DRAFT: { actorPolicyMode: "NOT_APPLICABLE", schemaKey: "createTask" },
  ASSIGN: { actorPolicyMode: "RELATION_OR_PRIVILEGED_SCOPE", relations: ["CREATOR", "ASSIGNED_BY"], schemaKey: "assignTask" },
  START: { actorPolicyMode: "RELATION_REQUIRED", relations: ["PRIMARY_ASSIGNEE"], schemaKey: "startTask" },
  BLOCK: { actorPolicyMode: "RELATION_REQUIRED", relations: ["PRIMARY_ASSIGNEE"], schemaKey: "blockTask" },
  UNBLOCK: { actorPolicyMode: "RELATION_REQUIRED", relations: ["PRIMARY_ASSIGNEE"], schemaKey: "unblockTask" },
  RESUME: { actorPolicyMode: "RELATION_REQUIRED", relations: ["PRIMARY_ASSIGNEE"], schemaKey: "resumeTask" },
  REQUEST_EXTENSION: { actorPolicyMode: "RELATION_REQUIRED", relations: ["PRIMARY_ASSIGNEE"], schemaKey: "extensionRequest" },
  CHANGE_DEADLINE: { actorPolicyMode: "RELATION_OR_PRIVILEGED_SCOPE", relations: ["CREATOR", "ASSIGNED_BY"], schemaKey: "changeDeadline" },
  SUBMIT: { actorPolicyMode: "RELATION_REQUIRED", relations: ["PRIMARY_ASSIGNEE"], schemaKey: "submission" },
  APPROVE_RESULT: { actorPolicyMode: "RELATION_REQUIRED", relations: ["APPROVER"], schemaKey: "approveSubmission" },
  CONFIRM_COMPLETION: { actorPolicyMode: "RELATION_REQUIRED", relations: ["APPROVER"], schemaKey: "completeTask" },
  ARCHIVE: { actorPolicyMode: "RELATION_OR_PRIVILEGED_SCOPE", relations: ["CREATOR", "ASSIGNED_BY"], schemaKey: "archiveTask" },
  RESTORE: { actorPolicyMode: "RELATION_OR_PRIVILEGED_SCOPE", relations: ["CREATOR", "ASSIGNED_BY"], schemaKey: "restoreTask" },
  REQUEST_HANDOVER: { actorPolicyMode: "RELATION_OR_PRIVILEGED_SCOPE", relations: ["PRIMARY_ASSIGNEE", "CREATOR", "ASSIGNED_BY"], schemaKey: "handoverRequest" },
  ACCEPT_HANDOVER: { actorPolicyMode: "RELATION_REQUIRED", relations: ["HANDOVER_RECEIVER"], scopes: ["HANDOVER_SCOPE"], schemaKey: "acceptHandover" },
  REJECT_HANDOVER: { actorPolicyMode: "RELATION_REQUIRED", relations: ["HANDOVER_RECEIVER"], scopes: ["HANDOVER_SCOPE"], schemaKey: "rejectHandover" },
  APPROVE_HANDOVER: { actorPolicyMode: "RELATION_OR_PRIVILEGED_SCOPE", relations: ["CREATOR", "ASSIGNED_BY"], schemaKey: "approveHandover" },
  EXECUTE_HANDOVER: { actorPolicyMode: "SYSTEM_OR_PRIVILEGED_SCOPE", scopes: ["DEPARTMENT", "PROJECT", "COMPANY"], schemaKey: "executeHandover" },
} satisfies Partial<Record<TaskAction, ExpectedActionSemantic>>;

const evaluate = (
  action: TaskAction,
  relations: readonly WorkManagementActorRelation[] = [],
  scopes: readonly string[] = [],
  actorType: "USER" | "SYSTEM" = "USER",
): boolean => evaluateActorPolicy(WORK_MANAGEMENT_ACTION_REGISTRY[action].actorPolicy, {
  actorType,
  actorRelations: relations,
  resolvedScopes: scopes as never,
});

test("independent semantic expectation matrix matches critical registry actions", async (t) => {
  for (const [action, expected] of Object.entries(EXPECTED_ACTION_SEMANTICS) as [TaskAction, ExpectedActionSemantic][]) {
    await t.test(action, () => {
      const definition = WORK_MANAGEMENT_ACTION_REGISTRY[action];
      assert.equal(definition.actorPolicy.mode, expected.actorPolicyMode);
      assert.equal(definition.commandSchemaKey, expected.schemaKey);
      if (expected.relations && "relations" in definition.actorPolicy) {
        assert.deepEqual(definition.actorPolicy.relations, expected.relations);
      }
      if (expected.scopes) {
        assert.deepEqual(definition.allowedScopes, expected.scopes);
      }
    });
  }
});

test("actor policies enforce relation-only and privileged-scope semantics", async (t) => {
  await t.test("CREATE_DRAFT needs no pre-existing relation", () => assert.equal(evaluate("CREATE_DRAFT"), true));
  await t.test("ASSIGN accepts creator, assigned-by, project, and company", () => {
    assert.equal(evaluate("ASSIGN", ["CREATOR"]), true);
    assert.equal(evaluate("ASSIGN", ["ASSIGNED_BY"]), true);
    assert.equal(evaluate("ASSIGN", [], ["PROJECT"]), true);
    assert.equal(evaluate("ASSIGN", [], ["COMPANY"]), true);
    assert.equal(evaluate("ASSIGN", [], ["PARTICIPATING"]), false);
  });
  await t.test("PRIMARY_ASSIGNEE actions cannot be overridden by company scope", () => {
    assert.equal(evaluate("START", ["PRIMARY_ASSIGNEE"]), true);
    assert.equal(evaluate("SUBMIT", [], ["COMPANY"]), false);
  });
  await t.test("handover accept and reject are limited to the proposed receiver", () => {
    for (const action of ["ACCEPT_HANDOVER", "REJECT_HANDOVER"] as const) {
      assert.equal(evaluate(action, ["HANDOVER_RECEIVER"], ["HANDOVER_SCOPE"]), true);
      assert.equal(evaluate(action, ["PRIMARY_ASSIGNEE"], ["HANDOVER_SCOPE"]), false);
      assert.equal(evaluate(action, ["CREATOR"], ["HANDOVER_SCOPE"]), false);
      assert.equal(evaluate(action, [], ["COMPANY"]), false);
    }
  });
  await t.test("handover approval accepts manager relation or privileged scope only", () => {
    assert.equal(evaluate("APPROVE_HANDOVER", ["ASSIGNED_BY"]), true);
    assert.equal(evaluate("APPROVE_HANDOVER", [], ["PROJECT"]), true);
    assert.equal(evaluate("APPROVE_HANDOVER", [], ["PARTICIPATING"]), false);
  });
  await t.test("handover execution supports system or privileged scope, not creator alone", () => {
    assert.equal(evaluate("EXECUTE_HANDOVER", [], [], "SYSTEM"), true);
    assert.equal(evaluate("EXECUTE_HANDOVER", [], ["PROJECT"]), true);
    assert.equal(evaluate("EXECUTE_HANDOVER", [], ["COMPANY"]), true);
    assert.equal(evaluate("EXECUTE_HANDOVER", ["CREATOR"]), false);
    assert.equal(
      WORK_MANAGEMENT_ACTION_REGISTRY.EXECUTE_HANDOVER.commandSchema.safeParse({ taskId: "task-1", handoverId: "handover-1", expectedVersion: 0, actorType: "SYSTEM" }).success,
      false,
    );
  });
});

test("action-specific schemas are not aliases for semantically different commands", () => {
  const registry = WORK_MANAGEMENT_ACTION_REGISTRY;
  assert.equal(registry.START.commandSchemaKey, "startTask");
  assert.notEqual(registry.START.commandSchema, acceptTaskSchema);
  assert.equal(registry.RESUME.commandSchemaKey, "resumeTask");
  assert.notEqual(registry.RESUME.commandSchema, acceptTaskSchema);
  assert.equal(registry.BLOCK.commandSchemaKey, "blockTask");
  assert.notEqual(registry.BLOCK.commandSchema, pauseTaskSchema);
  assert.equal(registry.UNBLOCK.commandSchemaKey, "unblockTask");
  assert.notEqual(registry.UNBLOCK.commandSchema, acceptTaskSchema);
  assert.equal(registry.EXECUTE_HANDOVER.commandSchemaKey, "executeHandover");
  assert.notEqual(registry.EXECUTE_HANDOVER.commandSchema, handoverDecisionSchema);
  assert.equal(registry.RESTORE.commandSchemaKey, "restoreTask");
  assert.notEqual(registry.RESTORE.commandSchema, archiveTaskSchema);
});

test("transition policy resolver returns behavioral policy metadata for all actions", async (t) => {
  for (const action of TASK_ACTIONS) {
    await t.test(action, () => {
      const policy = resolveTransitionPolicy(WORK_MANAGEMENT_ACTION_REGISTRY[action].transitionPolicyKey);
      assert.equal(policy.key, WORK_MANAGEMENT_ACTION_REGISTRY[action].transitionPolicyKey);
      assert.notEqual(policy.transitionIntent, "");
    });
  }
  assert.equal(resolveTransitionPolicy(WORK_MANAGEMENT_ACTION_REGISTRY.REQUEST_EXTENSION.transitionPolicyKey).changesDeadline, false);
  assert.equal(resolveTransitionPolicy(WORK_MANAGEMENT_ACTION_REGISTRY.CHANGE_DEADLINE.transitionPolicyKey).changesDeadline, true);
  assert.equal(resolveTransitionPolicy(WORK_MANAGEMENT_ACTION_REGISTRY.APPROVE_RESULT.transitionPolicyKey).transitionIntent, "APPROVE_SUBMISSION_REVIEW");
  assert.equal(resolveTransitionPolicy(WORK_MANAGEMENT_ACTION_REGISTRY.CONFIRM_COMPLETION.transitionPolicyKey).transitionIntent, "COMPLETE_TASK");
  for (const action of ["REQUEST_HANDOVER", "ACCEPT_HANDOVER", "REJECT_HANDOVER", "APPROVE_HANDOVER"] as const) {
    assert.equal(resolveTransitionPolicy(WORK_MANAGEMENT_ACTION_REGISTRY[action].transitionPolicyKey).changesAssignee, false);
  }
  assert.equal(resolveTransitionPolicy(WORK_MANAGEMENT_ACTION_REGISTRY.EXECUTE_HANDOVER.transitionPolicyKey).changesAssignee, true);
  assert.equal(resolveTransitionPolicy(WORK_MANAGEMENT_ACTION_REGISTRY.RESTORE.transitionPolicyKey).restoresPreviousLifecycle, true);
});

test("critical event activity and audit values match independent semantic expectations", () => {
  const expected = {
    ASSIGN: ["TaskAssigned", "TASK_ASSIGNED", "TASK_ASSIGN"],
    SUBMIT: ["TaskSubmitted", "TASK_SUBMITTED", "TASK_SUBMIT"],
    APPROVE_RESULT: ["TaskResultApproved", "TASK_RESULT_APPROVED", "TASK_APPROVE_RESULT"],
    CONFIRM_COMPLETION: ["TaskCompleted", "TASK_COMPLETED", "TASK_CONFIRM_COMPLETION"],
    CHANGE_DEADLINE: ["TaskDeadlineChanged", "TASK_DEADLINE_CHANGED", "TASK_CHANGE_DEADLINE"],
    EXECUTE_HANDOVER: ["TaskHandoverEffective", "TASK_HANDOVER_EXECUTED", "TASK_EXECUTE_HANDOVER"],
  } as const;
  for (const [action, values] of Object.entries(expected) as [keyof typeof expected, readonly [string, string, string]][]) {
    const definition = WORK_MANAGEMENT_ACTION_REGISTRY[action];
    assert.deepEqual([definition.eventType, definition.activityType, definition.auditType], values);
  }
});
