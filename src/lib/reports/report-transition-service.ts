import { Prisma, type UserRole } from "@prisma/client";
import { canApproveByRequestType } from "@/lib/approvals/approval-policy";
import { syncSiteReportProgressEntriesInTransaction } from "./report-progress-sync";

export type ReportTransitionClient = {
  $transaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T>;
};

export type ReportTransitionActor = {
  id: string;
  name: string;
  role: UserRole;
};

const REPORT_STATUS_CONFLICT_MESSAGE =
  "Trạng thái báo cáo đã thay đổi. Vui lòng tải lại.";

async function getExistingReport(
  tx: Prisma.TransactionClient,
  reportId: string,
) {
  const report = await tx.siteReport.findFirst({
    where: { id: reportId, deletedAt: null },
  });
  if (!report) {
    throw new Error("Không tìm thấy báo cáo.");
  }
  return report;
}

export async function submitSiteReportTransition(
  client: ReportTransitionClient,
  reportId: string,
  actor: ReportTransitionActor,
) {
  return client.$transaction(async (tx) => {
    const report = await getExistingReport(tx, reportId);
    if (report.createdById !== actor.id) {
      throw new Error("Bạn không có quyền gửi báo cáo này.");
    }

    const result = await tx.siteReport.updateMany({
      where: {
        id: reportId,
        deletedAt: null,
        status: { in: ["DRAFT", "REJECTED", "REVISION_REQUESTED"] },
      },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        rejectedReason: null,
      },
    });
    if (result.count !== 1) {
      throw new Error(REPORT_STATUS_CONFLICT_MESSAGE);
    }

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        projectId: report.projectId,
        action: "SITE_REPORT_SUBMITTED",
        entityType: "SiteReport",
        entityId: reportId,
        beforeData: JSON.stringify({ status: report.status }),
        afterData: JSON.stringify({ status: "SUBMITTED" }),
      },
    });

    await syncSiteReportProgressEntriesInTransaction(tx, {
      reportId,
      mode: "SUBMIT",
      actor,
    });

    return tx.siteReport.findUniqueOrThrow({ where: { id: reportId } });
  });
}

export async function approveSiteReportTransition(
  client: ReportTransitionClient,
  reportId: string,
  actor: ReportTransitionActor,
  note?: string,
) {
  return client.$transaction(async (tx) => {
    const report = await getExistingReport(tx, reportId);
    if (!canApproveByRequestType({
      userRole: actor.role,
      requestType: "REPORT",
      actorId: actor.id,
      requesterId: report.createdById,
    })) {
      throw new Error("Bạn không có quyền phê duyệt báo cáo này.");
    }

    const result = await tx.siteReport.updateMany({
      where: {
        id: reportId,
        deletedAt: null,
        status: "SUBMITTED",
      },
      data: {
        status: "APPROVED",
        approvedById: actor.id,
        approvedAt: new Date(),
      },
    });
    if (result.count !== 1) {
      throw new Error(REPORT_STATUS_CONFLICT_MESSAGE);
    }

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        projectId: report.projectId,
        action: "SITE_REPORT_APPROVED",
        entityType: "SiteReport",
        entityId: reportId,
        beforeData: JSON.stringify({ status: report.status }),
        afterData: JSON.stringify({ status: "APPROVED", note }),
      },
    });

    await syncSiteReportProgressEntriesInTransaction(tx, {
      reportId,
      mode: "APPROVE",
      actor,
    });

    return tx.siteReport.findUniqueOrThrow({ where: { id: reportId } });
  });
}

export async function rejectSiteReportTransition(
  client: ReportTransitionClient,
  reportId: string,
  actor: ReportTransitionActor,
  reason?: string,
) {
  if (!reason?.trim()) {
    throw new Error("Vui lòng nhập lý do từ chối.");
  }

  return client.$transaction(async (tx) => {
    const report = await getExistingReport(tx, reportId);
    if (!canApproveByRequestType({
      userRole: actor.role,
      requestType: "REPORT",
      actorId: actor.id,
      requesterId: report.createdById,
    })) {
      throw new Error("Bạn không có quyền từ chối báo cáo này.");
    }

    const result = await tx.siteReport.updateMany({
      where: {
        id: reportId,
        deletedAt: null,
        status: "SUBMITTED",
      },
      data: {
        status: "REJECTED",
        rejectedReason: reason.trim(),
      },
    });
    if (result.count !== 1) {
      throw new Error(REPORT_STATUS_CONFLICT_MESSAGE);
    }

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        projectId: report.projectId,
        action: "SITE_REPORT_REJECTED",
        entityType: "SiteReport",
        entityId: reportId,
        beforeData: JSON.stringify({ status: report.status }),
        afterData: JSON.stringify({
          status: "REJECTED",
          reason: reason.trim(),
        }),
      },
    });

    await syncSiteReportProgressEntriesInTransaction(tx, {
      reportId,
      mode: "REJECT",
      actor,
    });

    return tx.siteReport.findUniqueOrThrow({ where: { id: reportId } });
  });
}
