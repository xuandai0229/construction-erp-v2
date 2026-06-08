import prisma from './prisma';

export async function writeAuditLog({
  userId,
  projectId,
  action,
  entityType,
  entityId,
  beforeData,
  afterData,
  ipAddress,
  userAgent,
}: {
  userId?: string;
  projectId?: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeData?: unknown;
  afterData?: unknown;
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.auditLog.create({
    data: {
      userId,
      projectId,
      action,
      entityType,
      entityId,
      beforeData: beforeData ? JSON.stringify(beforeData) : null,
      afterData: afterData ? JSON.stringify(afterData) : null,
      ipAddress,
      userAgent,
    },
  });
}
