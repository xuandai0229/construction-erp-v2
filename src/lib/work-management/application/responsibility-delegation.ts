import { WorkManagementDomainError } from "../errors/codes";
import { requireExactObject } from "../validation/exact-object";
import {
  RESPONSIBILITY_REGISTRY,
} from "./responsibility-assignment";

export type ResponsibilityDelegationStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "REJECTED"
  | "REVOKED"
  | "EXPIRED";

export type ResponsibilityDelegationRecord = Readonly<{
  id: string; taskId: string; sourceAssignmentId: string; responsibilityCode: string;
  delegatorUserId: string; delegateUserId: string; requestedById: string;
  generation: number; status: ResponsibilityDelegationStatus;
  requestedAt: Date; startsAt: Date; expiresAt: Date; acceptedAt: Date | null; endedAt: Date | null;
  requestReason: string | null; decisionReason: string | null; endReason: string | null;
}>;

export type ResponsibilityDelegationSnapshot = Readonly<{
  taskId: string; sourceAssignmentId: string; responsibilityCode: string; delegatorUserId: string;
  version: number; delegations: readonly ResponsibilityDelegationRecord[];
}>;

type BaseEffect = Readonly<{
  delegationId: string; taskId: string; sourceAssignmentId: string; responsibilityCode: string;
  delegatorUserId: string; delegateUserId: string; actorId: string; generation: number;
  occurredAt: Date; startsAt: Date; expiresAt: Date;
}>;
export type ResponsibilityDelegationEffect =
  | Readonly<BaseEffect & { type: "RESPONSIBILITY_DELEGATION_REQUESTED"; requestReason: string | null }>
  | Readonly<BaseEffect & { type: "RESPONSIBILITY_DELEGATION_ACCEPTED"; acceptedAt: Date }>
  | Readonly<BaseEffect & { type: "RESPONSIBILITY_DELEGATION_REJECTED"; decisionReason: string | null }>
  | Readonly<BaseEffect & { type: "RESPONSIBILITY_DELEGATION_REVOKED"; endReason: string | null }>
  | Readonly<BaseEffect & { type: "RESPONSIBILITY_DELEGATION_EXPIRED"; endedAt: Date }>;
export type ResponsibilityDelegationResult = Readonly<{ snapshot: ResponsibilityDelegationSnapshot; effects: readonly ResponsibilityDelegationEffect[] }>;

const clone = <T>(value: T): T => structuredClone(value);
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const date = (value: unknown): value is Date => value instanceof Date && Number.isFinite(value.getTime());
const integer = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value);
const positive = (value: unknown): value is number => integer(value) && value > 0;
const reason = (value: unknown): value is string | null => value === null || text(value);
const status = (value: unknown): value is ResponsibilityDelegationStatus => value === "REQUESTED" || value === "ACCEPTED" || value === "REJECTED" || value === "REVOKED" || value === "EXPIRED";
const error = (code: "TASK_DELEGATION_INVALID" | "TASK_DELEGATION_HISTORY_INVALID" | "TASK_DELEGATION_NOT_FOUND" | "TASK_DELEGATION_NOT_REQUESTED" | "TASK_DELEGATION_NOT_OPEN" | "TASK_DELEGATION_ALREADY_OPEN" | "TASK_DELEGATION_ACTOR_INVALID" | "TASK_DELEGATION_SELF_FORBIDDEN" | "TASK_DELEGATION_TIME_INVALID"): never => { throw new WorkManagementDomainError(code); };
const validCode = (value: unknown): value is string => text(value) && RESPONSIBILITY_REGISTRY.some((item) => item.code === value);
const open = (item: ResponsibilityDelegationRecord): boolean => item.status === "REQUESTED" || item.status === "ACCEPTED";

