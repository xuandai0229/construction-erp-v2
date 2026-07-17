import assert from "node:assert/strict";
import test from "node:test";
import {
  canInitializePrimaryAssignee,
  canMutatePrimaryAssignee,
} from "../application/assignment-source-of-truth";
import { TASK_ACTIONS } from "../domain/types";

test("only ASSIGN and EXECUTE_HANDOVER may mutate primaryAssigneeId after creation", () => {
  const allowed = new Set(["ASSIGN", "EXECUTE_HANDOVER"]);
  for (const action of TASK_ACTIONS) {
    assert.equal(canMutatePrimaryAssignee(action), allowed.has(action), action);
  }
});

test("CREATE_DRAFT initialization is not supported by the frozen creation contract", () => {
  assert.equal(canInitializePrimaryAssignee("CREATE_DRAFT"), false);
  assert.equal(canInitializePrimaryAssignee("ASSIGN"), false);
});
