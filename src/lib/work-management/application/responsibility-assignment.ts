import { WorkManagementDomainError } from "../errors/codes";
import { requireExactObject } from "../validation/exact-object";

export type ResponsibilityCardinality = "SINGLE" | "MULTIPLE";
export type ResponsibilityAssignmentStatus = "ACTIVE" | "SUPERSEDED" | "REVOKED";

export type ResponsibilityDefinition = Readonly<{
  code: string;
  cardinality: ResponsibilityCardinality;
  description: string;
}>;

export const RESPONSIBILITY_REGISTRY: readonly ResponsibilityDefinition[] = Object.freeze([
  Object.freeze({
    code: "TASK_OWNER",
    cardinality: "SINGLE",
    description: "Explicit accountable owner register entry.",
  }),
  Object.freeze({
    code: "TASK_CONTRIBUTOR",
    cardinality: "MULTIPLE",
    description: "Explicit contributing responsibility register entry.",
  }),
]);

export type ResponsibilityAssignmentRecord = Readonly<{
  id: string;
  taskId: string;
  responsibilityCode: string;
  responsibleUserId: string;
  assignedById: string;
  generation: number;
  status: ResponsibilityAssignmentStatus;
  effectiveAt: Date;
  endedAt: Date | null;
  reason: string | null;
  supersedesAssignmentId: string | null;
}>;

export type ResponsibilityAssignmentSnapshot = Readonly<{
  taskId: string;
  version: number;
  assignments: readonly ResponsibilityAssignmentRecord[];
}>;

export type ResponsibilityAssignedEffect = Readonly<{
  type: "RESPONSIBILITY_ASSIGNED";
  assignmentId: string;
  taskId: string;
  responsibilityCode: string;
  responsibleUserId: string;
  assignedById: string;
  actorId: string;
  generation: number;
  previousAssignmentId: null;
  occurredAt: Date;
}>;

export type ResponsibilityReplacedEffect = Readonly<{
  type: "RESPONSIBILITY_REPLACED";
  assignmentId: string;
  taskId: string;
  responsibilityCode: string;
  responsibleUserId: string;
  previousResponsibleUserId: string;
  assignedById: string;
  actorId: string;
  generation: number;
  previousAssignmentId: string;
  occurredAt: Date;
}>;

export type ResponsibilityRevokedEffect = Readonly<{
  type: "RESPONSIBILITY_REVOKED";
  assignmentId: string;
  taskId: string;
  responsibilityCode: string;
  responsibleUserId: string;
  originalAssignedById: string;
  actorId: string;
  generation: number;
  previousAssignmentId: null;
  occurredAt: Date;
}>;

export type ResponsibilityEffect =
  | ResponsibilityAssignedEffect
  | ResponsibilityReplacedEffect
  | ResponsibilityRevokedEffect;

export type AssignResponsibilityCommand = Readonly<{
  snapshot: ResponsibilityAssignmentSnapshot;
  id: string;
  responsibilityCode: string;
  responsibleUserId: string;
  actorId: string;
  at: Date;
  reason?: string | null;
}>;

export type ReplaceResponsibilityCommand = AssignResponsibilityCommand;

export type RevokeResponsibilityCommand = Readonly<{
  snapshot: ResponsibilityAssignmentSnapshot;
  assignmentId: string;
  actorId: string;
  at: Date;
  reason?: string | null;
}>;

export type ResponsibilityOperationResult = Readonly<{
  snapshot: ResponsibilityAssignmentSnapshot;
  effects: readonly ResponsibilityEffect[];
}>;

const clone = <T>(value: T): T => structuredClone(value);

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export const isValidDate = (value: unknown): value is Date =>
  value instanceof Date && Number.isFinite(value.getTime());

export const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isValidReason = (value: unknown): value is string | null =>
  value === null || isNonEmptyString(value);