type ActiveSource = Readonly<{ id: string; taskId: string; responsibilityCode: string; responsibleUserId: string }>;
const parseSource = (value: unknown): ActiveSource => {
  if (!isRecord(value)) return error("TASK_DELEGATION_INVALID");
  const { id, taskId, responsibilityCode, responsibleUserId, assignedById, generation, status: sourceStatus, effectiveAt, endedAt, reason: sourceReason, supersedesAssignmentId } = value;
  if (!text(id) || !text(taskId) || !validCode(responsibilityCode) || !text(responsibleUserId) || !text(assignedById) || !positive(generation) || sourceStatus !== "ACTIVE" || !date(effectiveAt) || endedAt !== null || !reason(sourceReason) || !(supersedesAssignmentId === null || text(supersedesAssignmentId))) return error("TASK_DELEGATION_INVALID");
  return { id, taskId, responsibilityCode, responsibleUserId };
};

export function createResponsibilityDelegationSnapshot(value: unknown): ResponsibilityDelegationSnapshot {
  const source = parseSource(value);
  return { taskId: source.taskId, sourceAssignmentId: source.id, responsibilityCode: source.responsibilityCode, delegatorUserId: source.responsibleUserId, version: 0, delegations: [] };
}

const parseRecord = (value: unknown, snapshot: Readonly<{ taskId: string; sourceAssignmentId: string; responsibilityCode: string; delegatorUserId: string }>, previous: number, ids: ReadonlySet<string>): ResponsibilityDelegationRecord => {
  if (!isRecord(value)) return error("TASK_DELEGATION_HISTORY_INVALID");
  const { id, taskId, sourceAssignmentId, responsibilityCode, delegatorUserId, delegateUserId, requestedById, generation, status: state, requestedAt, startsAt, expiresAt, acceptedAt, endedAt, requestReason, decisionReason, endReason } = value;
  if (!text(id) || ids.has(id) || taskId !== snapshot.taskId || sourceAssignmentId !== snapshot.sourceAssignmentId || responsibilityCode !== snapshot.responsibilityCode || delegatorUserId !== snapshot.delegatorUserId || !text(delegateUserId) || !text(requestedById) || !positive(generation) || generation !== previous + 1 || !status(state) || !date(requestedAt) || !date(startsAt) || !date(expiresAt) || requestedAt > startsAt || startsAt >= expiresAt || !reason(requestReason) || !reason(decisionReason) || !reason(endReason) || delegateUserId === delegatorUserId) return error("TASK_DELEGATION_HISTORY_INVALID");
  const accepted = acceptedAt === null ? null : date(acceptedAt) ? acceptedAt : error("TASK_DELEGATION_HISTORY_INVALID");
  const ended = endedAt === null ? null : date(endedAt) ? endedAt : error("TASK_DELEGATION_HISTORY_INVALID");
  if (accepted !== null && (accepted < requestedAt || accepted >= expiresAt)) return error("TASK_DELEGATION_HISTORY_INVALID");
  if (requestedById !== delegatorUserId) return error("TASK_DELEGATION_HISTORY_INVALID");
  if (state === "REQUESTED" && (accepted !== null || ended !== null || decisionReason !== null || endReason !== null)) return error("TASK_DELEGATION_HISTORY_INVALID");
  if (state === "ACCEPTED" && (accepted === null || accepted < requestedAt || accepted >= expiresAt || ended !== null || decisionReason !== null || endReason !== null)) return error("TASK_DELEGATION_HISTORY_INVALID");
  if (state === "REJECTED" && (accepted !== null || ended === null || ended < requestedAt || ended >= expiresAt || endReason !== null)) return error("TASK_DELEGATION_HISTORY_INVALID");
  if (state === "REVOKED" && (ended === null || ended < requestedAt || (accepted !== null && ended < accepted) || decisionReason !== null)) return error("TASK_DELEGATION_HISTORY_INVALID");
  if (state === "EXPIRED" && (ended === null || ended < expiresAt || endReason !== null || decisionReason !== null)) return error("TASK_DELEGATION_HISTORY_INVALID");
  return { id, taskId, sourceAssignmentId, responsibilityCode, delegatorUserId, delegateUserId, requestedById, generation, status: state, requestedAt: clone(requestedAt), startsAt: clone(startsAt), expiresAt: clone(expiresAt), acceptedAt: accepted === null ? null : clone(accepted), endedAt: ended === null ? null : clone(ended), requestReason, decisionReason, endReason };
};

