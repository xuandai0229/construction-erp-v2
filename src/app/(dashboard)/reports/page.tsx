import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ReportsWorkspace } from "@/components/reports/reports-workspace";
import { getActiveProjects, getSiteReportsPage } from "./actions";
import { FieldReport, ReportType, WeatherCondition, ReportStatus } from "@/components/reports/types";
import fs from "fs";
import path from "path";
import { formatReportCreatorName } from "@/lib/reports/report-stats";
import { getVietnamDateString, getVietnamTimeString } from "@/lib/reports/report-timezone";
import { parseWeeklyGeneralNote } from "@/lib/reports/weekly-report-utils";
import { serializeDate } from "@/lib/reports/report-serializers";

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
  title: "Báo cáo hiện trường | ERP Công trình",
  description: "Quản lý, theo dõi và tổng hợp báo cáo công việc hằng ngày tại công trường",
};

import { getGlobalProjectContext } from "@/lib/project-context";
import { serializePrisma } from "@/lib/serialize";

export default async function ReportsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  const resolvedParams = await searchParams;
  const urlProjectId = typeof resolvedParams.projectId === "string" ? resolvedParams.projectId : undefined;
  const globalContext = serializePrisma(await getGlobalProjectContext(session, urlProjectId));

  const filters = {
    tab: typeof resolvedParams.tab === "string" ? resolvedParams.tab : undefined,
    q: typeof resolvedParams.q === "string" ? resolvedParams.q : undefined,
    projectId: globalContext.selectedProjectId || undefined,
    type: typeof resolvedParams.type === "string" ? resolvedParams.type : undefined,
    status: typeof resolvedParams.status === "string" ? resolvedParams.status : undefined,
    dateRange: typeof resolvedParams.dateRange === "string" ? resolvedParams.dateRange : undefined,
    reportId: typeof resolvedParams.reportId === "string" ? resolvedParams.reportId : undefined,
    page: typeof resolvedParams.page === "string" ? parseInt(resolvedParams.page, 10) : 1,
    pageSize: 10,
  };

  const pageData = await getSiteReportsPage(filters);
  const projects = (await getActiveProjects()).map(p => ({ id: p.id, code: p.code, name: p.name }));
  
  // Map backend model to frontend FieldReport
  const reports: FieldReport[] = pageData.items.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    reportNo: r.reportNo as string,
    code: (r.reportNo as string).length > 20 ? (r.reportNo as string).split('-')[0].toUpperCase() : (r.reportNo as string),
    type: r.type as ReportType,
    projectId: r.projectId as string,
    projectName: (r.project as { name: string; status?: string })?.name || 'Không xác định',
    projectStatus: (r.project as { name: string; status?: string })?.status,
    date: getVietnamDateString(r.reportDate as Date),
    time: getVietnamTimeString(r.reportDate as Date),
    weekStartDate: r.weekStartDate ? getVietnamDateString(r.weekStartDate as Date) : undefined,
    weekEndDate: r.weekEndDate ? getVietnamDateString(r.weekEndDate as Date) : undefined,
    summary: (r.summary as string) || undefined,
    weeklyNote: parseWeeklyGeneralNote(r.generalNote as string),
    creatorName: formatReportCreatorName(r as Parameters<typeof formatReportCreatorName>[0]),
    creatorRole: ((r.createdBy as { role?: string } | undefined)?.role as string) || 'Người tạo',
    createdById: r.createdById as string,
    weatherCondition: (r.weatherCondition as WeatherCondition) || 'SUNNY',
    weatherTemperature: r.weatherTemperature ? Number(r.weatherTemperature) : undefined,
    status: r.status as ReportStatus,
    photos: ((r.attachments as Record<string, unknown>[]) || []).filter((a: Record<string, unknown>) => a.kind === 'PHOTO').map((a: Record<string, unknown>) => {
      const storagePath = a.storagePath as string;
      const physicalPath = storagePath ? path.join(process.cwd(), storagePath.startsWith('storage') ? '' : 'storage', storagePath) : "";
      const isMissing = storagePath ? !fs.existsSync(physicalPath) : true;
      return {
        id: String(a.id),
        url: isMissing ? null : `/api/reports/attachments/${a.id}`,
        caption: a.caption ? String(a.caption) : undefined,
        createdAt: (a.createdAt as Date).toISOString(),
        isMissing
      };
    }),
    attachments: ((r.attachments as Record<string, unknown>[]) || []).filter((a: Record<string, unknown>) => a.kind === 'FILE').map((a: Record<string, unknown>) => {
      const storagePath = a.storagePath as string;
      const physicalPath = storagePath ? path.join(process.cwd(), storagePath.startsWith('storage') ? '' : 'storage', storagePath) : "";
      const isMissing = storagePath ? !fs.existsSync(physicalPath) : true;
      return {
        id: String(a.id),
        name: String(a.originalName || a.fileName),
        url: isMissing ? null : `/api/reports/attachments/${a.id}`,
        type: String(a.originalName || a.fileName).split('.').pop() || 'unknown',
        size: formatFileSize(Number(a.sizeBytes)),
        isMissing
      };
    }),
    workLines: ((r.lines as Record<string, unknown>[]) || []).map((l: Record<string, unknown>) => ({
      id: l.id as string,
      wbsItemId: (l.wbsItemId as string) || undefined,
      fieldProgressItemId: (l.fieldProgressItemId as string) || undefined,
      workContent: (l.workName as string) || (l.workContent as string),
      unit: (l.unit as string) || undefined,
      quantityToday: l.quantityToday !== undefined && l.quantityToday !== null ? Number(l.quantityToday) : undefined,
      note: (l.note as string) || undefined,
      proposalNote: (l.proposalNote as string) || undefined,
      issueNote: (l.issueNote as string) || undefined,
    })),
    materials: (r.materials as string) || '',
    labor: (r.labor as string) || '',
    quality: (r.quality as string) || '',
    issues: (r.issues as string) || '',
    recommendations: (r.recommendations as string) || '',
    gpsLocation:
      r.gpsLat !== undefined && r.gpsLat !== null && r.gpsLng !== undefined && r.gpsLng !== null
        ? `${Number(r.gpsLat)}, ${Number(r.gpsLng)}`
        : undefined,
    
    // Derived business logic
    hasIssues: (() => {
      const rawIssues = (r.issues as string || '').trim();
      const isIssueValid = rawIssues.length > 0 && !rawIssues.toLowerCase().startsWith('không có') && !rawIssues.toLowerCase().startsWith('không');
      const hasIssueNote = ((r.lines as Record<string, unknown>[]) || []).some(l => (l.issueNote as string || '').trim().length > 0);
      return isIssueValid || hasIssueNote;
    })(),
    hasNotes: (() => {
      const hasNote = ((r.lines as Record<string, unknown>[]) || []).some(l => (l.note as string || '').trim().length > 0 || (l.proposalNote as string || '').trim().length > 0);
      const hasSummary = (r.summary as string || '').trim().length > 0 && (r.summary as string) !== "No content";
      const hasRecommendations = (r.recommendations as string || '').trim().length > 0 && !((r.recommendations as string).toLowerCase().startsWith('tiếp tục'));
      return hasNote || hasSummary || hasRecommendations;
    })(),
    isSevereIssue: (() => {
      const severeKeywords = ['nguy hiểm', 'tai nạn', 'dừng thi công', 'chậm tiến độ', 'vượt khối lượng', 'vượt ngân sách', 'không đạt', 'sai kỹ thuật', 'thiếu vật tư', 'mưa lớn', 'sạt lở', 'an toàn'];
      const combinedText = [(r.issues as string || ''), ((r.lines as Record<string, unknown>[]) || []).map(l => (l.issueNote as string) || '').join(' ')].join(' ').toLowerCase();
      return severeKeywords.some(kw => combinedText.includes(kw));
    })(),

    approvalHistory: [], // Phase 4
  }));

  // Also get full list stats (for MVP, we might still want global stats, or stats based on filters without pagination)
  // To compute global stats, we'll fetch just counts.
  // Actually, computing stats based on all reports is heavy. The UX audit says:
  // "KPI tính chung tất cả report". 
  // Let's keep it simple for now and just pass paginated reports. The stats will reflect the current page if we do that,
  // which is wrong. We need global stats.
  /*
  const removedLegacyStats = [].map((r: Record<string, unknown>) => {
    const rawIssues = (r.issues as string || '').trim();
    const isIssueValid = rawIssues.length > 0 && !rawIssues.toLowerCase().startsWith('không có') && !rawIssues.toLowerCase().startsWith('không');
    
    const lines = (r.lines as Record<string, unknown>[]) || [];
    const hasIssueNote = lines.some(l => {
      const issueNote = (l.issueNote as string || '').trim();
      return issueNote.length > 0;
    });

    return { 
      status: r.status, 
      type: r.type,
      hasIssues: isIssueValid || hasIssueNote,
      createdById: r.createdById,
      reportDate: (r.reportDate as Date).toISOString()
    };
  });
  */
  
  return <ReportsWorkspace 
    initialReports={serializePrisma(reports)} 
    totalReports={pageData.total}
    currentPage={pageData.page}
    stats={pageData.stats}
    initialProjects={projects} 
    currentUser={{ id: session.id, name: session.name || session.email || "Người dùng hiện tại", role: session.role }} 
    globalContext={globalContext}
  />;
}
