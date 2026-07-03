import { Prisma, type UserRole } from "@prisma/client";

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

const REPORT_REVIEW_ROLES: UserRole[] = ["ADMIN", "DIRECTOR"];
const REPORT_STATUS_CONFLICT_MESSAGE =
  "Trạng thái báo cáo đã thay đổi, vui lòng tải lại.";

async function getExistingReport(
  tx: Prisma.TransactionClient,
  reportId: string,
) {
  const report = await tx.siteReport.findFirst({
    where: { id: reportId, deletedAt: null },
  });
  if (!report) {
    throw new Error("Không tìm thấy báo cáo");
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
      throw new Error("Không có quyền gửi báo cáo này");
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

    return tx.siteReport.findUniqueOrThrow({ where: { id: reportId } });
  });
}

export async function approveSiteReportTransition(
  client: ReportTransitionClient,
  reportId: string,
  actor: ReportTransitionActor,
  note?: string,
) {
  if (!REPORT_REVIEW_ROLES.includes(actor.role)) {
    throw new Error("Không có quyền duyệt báo cáo");
  }

  return client.$transaction(async (tx) => {
    const report = await getExistingReport(tx, reportId);
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
    throw new Error("Bắt buộc nhập lý do từ chối");
  }
  if (!REPORT_REVIEW_ROLES.includes(actor.role)) {
    throw new Error("Không có quyền từ chối báo cáo");
  }

  return client.$transaction(async (tx) => {
    const report = await getExistingReport(tx, reportId);
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

    return tx.siteReport.findUniqueOrThrow({ where: { id: reportId } });
  });
}
