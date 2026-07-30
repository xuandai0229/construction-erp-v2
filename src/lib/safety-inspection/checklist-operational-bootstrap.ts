import type { PrismaClient } from "@prisma/client";
import {
  SAFETY_OPERATIONAL_CHECKLIST_V2,
  SAFETY_OPERATIONAL_CHECKLIST_V2_HASH,
  assertSafetyOperationalChecklistV2Canonical,
  getSafetyV1SourceItem,
} from "./checklist-operational-v2";
import {
  assertSafetyActorPermission,
  type SafetyServerActor,
} from "./mutation-actor";

export type BootstrapSafetyOperationalV2Input = {
  correlationId: string;
  processName: string;
};

export async function bootstrapSafetyOperationalV2(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: BootstrapSafetyOperationalV2Input,
): Promise<{
  templateId: string;
  canonicalHash: string;
  created: boolean;
  activated: boolean;
}> {
  assertSafetyActorPermission(actor, "safety.template.manage");
  assertSafetyOperationalChecklistV2Canonical();
  if (!input.correlationId.trim() || !input.processName.trim()) {
    throw new Error("Thông tin audit bootstrap checklist không hợp lệ.");
  }

  return client.$transaction(
    async (tx) => {
      const definition = SAFETY_OPERATIONAL_CHECKLIST_V2;
      await tx.$queryRaw`
        SELECT pg_advisory_xact_lock(hashtextextended(${"SAFETY_COMPANY_V1:OPERATIONAL"}, 0))::text
      `;
      const existing = await tx.safetyChecklistTemplate.findUnique({
        where: {
          code_version: {
            code: definition.code,
            version: definition.version,
          },
        },
      });
      if (
        existing &&
        existing.canonicalHash !== SAFETY_OPERATIONAL_CHECKLIST_V2_HASH
      ) {
        throw new Error(
          "Checklist operational cùng code/version đã tồn tại nhưng khác SHA-256.",
        );
      }

      let template = existing;
      if (!template) {
        template = await tx.safetyChecklistTemplate.create({
          data: {
            code: definition.code,
            version: definition.version,
            name: definition.name,
            canonicalHash: SAFETY_OPERATIONAL_CHECKLIST_V2_HASH,
            effectiveFrom: new Date(
              `${definition.effectiveFrom}T00:00:00.000Z`,
            ),
            isActive: false,
            isLocked: true,
            createdById: actor.id,
            sections: {
              create: definition.sections.map((section) => ({
                code: section.code,
                title: section.title,
                sortOrder: section.sortOrder,
                constructionTypes: [
                  ...new Set(
                    section.items.flatMap(
                      (item) => item.constructionTypes,
                    ),
                  ),
                ],
                items: {
                  create: section.items.map((item) => {
                    const sources = item.sourceItemCodes.map(
                      (code, index) => {
                        const source = getSafetyV1SourceItem(code);
                        if (!source) {
                          throw new Error(
                            `Không tìm thấy dòng nguồn đã khóa ${code}.`,
                          );
                        }
                        return { source, index };
                      },
                    );
                    const primary = sources[0]?.source;
                    if (!primary) {
                      throw new Error(
                        `Operational item ${item.code} chưa có nguồn.`,
                      );
                    }
                    return {
                      code: item.code,
                      sourceText: primary.sourceText,
                      normalizedLabel: item.normalizedLabel,
                      sourceDocument: primary.sourceDocument,
                      sourceReference: primary.sourceReference,
                      reportItemNumbers: item.reportCategoryCodes.map(
                        (code) => Number(code.slice(3)),
                      ),
                      constructionTypes: item.constructionTypes,
                      sortOrder: item.sortOrder,
                      requiresFindingWhenFail:
                        item.requiresFindingWhenFail,
                      isRequired: item.isRequired,
                      isScored: item.isScored,
                      sources: {
                        create: sources.map(({ source, index }) => ({
                          sourceItemCode: source.code,
                          sourceDocument: source.sourceDocument,
                          sourceReference: source.sourceReference,
                          sourceText: source.sourceText,
                          sortOrder: index,
                        })),
                      },
                    };
                  }),
                },
              })),
            },
          },
        });

        const items = await tx.safetyChecklistItem.findMany({
          where: { section: { templateId: template.id } },
          select: { id: true, code: true },
        });
        const itemIds = new Map(items.map((item) => [item.code, item.id]));
        for (const category of definition.reportCategories) {
          await tx.safetyReportCategory.create({
            data: {
              templateId: template.id,
              code: category.code,
              sourceNumber: category.sourceNumber,
              sourceText: category.sourceText,
              normalizedLabel: category.normalizedLabel,
              sortOrder: category.sortOrder,
              requiresBusinessClarification:
                category.requiresBusinessClarification,
              blocksCompletion: category.blocksCompletion,
              isScored: category.isScored,
              items: {
                create: category.mappingItemCodes.map(
                  (itemCode, sortOrder) => {
                    const checklistItemId = itemIds.get(itemCode);
                    if (!checklistItemId) {
                      throw new Error(
                        `Mapping category ${category.code} tham chiếu item không tồn tại ${itemCode}.`,
                      );
                    }
                    return {
                      checklistItemId,
                      mappingKind: "DIRECT",
                      sortOrder,
                    };
                  },
                ),
              },
            },
          });
        }
      }

      await tx.safetyChecklistTemplate.updateMany({
        where: {
          code: definition.code,
          isActive: true,
          id: { not: template.id },
        },
        data: { isActive: false },
      });
      const activated = !template.isActive;
      if (activated) {
        template = await tx.safetyChecklistTemplate.update({
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
              ? "OPERATIONAL_V2_REACTIVATED"
              : "OPERATIONAL_V2_REPLAYED"
            : "OPERATIONAL_V2_BOOTSTRAPPED",
          actorId: actor.id,
          correlationId: input.correlationId,
          afterData: {
            processName: input.processName,
            canonicalHash: SAFETY_OPERATIONAL_CHECKLIST_V2_HASH,
            sourceChecklistHash: definition.sourceChecklistHash,
            operationalItemCount: definition.sections.flatMap(
              (section) => section.items,
            ).length,
            reportCategoryCount: definition.reportCategories.length,
          },
        },
      });
      return {
        templateId: template.id,
        canonicalHash: SAFETY_OPERATIONAL_CHECKLIST_V2_HASH,
        created: existing === null,
        activated,
      };
    },
    { isolationLevel: "Serializable" },
  );
}
