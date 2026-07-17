import { WorkManagementDomainError } from "../errors/codes";
import { evaluateTaskTransition, requiredPermissionForAction, type TransitionDecision } from "../domain/workflow";
import { isTaskParticipant } from "../permissions/scope-evaluator";
import type { AuditPort } from "../ports/audit";
import type { NotificationPort } from "../ports/notifications";
import type { TaskActivityRepository, TaskRepository } from "../ports/repositories";
import type { TransactionManager } from "../ports/transaction";
import type { TaskMutationCommand } from "./commands";
import { resolveCurrentTaskAssignment } from "./assignment-source-of-truth";
import type { ActorContext } from "./types";

export type TaskApplicationDependencies = { transactions: TransactionManager; tasks: TaskRepository; activities: TaskActivityRepository; audit: AuditPort; notifications: NotificationPort };
export type TaskMutationResult = { decision: TransitionDecision; version: number };

function isScopeAllowed(actor: ActorContext, task: Parameters<typeof isTaskParticipant>[0]): boolean {
  const currentAssignment = resolveCurrentTaskAssignment(task);
  if (actor.scopes.includes("COMPANY")) return true;
  if (task.projectId && actor.scopes.includes("PROJECT") && actor.projectMemberships.includes(task.projectId)) return true;
  if (actor.scopes.includes("OWN") && (task.creatorId === actor.userId || currentAssignment.assigneeId === actor.userId)) return true;
  return actor.scopes.includes("PARTICIPATING") && isTaskParticipant(task, actor.userId);
}

export class TaskApplicationService {
  constructor(private readonly dependencies: TaskApplicationDependencies) {}

  async execute(actor: ActorContext, command: TaskMutationCommand): Promise<TaskMutationResult> {
    if (!actor.userId || command.expectedVersion < 0) throw new WorkManagementDomainError("TASK_ACCESS_DENIED");
    return this.dependencies.transactions.run(async () => {
      const versioned = await this.dependencies.tasks.findById(command.taskId);
      if (!versioned) throw new WorkManagementDomainError("TASK_NOT_FOUND");
      if (versioned.version !== command.expectedVersion) throw new WorkManagementDomainError("TASK_CONCURRENCY_CONFLICT");
      if (!isScopeAllowed(actor, versioned.task)) throw new WorkManagementDomainError("TASK_ACCESS_DENIED");
      const requiredPermission = requiredPermissionForAction(command.action);
      const decision = evaluateTaskTransition({ currentState: versioned.task.state, action: command.action, taskId: versioned.task.id, actorHasPermission: actor.permissions.includes(requiredPermission as never), now: actor.currentTime });
      if (!decision.allowed || !decision.nextState) throw new WorkManagementDomainError(decision.errorCode ?? "TASK_INVALID_TRANSITION");
      const saved = await this.dependencies.tasks.save({ ...versioned.task, state: decision.nextState }, command.expectedVersion);
      if (!saved) throw new WorkManagementDomainError("TASK_CONCURRENCY_CONFLICT");
      const event = decision.requiredEvents[0];
      await this.dependencies.activities.append({ taskId: versioned.task.id, type: event.type, actorId: actor.userId, occurredAt: actor.currentTime });
      await this.dependencies.audit.record({ action: event.type, taskId: versioned.task.id, actorId: actor.userId, occurredAt: actor.currentTime });
      await this.dependencies.notifications.enqueue({ eventType: event.type, taskId: versioned.task.id, idempotencyKey: command.idempotencyKey });
      return { decision, version: command.expectedVersion + 1 };
    });
  }
}
