import assert from "node:assert/strict";
import test from "node:test";
import {
  getWorkManagementActionDefinition,
  WORK_MANAGEMENT_ACTION_REGISTRY,
  type WorkManagementActionDefinition,
} from "../application/action-registry";
import { resolveTransitionPolicy } from "../domain/transition-policies";
import { TASK_ACTIONS, type TaskAction } from "../domain/types";
import { WorkManagementDomainError } from "../errors/codes";
import { WORK_MANAGEMENT_ACTIVITY_TYPES } from "../events/activity-types";
import { WORK_MANAGEMENT_AUDIT_ACTIONS } from "../events/audit-actions";
import { WORK_MANAGEMENT_DOMAIN_EVENTS } from "../events/domain-events";
import { sideEffectMap } from "../events/side-effect-map";
import { WORK_MANAGEMENT_PERMISSIONS } from "../permissions/contract";

const entries = Object.entries(WORK_MANAGEMENT_ACTION_REGISTRY) as [
  TaskAction,
  WorkManagementActionDefinition,
][];

test("action registry contains exactly the 25 supported actions", async (t) => {
  await t.test("has every action once and no extra key", () => {
    assert.equal(TASK_ACTIONS.length, 25);
    assert.deepEqual(Object.keys(WORK_MANAGEMENT_ACTION_REGISTRY).sort(), [...TASK_ACTIONS].sort());
  });
  for (const [key, definition] of entries) {
    await t.test(`${key} definition matches registry key`, () => {
      assert.equal(definition.action, key);
    });
  }
});

test("each action has complete typed metadata", async (t) => {
  for (const [action, definition] of entries) {
    await t.test(`${action} metadata is complete and non-permissive`, () => {
      assert.ok(definition.commandSchema);
      assert.notEqual(definition.commandSchemaKey, "");
      assert.ok(WORK_MANAGEMENT_PERMISSIONS.includes(definition.requiredPermission));
      assert.ok(definition.allowedScopes.length > 0);
      assert.ok(definition.actorPolicy.mode);
      assert.ok(definition.invariantPolicy.length > 0);
      assert.equal(definition.idempotencyPolicy, "REQUIRED");
      assert.equal(definition.transactionPolicy, "REQUIRED");
      assert.ok(resolveTransitionPolicy(definition.transitionPolicyKey));
    });
  }
});

test("event, activity, audit and outbox contracts are independently typed", async (t) => {
  for (const [action, definition] of entries) {
    await t.test(`${action} resolves all side-effect contracts`, () => {
      assert.ok(WORK_MANAGEMENT_DOMAIN_EVENTS.includes(definition.eventType));
      assert.ok(WORK_MANAGEMENT_ACTIVITY_TYPES.includes(definition.activityType));
      assert.ok(WORK_MANAGEMENT_AUDIT_ACTIONS.includes(definition.auditType));
      assert.equal(sideEffectMap[action].activity, definition.activityType);
      assert.equal(sideEffectMap[action].audit, definition.auditType);
      assert.equal(
        sideEffectMap[action].notification,
        definition.notificationPolicy === "OUTBOX_REQUIRED",
      );
    });
  }
});

test("registry fails closed for untrusted action keys", async (t) => {
  for (const action of ["UNKNOWN_ACTION", "toString", "constructor", "__proto__"]) {
    await t.test(`${action} is rejected`, () => {
      assert.throws(
        () => getWorkManagementActionDefinition(action),
        (error: unknown) =>
          error instanceof WorkManagementDomainError &&
          error.code === "TASK_ACTION_UNSUPPORTED",
      );
    });
  }
});
