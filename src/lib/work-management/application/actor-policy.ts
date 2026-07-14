import type { WorkManagementScope } from "../permissions/contract";

export type WorkManagementActorRelation =
  | "CREATOR"
  | "ASSIGNED_BY"
  | "PRIMARY_ASSIGNEE"
  | "HANDOVER_RECEIVER"
  | "COLLABORATOR"
  | "REVIEWER"
  | "APPROVER";

export type WorkManagementActorPolicy =
  | { mode: "NOT_APPLICABLE" }
  | {
      mode: "RELATION_REQUIRED";
      relations: readonly WorkManagementActorRelation[];
    }
  | {
      mode: "RELATION_OR_PRIVILEGED_SCOPE";
      relations: readonly WorkManagementActorRelation[];
      privilegedScopes: readonly WorkManagementScope[];
    }
  | {
      mode: "SYSTEM_OR_PRIVILEGED_SCOPE";
      privilegedScopes: readonly WorkManagementScope[];
    };

export type ActorPolicyEvaluationInput = {
  actorType: "USER" | "SYSTEM";
  actorRelations: readonly WorkManagementActorRelation[];
  resolvedScopes: readonly WorkManagementScope[];
};

function hasAny<T>(actual: readonly T[], expected: readonly T[]): boolean {
  return expected.some((value) => actual.includes(value));
}

export function evaluateActorPolicy(
  policy: WorkManagementActorPolicy,
  input: ActorPolicyEvaluationInput,
): boolean {
  switch (policy.mode) {
    case "NOT_APPLICABLE":
      return input.actorType === "USER";
    case "RELATION_REQUIRED":
      return hasAny(input.actorRelations, policy.relations);
    case "RELATION_OR_PRIVILEGED_SCOPE":
      return (
        hasAny(input.actorRelations, policy.relations) ||
        hasAny(input.resolvedScopes, policy.privilegedScopes)
      );
    case "SYSTEM_OR_PRIVILEGED_SCOPE":
      return (
        input.actorType === "SYSTEM" ||
        hasAny(input.resolvedScopes, policy.privilegedScopes)
      );
  }
}