const isRecordObject = (
  value: unknown,
): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isResponsibilityCardinality = (
  value: unknown,
): value is ResponsibilityCardinality => value === "SINGLE" || value === "MULTIPLE";

export const isResponsibilityStatus = (
  value: unknown,
): value is ResponsibilityAssignmentStatus =>
  value === "ACTIVE" || value === "SUPERSEDED" || value === "REVOKED";

const isNonNegativeInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;

const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const codeError = (): never => {
  throw new WorkManagementDomainError("TASK_RESPONSIBILITY_CODE_INVALID");
};

const historyError = (): never => {
  throw new WorkManagementDomainError("TASK_RESPONSIBILITY_HISTORY_INVALID");
};

const assignmentError = (): never => {
  throw new WorkManagementDomainError("TASK_RESPONSIBILITY_ASSIGNMENT_INVALID");
};

export function validateResponsibilityRegistry(
  registry: unknown,
): asserts registry is readonly ResponsibilityDefinition[] {
  if (!Array.isArray(registry)) return codeError();

  const codes = new Set<string>();
  for (const candidate of registry) {
    if (!isRecordObject(candidate)) return codeError();
    const { code, cardinality, description } = candidate;
    if (
      !isNonEmptyString(code) ||
      !isNonEmptyString(description) ||
      !isResponsibilityCardinality(cardinality) ||
      codes.has(code)
    ) {
      return codeError();
    }
    codes.add(code);
  }
}

const definition = (code: unknown): ResponsibilityDefinition => {
  if (!isNonEmptyString(code)) return codeError();
  validateResponsibilityRegistry(RESPONSIBILITY_REGISTRY);
  const found = RESPONSIBILITY_REGISTRY.find((item) => item.code === code);
  if (!found) return codeError();
  return found;
};

const parseRecord = (
  value: unknown,
  snapshotTaskId: string,
  previousGeneration: number,
  ids: ReadonlySet<string>,
): ResponsibilityAssignmentRecord => {
  if (!isRecordObject(value)) return historyError();
  const {
    id,
    taskId,
    responsibilityCode,
    responsibleUserId,
    assignedById,
    generation,
    status,
    effectiveAt,
    endedAt,
    reason,
    supersedesAssignmentId,
  } = value;

  if (!isNonEmptyString(id) || ids.has(id) || taskId !== snapshotTaskId) return historyError();
  if (!isNonEmptyString(responsibleUserId) || !isNonEmptyString(assignedById)) {
    return historyError();
  }
  if (!isPositiveInteger(generation) || generation !== previousGeneration + 1) {
    return historyError();
  }
  if (!isNonEmptyString(responsibilityCode)) return historyError();
  if (!isResponsibilityStatus(status) || !isValidDate(effectiveAt)) return historyError();
  if (!isValidReason(reason)) return historyError();
  if (!(supersedesAssignmentId === null || isNonEmptyString(supersedesAssignmentId))) {
    return historyError();
  }

  definition(responsibilityCode);

  let validatedEndedAt: Date | null;
  if (status === "ACTIVE") {
    if (endedAt !== null) return historyError();
    validatedEndedAt = null;
  } else {
    if (!isValidDate(endedAt) || endedAt.getTime() < effectiveAt.getTime()) {
      return historyError();
    }
    validatedEndedAt = endedAt;
  }

  return {
    id,
    taskId,
    responsibilityCode,
    responsibleUserId,
    assignedById,
    generation,
    status,
    effectiveAt: clone(effectiveAt),
    endedAt: validatedEndedAt === null ? null : clone(validatedEndedAt),
    reason,
    supersedesAssignmentId,
  };
};