export function validateResponsibilityDelegationSnapshot(value: unknown): asserts value is ResponsibilityDelegationSnapshot {
  if (!isRecord(value)) return error("TASK_DELEGATION_HISTORY_INVALID");
  const { taskId, sourceAssignmentId, responsibilityCode, delegatorUserId, version, delegations } = value;
  if (!text(taskId) || !text(sourceAssignmentId) || !validCode(responsibilityCode) || !text(delegatorUserId) || !integer(version) || version < 0 || !Array.isArray(delegations)) return error("TASK_DELEGATION_HISTORY_INVALID");
  const anchor = { taskId, sourceAssignmentId, responsibilityCode, delegatorUserId }; const ids = new Set<string>(); const parsed: ResponsibilityDelegationRecord[] = []; let previous = 0;
  for (const item of delegations) { const record = parseRecord(item, anchor, previous, ids); ids.add(record.id); previous = record.generation; parsed.push(record); }
  if (parsed.filter(open).length > 1) return error("TASK_DELEGATION_ALREADY_OPEN");
}

export function validateResponsibilityDelegationRecord(value: unknown): ResponsibilityDelegationRecord {
  if (!isRecord(value) || !text(value.taskId) || !text(value.sourceAssignmentId) || !validCode(value.responsibilityCode) || !text(value.delegatorUserId) || !positive(value.generation)) return error("TASK_DELEGATION_INVALID");
  try {
    return parseRecord(value, { taskId: value.taskId, sourceAssignmentId: value.sourceAssignmentId, responsibilityCode: value.responsibilityCode, delegatorUserId: value.delegatorUserId }, value.generation - 1, new Set<string>());
  } catch (caught) {
    if (caught instanceof WorkManagementDomainError) return error("TASK_DELEGATION_INVALID");
    throw caught;
  }
}

const result = (snapshot: ResponsibilityDelegationSnapshot, effects: readonly ResponsibilityDelegationEffect[]): ResponsibilityDelegationResult => { validateResponsibilityDelegationSnapshot(snapshot); validateResponsibilityDelegationEffects(effects); return { snapshot: clone(snapshot), effects: clone(effects) }; };
const requiredReason = (value: unknown): string | null => { if (!reason(value)) return error("TASK_DELEGATION_INVALID"); return value; };
const snapshotInput = (value: unknown): ResponsibilityDelegationSnapshot => { validateResponsibilityDelegationSnapshot(value); return clone(value); };
const exact = (snapshot: ResponsibilityDelegationSnapshot, id: unknown): ResponsibilityDelegationRecord => { if (!text(id)) return error("TASK_DELEGATION_INVALID"); const item = snapshot.delegations.find((record) => record.id === id); if (!item) return error("TASK_DELEGATION_NOT_FOUND"); return item; };
const next = (snapshot: ResponsibilityDelegationSnapshot, delegations: readonly ResponsibilityDelegationRecord[]): ResponsibilityDelegationSnapshot => ({ ...snapshot, version: snapshot.version + 1, delegations: clone(delegations) });
const base = (record: ResponsibilityDelegationRecord, actorId: string, occurredAt: Date): BaseEffect => ({ delegationId: record.id, taskId: record.taskId, sourceAssignmentId: record.sourceAssignmentId, responsibilityCode: record.responsibilityCode, delegatorUserId: record.delegatorUserId, delegateUserId: record.delegateUserId, actorId, generation: record.generation, occurredAt: clone(occurredAt), startsAt: clone(record.startsAt), expiresAt: clone(record.expiresAt) });

