import prisma from "./prisma";
import type { UserRole } from "@prisma/client";

const SENSITIVE_AUDIT_KEYS = [
  "password", "passwordhash", "token", "secret", "cookie", "authorization", "resettoken", "accesstoken", "refreshtoken", "signedurl",
  "apikey", "clientsecret", "privatekey", "sessiontoken", "csrftoken", "otp", "mfasecret", "webhooksecret", "credential", "credentials", "setcookie", "proxyauthorization",
];
const MAX_DEPTH = 8;
const MAX_COLLECTION_ITEMS = 100;
const MAX_STRING_LENGTH = 4096;

function isSensitiveAuditKey(key: string) {
  const normalized = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  return SENSITIVE_AUDIT_KEYS.some((needle) => normalized === needle || normalized.includes(needle));
}

function redactSensitiveString(value: string) {
  const credentialRedacted = value
    .replace(/\b(Bearer|Basic)\s+[^\s,;]+/gi, "$1 [REDACTED]")
    .replace(/([?&](?:token|access_token|signature|sig|x-amz-signature)=[^&#\s]*)/gi, (match) => `${match.split("=")[0]}=[REDACTED]`);
  return credentialRedacted.length > MAX_STRING_LENGTH ? `${credentialRedacted.slice(0, MAX_STRING_LENGTH)}[TRUNCATED]` : credentialRedacted;
}

/** Redacts credentials recursively before an audit JSON payload is persisted. Does not mutate its input. */
export function sanitizeAuditData(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") return redactSensitiveString(value);
  if (typeof value === "bigint") return value.toString();
  if (typeof value !== "object") return value;
  if (value instanceof Date) return value.toISOString();
  if (depth >= MAX_DEPTH) return "[TRUNCATED_DEPTH]";
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  if (Array.isArray(value)) return value.slice(0, MAX_COLLECTION_ITEMS).map((item) => sanitizeAuditData(item, depth + 1, seen));
  const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_COLLECTION_ITEMS);
  return Object.fromEntries(entries.map(([key, item]) => [key, isSensitiveAuditKey(key) ? "[REDACTED]" : sanitizeAuditData(item, depth + 1, seen)]));
}

export async function writeAuditLog({ userId, projectId, action, entityType, entityId, beforeData, afterData, ipAddress, userAgent }: {
  userId?: string; projectId?: string; action: string; entityType: string; entityId: string; beforeData?: unknown; afterData?: unknown; ipAddress?: string; userAgent?: string;
}) {
  return prisma.auditLog.create({
    data: { userId, projectId, action, entityType, entityId, beforeData: beforeData ? JSON.stringify(sanitizeAuditData(beforeData)) : null, afterData: afterData ? JSON.stringify(sanitizeAuditData(afterData)) : null, ipAddress, userAgent },
  });
}

export type SecurityAuditEventType =
  | "AUTHORIZATION_DENIED"
  | "STALE_WRITE_REJECTED"
  | "CROSS_DOSSIER_ROW_REJECTED"
  | "CROSS_PROJECT_RESOURCE_REJECTED"
  | "WEEKLY_EXPORT_DENIED"
  | "SOURCE_MUTATION_DENIED"
  | "ROLE_GRANTED"
  | "ROLE_REVOKED";

export type SecurityAuditEvent = {
  eventType: SecurityAuditEventType;
  actorId?: string;
  role?: UserRole;
  action: string;
  resourceType: string;
  resourceId: string;
  projectId?: string | null;
  reasonCode: string;
};

/** Security audit must never change the authorization result or crash a denied request. */
export async function writeSecurityAuditEvent(event: SecurityAuditEvent): Promise<void> {
  try {
    await writeAuditLog({
      userId: event.actorId,
      projectId: event.projectId ?? undefined,
      action: event.eventType,
      entityType: event.resourceType,
      entityId: event.resourceId,
      afterData: {
        actorId: event.actorId ?? null,
        role: event.role ?? null,
        requestedAction: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        projectId: event.projectId ?? null,
        reasonCode: event.reasonCode,
      },
    });
  } catch (error) {
    console.error("Security audit persistence failed", error);
  }
}
