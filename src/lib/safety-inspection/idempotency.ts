import type { SafetyAggregateType } from "./types";

export type SafetyMutationIdentity = {
  actorId: string;
  aggregateType: SafetyAggregateType;
  aggregateId: string;
  clientMutationId: string;
};

function assertIdentityPart(value: string, label: string): void {
  if (!value.trim() || value.includes("\u001f")) {
    throw new Error(`${label} không hợp lệ.`);
  }
}

export function buildSafetyIdempotencyKey(
  identity: SafetyMutationIdentity,
): string {
  assertIdentityPart(identity.actorId, "Người thực hiện");
  assertIdentityPart(identity.aggregateId, "Đối tượng nghiệp vụ");
  assertIdentityPart(identity.clientMutationId, "Mã mutation");
  return [
    identity.actorId,
    identity.aggregateType,
    identity.aggregateId,
    identity.clientMutationId,
  ].join("\u001f");
}

export function isSafetyMutationReplay(
  existing: SafetyMutationIdentity,
  incoming: SafetyMutationIdentity,
): boolean {
  return (
    buildSafetyIdempotencyKey(existing) ===
    buildSafetyIdempotencyKey(incoming)
  );
}
