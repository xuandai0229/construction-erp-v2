import { WorkManagementDomainError, type WorkManagementErrorCode } from "../errors/codes";
import { evaluateTaskTransition, type DomainEvent, type TransitionTarget } from "./workflow";
import type { TaskAction, TaskState } from "./types";

export type WorkManagementTransitionPolicyKey =
  | "CREATE_NEW_TASK" | "ASSIGN_PRIMARY_ASSIGNEE" | "ACCEPT_ASSIGNMENT"
  | "REQUEST_TASK_CLARIFICATION" | "START_EXECUTION" | "UPDATE_EXECUTION_PROGRESS"
  | "REQUEST_DEADLINE_EXTENSION" | "CHANGE_TASK_DEADLINE" | "PAUSE_EXECUTION"
  | "RESUME_EXECUTION" | "BLOCK_EXECUTION" | "UNBLOCK_EXECUTION" | "SUBMIT_RESULT"
  | "REQUEST_RESULT_CHANGES" | "APPROVE_RESULT_REVIEW" | "CONFIRM_TASK_COMPLETION"
  | "REOPEN_COMPLETED_TASK" | "CANCEL_TASK" | "ARCHIVE_TASK" | "RESTORE_ARCHIVED_TASK"
  | "REQUEST_TASK_HANDOVER" | "ACCEPT_TASK_HANDOVER" | "REJECT_TASK_HANDOVER"
  | "APPROVE_TASK_HANDOVER" | "EXECUTE_TASK_HANDOVER";

export type TransitionPolicyEvaluationInput = {
  action: TaskAction;
  currentState: TaskState;
  taskId: string;
  command: Readonly<Record<string, unknown>>;
  now: Date;
};

export type TransitionPolicyDecision = {
  allowed: boolean;
  nextState: TaskState | null;
  errorCode: WorkManagementErrorCode | null;
  intents: readonly DomainEvent[];
  target?: TransitionTarget | null;
};

export type WorkManagementTransitionPolicy = {
  key: WorkManagementTransitionPolicyKey;
  action: TaskAction;
  transitionIntent: string;
  changesDeadline: boolean;
  changesAssignee: boolean;
  restoresPreviousLifecycle: boolean;
  evaluate(input: TransitionPolicyEvaluationInput): TransitionPolicyDecision;
};

function policy(
  key: WorkManagementTransitionPolicyKey,
  action: TaskAction,
  transitionIntent: string,
  overrides: Partial<Omit<WorkManagementTransitionPolicy, "key" | "action" | "transitionIntent" | "evaluate">> = {},
): WorkManagementTransitionPolicy {
  return {
    key,
    action,
    transitionIntent,
    changesDeadline: false,
    changesAssignee: false,
    restoresPreviousLifecycle: false,
    ...overrides,
    evaluate(input) {
      if (input.action !== action) {
        return { allowed: false, nextState: null, errorCode: "TASK_INVALID_TRANSITION", intents: [], target: null };
      }
      const result = evaluateTaskTransition({
        currentState: input.currentState,
        action,
        taskId: input.taskId,
        actorHasPermission: true,
        now: input.now,
      });
      return {
        allowed: result.allowed,
        nextState: result.nextState ?? null,
        errorCode: result.errorCode ?? null,
        intents: result.requiredEvents,
        target: result.target ?? null,
      };
    },
  };
}

