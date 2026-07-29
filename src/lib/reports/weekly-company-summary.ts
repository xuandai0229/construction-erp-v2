import { UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getVietnamIsoWeekInfo, vietnamEndOfDayUtc, vietnamStartOfDayUtc } from "@/lib/reports/report-timezone";
import { parseWeeklyGeneralNote } from "@/lib/reports/weekly-report-utils";
import { isCompanyWideUser } from "@/lib/rbac";

// ---------------------------------------------------------------------------
// Types - Unified View Model (NO APPROVAL STATUS / NO APPROVAL STATS)
// ---------------------------------------------------------------------------

export type WeeklyProjectEntry = {
  id: string;
  code: string;
  name: string;
  hasReport: boolean;
  reporter: string | null;
  result: string | null;
  incompleteWork: string | null;
  issues: string | null;
  safety: string | null;
  quality: string | null;
  materials: string | null;
  labor: string | null;
  equipment: string | null;
  nextWeekPlan: string | null;
  supportNeeded: string | null;
  updatedAtIso: string | null;
};

export type WeeklyCompanySummary = {
  week: ReturnType<typeof getVietnamIsoWeekInfo>;
  generatedAt: string; // ISO string for serialization
  summaryCounts: {
    totalProjects: number;
    reportedProjects: number;
    missingProjects: number;
  };
  projects: WeeklyProjectEntry[];
};

// ---------------------------------------------------------------------------
// Permission
// ---------------------------------------------------------------------------

export function assertWeeklyCompanySummaryPermission(role: UserRole) {
  if (!isCompanyWideUser({ role }))
    throw new Error("Bạn không có quyền tổng hợp báo cáo tuần toàn công ty.");
}

export function canAggregateWeeklyCompanySummary(role: UserRole): boolean {
  return isCompanyWideUser({ role });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * When multiple weekly reports exist for the same project+week,
 * select the LATEST version based on updatedAt desc, then createdAt desc, then id desc.
 * NOTE: Approval status does NOT influence selection priority anymore.
 */
function selectLatestReport<T extends { updatedAt: Date; createdAt?: Date; id?: string }>(
  reports: T[],
): T | undefined {
  if (!reports || reports.length === 0) return undefined;
  return [...reports].sort((left, right) => {
    const diffUpdated = right.updatedAt.getTime() - left.updatedAt.getTime();
    if (diffUpdated !== 0) return diffUpdated;

    const leftCreated = left.createdAt ? left.createdAt.getTime() : 0;
    const rightCreated = right.createdAt ? right.createdAt.getTime() : 0;
    const diffCreated = rightCreated - leftCreated;
    if (diffCreated !== 0) return diffCreated;

    return (right.id || "").localeCompare(left.id || "");
  })[0];
}

// ---------------------------------------------------------------------------
// Main query - single batch (no N+1)
// ---------------------------------------------------------------------------

export async function getWeeklyCompanySummary(
  weekStartDate: string,
): Promise<WeeklyCompanySummary> {
  const week = getVietnamIsoWeekInfo(weekStartDate);

  // Validate that weekStartDate is indeed a Monday
  if (week.weekStartDate !== weekStartDate)
    throw new Error("Tuần tổng hợp phải bắt đầu vào Thứ Hai.");

  // Batch query 1: all active / planned / on_hold projects
  const projects = await prisma.project.findMany({
    where: { deletedAt: null, status: { in: ["PLANNING", "ACTIVE", "ON_HOLD"] } },
    select: { id: true, code: true, name: true },
    orderBy: { name: "asc" },
  });

  // Batch query 2: ALL weekly reports for the selected week, across all projects
  // CRITICAL RULE: Filter ONLY by type = 'WEEKLY'. Do NOT filter out any status (DRAFT, SUBMITTED, APPROVED, REJECTED, etc.)
  const reports = await prisma.siteReport.findMany({
    where: {
      type: "WEEKLY",
      deletedAt: null,
      weekStartDate: vietnamStartOfDayUtc(week.weekStartDate),
      weekEndDate: vietnamEndOfDayUtc(week.weekEndDate),
    },
    select: {
      id: true,
      projectId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      summary: true,
      issues: true,
      recommendations: true,
      generalNote: true,
      reporterName: true,
      materials: true,
      labor: true,
      quality: true,
    },
  });

  // Group reports by projectId in memory
  const reportsByProject = new Map<string, typeof reports>();
  for (const report of reports) {
    const existing = reportsByProject.get(report.projectId) ?? [];
    existing.push(report);
    reportsByProject.set(report.projectId, existing);
  }

  // Build summary entries
  const entries: WeeklyProjectEntry[] = projects.map((project) => {
    const projectReports = reportsByProject.get(project.id) ?? [];
    const report = selectLatestReport(projectReports);

    if (!report) {
      return {
        id: project.id,
        code: project.code,
        name: project.name,
        hasReport: false,
        reporter: null,
        result: "Chưa có báo cáo tuần.",
        incompleteWork: null,
        issues: null,
        safety: null,
        quality: null,
        materials: null,
        labor: null,
        equipment: null,
        nextWeekPlan: null,
        supportNeeded: null,
        updatedAtIso: null,
      };
    }

    const note = parseWeeklyGeneralNote(report.generalNote);

    // Extract next week plan
    const nextWeekPlan =
      note.nextWeekPlan
        ?.map((item) => item.workContent)
        .filter(Boolean)
        .join("; ") || null;

    // Extract safety status text if present
    const safetyText =
      note.weeklyAssessment?.safetyStatus === "INCIDENT"
        ? "Có sự cố an toàn"
        : note.weeklyAssessment?.safetyStatus === "RISK"
          ? "Có nguy cơ an toàn"
          : null;

    return {
      id: project.id,
      code: project.code,
      name: project.name,
      hasReport: true,
      reporter: report.reporterName || null,
      result: report.summary || "Đã cập nhật kết quả thi công tuần.",
      incompleteWork: null,
      issues: report.issues || null,
      safety: safetyText,
      quality: report.quality || null,
      materials: report.materials || null,
      labor: report.labor || null,
      equipment: null,
      nextWeekPlan,
      supportNeeded: report.recommendations || null,
      updatedAtIso: report.updatedAt.toISOString(),
    };
  });

  const summaryCounts = {
    totalProjects: entries.length,
    reportedProjects: entries.filter((e) => e.hasReport).length,
    missingProjects: entries.filter((e) => !e.hasReport).length,
  };

  return {
    week,
    generatedAt: new Date().toISOString(),
    summaryCounts,
    projects: entries,
  };
}
