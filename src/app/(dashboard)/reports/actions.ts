"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  approveSiteReportTransition,
  rejectSiteReportTransition,
  submitSiteReportTransition,
} from "@/lib/reports/report-transition-service";
import { createSiteReportWithAudit } from "@/lib/reports/report-create-service";
import { canEditReportContent, canSoftDeleteReport } from "@/lib/reports/report-workflow-policy";
import { UserRole } from "@prisma/client";
import { getAccessibleProjectIds } from "@/lib/rbac";

export async function getActiveProjects() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  
  const user = { id: session.id, role: session.role as UserRole };
  const accessibleProjectIds = await getAccessibleProjectIds(user);
  
  const projects = await prisma.project.findMany({
    where: { 
      deletedAt: null, 
      status: "ACTIVE",
      ...(accessibleProjectIds !== null ? { id: { in: accessibleProjectIds } } : {})
    },
    select: { id: true, name: true, code: true },
    orderBy: { createdAt: "desc" },
  });
  return projects;
}

export async function getProjectWorkItems(projectId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = { id: session.id, role: session.role as UserRole };
  const accessibleProjectIds = await getAccessibleProjectIds(user);
  if (accessibleProjectIds !== null && !accessibleProjectIds.includes(projectId)) {
    throw new Error("Không có quyền truy cập dự án này");
  }

  // Try to fetch FieldProgressItem first
  const fieldItems = await prisma.fieldProgressItem.findMany({
    where: { projectId, deletedAt: null, itemType: "WORK" },
    select: { id: true, workContent: true, unit: true },
    orderBy: { sortOrder: "asc" },
  });

  if (fieldItems.length > 0) {
    return fieldItems.map(item => ({
      id: item.id,
      name: item.workContent || "Chưa đặt tên",
      unit: item.unit || "Lần",
      source: "FIELD_PROGRESS"
    }));
  }

  // Fallback to WBSItems
  const wbsItems = await prisma.wBSItem.findMany({
    where: { projectId, deletedAt: null },
    select: { id: true, name: true, unit: true },
    orderBy: { createdAt: "asc" },
  });

  return wbsItems.map(item => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    source: "WBS"
  }));
}

export async function createSiteReport(data: Record<string, unknown>, isDraft: boolean = false) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  if (!data.projectId) throw new Error("Missing projectId");
  if (!data.date) throw new Error("Missing date");

  const type = (data.type as "DAILY" | "WEEKLY") || "DAILY";
  const workLines = (data.workLines as Record<string, unknown>[]) || [];

  if (type === "DAILY" && workLines.length === 0) {
    throw new Error("Daily report requires at least one work line");
  }

  const pId = String(data.projectId);
  const user = { id: session.id, role: session.role as UserRole };
  const accessibleProjectIds = await getAccessibleProjectIds(user);
  if (accessibleProjectIds !== null && !accessibleProjectIds.includes(pId)) {
    throw new Error("Không có quyền truy cập dự án này");
  }

  const status = isDraft ? "DRAFT" : "SUBMITTED";
  const report = await createSiteReportWithAudit(
    prisma,
    session,
    {
      projectId: String(data.projectId),
      type: (data.type as "DAILY" | "WEEKLY") || "DAILY",
      reportDate: new Date(String(data.date)),
      weekStartDate: data.weekStartDate ? new Date(String(data.weekStartDate)) : undefined,
      weekEndDate: data.weekEndDate ? new Date(String(data.weekEndDate)) : undefined,
      weatherCondition: (data.weatherCondition as "SUNNY" | "CLOUDY" | "OVERCAST" | "LIGHT_RAIN" | "HEAVY_RAIN" | "WINDY" | "STORM" | "OTHER") || undefined,
      weatherTemperature: data.weatherTemperature ? Number(data.weatherTemperature) : undefined,
      summary: data.summary ? String(data.summary) : undefined,
      materials: data.materials ? String(data.materials) : undefined,
      labor: data.labor ? String(data.labor) : undefined,
      quality: data.quality ? String(data.quality) : undefined,
      issues: data.issues ? String(data.issues) : undefined,
      recommendations: data.recommendations ? String(data.recommendations) : undefined,
      status,
      lines: {
        create: workLines.map((line, index) => ({
          projectId: String(data.projectId),
          workContent: String(line.workContent || "No content"),
          workName: String(line.workName || line.workContent),
          quantityToday: (() => {
            if (line.quantityToday === undefined || line.quantityToday === null || line.quantityToday === "") return 0;
            const num = Number(line.quantityToday);
            if (!Number.isFinite(num) || num < 0) throw new Error("Khối lượng hôm nay không hợp lệ");
            return num;
          })(),
          unit: line.unit ? String(line.unit) : undefined,
          note: line.note ? String(line.note) : undefined,
          sortOrder: index,
        }))
      }
    }
  );

  revalidatePath("/reports");
  return { success: true, id: report.id, reportNo: report.reportNo };
}