export function requestResponsibilityDelegation(value: unknown): ResponsibilityDelegationResult {
  const input = requireExactObject(value, { requiredKeys: ["snapshot", "id", "delegateUserId", "actorId", "requestedAt", "startsAt", "expiresAt"], optionalKeys: ["reason"] }, () => error("TASK_DELEGATION_INVALID")); const snapshot = snapshotInput(input.snapshot); const { id, delegateUserId, actorId, requestedAt, startsAt, expiresAt } = input; const requestReason = requiredReason("reason" in input ? input.reason : null);
  if (!text(id) || !text(delegateUserId) || !text(actorId) || !date(requestedAt) || !date(startsAt) || !date(expiresAt)) return error("TASK_DELEGATION_INVALID");
  if (actorId !== snapshot.delegatorUserId) return error("TASK_DELEGATION_ACTOR_INVALID"); if (delegateUserId === snapshot.delegatorUserId) return error("TASK_DELEGATION_SELF_FORBIDDEN"); if (snapshot.delegations.some((item) => item.id === id)) return error("TASK_DELEGATION_HISTORY_INVALID"); if (snapshot.delegations.some(open)) return error("TASK_DELEGATION_ALREADY_OPEN"); if (requestedAt > startsAt || startsAt >= expiresAt) return error("TASK_DELEGATION_TIME_INVALID");
  const record: ResponsibilityDelegationRecord = { id, taskId: snapshot.taskId, sourceAssignmentId: snapshot.sourceAssignmentId, responsibilityCode: snapshot.responsibilityCode, delegatorUserId: snapshot.delegatorUserId, delegateUserId, requestedById: actorId, generation: snapshot.delegations.length + 1, status: "REQUESTED", requestedAt: clone(requestedAt), startsAt: clone(startsAt), expiresAt: clone(expiresAt), acceptedAt: null, endedAt: null, requestReason, decisionReason: null, endReason: null };
  const output = next(snapshot, [...snapshot.delegations, record]); return result(output, [{ ...base(record, actorId, requestedAt), type: "RESPONSIBILITY_DELEGATION_REQUESTED", requestReason }]);
}

const decide = (value: unknown, operation: "ACCEPT" | "REJECT" | "REVOKE" | "EXPIRE"): ResponsibilityDelegationResult => {
  const input = requireExactObject(value, (operation === "ACCEPT" || operation === "EXPIRE") ? { requiredKeys: ["snapshot", "delegationId", "actorId", "at"] } : { requiredKeys: ["snapshot", "delegationId", "actorId", "at"], optionalKeys: ["reason"] }, () => error("TASK_DELEGATION_INVALID")); const snapshot = snapshotInput(input.snapshot); const record = exact(snapshot, input.delegationId); const at = input.at; if (!text(input.actorId) || !date(at)) return error("TASK_DELEGATION_INVALID"); const actorId = input.actorId;
  if (!open(record)) return error("TASK_DELEGATION_NOT_OPEN");
  if (operation === "ACCEPT" || operation === "REJECT") { if (record.status !== "REQUESTED") return error("TASK_DELEGATION_NOT_REQUESTED"); if (actorId !== record.delegateUserId) return error("TASK_DELEGATION_ACTOR_INVALID"); if (at < record.requestedAt || at >= record.expiresAt) return error("TASK_DELEGATION_TIME_INVALID"); }
  if (operation === "REVOKE") { if (actorId !== record.delegateUserId && actorId !== record.delegatorUserId) return error("TASK_DELEGATION_ACTOR_INVALID"); if (at < record.requestedAt || at >= record.expiresAt || (record.acceptedAt !== null && at < record.acceptedAt)) return error("TASK_DELEGATION_TIME_INVALID"); }
  if (operation === "EXPIRE" && at < record.expiresAt) return error("TASK_DELEGATION_TIME_INVALID");
  const suppliedReason = (operation === "ACCEPT" || operation === "EXPIRE") ? null : requiredReason("reason" in input ? input.reason : null);
  let updated: ResponsibilityDelegationRecord; let effect: ResponsibilityDelegationEffect;
  if (operation === "ACCEPT") { updated = { ...record, status: "ACCEPTED", acceptedAt: clone(at) }; effect = { ...base(updated, actorId, at), type: "RESPONSIBILITY_DELEGATION_ACCEPTED", acceptedAt: clone(at) }; }
  else if (operation === "REJECT") { updated = { ...record, status: "REJECTED", endedAt: clone(at), decisionReason: suppliedReason }; effect = { ...base(updated, actorId, at), type: "RESPONSIBILITY_DELEGATION_REJECTED", decisionReason: suppliedReason }; }
  else if (operation === "REVOKE") { updated = { ...record, status: "REVOKED", endedAt: clone(at), endReason: suppliedReason }; effect = { ...base(updated, actorId, at), type: "RESPONSIBILITY_DELEGATION_REVOKED", endReason: suppliedReason }; }
  else { updated = { ...record, status: "EXPIRED", endedAt: clone(at) }; effect = { ...base(updated, actorId, at), type: "RESPONSIBILITY_DELEGATION_EXPIRED", endedAt: clone(at) }; }
  return result(next(snapshot, snapshot.delegations.map((item) => item.id === record.id ? updated : item)), [effect]);
};
export const acceptResponsibilityDelegation = (value: unknown): ResponsibilityDelegationResult => decide(value, "ACCEPT");
export const rejectResponsibilityDelegation = (value: unknown): ResponsibilityDelegationResult => decide(value, "REJECT");
export const revokeResponsibilityDelegation = (value: unknown): ResponsibilityDelegationResult => decide(value, "REVOKE");
export const expireResponsibilityDelegation = (value: unknown): ResponsibilityDelegationResult => decide(value, "EXPIRE");

