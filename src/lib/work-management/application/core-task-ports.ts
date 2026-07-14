import type { CoreTaskAggregate } from "./core-task-executor";
import type { CoreTaskEffects } from "./core-task-effects";
import type { IdempotencyRequest, StableCoreTaskExecutionResult } from "./core-task-idempotency";
import type { WorkManagementTransitionPolicy, WorkManagementTransitionPolicyKey } from "../domain/transition-policies";

export interface CoreTaskReadRepository { findById(taskId: string): Promise<CoreTaskAggregate | null>; }
export interface CoreTaskTransactionalRepository {
  create(task: CoreTaskAggregate): Promise<boolean>;
  compareAndSave(taskId: string, expectedVersion: number, nextTask: CoreTaskAggregate): Promise<boolean>;
}
export interface CoreTaskEffectStore { stage(effects: CoreTaskEffects): Promise<void>; }
export interface CoreTaskIdempotencyCompletionStore { complete(request: IdempotencyRequest, result: StableCoreTaskExecutionResult): Promise<void>; }
export interface CoreTaskTransactionContext { tasks: CoreTaskTransactionalRepository; effects: CoreTaskEffectStore; idempotency: CoreTaskIdempotencyCompletionStore; }
export interface CoreTaskUnitOfWork { run<T>(operation: (transaction: CoreTaskTransactionContext) => Promise<T>): Promise<T>; }
export interface CoreTaskTransitionPolicyResolver { resolve(key: WorkManagementTransitionPolicyKey): WorkManagementTransitionPolicy; }
