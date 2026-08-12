import { getSession } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { getActiveProjects, getSiteReportForEdit } from "../../../actions";
import { FieldEditor } from "@/components/reports/field-editor";
import { canViewNavigationItem } from "@/lib/navigation-permissions";
import type { FieldReport } from "@/components/reports/types";

export const metadata = {
  title: "Chỉnh sửa Báo cáo Hiện trường | ERP Công trình",
  description: "Chỉnh sửa nhật ký thi công ngày và báo cáo tổng hợp tuần",
};

export default async function EditFieldReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  if (!canViewNavigationItem(session.role, "/reports")) {
    redirect("/reports");
  }

  const { id } = await params;
  if (!id) notFound();

  let reportData;
  try {
    reportData = await getSiteReportForEdit(id);
  } catch (error) {
    console.error("Failed to load report for edit:", error);
    notFound();
  }

  const activeProjects = await getActiveProjects();

  const formattedReport: FieldReport = {
    id: reportData.id,
    reportNo: reportData.reportNo,
    type: reportData.type as "DAILY" | "WEEKLY",
    projectId: reportData.projectId,
    projectName: reportData.projectName,
    
    date: reportData.date,
    time: reportData.time,
    weekStartDate: reportData.weekStartDate,
    weekEndDate: reportData.weekEndDate,
    summary: reportData.summary,
    materials: reportData.materials,
    labor: reportData.labor,
    quality: reportData.quality,
    issues: reportData.issues,
    recommendations: reportData.recommendations,
    weatherCondition: reportData.weatherCondition as any,
    weatherTemperature: reportData.weatherTemperature,
    gpsLocation: reportData.gpsLocation,
    status: reportData.status as any,
    creatorName: reportData.creatorName,
    creatorRole: reportData.creatorRole,
    createdById: reportData.createdById,
    updatedAt: reportData.updatedAt,
    workLines: reportData.lines.map((l) => ({
      id: l.id,
      wbsItemId: l.wbsItemId,
      fieldProgressItemId: l.fieldProgressItemId,
      categoryName: l.categoryName,
      workContent: l.workContent,
      unit: l.unit || "Lần",
      designQuantity: l.designQuantity,
      quantityBefore: l.quantityBefore,
      quantityToday: l.quantityToday,
      quantityCumulative: l.quantityCumulative,
      progressPercent: l.progressPercent,
      note: l.note,
      proposalNote: l.proposalNote,
      issueNote: l.issueNote,
    })),
    photos: reportData.attachments
      .filter((a) => a.kind === "PHOTO")
      .map((a) => ({
        id: a.id,
        url: a.url,
        fileName: a.fileName,
        size: `${(a.sizeBytes / (1024 * 1024)).toFixed(2)} MB`,
      })),
    code: reportData.reportNo,
    approvalHistory: [],
    attachments: reportData.attachments
      .filter((a) => a.kind === "FILE")
      .map((a) => ({
        id: a.id,
        url: a.url,
        name: a.fileName,
        type: a.mimeType || "file",
        size: `${(a.sizeBytes / (1024 * 1024)).toFixed(2)} MB`,
      })),
  };

  return (
    <FieldEditor
      initialReport={formattedReport}
      activeProjects={activeProjects}
      currentUser={{
        id: session.id,
        name: session.name || session.email || "Người dùng",
        role: session.role,
      }}
      mode="edit"
    />
  );
}
