import type { CoreTaskAction } from "./core-task-executor";
import type { TaskSnapshot } from "../domain/types";
import { WorkManagementDomainError } from "../errors/codes";

export type CurrentTaskAssignment =
  | {
      status: "UNASSIGNED";
      assigneeId: null;
      assignedById: string | null;
      source: "TASK_PRIMARY_ASSIGNEE_PROJECTION";
    }
  | {
      status: "ASSIGNED";
      assigneeId: string;
      assignedById: string | null;
      source: "TASK_PRIMARY_ASSIGNEE_PROJECTION";
    };

export type AssignmentProjectionWriteAuthority = "ASSIGN" | "EXECUTE_HANDOVER";

const isValidOptionalUserId = (value: unknown): value is string | null =>
  value === null || (typeof value === "string" && value.trim().length > 0);

/** The only current-assignee reader. It intentionally has no fallback sources. */
export function resolveCurrentTaskAssignment(
  task: Pick<TaskSnapshot, "primaryAssigneeId" | "assignedById">,
): CurrentTaskAssignment {
  if (!isValidOptionalUserId(task.assignedById)) {
    throw new WorkManagementDomainError("TASK_ASSIGNMENT_PROJECTION_INVALID");
  }
  if (task.primaryAssigneeId === null) {
    return {
      status: "UNASSIGNED",
      assigneeId: null,
      assignedById: task.assignedById,
      source: "TASK_PRIMARY_ASSIGNEE_PROJECTION",
    };
  }
  if (typeof task.primaryAssigneeId !== "string" || task.primaryAssigneeId.trim().length === 0) {
    throw new WorkManagementDomainError("TASK_ASSIGNMENT_PROJECTION_INVALID");
  }
  return {
    status: "ASSIGNED",
    assigneeId: task.primaryAssigneeId,
    assignedById: task.assignedById,
    source: "TASK_PRIMARY_ASSIGNEE_PROJECTION",
  };
}

export function requireCurrentTaskAssignee(
  task: Pick<TaskSnapshot, "primaryAssigneeId" | "assignedById">,
): string {
  const assignment = resolveCurrentTaskAssignment(task);
  if (assignment.status === "UNASSIGNED") throw new WorkManagementDomainError("TASK_ASSIGNMENT_REQUIRED");
  return assignment.assigneeId;
}

export function canMutatePrimaryAssignee(action: CoreTaskAction): action is AssignmentProjectionWriteAuthority {
  return action === "ASSIGN" || action === "EXECUTE_HANDOVER";
}

/** Frozen CREATE_DRAFT creates unassigned drafts; it has no initialization authority. */
export function canInitializePrimaryAssignee(
  _action: CoreTaskAction,
): boolean {
  void _action;
  return false;
}