export function validateResponsibilityAssignmentSnapshot(
  snapshot: unknown,
): asserts snapshot is ResponsibilityAssignmentSnapshot {
  if (!isRecordObject(snapshot)) return historyError();
  const { taskId, version, assignments } = snapshot;
  if (!isNonEmptyString(taskId)) return historyError();
  if (!isNonNegativeInteger(version)) return historyError();
  if (!Array.isArray(assignments)) return historyError();

  const ids = new Set<string>();
  const records: ResponsibilityAssignmentRecord[] = [];
  let previousGeneration = 0;
  for (const candidate of assignments) {
    const record = parseRecord(candidate, taskId, previousGeneration, ids);
    ids.add(record.id);
    previousGeneration = record.generation;
    records.push(record);
  }

  const activeByCode = new Map<string, ResponsibilityAssignmentRecord[]>();
  for (const record of records.filter((item) => item.status === "ACTIVE")) {
    const entries = activeByCode.get(record.responsibilityCode) ?? [];
    if (entries.some((entry) => entry.responsibleUserId === record.responsibleUserId)) {
      throw new WorkManagementDomainError("TASK_RESPONSIBILITY_ALREADY_ACTIVE");
    }
    entries.push(record);
    activeByCode.set(record.responsibilityCode, entries);
  }

  for (const [code, entries] of activeByCode) {
    if (definition(code).cardinality === "SINGLE" && entries.length > 1) {
      throw new WorkManagementDomainError(
        "TASK_RESPONSIBILITY_CARDINALITY_CONFLICT",
      );
    }
  }

  const recordsById = new Map(records.map((record) => [record.id, record]));
  const replacementCount = new Map<string, number>();
  for (const record of records) {
    if (record.supersedesAssignmentId === null) continue;
    const previous = recordsById.get(record.supersedesAssignmentId);
    if (
      record.supersedesAssignmentId === record.id ||
      previous === undefined ||
      previous.generation >= record.generation ||
      previous.taskId !== record.taskId ||
      previous.responsibilityCode !== record.responsibilityCode ||
      previous.status !== "SUPERSEDED"
    ) {
      return historyError();
    }
    const count = (replacementCount.get(previous.id) ?? 0) + 1;
    if (count > 1) return historyError();
    replacementCount.set(previous.id, count);
  }

  for (const record of records) {
    if (record.status === "SUPERSEDED" && replacementCount.get(record.id) !== 1) {
      return historyError();
    }
  }
}

const active = (
  snapshot: ResponsibilityAssignmentSnapshot,
  code: string,
): readonly ResponsibilityAssignmentRecord[] =>
  snapshot.assignments.filter(
    (item) => item.status === "ACTIVE" && item.responsibilityCode === code,
  );

const next = (
  snapshot: ResponsibilityAssignmentSnapshot,
  assignments: readonly ResponsibilityAssignmentRecord[],
): ResponsibilityAssignmentSnapshot => ({
  taskId: snapshot.taskId,
  version: snapshot.version + 1,
  assignments: clone(assignments),
});

const requireReason = (value: unknown): string | null => {
  if (!isValidReason(value)) return assignmentError();
  return value;
};

const parseAssignCommand = (value: unknown): AssignResponsibilityCommand => {
  const input = requireExactObject(value, {
    requiredKeys: ["snapshot", "id", "responsibilityCode", "responsibleUserId", "actorId", "at"],
    optionalKeys: ["reason"],
  }, assignmentError);
  const { snapshot, id, responsibilityCode, responsibleUserId, actorId, at } = input;
  const reason = "reason" in input ? input.reason : null;
  if (
    !isRecordObject(snapshot) ||
    !isNonEmptyString(id) ||
    !isNonEmptyString(responsibilityCode) ||
    !isNonEmptyString(responsibleUserId) ||
    !isNonEmptyString(actorId) ||
    !isValidDate(at)
  ) {
    return assignmentError();
  }
  validateResponsibilityAssignmentSnapshot(snapshot);
  return {
    snapshot: clone(snapshot),
    id,
    responsibilityCode,
    responsibleUserId,
    actorId,
    at: clone(at),
    reason: requireReason(reason),
  };
};

