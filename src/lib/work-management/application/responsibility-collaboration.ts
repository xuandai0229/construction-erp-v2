import { WorkManagementDomainError } from "../errors/codes";
import { requireExactObject } from "../validation/exact-object";
import { RESPONSIBILITY_REGISTRY } from "./responsibility-assignment";

export type ResponsibilityCollaborationStatus =
  | "INVITED"
  | "ACTIVE"
  | "REJECTED"
  | "REMOVED"
  | "LEFT";

export type ResponsibilityCollaborationRecord = Readonly<{
  id: string;
  taskId: string;
  sourceAssignmentId: string;
  responsibilityCode: string;
  ownerUserId: string;
  collaboratorUserId: string;
  invitedById: string;
  generation: number;
  status: ResponsibilityCollaborationStatus;
  invitedAt: Date;
  acceptedAt: Date | null;
  endedAt: Date | null;
  invitationReason: string | null;
  decisionReason: string | null;
  endReason: string | null;
}>;

export type ResponsibilityCollaborationSnapshot = Readonly<{
  taskId: string;
  sourceAssignmentId: string;
  responsibilityCode: string;
  ownerUserId: string;
  version: number;
  collaborations: readonly ResponsibilityCollaborationRecord[];
}>;

type CollaborationEffectBase = Readonly<{
  collaborationId: string;
  taskId: string;
  sourceAssignmentId: string;
  responsibilityCode: string;
  ownerUserId: string;
  collaboratorUserId: string;
  actorId: string;
  generation: number;
  occurredAt: Date;
}>;

export type ResponsibilityCollaborationEffect =
  | Readonly<
      CollaborationEffectBase & {
        type: "RESPONSIBILITY_COLLABORATION_INVITED";
        invitationReason: string | null;
        invitedAt: Date;
      }
    >
  | Readonly<
      CollaborationEffectBase & {
        type: "RESPONSIBILITY_COLLABORATION_ACCEPTED";
        acceptedAt: Date;
      }
    >
  | Readonly<
      CollaborationEffectBase & {
        type: "RESPONSIBILITY_COLLABORATION_REJECTED";
        decisionReason: string | null;
        endedAt: Date;
      }
    >
  | Readonly<
      CollaborationEffectBase & {
        type: "RESPONSIBILITY_COLLABORATION_REMOVED";
        endReason: string | null;
        endedAt: Date;
        wasActive: boolean;
      }
    >
  | Readonly<
      CollaborationEffectBase & {
        type: "RESPONSIBILITY_COLLABORATION_LEFT";
        endReason: string | null;
        endedAt: Date;
      }
    >;

export type ResponsibilityCollaborationResult = Readonly<{
  snapshot: ResponsibilityCollaborationSnapshot;
  effects: readonly ResponsibilityCollaborationEffect[];
}>;

type CollaborationErrorCode =
  | "TASK_COLLABORATION_INVALID"
  | "TASK_COLLABORATION_HISTORY_INVALID"
  | "TASK_COLLABORATION_NOT_FOUND"
  | "TASK_COLLABORATION_NOT_INVITED"
  | "TASK_COLLABORATION_NOT_ACTIVE"
  | "TASK_COLLABORATION_NOT_OPEN"
  | "TASK_COLLABORATION_ALREADY_OPEN"
  | "TASK_COLLABORATION_ACTOR_INVALID"
  | "TASK_COLLABORATION_SELF_FORBIDDEN"
  | "TASK_COLLABORATION_TIME_INVALID";

type UnknownRecord = Readonly<Record<string, unknown>>;
type SnapshotInput = Readonly<{
  raw: UnknownRecord;
  snapshot: ResponsibilityCollaborationSnapshot;
}>;

const clone = <T>(value: T): T => structuredClone(value);

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isFiniteDate = (value: unknown): value is Date =>
  value instanceof Date && Number.isFinite(value.getTime());

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const isReason = (value: unknown): value is string | null =>
  value === null || isNonEmptyString(value);

const isRegisteredResponsibilityCode = (value: unknown): value is string =>
  isNonEmptyString(value) &&
  RESPONSIBILITY_REGISTRY.some((definition) => definition.code === value);

const isStatus = (value: unknown): value is ResponsibilityCollaborationStatus =>
  value === "INVITED" ||
  value === "ACTIVE" ||
  value === "REJECTED" ||
  value === "REMOVED" ||
  value === "LEFT";

const isOpen = (record: ResponsibilityCollaborationRecord): boolean =>
  record.status === "INVITED" || record.status === "ACTIVE";

