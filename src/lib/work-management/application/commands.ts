import type { TaskAction } from "../domain/types";
import type { CommandEnvelope } from "./types";

type TaskCommand = CommandEnvelope & { taskId: string };
export type CreateTaskCommand = CommandEnvelope & { title: string; projectId?: string; primaryAssigneeId?: string };
export type AssignTaskCommand = TaskCommand & { primaryAssigneeId: string; reason?: string };
export type AcceptTaskCommand = TaskCommand;
export type RequestClarificationCommand = TaskCommand & { reason: string };
export type StartTaskCommand = TaskCommand;
export type UpdateTaskProgressCommand = TaskCommand & { progressPercent: number; note?: string };
export type RequestExtensionCommand = TaskCommand & { requestedDueAt: Date; reason: string };
export type PauseTaskCommand = TaskCommand & { reason: string };
export type ResumeTaskCommand = TaskCommand;
export type BlockTaskCommand = TaskCommand & { reason: string };
export type UnblockTaskCommand = TaskCommand;
export type SubmitTaskCommand = TaskCommand & { summary: string };
export type RequestChangesCommand = TaskCommand & { submissionId: string; reason: string };
export type ApproveTaskResultCommand = TaskCommand & { submissionId: string };
export type ConfirmTaskCompletionCommand = TaskCommand;
export type ReopenTaskCommand = TaskCommand & { reason: string };
export type CancelTaskCommand = TaskCommand & { reason: string };
export type ArchiveTaskCommand = TaskCommand;
/** `receiverId` is a candidate only; sender, generation, and effective state are server-derived. */
export type RequestTaskHandoverCommand = TaskCommand & { receiverId: string; reason: string };
export type AcceptTaskHandoverCommand = TaskCommand & { handoverId: string };
export type RejectTaskHandoverCommand = TaskCommand & { handoverId: string; reason: string };
export type ApproveTaskHandoverCommand = TaskCommand & { handoverId: string };
export type ExecuteTaskHandoverCommand = TaskCommand & { handoverId: string };
export type TaskMutationCommand = TaskCommand & { action: TaskAction };
