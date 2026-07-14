import { WorkManagementDomainError } from "../errors/codes";
import type { TaskAction } from "../domain/types";

export type CommandMetadata = { commandId: string; idempotencyKey: string; correlationId?: string; causationId?: string; requestedAt: Date };
export function assertIdempotencyMetadata(metadata: CommandMetadata, action: TaskAction, aggregateId: string): void {
  const prefix = `work-management:${action.toLowerCase()}:${aggregateId}:`;
  if (!metadata.commandId.trim() || !metadata.idempotencyKey.startsWith(prefix) || metadata.idempotencyKey.length > 200 || /password|token|secret/i.test(metadata.idempotencyKey)) throw new WorkManagementDomainError("TASK_IDEMPOTENCY_CONFLICT");
}
