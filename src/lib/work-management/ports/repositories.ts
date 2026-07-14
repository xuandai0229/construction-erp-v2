import type { TaskSnapshot } from "../domain/types";

export type VersionedTask = { task: TaskSnapshot; version: number };
export interface TaskRepository { findById(id: string): Promise<VersionedTask | null>; save(task: TaskSnapshot, expectedVersion: number): Promise<boolean>; }
export interface TaskAssignmentHistoryRepository { append(entry: { taskId: string; assigneeId: string; effectiveAt: Date }): Promise<void>; }
export interface TaskActivityRepository { append(event: { taskId: string; type: string; actorId: string; occurredAt: Date }): Promise<void>; }
export interface TaskSubmissionRepository { findLatestNumber(taskId: string): Promise<number>; }
export interface TaskHandoverRepository { append(event: { taskId: string; type: string; occurredAt: Date }): Promise<void>; }
export interface ResponsibilityRepository { existsActiveAssignment(userId: string): Promise<boolean>; }
export interface DelegationRepository { findEffectiveFor(delegateId: string, at: Date): Promise<readonly unknown[]>; }
