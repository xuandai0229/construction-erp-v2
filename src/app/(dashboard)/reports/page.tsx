import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportsWorkspace } from "@/components/reports/reports-workspace";
import { getSiteReports, getActiveProjects } from "./actions";
import { FieldReport, ReportType, WeatherCondition, ReportStatus } from "@/components/reports/types";
import { format } from "date-fns";
import { SiteReportAttachment } from "@prisma/client";

export const metadata = {
  title: "Báo cáo hiện trường | ERP Công trình",
  description: "Quản lý, theo dõi và tổng hợp báo cáo công việc hằng ngày tại công trường",
};

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const rawReports = await getSiteReports({});
  const projects = await getActiveProjects();
  
  // Map backend model to frontend FieldReport
  const reports: FieldReport[] = rawReports.map(r => ({
    id: r.id,
    reportNo: r.reportNo,
    code: r.reportNo.length > 20 ? r.reportNo.split('-')[0].toUpperCase() : r.reportNo,
    type: r.type as ReportType,
    projectId: r.projectId,
    projectName: r.project?.name || 'Không xác định',
    date: format(r.reportDate, 'yyyy-MM-dd'),
    time: format(r.reportDate, 'HH:mm'),
    weekStartDate: r.weekStartDate ? format(r.weekStartDate, 'yyyy-MM-dd') : undefined,
    weekEndDate: r.weekEndDate ? format(r.weekEndDate, 'yyyy-MM-dd') : undefined,
    summary: r.summary || undefined,
    creatorName: r.reporterName || 'N/A',
    creatorRole: 'Người tạo', // Can be enhanced later
    createdById: r.createdById,
    weatherCondition: (r.weatherCondition as WeatherCondition) || 'SUNNY',
    weatherTemperature: r.weatherTemperature || undefined,
    status: r.status as ReportStatus,
    photos: (r.attachments || []).filter((a: SiteReportAttachment) => a.kind === 'PHOTO').map((a: SiteReportAttachment) => ({
      id: a.id,
      url: `/api/reports/attachments/${a.id}`,
      caption: a.caption || undefined,
      createdAt: a.createdAt.toISOString()
    })),
    attachments: (r.attachments || []).filter((a: SiteReportAttachment) => a.kind === 'FILE').map((a: SiteReportAttachment) => ({
      id: a.id,
      name: a.originalName || a.fileName,
      url: `/api/reports/attachments/${a.id}`,
      type: (a.originalName || a.fileName).split('.').pop() || 'unknown',
      size: `${(a.sizeBytes / 1024 / 1024).toFixed(2)} MB`
    })),
    workLines: (r.lines || []).map((l) => ({
      id: l.id,
      wbsItemId: l.wbsItemId || undefined,
      workContent: l.workName || l.workContent,
      unit: l.unit || undefined,
      quantityToday: l.quantityToday ? Number(l.quantityToday) : undefined,
      note: l.note || undefined,
    })),
    materials: r.materials || '',
    labor: r.labor || '',
    quality: r.quality || '',
    issues: r.issues || '',
    recommendations: r.recommendations || '',
    approvalHistory: [], // Phase 4
  }));

  return <ReportsWorkspace initialReports={JSON.parse(JSON.stringify(reports))} initialProjects={projects} currentUser={{ id: session.id, name: session.name || "N/A" }} />;
}