export async function getSiteReports(filters: Record<string, unknown> = {}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  
  const where: Record<string, unknown> = { 
    deletedAt: null,
    project: { deletedAt: null }
  };

  const user = { id: session.id, role: session.role as UserRole };
  const accessibleProjectIds = await getAccessibleProjectIds(user);

  if (accessibleProjectIds !== null) {
    if (filters.projectId && filters.projectId !== 'ALL' && filters.projectId !== 'all') {
      if (!accessibleProjectIds.includes(filters.projectId as string)) {
        return []; // No access
      }
      where.projectId = filters.projectId;
    } else {
      where.projectId = { in: accessibleProjectIds };
    }
  } else if (filters.projectId && filters.projectId !== 'ALL' && filters.projectId !== 'all') {
    where.projectId = filters.projectId;
  }

  if (filters.type && filters.type !== 'ALL' && filters.type !== 'all') {
    // Only accept valid enum values
    if (['DAILY', 'WEEKLY'].includes(filters.type as string)) {
      where.type = filters.type;
    }
  }
  if (filters.status && filters.status !== 'ALL' && filters.status !== 'all') {
    // Only accept valid enum values
    if (['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED', 'LOCKED', 'CANCELLED'].includes(filters.status as string)) {
      where.status = filters.status;
    }
  }

  const reports = await prisma.siteReport.findMany({
    where,
    include: {
      project: { select: { name: true } },
      lines: {
        orderBy: { sortOrder: 'asc' }
      },
      attachments: true
    },
    orderBy: { reportDate: 'desc' }
  });

  return reports;
}

export type ReportPageFilters = {
  tab?: string;
  q?: string;
  projectId?: string;
  type?: string;
  status?: string;
  dateRange?: string; // e.g. "today", "thisWeek", "thisMonth", or "YYYY-MM-DD_YYYY-MM-DD"
  page?: number;
  pageSize?: number;
  reportId?: string;
};

