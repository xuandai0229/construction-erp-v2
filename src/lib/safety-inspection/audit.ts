import type { SafetyAggregateType } from "./types";

export type SafetyAuditEvent<TBefore, TAfter> = {
  aggregateType: SafetyAggregateType;
  aggregateId: string;
  projectId: string | null;
  action: string;
  actorId: string;
  occurredAt: Date;
  correlationId: string;
  beforeData: TBefore | null;
  afterData: TAfter | null;
};

export function createSafetyAuditEvent<TBefore, TAfter>(
  event: SafetyAuditEvent<TBefore, TAfter>,
): Readonly<SafetyAuditEvent<TBefore, TAfter>> {
  if (!event.action.trim() || !event.correlationId.trim()) {
    throw new Error("Sự kiện audit ATLĐ không hợp lệ.");
  }
  return Object.freeze({ ...event });
}
