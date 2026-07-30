import { Prisma, PrismaClient } from "@prisma/client";
import {
  assertSafetySessionSourceInvariant,
} from "./inspection-domain";
import {
  assertSafetyActorPermission,
  assertSafetyActorProjectScope,
  type SafetyServerActor,
} from "./mutation-actor";

export type CreateSafetySessionInput = {
  clientMutationId: string;
  checklistTemplateId: string;
  occurredAt: Date;
  shift: "MORNING" | "AFTERNOON" | "EVENING";
  location: string | null;
  source:
    | {
        kind: "SCHEDULED";
        scheduleId: string;
        expectedScheduleVersion: number;
      }
    | {
        kind: "UNPLANNED";
        projectId: string;
        constructionType:
          | "BUILDING"
          | "DRAINAGE_INFRASTRUCTURE"
          | "OTHER";
        reason: string;
      };
};

export async function createSafetyInspectionSession(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: CreateSafetySessionInput,
): Promise<{ sessionId: string }> {
  assertSafetyActorPermission(actor, "safety.session.start");

  return client.$transaction(
    async (tx) => {
      const template = await tx.safetyChecklistTemplate.findUnique({
        where: { id: input.checklistTemplateId },
        select: { id: true, isActive: true, isLocked: true },
      });
      if (!template || !template.isActive || !template.isLocked) {
        throw new Error("Checklist phiên kiểm tra chưa được kích hoạt và khóa.");
      }

      let planId: string | null = null;
      let scheduleId: string | null = null;
      let projectId: string;
      let constructionType:
        | "BUILDING"
        | "DRAINAGE_INFRASTRUCTURE"
        | "OTHER";
      let unplannedReason: string | null = null;

      if (input.source.kind === "SCHEDULED") {
        const schedule = await tx.safetyInspectionSchedule.findUnique({
          where: { id: input.source.scheduleId },
        });
        if (!schedule) throw new Error("Lịch kiểm tra không tồn tại.");
        if (schedule.version !== input.source.expectedScheduleVersion) {
          throw new Error("Lịch kiểm tra đã thay đổi, vui lòng tải lại.");
        }
        assertSafetyActorProjectScope(actor, schedule.projectId);
        assertSafetySessionSourceInvariant({
          schedule: {
            planId: schedule.planId,
            projectId: schedule.projectId,
            scheduledDate: schedule.scheduledDate
              .toISOString()
              .slice(0, 10),
            constructionType: schedule.constructionType,
          },
          planId: schedule.planId,
          projectId: schedule.projectId,
          occurredAt: input.occurredAt,
          constructionType: schedule.constructionType,
          unplannedReason: null,
          canInspectUnplanned: false,
          projectAllowed: true,
        });
        planId = schedule.planId;
        scheduleId = schedule.id;
        projectId = schedule.projectId;
        constructionType = schedule.constructionType;
      } else {
        assertSafetyActorPermission(actor, "safety.inspection.unplanned");
        assertSafetyActorProjectScope(actor, input.source.projectId);
        assertSafetySessionSourceInvariant({
          schedule: null,
          planId: null,
          projectId: input.source.projectId,
          occurredAt: input.occurredAt,
          constructionType: input.source.constructionType,
          unplannedReason: input.source.reason,
          canInspectUnplanned: true,
          projectAllowed: true,
        });
        projectId = input.source.projectId;
        constructionType = input.source.constructionType;
        unplannedReason = input.source.reason.trim();
      }

      const session = await tx.safetyInspectionSession.create({
        data: {
          scheduleId,
          planId,
          projectId,
          checklistTemplateId: input.checklistTemplateId,
          occurredAt: input.occurredAt,
          shift: input.shift,
          location: input.location,
          constructionType,
          inspectorId: actor.id,
          status: "DRAFT",
          unplannedReason,
        },
      });
      await tx.safetyAuditLog.create({
        data: {
          projectId,
          aggregateType: "SESSION",
          aggregateId: session.id,
          action:
            input.source.kind === "UNPLANNED"
              ? "CREATE_UNPLANNED_SESSION"
              : "CREATE_SCHEDULED_SESSION",
          afterData: {
            scheduleId,
            planId,
            checklistTemplateId: input.checklistTemplateId,
            unplannedReason,
          },
          actorId: actor.id,
          correlationId: input.clientMutationId,
        },
      });
      return { sessionId: session.id };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
