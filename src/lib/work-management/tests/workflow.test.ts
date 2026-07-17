import assert from "node:assert/strict";
import test from "node:test";
import { evaluateTaskTransition } from "../domain/workflow";
import type { TaskAction, TaskState } from "../domain/types";
import { activeState, draftState, now } from "./fixtures";

const evaluate = (state: TaskState, action: TaskAction, actorHasPermission = true) => evaluateTaskTransition({ currentState: state, action, actorHasPermission, now, taskId: "task-1" });
test("draft is assigned but never jumps directly to completed", () => { assert.equal(evaluate(draftState(), "ASSIGN").nextState?.lifecycle, "ASSIGNED"); assert.equal(evaluate(draftState(), "CONFIRM_COMPLETION").allowed, false); });
test("assigned task needs acceptance before start under the pending policy", () => { const state = { ...draftState(), lifecycle: "ASSIGNED" as const, acceptance: "PENDING" as const }; assert.equal(evaluate(state, "START").allowed, false); assert.equal(evaluate(state, "ACCEPT").nextState?.acceptance, "ACCEPTED"); });
test("submitted task supports request changes then resubmission", () => { const submitted = { ...activeState(), lifecycle: "SUBMITTED" as const, review: "PENDING" as const }; assert.equal(evaluate(submitted, "REQUEST_CHANGES").nextState?.lifecycle, "IN_PROGRESS"); assert.equal(evaluate(submitted, "APPROVE_RESULT").nextState?.review, "RESULT_APPROVED"); });
test("completion needs result approval and reopen is an event back to in progress", () => { const approved = { ...activeState(), lifecycle: "SUBMITTED" as const, review: "RESULT_APPROVED" as const }; const completed = evaluate(approved, "CONFIRM_COMPLETION").nextState!; assert.equal(completed.lifecycle, "COMPLETED"); assert.equal(evaluate(completed, "REOPEN").nextState?.lifecycle, "IN_PROGRESS"); });
test("cancelled task cannot resume and archived task rejects ordinary updates", () => { const cancelled = { ...activeState(), lifecycle: "CANCELLED" as const }; const archived = { ...activeState(), lifecycle: "ARCHIVED" as const }; assert.equal(evaluate(cancelled, "RESUME").allowed, false); assert.equal(evaluate(archived, "UPDATE_PROGRESS").allowed, false); });
test("handover is a separate axis and leaves execution lifecycle intact", () => { const requested = evaluate(activeState(), "REQUEST_HANDOVER").nextState!; assert.equal(requested.lifecycle, "IN_PROGRESS"); assert.equal(requested.handover, "PENDING_TO_USER"); const accepted = evaluate(requested, "ACCEPT_HANDOVER").nextState!; const approved = evaluate(accepted, "APPROVE_HANDOVER").nextState!; assert.equal(evaluate(approved, "EXECUTE_HANDOVER").nextState?.handover, "EFFECTIVE"); });
test("action permission denial is fail-closed and produces no event", () => { const decision = evaluate(activeState(), "SUBMIT", false); assert.equal(decision.errorCode, "TASK_ACCESS_DENIED"); assert.deepEqual(decision.requiredEvents, []); });
test("B2 direct lifecycle policies reject invalid source states and never expose a fake restore state", () => {
  const completed = { ...activeState(), lifecycle: "COMPLETED" as const, review: "RESULT_APPROVED" as const };
  const cancelled = { ...activeState(), lifecycle: "CANCELLED" as const };
  const archived = { ...activeState(), lifecycle: "ARCHIVED" as const };
  assert.equal(evaluate(completed, "REOPEN").nextState?.lifecycle, "IN_PROGRESS"); assert.equal(evaluate(activeState(), "REOPEN").errorCode, "TASK_INVALID_TRANSITION");
  assert.equal(evaluate(activeState(), "CANCEL").nextState?.lifecycle, "CANCELLED"); assert.equal(evaluate(completed, "CANCEL").errorCode, "TASK_INVALID_TRANSITION"); assert.equal(evaluate(cancelled, "CANCEL").errorCode, "TASK_ALREADY_CANCELLED");
  assert.equal(evaluate(completed, "ARCHIVE").nextState?.lifecycle, "ARCHIVED"); assert.equal(evaluate(cancelled, "ARCHIVE").nextState?.lifecycle, "ARCHIVED"); assert.equal(evaluate(activeState(), "ARCHIVE").errorCode, "TASK_INVALID_TRANSITION"); assert.equal(evaluate(archived, "ARCHIVE").errorCode, "TASK_ALREADY_ARCHIVED");
  const restore = evaluate(archived, "RESTORE"); assert.equal(restore.target?.strategy, "RESTORE_ACTIVE_ARCHIVE"); assert.equal(restore.nextState, undefined); assert.equal(evaluate(activeState(), "RESTORE").errorCode, "TASK_ARCHIVE_REQUIRED");
});
test("Slice C direct handover policies support terminal generations and reject invalid decisions", async (t) => {
  const requested = evaluate(activeState(), "REQUEST_HANDOVER").nextState!;
  await t.test("REQUEST_HANDOVER permits a new generation after rejected or effective", () => {
    assert.equal(requested.handover, "PENDING_TO_USER");
    assert.equal(evaluate({ ...activeState(), handover: "REJECTED" }, "REQUEST_HANDOVER").nextState?.handover, "PENDING_TO_USER");
    assert.equal(evaluate({ ...activeState(), handover: "EFFECTIVE" }, "REQUEST_HANDOVER").nextState?.handover, "PENDING_TO_USER");
    assert.equal(evaluate(requested, "REQUEST_HANDOVER").errorCode, "TASK_HANDOVER_CONFLICT");
  });
  await t.test("ACCEPT_HANDOVER and REJECT_HANDOVER use their exact source states", () => {
    assert.equal(evaluate(requested, "ACCEPT_HANDOVER").nextState?.handover, "PENDING_APPROVAL");
    assert.equal(evaluate(requested, "REJECT_HANDOVER").nextState?.handover, "REJECTED");
    assert.equal(evaluate(activeState(), "ACCEPT_HANDOVER").errorCode, "TASK_INVALID_TRANSITION");
  });
  await t.test("APPROVE_HANDOVER and EXECUTE_HANDOVER require ordered decisions", () => {
    const accepted = evaluate(requested, "ACCEPT_HANDOVER").nextState!;
    const approved = evaluate(accepted, "APPROVE_HANDOVER").nextState!;
    assert.equal(approved.handover, "APPROVED");
    assert.equal(evaluate(approved, "EXECUTE_HANDOVER").nextState?.handover, "EFFECTIVE");
    assert.equal(evaluate(requested, "APPROVE_HANDOVER").errorCode, "TASK_INVALID_TRANSITION");
    assert.equal(evaluate(accepted, "EXECUTE_HANDOVER").errorCode, "TASK_INVALID_TRANSITION");
  });
});