const fail = (code: CollaborationErrorCode): never => {
  throw new WorkManagementDomainError(code);
};

const requireRecord = (value: unknown, code: CollaborationErrorCode): UnknownRecord => {
  if (!isRecord(value)) {
    return fail(code);
  }

  return value;
};

const requireNullableDate = (
  value: unknown,
  code: CollaborationErrorCode,
): Date | null => {
  if (value === null) {
    return null;
  }

  if (!isFiniteDate(value)) {
    return fail(code);
  }

  return value;
};

const requireText = (value: unknown, code: CollaborationErrorCode): string => {
  if (!isNonEmptyString(value)) {
    return fail(code);
  }
  return value;
};

const requireNullableReason = (
  value: unknown,
  code: CollaborationErrorCode,
): string | null => {
  if (!isReason(value)) {
    return fail(code);
  }
  return value;
};

const requirePositiveInteger = (
  value: unknown,
  code: CollaborationErrorCode,
): number => {
  if (!isPositiveInteger(value)) {
    return fail(code);
  }
  return value;
};

const requireFiniteDate = (value: unknown, code: CollaborationErrorCode): Date => {
  if (!isFiniteDate(value)) {
    return fail(code);
  }
  return value;
};

const requireSnapshotInput = (value: unknown): SnapshotInput => {
  const raw = requireRecord(value, "TASK_COLLABORATION_INVALID");

  validateResponsibilityCollaborationSnapshot(raw.snapshot);
  return { raw, snapshot: clone(raw.snapshot) };
};

export function createResponsibilityCollaborationSnapshot(
  value: unknown,
): ResponsibilityCollaborationSnapshot {
  const source = requireRecord(value, "TASK_COLLABORATION_INVALID");
  const id = requireText(source.id, "TASK_COLLABORATION_INVALID");
  const taskId = requireText(source.taskId, "TASK_COLLABORATION_INVALID");
  const responsibilityCode = source.responsibilityCode;
  const responsibleUserId = requireText(
    source.responsibleUserId,
    "TASK_COLLABORATION_INVALID",
  );
  requireText(source.assignedById, "TASK_COLLABORATION_INVALID");
  requirePositiveInteger(source.generation, "TASK_COLLABORATION_INVALID");
  requireFiniteDate(source.effectiveAt, "TASK_COLLABORATION_INVALID");
  if (
    !isRegisteredResponsibilityCode(responsibilityCode) ||
    source.status !== "ACTIVE" ||
    source.endedAt !== null ||
    !isReason(source.reason) ||
    (source.supersedesAssignmentId !== null &&
      !isNonEmptyString(source.supersedesAssignmentId))
  ) {
    return fail("TASK_COLLABORATION_INVALID");
  }

  return {
    taskId,
    sourceAssignmentId: id,
    responsibilityCode,
    ownerUserId: responsibleUserId,
    version: 0,
    collaborations: [],
  };
}

