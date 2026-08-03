import prisma from "./prisma";
import type { UserRole } from "@prisma/client";
import { sanitizeAuditData } from "./audit-sanitizer";

export { sanitizeAuditData };

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
