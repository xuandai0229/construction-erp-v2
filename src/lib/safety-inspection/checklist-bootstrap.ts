import type { PrismaClient } from "@prisma/client";
import {
  SAFETY_CHECKLIST_V1,
  SAFETY_CHECKLIST_V1_HASH,
  assertSafetyChecklistV1Canonical,
} from "./checklist-v1";
import {
  assertSafetyActorPermission,
  type SafetyServerActor,
} from "./mutation-actor";

export type BootstrapSafetyChecklistV1Input = {
  correlationId: string;
  processName: string;
};

export type BootstrapSafetyChecklistV1Result = {
  templateId: string;
  canonicalHash: string;
  created: boolean;
  activated: boolean;
};

export async function bootstrapSafetyChecklistV1(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: BootstrapSafetyChecklistV1Input,
): Promise<BootstrapSafetyChecklistV1Result> {
  assertSafetyActorPermission(actor, "safety.template.manage");
  assertSafetyChecklistV1Canonical();
  if (!input.correlationId.trim() || !input.processName.trim()) {
    throw new Error("Thông tin audit bootstrap checklist không hợp lệ.");
  }

  return client.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${"SAFETY_COMPANY_V1"}, 0))::text`;
      const existing = await tx.safetyChecklistTemplate.findUnique({
        where: {
          code_version: {
            code: SAFETY_CHECKLIST_V1.code,
            version: SAFETY_CHECKLIST_V1.version,
          },
        },
      });

      if (
        existing &&
        existing.canonicalHash !== SAFETY_CHECKLIST_V1_HASH
      ) {
        throw new Error(
          "Checklist SAFETY_COMPANY_V1 cùng version đã tồn tại nhưng khác SHA-256; không được cập nhật âm thầm.",
        );
      }

      await tx.safetyChecklistTemplate.updateMany({
        where: {
          code: SAFETY_CHECKLIST_V1.code,
          isActive: true,
          ...(existing ? { id: { not: existing.id } } : {}),
        },
        data: { isActive: false },
      });

      const template =
        existing ??
        (await tx.safetyChecklistTemplate.create({
          data: {
            code: SAFETY_CHECKLIST_V1.code,
            version: SAFETY_CHECKLIST_V1.version,
            name: SAFETY_CHECKLIST_V1.name,
            canonicalHash: SAFETY_CHECKLIST_V1_HASH,
            effectiveFrom: new Date(
              `${SAFETY_CHECKLIST_V1.effectiveFrom}T00:00:00.000Z`,
            ),
            isActive: false,
            isLocked: true,
            createdById: actor.id,
            sections: {
              create: SAFETY_CHECKLIST_V1.sections.map((section) => ({
                code: section.code,
                title: section.title,
                sortOrder: section.sortOrder,
                constructionTypes: section.constructionTypes,
                items: {
                  create: section.items.map((item) => ({
                    code: item.code,
                    sourceText: item.sourceText,
                    normalizedLabel: item.normalizedLabel,
                    sourceDocument: item.sourceDocument,
                    sourceReference: item.sourceReference,
                    reportItemNumbers: item.reportItemNumbers,
                    constructionTypes: item.constructionTypes,
                    sortOrder: item.sortOrder,
                    requiresFindingWhenFail:
                      item.requiresFindingWhenFail,
                  })),
                },
              })),
            },
          },
        }));

      const activated = !template.isActive;
      if (activated) {
        await tx.safetyChecklistTemplate.update({
          where: { id: template.id },
          data: { isActive: true, isLocked: true },
        });
      }

      await tx.safetyAuditLog.create({
        data: {
          aggregateType: "CHECKLIST_TEMPLATE",
          aggregateId: template.id,
          action: existing
            ? activated
              ? "CHECKLIST_V1_REACTIVATED"
              : "CHECKLIST_V1_REPLAYED"
            : "CHECKLIST_V1_BOOTSTRAPPED",
          actorId: actor.id,
          correlationId: input.correlationId,
          afterData: {
            canonicalHash: SAFETY_CHECKLIST_V1_HASH,
            processName: input.processName,
            code: SAFETY_CHECKLIST_V1.code,
            version: SAFETY_CHECKLIST_V1.version,
          },
        },
      });

      return {
        templateId: template.id,
        canonicalHash: SAFETY_CHECKLIST_V1_HASH,
        created: existing === null,
        activated,
      };
    },
    { isolationLevel: "Serializable" },
  );
}