const parseHistoryRecord = (
  value: unknown,
  anchor: Pick<
    ResponsibilityCollaborationSnapshot,
    "taskId" | "sourceAssignmentId" | "responsibilityCode" | "ownerUserId"
  >,
  previousGeneration: number,
  ids: ReadonlySet<string>,
): ResponsibilityCollaborationRecord => {
  const record = requireRecord(value, "TASK_COLLABORATION_HISTORY_INVALID");
  const id = requireText(record.id, "TASK_COLLABORATION_HISTORY_INVALID");
  const taskId = requireText(record.taskId, "TASK_COLLABORATION_HISTORY_INVALID");
  const sourceAssignmentId = requireText(
    record.sourceAssignmentId,
    "TASK_COLLABORATION_HISTORY_INVALID",
  );
  const responsibilityCode = record.responsibilityCode;
  const ownerUserId = requireText(
    record.ownerUserId,
    "TASK_COLLABORATION_HISTORY_INVALID",
  );
  const collaboratorUserId = requireText(
    record.collaboratorUserId,
    "TASK_COLLABORATION_HISTORY_INVALID",
  );
  const invitedById = requireText(
    record.invitedById,
    "TASK_COLLABORATION_HISTORY_INVALID",
  );
  const generation = requirePositiveInteger(
    record.generation,
    "TASK_COLLABORATION_HISTORY_INVALID",
  );
  const status = record.status;
  const invitedAt = requireFiniteDate(
    record.invitedAt,
    "TASK_COLLABORATION_HISTORY_INVALID",
  );
  const acceptedAt = requireNullableDate(
    record.acceptedAt,
    "TASK_COLLABORATION_HISTORY_INVALID",
  );
  const endedAt = requireNullableDate(
    record.endedAt,
    "TASK_COLLABORATION_HISTORY_INVALID",
  );
  const invitationReason = requireNullableReason(
    record.invitationReason,
    "TASK_COLLABORATION_HISTORY_INVALID",
  );
  const decisionReason = requireNullableReason(
    record.decisionReason,
    "TASK_COLLABORATION_HISTORY_INVALID",
  );
  const endReason = requireNullableReason(
    record.endReason,
    "TASK_COLLABORATION_HISTORY_INVALID",
  );

  const validBase =
    !ids.has(id) &&
    taskId === anchor.taskId &&
    sourceAssignmentId === anchor.sourceAssignmentId &&
    responsibilityCode === anchor.responsibilityCode &&
    ownerUserId === anchor.ownerUserId &&
    collaboratorUserId !== anchor.ownerUserId &&
    invitedById === anchor.ownerUserId &&
    generation === previousGeneration + 1 &&
    isStatus(status);

  if (!validBase) {
    return fail("TASK_COLLABORATION_HISTORY_INVALID");
  }

  const isValidLifecycle =
    (status === "INVITED" &&
      acceptedAt === null &&
      endedAt === null &&
      decisionReason === null &&
      endReason === null) ||
    (status === "ACTIVE" &&
      acceptedAt !== null &&
      acceptedAt >= invitedAt &&
      endedAt === null &&
      decisionReason === null &&
      endReason === null) ||
    (status === "REJECTED" &&
      acceptedAt === null &&
      endedAt !== null &&
      endedAt >= invitedAt &&
      endReason === null) ||
    (status === "REMOVED" &&
      endedAt !== null &&
      endedAt >= invitedAt &&
      (acceptedAt === null ||
        (acceptedAt >= invitedAt && endedAt >= acceptedAt)) &&
      decisionReason === null) ||
    (status === "LEFT" &&
      acceptedAt !== null &&
      acceptedAt >= invitedAt &&
      endedAt !== null &&
      endedAt >= acceptedAt &&
      decisionReason === null);

  if (!isValidLifecycle) {
    return fail("TASK_COLLABORATION_HISTORY_INVALID");
  }

  return {
    id,
    taskId,
    sourceAssignmentId,
    responsibilityCode,
    ownerUserId,
    collaboratorUserId,
    invitedById,
    generation,
    status,
    invitedAt: clone(invitedAt),
    acceptedAt: acceptedAt === null ? null : clone(acceptedAt),
    endedAt: endedAt === null ? null : clone(endedAt),
    invitationReason: invitationReason as string | null,
    decisionReason: decisionReason as string | null,
    endReason: endReason as string | null,
  };
};

export function validateResponsibilityCollaborationSnapshot(
  value: unknown,
): asserts value is ResponsibilityCollaborationSnapshot {
  const snapshot = requireRecord(value, "TASK_COLLABORATION_HISTORY_INVALID");
  const taskId = requireText(snapshot.taskId, "TASK_COLLABORATION_HISTORY_INVALID");
  const sourceAssignmentId = requireText(
    snapshot.sourceAssignmentId,
    "TASK_COLLABORATION_HISTORY_INVALID",
  );
  const responsibilityCode = snapshot.responsibilityCode;
  const ownerUserId = requireText(
    snapshot.ownerUserId,
    "TASK_COLLABORATION_HISTORY_INVALID",
  );
  const collaborations = snapshot.collaborations;
  const valid =
    isRegisteredResponsibilityCode(responsibilityCode) &&
    typeof snapshot.version === "number" &&
    Number.isInteger(snapshot.version) &&
    snapshot.version >= 0 &&
    Array.isArray(collaborations);

  if (!valid) {
    return fail("TASK_COLLABORATION_HISTORY_INVALID");
  }

  const anchor = {
    taskId,
    sourceAssignmentId,
    responsibilityCode,
    ownerUserId,
  };
  const ids = new Set<string>();
  const records: ResponsibilityCollaborationRecord[] = [];
  let previousGeneration = 0;

  for (const rawRecord of collaborations) {
    const record = parseHistoryRecord(rawRecord, anchor, previousGeneration, ids);
    ids.add(record.id);
    previousGeneration = record.generation;
    records.push(record);
  }

  for (const record of records) {
    if (
      records.some(
        (other) =>
          other !== record &&
          isOpen(other) &&
          isOpen(record) &&
          other.collaboratorUserId === record.collaboratorUserId,
      )
    ) {
      return fail("TASK_COLLABORATION_ALREADY_OPEN");
    }
  }
}

