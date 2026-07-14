import assert from "node:assert/strict";
import test from "node:test";
import { CORE_TASK_ACTIONS } from "../application/core-task-executor";
import { getWorkManagementActionDefinition } from "../application/action-registry";
import { resolveTransitionPolicy } from "../domain/transition-policies";
import type { TaskState } from "../domain/types";

const now = new Date("2026-07-14T08:00:00.000Z");
const state = (patch: Partial<TaskState> = {}): TaskState => ({ lifecycle: "IN_PROGRESS", acceptance: "ACCEPTED", execution: "ACTIVE", review: "NOT_SUBMITTED", handover: "NONE", waitingReason: null, ...patch });
const current: Record<(typeof CORE_TASK_ACTIONS)[number], TaskState> = {
  CREATE_DRAFT: state({ lifecycle: "DRAFT", acceptance: "NOT_REQUIRED" }), ASSIGN: state({ lifecycle: "DRAFT", acceptance: "NOT_REQUIRED" }), ACCEPT: state({ lifecycle: "ASSIGNED", acceptance: "PENDING" }), REQUEST_CLARIFICATION: state({ lifecycle: "ASSIGNED", acceptance: "PENDING" }), START: state({ lifecycle: "ASSIGNED", acceptance: "ACCEPTED" }), UPDATE_PROGRESS: state(), REQUEST_EXTENSION: state(), CHANGE_DEADLINE: state(), PAUSE: state(), RESUME: state({ execution: "PAUSED" }), BLOCK: state(), UNBLOCK: state({ execution: "BLOCKED" }),
};

test("each Slice A registry policy is executable and returns its own decision", (t) => {
  for (const action of CORE_TASK_ACTIONS) t.test(action, () => {
    const definition = getWorkManagementActionDefinition(action);
    const policy = resolveTransitionPolicy(definition.transitionPolicyKey);
    const decision = policy.evaluate({ action, currentState: current[action], command: {}, taskId: "task-1", now });
    assert.equal(policy.action, action); assert.equal(decision.allowed, true); assert.notEqual(decision.nextState, null);
    assert.equal(decision.intents.some((intent) => intent.type === definition.eventType), true);
  });
});

test("executable policy fails closed on a mismatched action and preserves deadline semantics", () => {
  const start = resolveTransitionPolicy("START_EXECUTION");
  const denied = start.evaluate({ action: "PAUSE", currentState: state(), command: {}, taskId: "task-1", now });
  assert.equal(denied.allowed, false); assert.equal(denied.errorCode, "TASK_INVALID_TRANSITION");
  const extension = resolveTransitionPolicy("REQUEST_DEADLINE_EXTENSION").evaluate({ action: "REQUEST_EXTENSION", currentState: state(), command: {}, taskId: "task-1", now });
  const change = resolveTransitionPolicy("CHANGE_TASK_DEADLINE");
  assert.equal(extension.nextState?.lifecycle, "IN_PROGRESS"); assert.equal(change.changesDeadline, true);
});