export async function getSiteReportsPage(filters: ReportPageFilters) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  
  const user = { id: session.id, role: session.role as UserRole };
  const accessibleProjectIds = await getAccessibleProjectIds(user);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { 
    deletedAt: null,
    project: { deletedAt: null }
  };

  if (accessibleProjectIds !== null) {
    where.projectId = { in: accessibleProjectIds };
  }

  // 1. Tab filtering
  if (filters.tab === "daily") where.type = "DAILY";
  if (filters.tab === "weekly") where.type = "WEEKLY";
  if (filters.tab === "pending") where.status = "SUBMITTED";
  if (filters.tab === "rejected") where.status = { in: ["REJECTED", "REVISION_REQUESTED"] };
  if (filters.tab === "issues") {
    where.AND = [
      ...(where.AND || []),
      {
        OR: [
          {
            AND: [
              { issues: { not: null, notIn: ["", " "] } },
              { NOT: { issues: { startsWith: "Không có" } } },
              { NOT: { issues: { startsWith: "không có" } } },
            ]
          },
          {
            lines: {
              some: {
                issueNote: { not: null, notIn: ["", " "] }
              }
            }
          }
        ]
      }
    ];
  }

  // 2. Explicit filters
  if (filters.reportId) {
    where.id = filters.reportId;
  }
  
  if (filters.projectId && filters.projectId !== "all") {
    if (accessibleProjectIds !== null && !accessibleProjectIds.includes(filters.projectId as string)) {
      return { items: [], total: 0, page: 1, pageSize: filters.pageSize || 20, totalPages: 0 };
    }
    where.projectId = filters.projectId;
  }
  if (filters.type && filters.type !== "all" && !filters.tab?.match(/^(daily|weekly)$/)) where.type = filters.type;
  if (filters.status && filters.status !== "all" && !filters.tab?.match(/^(pending|rejected)$/)) {
    if (filters.status === "REJECTED_AND_REVISION") {
      where.status = { in: ["REJECTED", "REVISION_REQUESTED"] };
    } else if (filters.status === "ISSUE") {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            {
              AND: [
                { issues: { not: null, notIn: ["", " "] } },
                { NOT: { issues: { startsWith: "Không có" } } },
                { NOT: { issues: { startsWith: "không có" } } },
              ]
            },
            {
              lines: {
                some: {
                  issueNote: { not: null, notIn: ["", " "] }
                }
              }
            }
          ]
        }
      ];
    } else if (["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "REVISION_REQUESTED", "LOCKED", "CANCELLED"].includes(filters.status)) {
      where.status = filters.status;
    }
  }

  // 3. Search query
  if (filters.q) {
    const q = filters.q;
    // We try to match multiple fields. 
    // Prisma full text search or simple contains
    where.OR = [
      { reportNo: { contains: q } },
      { title: { contains: q } },
      { reporterName: { contains: q } },
      { project: { name: { contains: q } } },
      { project: { code: { contains: q } } },
      { lines: { some: { workContent: { contains: q } } } }
    ];
  }

  // 4. Date Range
  if (filters.dateRange) {
    const now = new Date();
    // VZ Timezone approximation: add 7 hours, get date, then set bounds
    // A simpler approach for "today", "thisWeek", "thisMonth"
    // Since server runs in UTC or local, let's use JS Date but assume local is mostly correct 
    // or use exact offset if needed. Next.js server might be UTC.
    // For simplicity, we just use standard Date methods
    if (filters.dateRange === "today") {
      const start = new Date(now.setHours(0,0,0,0));
      const end = new Date(now.setHours(23,59,59,999));
      where.reportDate = { gte: start, lte: end };
    } else if (filters.dateRange === "thisWeek") {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay() + 1);
      start.setHours(0,0,0,0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23,59,59,999);
      where.reportDate = { gte: start, lte: end };
    } else if (filters.dateRange === "thisMonth") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23,59,59,999);
      where.reportDate = { gte: start, lte: end };
    } else if (filters.dateRange.includes("_")) {
      const [startStr, endStr] = filters.dateRange.split("_");
      const start = new Date(`${startStr}T00:00:00`);
      const end = new Date(`${endStr}T23:59:59`);
      where.reportDate = { gte: start, lte: end };
    }
  }

  // Count total for pagination
  const total = await prisma.siteReport.count({ where });

  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.max(1, Math.min(50, filters.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const items = await prisma.siteReport.findMany({
    where,
    include: {
      project: { select: { name: true } },
      lines: { orderBy: { sortOrder: 'asc' } },
      attachments: true
    },
    orderBy: { reportDate: 'desc' },
    skip,
    take: pageSize
  });

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  };
}

export async function submitSiteReport(reportId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const updated = await submitSiteReportTransition(prisma, reportId, session);

  revalidatePath("/reports");
  return { success: true, status: updated.status };
}

export async function approveSiteReport(reportId: string, note?: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const updated = await approveSiteReportTransition(prisma, reportId, session, note);

  revalidatePath("/reports");
  return { success: true, status: updated.status };
}

export async function rejectSiteReport(reportId: string, reason: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const updated = await rejectSiteReportTransition(
    prisma,
    reportId,
    session,
    reason,
  );

  revalidatePath("/reports");
  return { success: true, status: updated.status };
}