export function validateResponsibilityCollaborationRecord(
  value: unknown,
): ResponsibilityCollaborationRecord {
  const record = requireRecord(value, "TASK_COLLABORATION_INVALID");
  if (
    !isNonEmptyString(record.taskId) ||
    !isNonEmptyString(record.sourceAssignmentId) ||
    !isRegisteredResponsibilityCode(record.responsibilityCode) ||
    !isNonEmptyString(record.ownerUserId) ||
    !isPositiveInteger(record.generation)
  ) {
    return fail("TASK_COLLABORATION_INVALID");
  }

  try {
    return parseHistoryRecord(
      record,
      {
        taskId: record.taskId,
        sourceAssignmentId: record.sourceAssignmentId,
        responsibilityCode: record.responsibilityCode,
        ownerUserId: record.ownerUserId,
      },
      record.generation - 1,
      new Set<string>(),
    );
  } catch (error) {
    if (error instanceof WorkManagementDomainError) {
      return fail("TASK_COLLABORATION_INVALID");
    }

    throw error;
  }
}

const makeNextSnapshot = (
  snapshot: ResponsibilityCollaborationSnapshot,
  collaborations: readonly ResponsibilityCollaborationRecord[],
): ResponsibilityCollaborationSnapshot => ({
  ...snapshot,
  version: snapshot.version + 1,
  collaborations: clone(collaborations),
});

const makeEffectBase = (
  record: ResponsibilityCollaborationRecord,
  actorId: string,
  occurredAt: Date,
): CollaborationEffectBase => ({
  collaborationId: record.id,
  taskId: record.taskId,
  sourceAssignmentId: record.sourceAssignmentId,
  responsibilityCode: record.responsibilityCode,
  ownerUserId: record.ownerUserId,
  collaboratorUserId: record.collaboratorUserId,
  actorId,
  generation: record.generation,
  occurredAt: clone(occurredAt),
});

const finish = (
  snapshot: ResponsibilityCollaborationSnapshot,
  effects: readonly ResponsibilityCollaborationEffect[],
): ResponsibilityCollaborationResult => {
  validateResponsibilityCollaborationSnapshot(snapshot);
  validateResponsibilityCollaborationEffects(effects);
  return { snapshot: clone(snapshot), effects: clone(effects) };
};

const getString = (raw: UnknownRecord, key: string): string | null =>
  isNonEmptyString(raw[key]) ? raw[key] : null;

const requireReason = (raw: UnknownRecord): string | null => {
  if (!("reason" in raw)) {
    return null;
  }
  if (!isReason(raw.reason)) {
    return fail("TASK_COLLABORATION_INVALID");
  }
  return raw.reason;
};

const requireDate = (raw: UnknownRecord): Date => {
  if (!isFiniteDate(raw.at)) {
    return fail("TASK_COLLABORATION_INVALID");
  }
  return raw.at;
};

const findRecord = (
  snapshot: ResponsibilityCollaborationSnapshot,
  id: unknown,
): ResponsibilityCollaborationRecord => {
  if (!isNonEmptyString(id)) {
    return fail("TASK_COLLABORATION_INVALID");
  }
  const record = snapshot.collaborations.find((item) => item.id === id);
  return record ?? fail("TASK_COLLABORATION_NOT_FOUND");
};