export function isResponsibilityDelegationEffectiveAt(value: unknown, checkedAt: unknown): boolean {
  if (!date(checkedAt)) return error("TASK_DELEGATION_INVALID");
  const record = validateResponsibilityDelegationRecord(value);
  return record.status === "ACCEPTED" && record.endedAt === null && record.startsAt <= checkedAt && checkedAt < record.expiresAt;
}

export function validateResponsibilityDelegationEffects(value: unknown): asserts value is readonly ResponsibilityDelegationEffect[] {
  if (!Array.isArray(value)) return error("TASK_DELEGATION_INVALID");
  for (const item of value) {
    if (!isRecord(item) || !text(item.delegationId) || !text(item.taskId) || !text(item.sourceAssignmentId) || !validCode(item.responsibilityCode) || !text(item.delegatorUserId) || !text(item.delegateUserId) || !text(item.actorId) || !positive(item.generation) || !date(item.occurredAt) || !date(item.startsAt) || !date(item.expiresAt) || item.startsAt >= item.expiresAt) return error("TASK_DELEGATION_INVALID");
    if (item.type === "RESPONSIBILITY_DELEGATION_REQUESTED") { if (!reason(item.requestReason) || item.occurredAt > item.startsAt || ("acceptedAt" in item && item.acceptedAt !== null) || ("decisionReason" in item && item.decisionReason !== null) || ("endReason" in item && item.endReason !== null)) return error("TASK_DELEGATION_INVALID"); }
    else if (item.type === "RESPONSIBILITY_DELEGATION_ACCEPTED") { if (!date(item.acceptedAt) || item.acceptedAt.getTime() !== item.occurredAt.getTime() || item.acceptedAt >= item.expiresAt) return error("TASK_DELEGATION_INVALID"); }
    else if (item.type === "RESPONSIBILITY_DELEGATION_REJECTED") { if (!reason(item.decisionReason) || item.occurredAt >= item.expiresAt) return error("TASK_DELEGATION_INVALID"); }
    else if (item.type === "RESPONSIBILITY_DELEGATION_REVOKED") { if (!reason(item.endReason) || item.occurredAt >= item.expiresAt) return error("TASK_DELEGATION_INVALID"); }
    else if (item.type === "RESPONSIBILITY_DELEGATION_EXPIRED") { if (!date(item.endedAt) || item.endedAt.getTime() !== item.occurredAt.getTime() || item.endedAt < item.expiresAt) return error("TASK_DELEGATION_INVALID"); }
    else return error("TASK_DELEGATION_INVALID");
  }
}
