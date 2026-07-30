import {
  Prisma,
  PrismaClient,
  type SafetyConstructionType,
  type SafetyScheduleKind,
  type SafetyShift,
} from "@prisma/client";
import { assertPlanMutable, assertReportMutable } from "./inspection-domain";
import {
  assertSafetyActorPermission,
  assertSafetyActorProjectScope,
  type SafetyServerActor,
} from "./mutation-actor";

async function reconcilePlanProjects(
  tx: Prisma.TransactionClient,
  actor: SafetyServerActor,
  planId: string,
  correlationId: string,
): Promise<void> {
  const [schedules, current] = await Promise.all([
    tx.safetyInspectionSchedule.findMany({
      where: { planId, status: { not: "CANCELLED" } },
      select: { projectId: true },
    }),
    tx.safetyInspectionPlanProject.findMany({
      where: { planId },
      select: { projectId: true },
    }),
  ]);
  const desired = new Set(schedules.map((row) => row.projectId));
  const existing = new Set(current.map((row) => row.projectId));
  const additions = [...desired].filter((id) => !existing.has(id));
  const removals = [...existing].filter((id) => !desired.has(id));

  for (const projectId of additions) {
    await tx.safetyInspectionPlanProject.create({
      data: { planId, projectId, addedById: actor.id },
    });
    await tx.safetyAuditLog.create({
      data: {
        projectId,
        aggregateType: "PLAN",
        aggregateId: planId,
        action: "ADD_PLAN_PROJECT_SCOPE",
        afterData: { projectId },
        actorId: actor.id,
        correlationId,
      },
    });
  }
  for (const projectId of removals) {
    await tx.safetyInspectionPlanProject.delete({
      where: { planId_projectId: { planId, projectId } },
    });
    await tx.safetyAuditLog.create({
      data: {
        projectId,
        aggregateType: "PLAN",
        aggregateId: planId,
        action: "REMOVE_PLAN_PROJECT_SCOPE",
        beforeData: { projectId },
        actorId: actor.id,
        correlationId,
      },
    });
  }
}

async function reconcileReportProjects(
  tx: Prisma.TransactionClient,
  actor: SafetyServerActor,
  reportId: string,
  correlationId: string,
): Promise<void> {
  const [entries, current] = await Promise.all([
    tx.safetyWeeklyReportEntry.findMany({
      where: { reportId, cancelledAt: null },
      select: { projectId: true },
    }),
    tx.safetyWeeklyReportProject.findMany({
      where: { reportId },
      select: { projectId: true },
    }),
  ]);
  const desired = new Set(entries.map((row) => row.projectId));
  const existing = new Set(current.map((row) => row.projectId));
  const additions = [...desired].filter((id) => !existing.has(id));
  const removals = [...existing].filter((id) => !desired.has(id));

  for (const projectId of additions) {
    await tx.safetyWeeklyReportProject.create({
      data: { reportId, projectId },
    });
    await tx.safetyAuditLog.create({
      data: {
        projectId,
        aggregateType: "WEEKLY_REPORT",
        aggregateId: reportId,
        action: "ADD_REPORT_PROJECT_SCOPE",
        afterData: { projectId },
        actorId: actor.id,
        correlationId,
      },
    });
  }
  for (const projectId of removals) {
    await tx.safetyWeeklyReportProject.delete({
      where: { reportId_projectId: { reportId, projectId } },
    });
    await tx.safetyAuditLog.create({
      data: {
        projectId,
        aggregateType: "WEEKLY_REPORT",
        aggregateId: reportId,
        action: "REMOVE_REPORT_PROJECT_SCOPE",
        beforeData: { projectId },
        actorId: actor.id,
        correlationId,
      },
    });
  }
}

export type SafetyScheduleMutationData = {
  projectId: string;
  scheduledDate: Date;
  shift: SafetyShift;
  kind: SafetyScheduleKind;
  constructionType: SafetyConstructionType;
  location: string | null;
  plannedFreeText: string | null;
  trainingContent: string | null;
  startAt: Date | null;
  expectedEndAt: Date | null;
  changeNote: string | null;
  sortOrder: number;
};

