import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";
import { PrintReportToolbar } from "@/components/reports/print-report-toolbar";
import { canAccessProject } from "@/lib/rbac";
import { canPrintReport } from "@/lib/reports/report-workflow-policy";
import { formatReportCreatorName } from "@/lib/reports/report-stats";
import { getVietnamDateString, getVietnamTimeString } from "@/lib/reports/report-timezone";
import { parseWeeklyGeneralNote } from "@/lib/reports/weekly-report-utils";
import type { FieldReport, ReportType, WeatherCondition, ReportStatus } from "@/components/reports/types";
import { ReportPrintTemplate } from "@/components/reports/report-print-template";

const formatFileSize = (bytes: number | null | undefined | string | bigint) => {
  if (bytes === undefined || bytes === null || bytes === "") return "Không rõ dung lượng";
  const num = Number(bytes);
  if (isNaN(num)) return "Không rõ dung lượng";
  if (num === 0) return "0 Bytes";
  if (num < 1024) return "< 1 KB";
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  const mb = num / (1024 * 1024);
  if (mb < 0.01) return "< 0.01 MB";
  return `${mb.toFixed(2)} MB`;
};

export const metadata = {
  title: "In Báo Cáo Hiện Trường",
};

export default async function PrintReportPage({ params }: { params: Promise<{ reportId: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  const { reportId } = await params;

  const report = await prisma.siteReport.findUnique({
    where: { id: reportId },
    include: {
      project: true,
      createdBy: true,
      lines: { orderBy: { sortOrder: 'asc' } },
      attachments: true,
    }
  });

  if (!report || report.deletedAt) notFound();

  if (report.project?.deletedAt) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md w-full text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Báo cáo không khả dụng</h1>
          <p className="text-slate-600 mb-6">Công trình của báo cáo này đã bị xóa hoặc không còn hoạt động trên hệ thống.</p>
          <a href="/reports" className="inline-block px-4 py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 transition-colors">
            Quay lại danh sách
          </a>
        </div>
      </div>
    );
  }

  const policyUser = { id: session.id, role: session.role };
  const hasProjectAccess = await canAccessProject(policyUser, report.projectId);
  if (!canPrintReport(report, policyUser, hasProjectAccess)) {
    return (
      <div className="p-8 text-center text-red-600 font-bold">
        Bạn không có quyền xem báo cáo này (Mã: {report.reportNo}).
      </div>
    );
  }

  const isSystemAdmin = true;
  if (!isSystemAdmin && report.createdById !== session.id) {
    return (
      <div className="p-8 text-center text-red-600 font-bold">
        Bạn không có quyền xem báo cáo này (Mã: {report.reportNo}).
      </div>
    );
  }

  // Map to FieldReport
  const fieldReport: FieldReport = {
    id: report.id,
    reportNo: report.reportNo,
    code: report.reportNo.length > 20 ? report.reportNo.split('-')[0].toUpperCase() : report.reportNo,
    type: report.type as ReportType,
    projectId: report.projectId,
    projectName: report.project?.name || 'Không xác định',
    projectStatus: report.project?.status,
    date: getVietnamDateString(report.reportDate),
    time: getVietnamTimeString(report.reportDate),
    weekStartDate: report.weekStartDate ? getVietnamDateString(report.weekStartDate) : undefined,
    weekEndDate: report.weekEndDate ? getVietnamDateString(report.weekEndDate) : undefined,
    summary: report.summary || undefined,
    weeklyNote: parseWeeklyGeneralNote(report.generalNote),
    creatorName: formatReportCreatorName(report as any),
    creatorRole: report.createdBy?.role || 'Người tạo',
    createdById: report.createdById,
    weatherCondition: (report.weatherCondition as WeatherCondition) || 'SUNNY',
    weatherTemperature: report.weatherTemperature ? Number(report.weatherTemperature) : undefined,
    status: report.status as ReportStatus,
    photos: report.attachments.filter(a => a.kind === 'PHOTO').map(a => {
      const physicalPath = a.storagePath ? path.join(process.cwd(), a.storagePath.startsWith('storage') ? '' : 'storage', a.storagePath) : "";
      const isMissing = a.storagePath ? !fs.existsSync(physicalPath) : true;
      return {
        id: String(a.id),
        url: isMissing ? null : `/api/reports/attachments/${a.id}`,
        caption: a.caption || undefined,
        createdAt: a.createdAt.toISOString(),
        isMissing
      };
    }),
    attachments: report.attachments.filter(a => a.kind === 'FILE').map(a => {
      const physicalPath = a.storagePath ? path.join(process.cwd(), a.storagePath.startsWith('storage') ? '' : 'storage', a.storagePath) : "";
      const isMissing = a.storagePath ? !fs.existsSync(physicalPath) : true;
      return {
        id: String(a.id),
        name: String(a.originalName || a.fileName),
        url: isMissing ? null : `/api/reports/attachments/${a.id}`,
        type: String(a.originalName || a.fileName).split('.').pop() || 'unknown',
        size: formatFileSize(Number(a.sizeBytes)),
        isMissing
      };
    }),
    workLines: report.lines.map(l => ({
      id: l.id,
      wbsItemId: l.wbsItemId || undefined,
      categoryName: l.area || undefined,
      workContent: l.workName || l.workContent,
      unit: l.unit || undefined,
      quantityToday: l.quantityToday ? Number(l.quantityToday) : undefined,
      note: l.note || undefined,
    })),
    materials: report.materials || '',
    labor: report.labor || '',
    quality: report.quality || '',
    issues: report.issues || '',
    recommendations: report.recommendations || '',
    gpsLocation:
      report.gpsLat !== null && report.gpsLng !== null
        ? `${Number(report.gpsLat)}, ${Number(report.gpsLng)}`
        : undefined,
    approvalHistory: [],
  };

  return (
    <div className="print-container bg-slate-100 min-h-screen text-slate-900 font-sans pb-12">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white; }
          .no-print { display: none !important; }
          .print-container { padding: 0 !important; max-width: 100% !important; box-shadow: none !important; background: transparent !important; margin: 0 !important; }
        }
      `}} />
      
      {/* Action Bar (Client Component) */}
      <div className="no-print p-4">
        <PrintReportToolbar />
      </div>

      <div className="print-wrapper mx-auto mt-4 bg-white shadow-md max-w-5xl rounded-sm overflow-hidden">
        <ReportPrintTemplate report={fieldReport} />
      </div>
    </div>
  );
}
