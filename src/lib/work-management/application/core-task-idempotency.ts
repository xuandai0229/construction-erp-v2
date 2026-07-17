import { createHash } from "node:crypto";
import type { CoreTaskAggregate } from "./core-task-executor";
import type { CoreTaskEffects } from "./core-task-effects";
import type { CoreTaskAction } from "./core-task-executor";

export type StableCoreTaskExecutionResult = { task: CoreTaskAggregate; effects: CoreTaskEffects };
export type IdempotencyRequest = { action: CoreTaskAction; key: string; fingerprint: string; actorId: string; companyId: string | null; taskId: string | null; projectId: string | null };
export type IdempotencyInspection =
  | { status: "PROCEED" }
  | { status: "REPLAY"; identity: IdempotencyRequest; result: StableCoreTaskExecutionResult }
  | { status: "CONFLICT" }
  | { status: "IN_PROGRESS" };

export interface IdempotencyIntegrationPort {
  inspect(request: IdempotencyRequest): Promise<IdempotencyInspection>;
  begin(request: IdempotencyRequest): Promise<void>;
  complete(request: IdempotencyRequest, result: StableCoreTaskExecutionResult): Promise<void>;
  abort(request: IdempotencyRequest, reason: string): Promise<void>;
}

/** The one canonical equality model for a reserved idempotency key. */
export function sameIdempotencyIdentity(
  left: IdempotencyRequest,
  right: IdempotencyRequest,
): boolean {
  return left.key === right.key
    && left.action === right.action
    && left.actorId === right.actorId
    && left.companyId === right.companyId
    && left.taskId === right.taskId
    && left.projectId === right.projectId
    && left.fingerprint === right.fingerprint;
}

function canonical(value: unknown): string {
  if (value === null) return "null";
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("non-finite idempotency value");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value === "object") {
    const record = value as Readonly<Record<string, unknown>>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
  }
  throw new TypeError("non-serializable idempotency value");
}

export function canonicalIdempotencyFingerprint(input: {
  action: CoreTaskAction;
  command: Readonly<Record<string, unknown>>;
  actorId: string;
  companyId: string | null;
  taskId: string | null;
  projectId: string | null;
}): string {
  return createHash("sha256").update(canonical(input)).digest("hex");
}
