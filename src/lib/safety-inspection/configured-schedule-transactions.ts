import { createHash } from "node:crypto";
import {
  Prisma,
  type PrismaClient,
} from "@prisma/client";
import { SafetyApiError } from "./errors";
import { assertPlanMutable } from "./inspection-domain";
import {
  assertSafetyActorPermission,
  assertSafetyActorProjectScope,
  type SafetyServerActor,
} from "./mutation-actor";
import type { SafetyScheduleMutationData } from "./scope-transactions";

export type ConfiguredScheduleData = SafetyScheduleMutationData & {
  collaboratorUserIds: string[];
  checklistItemIds: string[];
};

type AggregateReceipt = {
  scheduleId: string;
  scheduleVersion: number;
  planVersion: number;
};

async function runSerializable<T>(
  client: PrismaClient,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  try {
    return await client.$transaction(operation, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      throw new SafetyApiError(
        "SAFETY_VERSION_CONFLICT",
        "Dữ liệu lịch đã được cập nhật ở thiết bị khác.",
      );
    }
    throw error;
  }
}

function requestHash(input: object): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

function receiptFromJson(value: Prisma.JsonValue | null): AggregateReceipt {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new SafetyApiError(
      "SAFETY_INTERNAL_ERROR",
      "Biên nhận lịch kiểm tra không hợp lệ.",
    );
  }
  const scheduleId = value.scheduleId;
  const scheduleVersion = value.scheduleVersion;
  const planVersion = value.planVersion;
  if (
    typeof scheduleId !== "string" ||
    typeof scheduleVersion !== "number" ||
    typeof planVersion !== "number"
  ) {
    throw new SafetyApiError(
      "SAFETY_INTERNAL_ERROR",
      "Biên nhận lịch kiểm tra không hợp lệ.",
    );
  }
  return { scheduleId, scheduleVersion, planVersion };
}