const parseRevokeCommand = (value: unknown): RevokeResponsibilityCommand => {
  const input = requireExactObject(value, {
    requiredKeys: ["snapshot", "assignmentId", "actorId", "at"],
    optionalKeys: ["reason"],
  }, assignmentError);
  const { snapshot, assignmentId, actorId, at } = input;
  const reason = "reason" in input ? input.reason : null;
  if (
    !isRecordObject(snapshot) ||
    !isNonEmptyString(assignmentId) ||
    !isNonEmptyString(actorId) ||
    !isValidDate(at)
  ) {
    return assignmentError();
  }
  validateResponsibilityAssignmentSnapshot(snapshot);
  return {
    snapshot: clone(snapshot),
    assignmentId,
    actorId,
    at: clone(at),
    reason: requireReason(reason),
  };
};

export function validateResponsibilityEffects(
  value: unknown,
): asserts value is readonly ResponsibilityEffect[] {
  if (!Array.isArray(value)) return assignmentError();
  for (const candidate of value) {
    if (!isRecordObject(candidate)) return assignmentError();
    const {
      type,
      assignmentId,
      taskId,
      responsibilityCode,
      responsibleUserId,
      actorId,
      generation,
      previousAssignmentId,
      occurredAt,
    } = candidate;
    if (!isNonEmptyString(assignmentId) || !isNonEmptyString(taskId)) {
      return assignmentError();
    }
    if (!isNonEmptyString(responsibleUserId) || !isNonEmptyString(actorId)) {
      return assignmentError();
    }
    if (!isPositiveInteger(generation) || !isValidDate(occurredAt)) {
      return assignmentError();
    }
    definition(responsibilityCode);
    if (type === "RESPONSIBILITY_ASSIGNED") {
      if (!isNonEmptyString(candidate.assignedById) || previousAssignmentId !== null) {
        return assignmentError();
      }
    } else if (type === "RESPONSIBILITY_REPLACED") {
      if (
        !isNonEmptyString(candidate.assignedById) ||
        !isNonEmptyString(candidate.previousResponsibleUserId) ||
        !isNonEmptyString(previousAssignmentId)
      ) {
        return assignmentError();
      }
    } else if (type === "RESPONSIBILITY_REVOKED") {
      if (
        !isNonEmptyString(candidate.originalAssignedById) ||
        previousAssignmentId !== null
      ) {
        return assignmentError();
      }
    } else {
      return assignmentError();
    }
  }
}

const result = (
  snapshot: ResponsibilityAssignmentSnapshot,
  effects: readonly ResponsibilityEffect[],
): ResponsibilityOperationResult => {
  validateResponsibilityAssignmentSnapshot(snapshot);
  validateResponsibilityEffects(effects);
  return { snapshot: clone(snapshot), effects: clone(effects) };
};

export function assignResponsibility(value: unknown): ResponsibilityOperationResult {
  const input = parseAssignCommand(value);
  validateResponsibilityAssignmentSnapshot(input.snapshot);
  const rule = definition(input.responsibilityCode);
  const current = active(input.snapshot, rule.code);

  if (input.snapshot.assignments.some((item) => item.id === input.id)) historyError();
  if (current.some((item) => item.responsibleUserId === input.responsibleUserId)) {
    throw new WorkManagementDomainError("TASK_RESPONSIBILITY_ALREADY_ACTIVE");
  }
  if (rule.cardinality === "SINGLE" && current.length > 0) {
    throw new WorkManagementDomainError("TASK_RESPONSIBILITY_CARDINALITY_CONFLICT");
  }

  const record: ResponsibilityAssignmentRecord = {
    id: input.id,
    taskId: input.snapshot.taskId,
    responsibilityCode: rule.code,
    responsibleUserId: input.responsibleUserId,
    assignedById: input.actorId,
    generation: input.snapshot.assignments.length + 1,
    status: "ACTIVE",
    effectiveAt: clone(input.at),
    endedAt: null,
    reason: input.reason ?? null,
    supersedesAssignmentId: null,
  };
  const output = next(input.snapshot, [...input.snapshot.assignments, record]);
  return result(output, [
    {
      type: "RESPONSIBILITY_ASSIGNED",
      assignmentId: record.id,
      taskId: record.taskId,
      responsibilityCode: record.responsibilityCode,
      responsibleUserId: record.responsibleUserId,
      assignedById: record.assignedById,
      actorId: input.actorId,
      generation: record.generation,
      previousAssignmentId: null,
      occurredAt: clone(input.at),
    },
  ]);
}