export async function getSiteReportAuditLogs(reportId: string) {
  const logs = await prisma.auditLog.findMany({
    where: { entityType: "SiteReport", entityId: reportId },
    include: { user: { select: { name: true, avatar: true, role: true } } },
    orderBy: { createdAt: 'desc' }
  });
  
  return logs.map(log => {
    let detail = "";
    if (log.afterData) {
      try {
        const parsed = JSON.parse(log.afterData);
        if (parsed.reason) detail = parsed.reason;
        else if (parsed.note) detail = parsed.note;
      } catch {
        // ignore
      }
    }
    
    return {
      id: log.id,
      action: log.action,
      actorName: log.user?.name || "Người dùng",
      actorRole: log.user?.role || "USER",
      createdAt: log.createdAt,
      detail
    };
  });
}

// === PHASE 5: WEEKLY AGGREGATION ===

export async function getWeeklyReportPreview(projectId: string, weekStartDate: Date, weekEndDate: Date) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const accessibleProjectIds = await getAccessibleProjectIds({ id: session.id, role: session.role as UserRole });
  if (accessibleProjectIds !== null && !accessibleProjectIds.includes(projectId)) {
    throw new Error("Không có quyền truy cập dự án này");
  }

  // 1. Check if a weekly report already exists for this period
  const existingWeekly = await prisma.siteReport.findFirst({
    where: {
      projectId,
      type: "WEEKLY",
      weekStartDate: { gte: weekStartDate, lte: weekStartDate },
      weekEndDate: { gte: weekEndDate, lte: weekEndDate },
      deletedAt: null
    }
  });

  if (existingWeekly) {
    throw new Error(`Đã tồn tại báo cáo tuần từ ${weekStartDate.toLocaleDateString("vi-VN")} đến ${weekEndDate.toLocaleDateString("vi-VN")}`);
  }

  // 2. Fetch all reports in this week
  const reports = await prisma.siteReport.findMany({
    where: {
      projectId,
      type: "DAILY",
      reportDate: {
        gte: weekStartDate,
        lte: weekEndDate
      },
      deletedAt: null
    },
    include: {
      lines: true,
      attachments: true
    }
  });

  const approvedReports = reports.filter(r => r.status === "APPROVED");
  const pendingReports = reports.filter(r => r.status === "SUBMITTED");
  const rejectedReports = reports.filter(r => r.status === "REJECTED");
  
  // Calculate missing days (assuming Mon-Sat or Mon-Sun, let's just count days with reports vs total days)
  const diffTime = Math.abs(weekEndDate.getTime() - weekStartDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const daysWithReports = new Set(reports.map(r => r.reportDate.toISOString().split('T')[0])).size;
  const missingDays = diffDays - daysWithReports;

  let totalPhotos = 0;
  let totalFiles = 0;

  approvedReports.forEach(r => {
    r.attachments.forEach(a => {
      if (a.kind === "PHOTO") totalPhotos++;
      else totalFiles++;
    });
  });

  // Aggregate items
  const itemMap = new Map<string, {
    fieldProgressItemId?: string | null;
    workName: string;
    area?: string | null;
    unit?: string | null;
    totalQuantity: number;
    reportCount: number;
    sourceReportIds: Set<string>;
  }>();
  
  for (const report of approvedReports) {
    for (const line of report.lines) {
      const key = line.fieldProgressItemId || `${line.workName || line.workContent}_${line.unit || ''}_${line.area || ''}`;
      if (!itemMap.has(key)) {
        itemMap.set(key, {
          fieldProgressItemId: line.fieldProgressItemId,
          workName: line.workName || line.workContent,
          area: line.area,
          unit: line.unit,
          totalQuantity: 0,
          reportCount: 0,
          sourceReportIds: new Set<string>()
        });
      }
      
      const entry = itemMap.get(key);
      if (entry) {
        entry.totalQuantity += Number(line.quantityToday || 0);
        entry.sourceReportIds.add(report.id);
      }
    }
  }

  const aggregatedItems = Array.from(itemMap.values()).map(item => ({
    ...item,
    reportCount: item.sourceReportIds.size,
    sourceReportIds: Array.from(item.sourceReportIds)
  }));

  return {
    project: await prisma.project.findUnique({ where: { id: projectId } }),
    weekStartDate,
    weekEndDate,
    approvedCount: approvedReports.length,
    pendingCount: pendingReports.length,
    rejectedCount: rejectedReports.length,
    missingDays,
    totalPhotos,
    totalFiles,
    aggregatedItems
  };
}