export function inviteResponsibilityCollaborator(
  value: unknown,
): ResponsibilityCollaborationResult {
  const raw = requireExactObject(value, { requiredKeys: ["snapshot", "id", "collaboratorUserId", "actorId", "at"], optionalKeys: ["reason"] }, () => fail("TASK_COLLABORATION_INVALID"));
  const { snapshot } = requireSnapshotInput(raw);
  const id = getString(raw, "id");
  const collaboratorUserId = getString(raw, "collaboratorUserId");
  const actorId = getString(raw, "actorId");
  const at = requireDate(raw);
  const invitationReason = requireReason(raw);

  if (id === null || collaboratorUserId === null || actorId === null) {
    return fail("TASK_COLLABORATION_INVALID");
  }
  if (actorId !== snapshot.ownerUserId) {
    return fail("TASK_COLLABORATION_ACTOR_INVALID");
  }
  if (collaboratorUserId === snapshot.ownerUserId) {
    return fail("TASK_COLLABORATION_SELF_FORBIDDEN");
  }
  if (snapshot.collaborations.some((record) => record.id === id)) {
    return fail("TASK_COLLABORATION_HISTORY_INVALID");
  }
  if (
    snapshot.collaborations.some(
      (record) => isOpen(record) && record.collaboratorUserId === collaboratorUserId,
    )
  ) {
    return fail("TASK_COLLABORATION_ALREADY_OPEN");
  }

  const record: ResponsibilityCollaborationRecord = {
    id,
    taskId: snapshot.taskId,
    sourceAssignmentId: snapshot.sourceAssignmentId,
    responsibilityCode: snapshot.responsibilityCode,
    ownerUserId: snapshot.ownerUserId,
    collaboratorUserId,
    invitedById: actorId,
    generation: snapshot.collaborations.length + 1,
    status: "INVITED",
    invitedAt: clone(at),
    acceptedAt: null,
    endedAt: null,
    invitationReason,
    decisionReason: null,
    endReason: null,
  };
  const next = makeNextSnapshot(snapshot, [...snapshot.collaborations, record]);
  const effect: ResponsibilityCollaborationEffect = {
    ...makeEffectBase(record, actorId, at),
    type: "RESPONSIBILITY_COLLABORATION_INVITED",
    invitationReason,
    invitedAt: clone(at),
  };
  return finish(next, [effect]);
}

type DecisionKind = "ACCEPT" | "REJECT" | "REMOVE" | "LEAVE";

const applyDecision = (
  value: unknown,
  kind: DecisionKind,
): ResponsibilityCollaborationResult => {
  const contract = kind === "ACCEPT"
    ? { requiredKeys: ["snapshot", "collaborationId", "actorId", "at"] }
    : { requiredKeys: ["snapshot", "collaborationId", "actorId", "at"], optionalKeys: ["reason"] };
  const raw = requireExactObject(value, contract, () => fail("TASK_COLLABORATION_INVALID"));
  const { snapshot } = requireSnapshotInput(raw);
  const record = findRecord(snapshot, raw.collaborationId);
  const actorId = getString(raw, "actorId");
  const at = requireDate(raw);
  const reason = requireReason(raw);
  if (actorId === null) {
    return fail("TASK_COLLABORATION_INVALID");
  }

  if (kind === "ACCEPT" || kind === "REJECT") {
    if (record.status !== "INVITED") {
      return fail("TASK_COLLABORATION_NOT_INVITED");
    }
    if (actorId !== record.collaboratorUserId) {
      return fail("TASK_COLLABORATION_ACTOR_INVALID");
    }
  }
  if (kind === "REMOVE") {
    if (!isOpen(record)) {
      return fail("TASK_COLLABORATION_NOT_OPEN");
    }
    if (actorId !== record.ownerUserId) {
      return fail("TASK_COLLABORATION_ACTOR_INVALID");
    }
  }
  if (kind === "LEAVE") {
    if (record.status !== "ACTIVE") {
      return fail("TASK_COLLABORATION_NOT_ACTIVE");
    }
    if (actorId !== record.collaboratorUserId) {
      return fail("TASK_COLLABORATION_ACTOR_INVALID");
    }
  }
  if (at < record.invitedAt || (record.acceptedAt !== null && at < record.acceptedAt)) {
    return fail("TASK_COLLABORATION_TIME_INVALID");
  }

  let updated: ResponsibilityCollaborationRecord;
  let effect: ResponsibilityCollaborationEffect;
  if (kind === "ACCEPT") {
    updated = { ...record, status: "ACTIVE", acceptedAt: clone(at) };
    effect = {
      ...makeEffectBase(updated, actorId, at),
      type: "RESPONSIBILITY_COLLABORATION_ACCEPTED",
      acceptedAt: clone(at),
    };
  } else if (kind === "REJECT") {
    updated = {
      ...record,
      status: "REJECTED",
      endedAt: clone(at),
      decisionReason: reason,
    };
    effect = {
      ...makeEffectBase(updated, actorId, at),
      type: "RESPONSIBILITY_COLLABORATION_REJECTED",
      decisionReason: reason,
      endedAt: clone(at),
    };
  } else if (kind === "REMOVE") {
    updated = { ...record, status: "REMOVED", endedAt: clone(at), endReason: reason };
    effect = {
      ...makeEffectBase(updated, actorId, at),
      type: "RESPONSIBILITY_COLLABORATION_REMOVED",
      endReason: reason,
      endedAt: clone(at),
      wasActive: record.status === "ACTIVE",
    };
  } else {
    updated = { ...record, status: "LEFT", endedAt: clone(at), endReason: reason };
    effect = {
      ...makeEffectBase(updated, actorId, at),
      type: "RESPONSIBILITY_COLLABORATION_LEFT",
      endReason: reason,
      endedAt: clone(at),
    };
  }

  const next = makeNextSnapshot(
    snapshot,
    snapshot.collaborations.map((item) => (item.id === record.id ? updated : item)),
  );
  return finish(next, [effect]);
};