export const WORK_MANAGEMENT_TRANSITION_POLICIES = {
  CREATE_NEW_TASK: policy("CREATE_NEW_TASK", "CREATE_DRAFT", "CREATE_TASK"),
  ASSIGN_PRIMARY_ASSIGNEE: policy("ASSIGN_PRIMARY_ASSIGNEE", "ASSIGN", "SET_PRIMARY_ASSIGNEE"),
  ACCEPT_ASSIGNMENT: policy("ACCEPT_ASSIGNMENT", "ACCEPT", "ACCEPT_ASSIGNED_TASK"),
  REQUEST_TASK_CLARIFICATION: policy("REQUEST_TASK_CLARIFICATION", "REQUEST_CLARIFICATION", "REQUEST_CLARIFICATION"),
  START_EXECUTION: policy("START_EXECUTION", "START", "START_TASK_EXECUTION"),
  UPDATE_EXECUTION_PROGRESS: policy("UPDATE_EXECUTION_PROGRESS", "UPDATE_PROGRESS", "RECORD_PROGRESS"),
  REQUEST_DEADLINE_EXTENSION: policy("REQUEST_DEADLINE_EXTENSION", "REQUEST_EXTENSION", "CREATE_EXTENSION_REQUEST"),
  CHANGE_TASK_DEADLINE: policy("CHANGE_TASK_DEADLINE", "CHANGE_DEADLINE", "CHANGE_DUE_DATE", { changesDeadline: true }),
  PAUSE_EXECUTION: policy("PAUSE_EXECUTION", "PAUSE", "PAUSE_TASK_EXECUTION"),
  RESUME_EXECUTION: policy("RESUME_EXECUTION", "RESUME", "RESUME_TASK_EXECUTION"),
  BLOCK_EXECUTION: policy("BLOCK_EXECUTION", "BLOCK", "BLOCK_TASK_EXECUTION"),
  UNBLOCK_EXECUTION: policy("UNBLOCK_EXECUTION", "UNBLOCK", "UNBLOCK_TASK_EXECUTION"),
  SUBMIT_RESULT: policy("SUBMIT_RESULT", "SUBMIT", "APPEND_TASK_SUBMISSION"),
  REQUEST_RESULT_CHANGES: policy("REQUEST_RESULT_CHANGES", "REQUEST_CHANGES", "REQUEST_SUBMISSION_CHANGES"),
  APPROVE_RESULT_REVIEW: policy("APPROVE_RESULT_REVIEW", "APPROVE_RESULT", "APPROVE_SUBMISSION_REVIEW"),
  CONFIRM_TASK_COMPLETION: policy("CONFIRM_TASK_COMPLETION", "CONFIRM_COMPLETION", "COMPLETE_TASK"),
  REOPEN_COMPLETED_TASK: policy("REOPEN_COMPLETED_TASK", "REOPEN", "REOPEN_TASK"),
  CANCEL_TASK: policy("CANCEL_TASK", "CANCEL", "CANCEL_TASK"),
  ARCHIVE_TASK: policy("ARCHIVE_TASK", "ARCHIVE", "ARCHIVE_WITH_SOURCE_LIFECYCLE"),
  RESTORE_ARCHIVED_TASK: policy("RESTORE_ARCHIVED_TASK", "RESTORE", "RESTORE_PREVIOUS_LIFECYCLE", { restoresPreviousLifecycle: true }),
  REQUEST_TASK_HANDOVER: policy("REQUEST_TASK_HANDOVER", "REQUEST_HANDOVER", "CREATE_HANDOVER_REQUEST"),
  ACCEPT_TASK_HANDOVER: policy("ACCEPT_TASK_HANDOVER", "ACCEPT_HANDOVER", "ACCEPT_HANDOVER_REQUEST"),
  REJECT_TASK_HANDOVER: policy("REJECT_TASK_HANDOVER", "REJECT_HANDOVER", "REJECT_HANDOVER_REQUEST"),
  APPROVE_TASK_HANDOVER: policy("APPROVE_TASK_HANDOVER", "APPROVE_HANDOVER", "APPROVE_HANDOVER_REQUEST"),
  EXECUTE_TASK_HANDOVER: policy("EXECUTE_TASK_HANDOVER", "EXECUTE_HANDOVER", "TRANSFER_PRIMARY_ASSIGNEE", { changesAssignee: true }),
} as const satisfies Record<WorkManagementTransitionPolicyKey, WorkManagementTransitionPolicy>;

export function resolveTransitionPolicy(key: WorkManagementTransitionPolicyKey): WorkManagementTransitionPolicy {
  const resolved = WORK_MANAGEMENT_TRANSITION_POLICIES[key];
  if (!resolved) throw new WorkManagementDomainError("TASK_ACTION_UNSUPPORTED");
  return resolved;
}