export async function createWeeklyReportFromApprovedDailyReports(input: {
  projectId: string;
  weekStartDate: string;
  weekEndDate: string;
  summary?: string;
  issues?: string;
  recommendations?: string;
  weatherCondition?: string;
  isDraft: boolean;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const start = new Date(input.weekStartDate);
  const end = new Date(input.weekEndDate);

  // Re-run preview to get exact lines
  const preview = await getWeeklyReportPreview(input.projectId, start, end);
  
  if (preview.approvedCount === 0) {
    throw new Error("Không có báo cáo ngày nào được duyệt trong tuần này để tổng hợp.");
  }

  const status = input.isDraft ? "DRAFT" : "SUBMITTED";

  const newReport = await prisma.$transaction(async (tx) => {
    // Check duplicate again in transaction
    const existing = await tx.siteReport.findFirst({
      where: {
        projectId: input.projectId,
        type: "WEEKLY",
        weekStartDate: start,
        weekEndDate: end,
        deletedAt: null
      }
    });

    if (existing) {
      throw new Error("Báo cáo tuần này đã tồn tại!");
    }

    const report = await tx.siteReport.create({
      data: {
        projectId: input.projectId,
        type: "WEEKLY",
        reportDate: new Date(),
        weekStartDate: start,
        weekEndDate: end,
        status,
        createdById: session.id,
        reporterName: session.name,
        submittedAt: status === "SUBMITTED" ? new Date() : null,
        summary: input.summary,
        issues: input.issues,
        recommendations: input.recommendations,
        weatherCondition: (input.weatherCondition as "SUNNY" | "CLOUDY" | "OVERCAST" | "LIGHT_RAIN" | "HEAVY_RAIN" | "WINDY" | "STORM" | "OTHER") || "SUNNY",
        lines: {
          create: preview.aggregatedItems.map((item, index) => ({
            projectId: input.projectId,
            workContent: item.workName,
            workName: item.workName,
            area: item.area,
            unit: item.unit,
            quantityToday: item.totalQuantity,
            fieldProgressItemId: item.fieldProgressItemId,
            sortOrder: index,
            note: `Được tổng hợp từ ${item.reportCount} báo cáo ngày đã duyệt`
          }))
        }
      }
    });

    await tx.auditLog.create({
      data: {
        userId: session.id,
        projectId: input.projectId,
        entityType: "SiteReport",
        entityId: report.id,
        action: "SITE_REPORT_CREATED",
        afterData: JSON.stringify({
          status,
          type: "WEEKLY",
          reportNo: report.reportNo,
        }),
      }
    });

    if (status === "SUBMITTED") {
      await tx.auditLog.create({
        data: {
          userId: session.id,
          projectId: input.projectId,
          entityType: "SiteReport",
          entityId: report.id,
          action: "SITE_REPORT_SUBMITTED",
          afterData: JSON.stringify({ status: "SUBMITTED" }),
        }
      });
    }

    return report;
  });

  return { success: true, id: newReport.id, reportNo: newReport.reportNo };
}

// === PHASE 3B: EDIT & DELETE ===

export async function updateSiteReport(reportId: string, data: Record<string, unknown>) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { role: true }
  });
  const isSystemAdmin = user && ['ADMIN', 'DIRECTOR'].includes(user.role);

  const report = await prisma.siteReport.findUnique({
    where: { id: reportId },
    include: { lines: true }
  });

  if (!report || report.deletedAt) {
    throw new Error("Không tìm thấy báo cáo hoặc báo cáo đã bị xóa.");
  }

  // Chuyển session user thành format cần thiết cho policy
  const policyUser = { id: session.id, role: user?.role as UserRole };

  if (!canEditReportContent(report, policyUser)) {
    if (report.status !== "DRAFT" && report.status !== "REJECTED") {
      throw new Error("Chỉ được sửa báo cáo nháp hoặc báo cáo bị từ chối.");
    }
    throw new Error("Không có quyền sửa báo cáo này.");
  }

  const workLines = (data.workLines as Record<string, unknown>[]) || [];

  const updatedReport = await prisma.$transaction(async (tx) => {
    // Delete existing lines
    await tx.siteReportLine.deleteMany({
      where: { siteReportId: reportId }
    });

    // Update report and create new lines
    const result = await tx.siteReport.update({
      where: { id: reportId },
      data: {
        reportDate: data.date ? new Date(String(data.date)) : undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        weatherCondition: data.weatherCondition as any || undefined,
        weatherTemperature: data.weatherTemperature ? Number(data.weatherTemperature) : undefined,
        summary: data.summary ? String(data.summary) : null,
        materials: data.materials ? String(data.materials) : null,
        labor: data.labor ? String(data.labor) : null,
        quality: data.quality ? String(data.quality) : null,
        issues: data.issues ? String(data.issues) : null,
        recommendations: data.recommendations ? String(data.recommendations) : null,
        gpsLat: data.gpsLat ? Number(data.gpsLat) : null,
        gpsLng: data.gpsLng ? Number(data.gpsLng) : null,
        // Optional status update if sent (e.g., submit immediately) - wait, only allow DRAFT or SUBMITTED if explicitly told, but we just leave it or handle it if needed
        // For now, do not change status unless explicit
        lines: {
          create: workLines.map((line, index) => ({
            projectId: report.projectId,
            workContent: String(line.workContent || "No content"),
            workName: String(line.workName || line.workContent),
            quantityToday: (() => {
              if (line.quantityToday === undefined || line.quantityToday === null || line.quantityToday === "") return 0;
              const num = Number(line.quantityToday);
              if (!Number.isFinite(num) || num < 0) throw new Error("Khối lượng hôm nay không hợp lệ");
              return num;
            })(),
            unit: line.unit ? String(line.unit) : null,
            note: line.note ? String(line.note) : null,
            sortOrder: index,
          }))
        }
      }
    });

    // Audit Log
    await tx.auditLog.create({
      data: {
        userId: session.id,
        projectId: report.projectId,
        entityType: "SiteReport",
        entityId: report.id,
        action: "SITE_REPORT_UPDATED",
        beforeData: JSON.stringify({
          status: report.status,
          reportDate: report.reportDate,
          summary: report.summary,
          linesCount: report.lines.length
        }),
        afterData: JSON.stringify({
          status: result.status,
          reportDate: result.reportDate,
          summary: result.summary,
          linesCount: workLines.length
        }),
      }
    });

    return result;
  });

  revalidatePath("/reports");
  return { success: true, id: updatedReport.id, reportNo: updatedReport.reportNo };
}

