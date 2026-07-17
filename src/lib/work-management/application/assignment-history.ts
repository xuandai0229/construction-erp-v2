import { WorkManagementDomainError } from "../errors/codes";

export type AssignmentHistorySourceAction = "ASSIGN" | "EXECUTE_HANDOVER";

/** Append-only evidence of a committed change; never a current-assignee source. */
export type TaskAssignmentHistoryRecord = Readonly<{
  id: string;
  taskId: string;
  generation: number;
  previousAssigneeId: string | null;
  newAssigneeId: string;
  assignedById: string;
  sourceAction: AssignmentHistorySourceAction;
  sourceHandoverId: string | null;
  reason: string | null;
  effectiveAt: Date;
}>;

export type AssignmentHistorySnapshot = {
  id: string;
  primaryAssigneeId: string | null;
  assignmentHistory: readonly TaskAssignmentHistoryRecord[];
};

const validUserId = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validDate = (value: unknown): value is Date =>
  value instanceof Date && Number.isFinite(value.getTime());

const validReason = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

export function cloneAssignmentHistoryRecord(
  record: TaskAssignmentHistoryRecord,
): TaskAssignmentHistoryRecord {
  return { ...record, effectiveAt: new Date(record.effectiveAt.getTime()) };
}

export function validateAssignmentHistory(task: AssignmentHistorySnapshot): void {
  const ids = new Set<string>();
  let previous: TaskAssignmentHistoryRecord | null = null;

  for (const [index, record] of task.assignmentHistory.entries()) {
    if (!validUserId(record.id) || !validUserId(record.newAssigneeId) || !validUserId(record.assignedById) || !validDate(record.effectiveAt) || !validReason(record.reason)) {
      throw new WorkManagementDomainError("TASK_ASSIGNMENT_HISTORY_INVALID");
    }
    if (ids.has(record.id)) throw new WorkManagementDomainError("TASK_ASSIGNMENT_HISTORY_INVALID");
    ids.add(record.id);
    if (record.taskId !== task.id) throw new WorkManagementDomainError("TASK_ASSIGNMENT_HISTORY_TASK_MISMATCH");
    if (!Number.isInteger(record.generation) || record.generation !== index + 1) {
      throw new WorkManagementDomainError("TASK_ASSIGNMENT_HISTORY_GENERATION_INVALID");
    }
    if (record.previousAssigneeId !== null && !validUserId(record.previousAssigneeId)) {
      throw new WorkManagementDomainError("TASK_ASSIGNMENT_HISTORY_INVALID");
    }
    if (record.previousAssigneeId === record.newAssigneeId) {
      throw new WorkManagementDomainError("TASK_ASSIGNMENT_HISTORY_INVALID");
    }
    if (record.sourceAction !== "ASSIGN" && record.sourceAction !== "EXECUTE_HANDOVER") {
      throw new WorkManagementDomainError("TASK_ASSIGNMENT_HISTORY_INVALID");
    }
    if ((record.sourceAction === "ASSIGN" && record.sourceHandoverId !== null)
      || (record.sourceAction === "EXECUTE_HANDOVER" && !validUserId(record.sourceHandoverId))) {
      throw new WorkManagementDomainError("TASK_ASSIGNMENT_HISTORY_INVALID");
    }
    if (previous && record.previousAssigneeId !== previous.newAssigneeId) {
      throw new WorkManagementDomainError("TASK_ASSIGNMENT_HISTORY_CHAIN_BROKEN");
    }
    previous = record;
  }

  if (previous && task.primaryAssigneeId !== previous.newAssigneeId) {
    throw new WorkManagementDomainError("TASK_ASSIGNMENT_HISTORY_PROJECTION_MISMATCH");
  }
}

export function getNextAssignmentGeneration(task: AssignmentHistorySnapshot): number {
  validateAssignmentHistory(task);
  return task.assignmentHistory.length + 1;
}

export function appendAssignmentHistoryRecord(
  task: AssignmentHistorySnapshot,
  record: TaskAssignmentHistoryRecord,
): readonly TaskAssignmentHistoryRecord[] {
  validateAssignmentHistory(task);
  if (record.previousAssigneeId !== task.primaryAssigneeId) {
    throw new WorkManagementDomainError("TASK_ASSIGNMENT_HISTORY_SOURCE_MISMATCH");
  }
  if (record.taskId !== task.id || record.generation !== getNextAssignmentGeneration(task)) {
    throw new WorkManagementDomainError("TASK_ASSIGNMENT_HISTORY_GENERATION_INVALID");
  }
  const next = [...task.assignmentHistory.map(cloneAssignmentHistoryRecord), cloneAssignmentHistoryRecord(record)];
  validateAssignmentHistory({
    id: task.id,
    primaryAssigneeId: record.newAssigneeId,
    assignmentHistory: next,
  });
  return next;
}