async function lockAndReplay(
  tx: Prisma.TransactionClient,
  actorId: string,
  aggregateId: string,
  clientMutationId: string,
  hash: string,
): Promise<AggregateReceipt | null> {
  const lockKey = `${actorId}:SCHEDULE:${aggregateId}:${clientMutationId}`;
  await tx.$queryRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))::text
  `;
  const receipt = await tx.safetyIdempotency.findUnique({
    where: {
      actorId_aggregateType_aggregateId_clientMutationId: {
        actorId,
        aggregateType: "SCHEDULE",
        aggregateId,
        clientMutationId,
      },
    },
  });
  if (!receipt) return null;
  if (receipt.requestHash !== hash) {
    throw new SafetyApiError(
      "SAFETY_IDEMPOTENCY_CONFLICT",
      "Mã thao tác đã được dùng cho một nội dung lịch khác.",
    );
  }
  return receiptFromJson(receipt.resultData);
}

async function validateConfiguration(
  tx: Prisma.TransactionClient,
  projectId: string,
  constructionType: ConfiguredScheduleData["constructionType"],
  collaboratorUserIds: string[],
  checklistItemIds: string[],
) {
  const collaboratorIds = [...new Set(collaboratorUserIds)];
  const checklistIds = [...new Set(checklistItemIds)];
  const memberships = await tx.projectMember.findMany({
    where: {
      projectId,
      userId: { in: collaboratorIds },
      isActive: true,
      deletedAt: null,
      leftAt: null,
      user: { deletedAt: null },
    },
    select: { userId: true, role: true, user: { select: { name: true } } },
  });
  const template = await tx.safetyChecklistTemplate.findFirst({
    where: {
      code: "SAFETY_COMPANY_V1",
      version: 2,
      isActive: true,
      isLocked: true,
    },
    select: { id: true },
  });
  if (memberships.length !== collaboratorIds.length) {
    throw new SafetyApiError(
      "SAFETY_VALIDATION_FAILED",
      "Người phối hợp phải là thành viên đang hoạt động của công trình.",
    );
  }
  if (!template) {
    throw new SafetyApiError(
      "SAFETY_TEMPLATE_UNAVAILABLE",
      "Checklist operational V2 chưa sẵn sàng.",
    );
  }
  const items = await tx.safetyChecklistItem.findMany({
    where: {
      id: { in: checklistIds },
      isActive: true,
      section: { templateId: template.id },
      constructionTypes: { has: constructionType },
    },
    select: { id: true },
  });
  if (items.length !== checklistIds.length) {
    throw new SafetyApiError(
      "SAFETY_VALIDATION_FAILED",
      "Checklist dự kiến không thuộc operational template/loại công trình.",
    );
  }
  return { memberships, items };
}

async function reconcilePlanScope(
  tx: Prisma.TransactionClient,
  actor: SafetyServerActor,
  planId: string,
  correlationId: string,
) {
  const schedules = await tx.safetyInspectionSchedule.findMany({
    where: { planId, status: { not: "CANCELLED" } },
    select: { projectId: true },
  });
  const current = await tx.safetyInspectionPlanProject.findMany({
    where: { planId },
    select: { projectId: true },
  });
  const desired = new Set(schedules.map((schedule) => schedule.projectId));
  const existing = new Set(current.map((scope) => scope.projectId));
  for (const projectId of desired) {
    if (!existing.has(projectId)) {
      await tx.safetyInspectionPlanProject.create({
        data: { planId, projectId, addedById: actor.id },
      });
      await tx.safetyAuditLog.create({
        data: {
          projectId,
          aggregateType: "PLAN",
          aggregateId: planId,
          action: "ADD_PLAN_PROJECT_SCOPE",
          actorId: actor.id,
          correlationId,
          afterData: { projectId },
        },
      });
    }
  }
  for (const projectId of existing) {
    if (!desired.has(projectId)) {
      await tx.safetyInspectionPlanProject.delete({
        where: { planId_projectId: { planId, projectId } },
      });
      await tx.safetyAuditLog.create({
        data: {
          projectId,
          aggregateType: "PLAN",
          aggregateId: planId,
          action: "REMOVE_PLAN_PROJECT_SCOPE",
          actorId: actor.id,
          correlationId,
          beforeData: { projectId },
        },
      });
    }
  }
}

async function replaceScheduleConfiguration(
  tx: Prisma.TransactionClient,
  scheduleId: string,
  configuration: Awaited<ReturnType<typeof validateConfiguration>>,
) {
  await tx.safetyInspectionScheduleCollaborator.deleteMany({
    where: { scheduleId },
  });
  await tx.safetyInspectionScheduleChecklistItem.deleteMany({
    where: { scheduleId },
  });
  if (configuration.memberships.length > 0) {
    await tx.safetyInspectionScheduleCollaborator.createMany({
      data: configuration.memberships.map((membership) => ({
        scheduleId,
        userId: membership.userId,
        displayNameSnapshot: membership.user.name,
        roleSnapshot: membership.role,
      })),
    });
  }
  if (configuration.items.length > 0) {
    await tx.safetyInspectionScheduleChecklistItem.createMany({
      data: configuration.items.map((item, sortOrder) => ({
        scheduleId,
        checklistItemId: item.id,
        sortOrder,
      })),
    });
  }
}

async function storeReceipt(
  tx: Prisma.TransactionClient,
  actorId: string,
  aggregateId: string,
  clientMutationId: string,
  hash: string,
  receipt: AggregateReceipt,
) {
  await tx.safetyIdempotency.create({
    data: {
      actorId,
      aggregateType: "SCHEDULE",
      aggregateId,
      clientMutationId,
      requestHash: hash,
      resultData: receipt,
      completedAt: new Date(),
    },
  });
}

export async function createConfiguredSafetySchedule(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: {
    planId: string;
    expectedPlanVersion: number;
    clientMutationId: string;
    data: ConfiguredScheduleData;
  },
): Promise<AggregateReceipt & { replayed: boolean }> {
  assertSafetyActorPermission(actor, "safety.plan.update");
  assertSafetyActorProjectScope(actor, input.data.projectId);
  const hash = requestHash(input);
  return runSerializable(
    client,
    async (tx) => {
      const replay = await lockAndReplay(
        tx,
        actor.id,
        input.planId,
        input.clientMutationId,
        hash,
      );
      if (replay) return { ...replay, replayed: true };
      const plan = await tx.safetyInspectionPlan.findUnique({
        where: { id: input.planId },
      });
      if (!plan) {
        throw new SafetyApiError(
          "SAFETY_FORBIDDEN_OR_NOT_FOUND",
          "Không thể truy cập kế hoạch kiểm tra.",
        );
      }
      assertPlanMutable(plan.status);
      if (plan.version !== input.expectedPlanVersion) {
        throw new SafetyApiError(
          "SAFETY_VERSION_CONFLICT",
          "Kế hoạch đã được cập nhật ở thiết bị khác.",
        );
      }
      const { collaboratorUserIds, checklistItemIds, ...scheduleData } =
        input.data;
      const configuration = await validateConfiguration(
        tx,
        scheduleData.projectId,
        scheduleData.constructionType,
        collaboratorUserIds,
        checklistItemIds,
      );
      const schedule = await tx.safetyInspectionSchedule.create({
        data: { planId: input.planId, ...scheduleData },
      });
      await replaceScheduleConfiguration(tx, schedule.id, configuration);
      await reconcilePlanScope(
        tx,
        actor,
        input.planId,
        input.clientMutationId,
      );
      const planUpdated = await tx.safetyInspectionPlan.updateMany({
        where: { id: input.planId, version: input.expectedPlanVersion },
        data: { version: { increment: 1 } },
      });
      if (planUpdated.count !== 1) {
        throw new SafetyApiError(
          "SAFETY_VERSION_CONFLICT",
          "Kế hoạch đã được cập nhật ở thiết bị khác.",
        );
      }
      const receipt = {
        scheduleId: schedule.id,
        scheduleVersion: schedule.version,
        planVersion: input.expectedPlanVersion + 1,
      };
      await tx.safetyAuditLog.create({
        data: {
          projectId: schedule.projectId,
          aggregateType: "SCHEDULE",
          aggregateId: schedule.id,
          action: "CREATE_CONFIGURED_SCHEDULE",
          actorId: actor.id,
          correlationId: input.clientMutationId,
          afterData: {
            planId: input.planId,
            collaboratorCount: configuration.memberships.length,
            checklistItemCount: configuration.items.length,
          },
        },
      });
      await storeReceipt(
        tx,
        actor.id,
        input.planId,
        input.clientMutationId,
        hash,
        receipt,
      );
      return { ...receipt, replayed: false };
    },
  );
}

export async function updateConfiguredSafetySchedule(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: {
    scheduleId: string;
    expectedScheduleVersion: number;
    expectedPlanVersion: number;
    clientMutationId: string;
    data: ConfiguredScheduleData;
  },
): Promise<AggregateReceipt & { replayed: boolean }> {
  assertSafetyActorPermission(actor, "safety.plan.update");
  assertSafetyActorProjectScope(actor, input.data.projectId);
  const hash = requestHash(input);
  return runSerializable(
    client,
    async (tx) => {
      const replay = await lockAndReplay(
        tx,
        actor.id,
        input.scheduleId,
        input.clientMutationId,
        hash,
      );
      if (replay) return { ...replay, replayed: true };
      const schedule = await tx.safetyInspectionSchedule.findUnique({
        where: { id: input.scheduleId },
        include: { plan: true },
      });
      if (!schedule) {
        throw new SafetyApiError(
          "SAFETY_FORBIDDEN_OR_NOT_FOUND",
          "Không thể truy cập lịch kiểm tra.",
        );
      }
      assertSafetyActorProjectScope(actor, schedule.projectId);
      assertPlanMutable(schedule.plan.status);
      if (schedule.plan.version !== input.expectedPlanVersion) {
        throw new SafetyApiError(
          "SAFETY_VERSION_CONFLICT",
          "Kế hoạch đã được cập nhật ở thiết bị khác.",
        );
      }
      const { collaboratorUserIds, checklistItemIds, ...scheduleData } =
        input.data;
      const configuration = await validateConfiguration(
        tx,
        scheduleData.projectId,
        scheduleData.constructionType,
        collaboratorUserIds,
        checklistItemIds,
      );
      const updated = await tx.safetyInspectionSchedule.updateMany({
        where: {
          id: schedule.id,
          version: input.expectedScheduleVersion,
        },
        data: { ...scheduleData, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw new SafetyApiError(
          "SAFETY_VERSION_CONFLICT",
          "Lịch kiểm tra đã được cập nhật ở thiết bị khác.",
        );
      }
      await replaceScheduleConfiguration(tx, schedule.id, configuration);
      await reconcilePlanScope(
        tx,
        actor,
        schedule.planId,
        input.clientMutationId,
      );
      const planUpdated = await tx.safetyInspectionPlan.updateMany({
        where: {
          id: schedule.planId,
          version: input.expectedPlanVersion,
        },
        data: { version: { increment: 1 } },
      });
      if (planUpdated.count !== 1) {
        throw new SafetyApiError(
          "SAFETY_VERSION_CONFLICT",
          "Kế hoạch đã được cập nhật ở thiết bị khác.",
        );
      }
      const receipt = {
        scheduleId: schedule.id,
        scheduleVersion: input.expectedScheduleVersion + 1,
        planVersion: input.expectedPlanVersion + 1,
      };
      await tx.safetyAuditLog.create({
        data: {
          projectId: scheduleData.projectId,
          aggregateType: "SCHEDULE",
          aggregateId: schedule.id,
          action: "UPDATE_CONFIGURED_SCHEDULE",
          actorId: actor.id,
          correlationId: input.clientMutationId,
          beforeData: { projectId: schedule.projectId },
          afterData: {
            projectId: scheduleData.projectId,
            collaboratorCount: configuration.memberships.length,
            checklistItemCount: configuration.items.length,
          },
        },
      });
      await storeReceipt(
        tx,
        actor.id,
        input.scheduleId,
        input.clientMutationId,
        hash,
        receipt,
      );
      return { ...receipt, replayed: false };
    },
  );
}

export async function cancelConfiguredSafetySchedule(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: {
    scheduleId: string;
    expectedScheduleVersion: number;
    expectedPlanVersion: number;
    clientMutationId: string;
    reason: string;
  },
): Promise<AggregateReceipt & { replayed: boolean }> {
  assertSafetyActorPermission(actor, "safety.plan.update");
  if (!input.reason.trim()) {
    throw new SafetyApiError(
      "SAFETY_VALIDATION_FAILED",
      "Hủy lịch kiểm tra phải có lý do.",
    );
  }
  const hash = requestHash(input);
  return runSerializable(
    client,
    async (tx) => {
      const replay = await lockAndReplay(
        tx,
        actor.id,
        input.scheduleId,
        input.clientMutationId,
        hash,
      );
      if (replay) return { ...replay, replayed: true };
      const schedule = await tx.safetyInspectionSchedule.findUnique({
        where: { id: input.scheduleId },
        include: { plan: true },
      });
      if (!schedule) {
        throw new SafetyApiError(
          "SAFETY_FORBIDDEN_OR_NOT_FOUND",
          "Không thể truy cập lịch kiểm tra.",
        );
      }
      assertSafetyActorProjectScope(actor, schedule.projectId);
      assertPlanMutable(schedule.plan.status);
      if (schedule.plan.version !== input.expectedPlanVersion) {
        throw new SafetyApiError(
          "SAFETY_VERSION_CONFLICT",
          "Kế hoạch đã được cập nhật ở thiết bị khác.",
        );
      }
      const updated = await tx.safetyInspectionSchedule.updateMany({
        where: {
          id: schedule.id,
          version: input.expectedScheduleVersion,
        },
        data: {
          status: "CANCELLED",
          changeNote: input.reason.trim(),
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new SafetyApiError(
          "SAFETY_VERSION_CONFLICT",
          "Lịch kiểm tra đã được cập nhật ở thiết bị khác.",
        );
      }
      await reconcilePlanScope(
        tx,
        actor,
        schedule.planId,
        input.clientMutationId,
      );
      const planUpdated = await tx.safetyInspectionPlan.updateMany({
        where: {
          id: schedule.planId,
          version: input.expectedPlanVersion,
        },
        data: { version: { increment: 1 } },
      });
      if (planUpdated.count !== 1) {
        throw new SafetyApiError(
          "SAFETY_VERSION_CONFLICT",
          "Kế hoạch đã được cập nhật ở thiết bị khác.",
        );
      }
      const receipt = {
        scheduleId: schedule.id,
        scheduleVersion: input.expectedScheduleVersion + 1,
        planVersion: input.expectedPlanVersion + 1,
      };
      await tx.safetyAuditLog.create({
        data: {
          projectId: schedule.projectId,
          aggregateType: "SCHEDULE",
          aggregateId: schedule.id,
          action: "CANCEL_CONFIGURED_SCHEDULE",
          actorId: actor.id,
          correlationId: input.clientMutationId,
          beforeData: { status: schedule.status },
          afterData: { status: "CANCELLED", reason: input.reason.trim() },
        },
      });
      await storeReceipt(
        tx,
        actor.id,
        input.scheduleId,
        input.clientMutationId,
        hash,
        receipt,
      );
      return { ...receipt, replayed: false };
    },
  );
}
