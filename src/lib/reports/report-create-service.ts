import { Prisma, type UserRole } from "@prisma/client";
import type { ReportTransitionClient } from "./report-transition-service";
import { syncSiteReportProgressEntriesInTransaction } from "./report-progress-sync";

export type ReportCreateActor = {
  id: string;
  name: string;
  role: UserRole;
};

export type ReportCreateData = Omit<
  Prisma.SiteReportUncheckedCreateInput,
  "createdById" | "reporterName" | "submittedAt"
>;

export async function createSiteReportWithAudit(
  client: ReportTransitionClient,
  actor: ReportCreateActor,
  data: ReportCreateData,
) {
  const status = data.status || "DRAFT";
  if (status !== "DRAFT" && status !== "SUBMITTED") {
    throw new Error("Trạng thái báo cáo không hợp lệ để tạo mới");
  }

  return client.$transaction(async (tx) => {
    const isSubmitted = status === "SUBMITTED";
    const submittedAt = isSubmitted ? new Date() : null;

    const report = await tx.siteReport.create({
      data: {
        ...data,
        status,
        createdById: actor.id,
        reporterName: actor.name,
        submittedAt,
      },
    });

    await tx.auditLog.create({
      data: {
        userId: actor.id,
        projectId: report.projectId,
        action: "SITE_REPORT_CREATED",
        entityType: "SiteReport",
        entityId: report.id,
        afterData: JSON.stringify({ status: report.status }),
      },
    });

    if (isSubmitted) {
      await tx.auditLog.create({
        data: {
          userId: actor.id,
          projectId: report.projectId,
          action: "SITE_REPORT_SUBMITTED",
          entityType: "SiteReport",
          entityId: report.id,
          afterData: JSON.stringify({ status: "SUBMITTED" }),
        },
      });

      await syncSiteReportProgressEntriesInTransaction(tx, {
        reportId: report.id,
        mode: "SUBMIT",
        actor,
      });
    }

    return report;
  });
}
