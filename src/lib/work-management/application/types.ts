import type { WorkManagementPermission, WorkManagementScope } from "../permissions/contract";
import type { DelegationContext } from "../permissions/scope-evaluator";

export type ActorContext = {
  userId: string;
  permissions: readonly WorkManagementPermission[];
  scopes: readonly WorkManagementScope[];
  projectMemberships: readonly string[];
  delegations: readonly DelegationContext[];
  currentTime: Date;
};

export type CommandEnvelope = { requestId?: string; idempotencyKey?: string; expectedVersion: number };
export type ScopedActorContext = ActorContext;
