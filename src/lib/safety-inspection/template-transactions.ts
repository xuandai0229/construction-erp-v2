import { Prisma, PrismaClient } from "@prisma/client";
import {
  assertSafetyActorPermission,
  type SafetyServerActor,
} from "./mutation-actor";

async function advisoryLock(
  tx: Prisma.TransactionClient,
  key: string,
): Promise<void> {
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))::text AS "locked"
  `;
}

export async function activateSafetyChecklistTemplate(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: { templateId: string; clientMutationId: string },
): Promise<void> {
  assertSafetyActorPermission(actor, "safety.template.manage");
  await client.$transaction(
    async (tx) => {
      const template = await tx.safetyChecklistTemplate.findUnique({
        where: { id: input.templateId },
      });
      if (!template) throw new Error("Mẫu checklist không tồn tại.");
      await advisoryLock(tx, `safety-checklist-template:${template.code}`);
      await tx.safetyChecklistTemplate.updateMany({
        where: { code: template.code, isActive: true },
        data: { isActive: false },
      });
      await tx.safetyChecklistTemplate.update({
        where: { id: template.id },
        data: { isActive: true, isLocked: true },
      });
      await tx.safetyAuditLog.create({
        data: {
          aggregateType: "CHECKLIST_TEMPLATE",
          aggregateId: template.id,
          action: "ACTIVATE_CHECKLIST_TEMPLATE",
          afterData: { code: template.code, version: template.version },
          actorId: actor.id,
          correlationId: input.clientMutationId,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}

export async function activateSafetyDocumentTemplate(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: { templateId: string; clientMutationId: string },
): Promise<void> {
  assertSafetyActorPermission(actor, "safety.template.manage");
  await client.$transaction(
    async (tx) => {
      const template = await tx.safetyDocumentTemplate.findUnique({
        where: { id: input.templateId },
      });
      if (!template) throw new Error("Mẫu tài liệu không tồn tại.");
      await advisoryLock(
        tx,
        `safety-document-template:${template.templateType}`,
      );
      await tx.safetyDocumentTemplate.updateMany({
        where: { templateType: template.templateType, isActive: true },
        data: { isActive: false },
      });
      await tx.safetyDocumentTemplate.update({
        where: { id: template.id },
        data: { isActive: true },
      });
      await tx.safetyAuditLog.create({
        data: {
          aggregateType: "DOCUMENT_TEMPLATE",
          aggregateId: template.id,
          action: "ACTIVATE_DOCUMENT_TEMPLATE",
          afterData: {
            templateType: template.templateType,
            version: template.version,
          },
          actorId: actor.id,
          correlationId: input.clientMutationId,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted },
  );
}