export async function softDeleteSiteReport(reportId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { role: true }
  });
  const isSystemAdmin = user && ['ADMIN', 'DIRECTOR'].includes(user.role);

  const report = await prisma.siteReport.findUnique({
    where: { id: reportId }
  });

  if (!report || report.deletedAt) {
    throw new Error("Không tìm thấy báo cáo hoặc báo cáo đã bị xóa.");
  }

  const policyUser = { id: session.id, role: user?.role as UserRole };

  if (!canSoftDeleteReport(report, policyUser)) {
    if (report.status === "APPROVED" || report.status === "LOCKED" || report.status === "CANCELLED") {
      throw new Error("Không thể xóa báo cáo đã duyệt hoặc đã khóa.");
    }
    throw new Error("Bạn không có quyền xóa báo cáo. Vui lòng liên hệ quản lý hoặc Admin.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.siteReport.update({
      where: { id: reportId },
      data: { deletedAt: new Date() }
    });

    await tx.auditLog.create({
      data: {
        userId: session.id,
        projectId: report.projectId,
        entityType: "SiteReport",
        entityId: report.id,
        action: "SITE_REPORT_SOFT_DELETED",
        beforeData: JSON.stringify({
          status: report.status,
          reportDate: report.reportDate,
        }),
        afterData: JSON.stringify({
          deletedAt: new Date()
        }),
      }
    });
  });

  revalidatePath("/reports");
  return { success: true };
}