export async function createSafetyScheduleWithScope(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: {
    planId: string;
    expectedPlanVersion: number;
    clientMutationId: string;
    data: SafetyScheduleMutationData;
  },
): Promise<{ scheduleId: string }> {
  assertSafetyActorPermission(actor, "safety.plan.update");
  assertSafetyActorProjectScope(actor, input.data.projectId);
  return client.$transaction(
    async (tx) => {
      const plan = await tx.safetyInspectionPlan.findUnique({
        where: { id: input.planId },
      });
      if (!plan) throw new Error("Kế hoạch không tồn tại.");
      assertPlanMutable(plan.status);
      if (plan.version !== input.expectedPlanVersion) {
        throw new Error("Kế hoạch đã thay đổi, vui lòng tải lại.");
      }
      const schedule = await tx.safetyInspectionSchedule.create({
        data: { planId: input.planId, ...input.data },
      });
      await reconcilePlanProjects(
        tx,
        actor,
        input.planId,
        input.clientMutationId,
      );
      const updated = await tx.safetyInspectionPlan.updateMany({
        where: { id: input.planId, version: input.expectedPlanVersion },
        data: { version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw new Error("Kế hoạch đã thay đổi, vui lòng tải lại.");
      }
      await tx.safetyAuditLog.create({
        data: {
          projectId: input.data.projectId,
          aggregateType: "SCHEDULE",
          aggregateId: schedule.id,
          action: "CREATE_SCHEDULE",
          afterData: { planId: input.planId },
          actorId: actor.id,
          correlationId: input.clientMutationId,
        },
      });
      return { scheduleId: schedule.id };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function updateSafetyScheduleWithScope(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: {
    scheduleId: string;
    expectedScheduleVersion: number;
    expectedPlanVersion: number;
    clientMutationId: string;
    data: SafetyScheduleMutationData;
  },
): Promise<void> {
  assertSafetyActorPermission(actor, "safety.plan.update");
  assertSafetyActorProjectScope(actor, input.data.projectId);
  await client.$transaction(
    async (tx) => {
      const schedule = await tx.safetyInspectionSchedule.findUnique({
        where: { id: input.scheduleId },
        include: { plan: true },
      });
      if (!schedule) throw new Error("Lịch kiểm tra không tồn tại.");
      assertPlanMutable(schedule.plan.status);
      if (schedule.plan.version !== input.expectedPlanVersion) {
        throw new Error("Kế hoạch đã thay đổi, vui lòng tải lại.");
      }
      const updated = await tx.safetyInspectionSchedule.updateMany({
        where: {
          id: input.scheduleId,
          version: input.expectedScheduleVersion,
        },
        data: { ...input.data, version: { increment: 1 } },
      });
      if (updated.count !== 1) {
        throw new Error("Lịch kiểm tra đã thay đổi, vui lòng tải lại.");
      }
      await reconcilePlanProjects(
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
        throw new Error("Kế hoạch đã thay đổi, vui lòng tải lại.");
      }
      await tx.safetyAuditLog.create({
        data: {
          projectId: input.data.projectId,
          aggregateType: "SCHEDULE",
          aggregateId: input.scheduleId,
          action: "UPDATE_SCHEDULE",
          beforeData: { projectId: schedule.projectId },
          afterData: { projectId: input.data.projectId },
          actorId: actor.id,
          correlationId: input.clientMutationId,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function cancelSafetyScheduleWithScope(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: {
    scheduleId: string;
    expectedScheduleVersion: number;
    expectedPlanVersion: number;
    reason: string;
    clientMutationId: string;
  },
): Promise<void> {
  if (!input.reason.trim()) throw new Error("Hủy lịch phải có lý do.");
  assertSafetyActorPermission(actor, "safety.plan.update");
  await client.$transaction(
    async (tx) => {
      const schedule = await tx.safetyInspectionSchedule.findUnique({
        where: { id: input.scheduleId },
        include: { plan: true },
      });
      if (!schedule) throw new Error("Lịch kiểm tra không tồn tại.");
      assertSafetyActorProjectScope(actor, schedule.projectId);
      assertPlanMutable(schedule.plan.status);
      if (schedule.plan.version !== input.expectedPlanVersion) {
        throw new Error("Kế hoạch đã thay đổi, vui lòng tải lại.");
      }
      const updated = await tx.safetyInspectionSchedule.updateMany({
        where: {
          id: input.scheduleId,
          version: input.expectedScheduleVersion,
        },
        data: {
          status: "CANCELLED",
          changeNote: input.reason.trim(),
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        throw new Error("Lịch kiểm tra đã thay đổi, vui lòng tải lại.");
      }
      await reconcilePlanProjects(
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
        throw new Error("Kế hoạch đã thay đổi, vui lòng tải lại.");
      }
      await tx.safetyAuditLog.create({
        data: {
          projectId: schedule.projectId,
          aggregateType: "SCHEDULE",
          aggregateId: schedule.id,
          action: "CANCEL_SCHEDULE",
          beforeData: { status: schedule.status },
          afterData: { status: "CANCELLED", reason: input.reason.trim() },
          actorId: actor.id,
          correlationId: input.clientMutationId,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export type SafetyReportEntryMutationData = {
  sessionId: string;
  projectSnapshot: string;
  content: string;
  assessment: string | null;
  request: string | null;
  implementationResult: string | null;
  sortOrder: number;
};

async function reportEntryDataFromSession(
  tx: Prisma.TransactionClient,
  actor: SafetyServerActor,
  data: SafetyReportEntryMutationData,
) {
  const session = await tx.safetyInspectionSession.findUnique({
    where: { id: data.sessionId },
  });
  if (!session) throw new Error("Phiên kiểm tra không tồn tại.");
  assertSafetyActorProjectScope(actor, session.projectId);
  return {
    projectId: session.projectId,
    sessionId: session.id,
    inspectionDate: session.occurredAt,
    shift: session.shift,
    projectSnapshot: data.projectSnapshot,
    content: data.content,
    assessment: data.assessment,
    request: data.request,
    implementationResult: data.implementationResult,
    sortOrder: data.sortOrder,
  };
}

export async function createSafetyReportEntryWithScope(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: {
    reportId: string;
    expectedReportVersion: number;
    clientMutationId: string;
    data: SafetyReportEntryMutationData;
  },
): Promise<{ entryId: string }> {
  assertSafetyActorPermission(actor, "safety.report.update");
  return client.$transaction(
    async (tx) => {
      const report = await tx.safetyWeeklyReport.findUnique({
        where: { id: input.reportId },
      });
      if (!report) throw new Error("Báo cáo không tồn tại.");
      assertReportMutable(report.status);
      if (report.version !== input.expectedReportVersion) {
        throw new Error("Báo cáo đã thay đổi, vui lòng tải lại.");
      }
      const data = await reportEntryDataFromSession(tx, actor, input.data);
      const entry = await tx.safetyWeeklyReportEntry.create({
        data: { reportId: input.reportId, ...data },
      });
      await reconcileReportProjects(
        tx,
        actor,
        input.reportId,
        input.clientMutationId,
      );
      const reportUpdated = await tx.safetyWeeklyReport.updateMany({
        where: {
          id: input.reportId,
          version: input.expectedReportVersion,
        },
        data: { version: { increment: 1 } },
      });
      if (reportUpdated.count !== 1) {
        throw new Error("Báo cáo đã thay đổi, vui lòng tải lại.");
      }
      await tx.safetyAuditLog.create({
        data: {
          projectId: data.projectId,
          aggregateType: "WEEKLY_REPORT",
          aggregateId: input.reportId,
          action: "CREATE_REPORT_ENTRY",
          afterData: { entryId: entry.id, sessionId: data.sessionId },
          actorId: actor.id,
          correlationId: input.clientMutationId,
        },
      });
      return { entryId: entry.id };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function updateSafetyReportEntryWithScope(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: {
    entryId: string;
    expectedReportVersion: number;
    clientMutationId: string;
    data: SafetyReportEntryMutationData;
  },
): Promise<void> {
  assertSafetyActorPermission(actor, "safety.report.update");
  await client.$transaction(
    async (tx) => {
      const entry = await tx.safetyWeeklyReportEntry.findUnique({
        where: { id: input.entryId },
        include: { report: true },
      });
      if (!entry || entry.cancelledAt) {
        throw new Error("Dòng báo cáo không tồn tại.");
      }
      assertReportMutable(entry.report.status);
      if (entry.report.version !== input.expectedReportVersion) {
        throw new Error("Báo cáo đã thay đổi, vui lòng tải lại.");
      }
      const data = await reportEntryDataFromSession(tx, actor, input.data);
      await tx.safetyWeeklyReportEntry.update({
        where: { id: input.entryId },
        data,
      });
      await reconcileReportProjects(
        tx,
        actor,
        entry.reportId,
        input.clientMutationId,
      );
      const reportUpdated = await tx.safetyWeeklyReport.updateMany({
        where: {
          id: entry.reportId,
          version: input.expectedReportVersion,
        },
        data: { version: { increment: 1 } },
      });
      if (reportUpdated.count !== 1) {
        throw new Error("Báo cáo đã thay đổi, vui lòng tải lại.");
      }
      await tx.safetyAuditLog.create({
        data: {
          projectId: data.projectId,
          aggregateType: "WEEKLY_REPORT",
          aggregateId: entry.reportId,
          action: "UPDATE_REPORT_ENTRY",
          beforeData: { entryId: entry.id, projectId: entry.projectId },
          afterData: { entryId: entry.id, projectId: data.projectId },
          actorId: actor.id,
          correlationId: input.clientMutationId,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function cancelSafetyReportEntryWithScope(
  client: PrismaClient,
  actor: SafetyServerActor,
  input: {
    entryId: string;
    expectedReportVersion: number;
    reason: string;
    clientMutationId: string;
  },
): Promise<void> {
  if (!input.reason.trim()) throw new Error("Hủy dòng báo cáo phải có lý do.");
  assertSafetyActorPermission(actor, "safety.report.update");
  await client.$transaction(
    async (tx) => {
      const entry = await tx.safetyWeeklyReportEntry.findUnique({
        where: { id: input.entryId },
        include: { report: true },
      });
      if (!entry || entry.cancelledAt) {
        throw new Error("Dòng báo cáo không tồn tại.");
      }
      assertReportMutable(entry.report.status);
      assertSafetyActorProjectScope(actor, entry.projectId);
      if (entry.report.version !== input.expectedReportVersion) {
        throw new Error("Báo cáo đã thay đổi, vui lòng tải lại.");
      }
      await tx.safetyWeeklyReportEntry.update({
        where: { id: entry.id },
        data: {
          cancelledAt: new Date(),
          cancelledById: actor.id,
          cancellationReason: input.reason.trim(),
        },
      });
      await reconcileReportProjects(
        tx,
        actor,
        entry.reportId,
        input.clientMutationId,
      );
      const reportUpdated = await tx.safetyWeeklyReport.updateMany({
        where: {
          id: entry.reportId,
          version: input.expectedReportVersion,
        },
        data: { version: { increment: 1 } },
      });
      if (reportUpdated.count !== 1) {
        throw new Error("Báo cáo đã thay đổi, vui lòng tải lại.");
      }
      await tx.safetyAuditLog.create({
        data: {
          projectId: entry.projectId,
          aggregateType: "WEEKLY_REPORT",
          aggregateId: entry.reportId,
          action: "CANCEL_REPORT_ENTRY",
          beforeData: { entryId: entry.id },
          afterData: { entryId: entry.id, reason: input.reason.trim() },
          actorId: actor.id,
          correlationId: input.clientMutationId,
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