export const acceptResponsibilityCollaboration = (
  value: unknown,
): ResponsibilityCollaborationResult => applyDecision(value, "ACCEPT");

export const rejectResponsibilityCollaboration = (
  value: unknown,
): ResponsibilityCollaborationResult => applyDecision(value, "REJECT");

export const removeResponsibilityCollaborator = (
  value: unknown,
): ResponsibilityCollaborationResult => applyDecision(value, "REMOVE");

export const leaveResponsibilityCollaboration = (
  value: unknown,
): ResponsibilityCollaborationResult => applyDecision(value, "LEAVE");

export function validateResponsibilityCollaborationEffects(
  value: unknown,
): asserts value is readonly ResponsibilityCollaborationEffect[] {
  if (!Array.isArray(value)) {
    return fail("TASK_COLLABORATION_INVALID");
  }

  for (const raw of value) {
    const effect = requireRecord(raw, "TASK_COLLABORATION_INVALID");
    const occurredAt = requireFiniteDate(
      effect.occurredAt,
      "TASK_COLLABORATION_INVALID",
    );
    const validBase =
      isNonEmptyString(effect.collaborationId) &&
      isNonEmptyString(effect.taskId) &&
      isNonEmptyString(effect.sourceAssignmentId) &&
      isRegisteredResponsibilityCode(effect.responsibilityCode) &&
      isNonEmptyString(effect.ownerUserId) &&
      isNonEmptyString(effect.collaboratorUserId) &&
      isNonEmptyString(effect.actorId) &&
      isPositiveInteger(effect.generation) &&
      effect.collaboratorUserId !== effect.ownerUserId;
    if (!validBase) {
      return fail("TASK_COLLABORATION_INVALID");
    }

    const acceptsNoConflicting = (keys: readonly string[]): boolean =>
      keys.every((key) => !(key in effect) || effect[key] === null);

    const validType =
      (effect.type === "RESPONSIBILITY_COLLABORATION_INVITED" &&
        effect.actorId === effect.ownerUserId &&
        isReason(effect.invitationReason) &&
        isFiniteDate(effect.invitedAt) &&
        acceptsNoConflicting(["acceptedAt", "endedAt", "decisionReason", "endReason"]) &&
        occurredAt.getTime() === effect.invitedAt.getTime()) ||
      (effect.type === "RESPONSIBILITY_COLLABORATION_ACCEPTED" &&
        effect.actorId === effect.collaboratorUserId &&
        isFiniteDate(effect.acceptedAt) &&
        acceptsNoConflicting(["endedAt", "decisionReason", "endReason"]) &&
        occurredAt.getTime() === effect.acceptedAt.getTime()) ||
      (effect.type === "RESPONSIBILITY_COLLABORATION_REJECTED" &&
        effect.actorId === effect.collaboratorUserId &&
        isReason(effect.decisionReason) &&
        isFiniteDate(effect.endedAt) &&
        acceptsNoConflicting(["acceptedAt", "endReason"]) &&
        occurredAt.getTime() === effect.endedAt.getTime()) ||
      (effect.type === "RESPONSIBILITY_COLLABORATION_REMOVED" &&
        effect.actorId === effect.ownerUserId &&
        isReason(effect.endReason) &&
        isFiniteDate(effect.endedAt) &&
        typeof effect.wasActive === "boolean" &&
        acceptsNoConflicting(["decisionReason"]) &&
        occurredAt.getTime() === effect.endedAt.getTime()) ||
      (effect.type === "RESPONSIBILITY_COLLABORATION_LEFT" &&
        effect.actorId === effect.collaboratorUserId &&
        isReason(effect.endReason) &&
        isFiniteDate(effect.endedAt) &&
        acceptsNoConflicting(["decisionReason"]) &&
        occurredAt.getTime() === effect.endedAt.getTime());
    if (!validType) {
      return fail("TASK_COLLABORATION_INVALID");
    }
  }
}