export function replaceResponsibility(value: unknown): ResponsibilityOperationResult {
  const input = parseAssignCommand(value);
  validateResponsibilityAssignmentSnapshot(input.snapshot);
  const rule = definition(input.responsibilityCode);
  const current = active(input.snapshot, rule.code);

  if (rule.cardinality !== "SINGLE" || current.length !== 1) {
    throw new WorkManagementDomainError("TASK_RESPONSIBILITY_NOT_ACTIVE");
  }
  const previous = current[0];
  if (previous.responsibleUserId === input.responsibleUserId) {
    throw new WorkManagementDomainError("TASK_RESPONSIBILITY_ALREADY_ACTIVE");
  }
  if (input.snapshot.assignments.some((item) => item.id === input.id)) historyError();
  if (input.at.getTime() < previous.effectiveAt.getTime()) assignmentError();

  const closed: ResponsibilityAssignmentRecord = {
    ...previous,
    status: "SUPERSEDED",
    endedAt: clone(input.at),
  };
  const record: ResponsibilityAssignmentRecord = {
    id: input.id,
    taskId: input.snapshot.taskId,
    responsibilityCode: rule.code,
    responsibleUserId: input.responsibleUserId,
    assignedById: input.actorId,
    generation: input.snapshot.assignments.length + 1,
    status: "ACTIVE",
    effectiveAt: clone(input.at),
    endedAt: null,
    reason: input.reason ?? null,
    supersedesAssignmentId: previous.id,
  };
  const output = next(
    input.snapshot,
    input.snapshot.assignments.map((item) => (item.id === previous.id ? closed : item)).concat(record),
  );
  return result(output, [
    {
      type: "RESPONSIBILITY_REPLACED",
      assignmentId: record.id,
      taskId: record.taskId,
      responsibilityCode: record.responsibilityCode,
      responsibleUserId: record.responsibleUserId,
      previousResponsibleUserId: previous.responsibleUserId,
      assignedById: record.assignedById,
      actorId: input.actorId,
      generation: record.generation,
      previousAssignmentId: previous.id,
      occurredAt: clone(input.at),
    },
  ]);
}

export function revokeResponsibility(value: unknown): ResponsibilityOperationResult {
  const input = parseRevokeCommand(value);
  validateResponsibilityAssignmentSnapshot(input.snapshot);
  const record = input.snapshot.assignments.find((item) => item.id === input.assignmentId);
  if (record === undefined || record.status !== "ACTIVE") {
    throw new WorkManagementDomainError("TASK_RESPONSIBILITY_NOT_ACTIVE");
  }
  if (input.at.getTime() < record.effectiveAt.getTime()) assignmentError();

  const closed: ResponsibilityAssignmentRecord = {
    ...record,
    status: "REVOKED",
    endedAt: clone(input.at),
    reason: input.reason ?? null,
  };
  const output = next(
    input.snapshot,
    input.snapshot.assignments.map((item) => (item.id === record.id ? closed : item)),
  );
  return result(output, [
    {
      type: "RESPONSIBILITY_REVOKED",
      assignmentId: record.id,
      taskId: record.taskId,
      responsibilityCode: record.responsibilityCode,
      responsibleUserId: record.responsibleUserId,
      originalAssignedById: record.assignedById,
      actorId: input.actorId,
      generation: record.generation,
      previousAssignmentId: null,
      occurredAt: clone(input.at),
    },
  ]);
}
