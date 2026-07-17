import assert from "node:assert/strict";
import test from "node:test";
import {
  validateAssignmentHistory,
  type AssignmentHistorySnapshot,
  type TaskAssignmentHistoryRecord,
} from "../application/assignment-history";
import { WorkManagementDomainError } from "../errors/codes";

const at = new Date("2026-07-19T08:00:00.000Z");
const record = (patch: Partial<TaskAssignmentHistoryRecord> = {}): TaskAssignmentHistoryRecord => ({
  id: "assignment-1", taskId: "task-1", generation: 1,
  previousAssigneeId: null, newAssigneeId: "assignee-a", assignedById: "manager",
  sourceAction: "ASSIGN", sourceHandoverId: null, reason: null, effectiveAt: at, ...patch,
});
const task = (patch: Partial<AssignmentHistorySnapshot> = {}): AssignmentHistorySnapshot => ({
  id: "task-1", primaryAssigneeId: "assignee-a", assignmentHistory: [record()], ...patch,
});
const assertCode = (value: AssignmentHistorySnapshot, code: string): void => {
  assert.throws(
    () => validateAssignmentHistory(value),
    (error: unknown) => error instanceof WorkManagementDomainError && error.code === code,
  );
};

test("malformed assignment history fails closed before mutation", async (t) => {
  const cases: readonly { readonly name: string; readonly value: AssignmentHistorySnapshot; readonly code: string }[] = [
    { name: "duplicate record ID", value: task({ assignmentHistory: [record(), record({ generation: 2, previousAssigneeId: "assignee-a", newAssigneeId: "assignee-b" })], primaryAssigneeId: "assignee-b" }), code: "TASK_ASSIGNMENT_HISTORY_INVALID" },
    { name: "cross-task history record", value: task({ assignmentHistory: [record({ taskId: "other-task" })] }), code: "TASK_ASSIGNMENT_HISTORY_TASK_MISMATCH" },
    { name: "generation zero", value: task({ assignmentHistory: [record({ generation: 0 })] }), code: "TASK_ASSIGNMENT_HISTORY_GENERATION_INVALID" },
    { name: "negative generation", value: task({ assignmentHistory: [record({ generation: -1 })] }), code: "TASK_ASSIGNMENT_HISTORY_GENERATION_INVALID" },
    { name: "non-integer generation", value: task({ assignmentHistory: [record({ generation: 1.5 })] }), code: "TASK_ASSIGNMENT_HISTORY_GENERATION_INVALID" },
    { name: "generation gap", value: task({ assignmentHistory: [record({ generation: 2 })] }), code: "TASK_ASSIGNMENT_HISTORY_GENERATION_INVALID" },
    { name: "out-of-order generation", value: task({ assignmentHistory: [record({ generation: 2 }), record({ id: "assignment-2", generation: 1, previousAssigneeId: "assignee-a", newAssigneeId: "assignee-b" })], primaryAssigneeId: "assignee-b" }), code: "TASK_ASSIGNMENT_HISTORY_GENERATION_INVALID" },
    { name: "broken chain", value: task({ assignmentHistory: [record(), record({ id: "assignment-2", generation: 2, previousAssigneeId: "other", newAssigneeId: "assignee-b" })], primaryAssigneeId: "assignee-b" }), code: "TASK_ASSIGNMENT_HISTORY_CHAIN_BROKEN" },
    { name: "empty new assignee", value: task({ assignmentHistory: [record({ newAssigneeId: "" })] }), code: "TASK_ASSIGNMENT_HISTORY_INVALID" },
    { name: "whitespace assigned by", value: task({ assignmentHistory: [record({ assignedById: "  " })] }), code: "TASK_ASSIGNMENT_HISTORY_INVALID" },
    { name: "invalid effectiveAt", value: task({ assignmentHistory: [record({ effectiveAt: new Date("invalid") })] }), code: "TASK_ASSIGNMENT_HISTORY_INVALID" },
    { name: "non-string assignment reason fails closed", value: task({ assignmentHistory: [{ ...record(), reason: 7 } as unknown as TaskAssignmentHistoryRecord] }), code: "TASK_ASSIGNMENT_HISTORY_INVALID" },
    { name: "object assignment reason fails closed", value: task({ assignmentHistory: [{ ...record(), reason: { text: "reason" } } as unknown as TaskAssignmentHistoryRecord] }), code: "TASK_ASSIGNMENT_HISTORY_INVALID" },
    { name: "ASSIGN source has handover link", value: task({ assignmentHistory: [record({ sourceHandoverId: "handover-1" })] }), code: "TASK_ASSIGNMENT_HISTORY_INVALID" },
    { name: "EXECUTE_HANDOVER source lacks handover link", value: task({ assignmentHistory: [record({ sourceAction: "EXECUTE_HANDOVER", sourceHandoverId: null })] }), code: "TASK_ASSIGNMENT_HISTORY_INVALID" },
    { name: "unknown source action", value: task({ assignmentHistory: [{ ...record(), sourceAction: "UNKNOWN" } as unknown as TaskAssignmentHistoryRecord] }), code: "TASK_ASSIGNMENT_HISTORY_INVALID" },
    { name: "projection and assignment history mismatch", value: task({ primaryAssigneeId: "other" }), code: "TASK_ASSIGNMENT_HISTORY_PROJECTION_MISMATCH" },
  ];
  for (const item of cases) await t.test(item.name, () => assertCode(item.value, item.code));
});
