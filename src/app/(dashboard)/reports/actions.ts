"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getActiveProjects() {
  const projects = await prisma.project.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { id: true, name: true, code: true },
    orderBy: { createdAt: "desc" },
  });
  return projects;
}

export async function getProjectWorkItems(projectId: string) {
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

  const report = await prisma.siteReport.create({
    data: {
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
      createdById: session.id,
      reporterName: session.name, // Snapshot
      status: isDraft ? "DRAFT" : "SUBMITTED",
      lines: {
        create: ((data.workLines as Record<string, unknown>[]) || []).map((line: Record<string, unknown>, index: number) => ({
          projectId: String(data.projectId),
          workContent: String(line.workContent || "No content"),
          workName: String(line.workName || line.workContent),
          quantityToday: line.quantityToday ? Number(line.quantityToday) : 0,
          unit: line.unit ? String(line.unit) : undefined,
          note: line.note ? String(line.note) : undefined,
          sortOrder: index,
        }))
      }
    }
  });

  revalidatePath("/reports");
  return { success: true, id: report.id, reportNo: report.reportNo };
}

export async function getSiteReports(filters: Record<string, unknown> = {}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  
  const where: Record<string, unknown> = { deletedAt: null };

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { role: true }
  });

  const isSystemAdmin = user && ['ADMIN', 'DIRECTOR'].includes(user.role);

  // RBAC: Non-admins can only see their own reports (MVP)
  if (!isSystemAdmin) {
    where.createdById = session.id;
  }
  if (filters.projectId && filters.projectId !== 'ALL' && filters.projectId !== 'all') {
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

export async function submitSiteReport(reportId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const report = await prisma.siteReport.findUnique({ where: { id: reportId } });
  if (!report) throw new Error("Không tìm thấy báo cáo");

  if (report.createdById !== session.id) {
    throw new Error("Không có quyền gửi báo cáo này");
  }

  if (!["DRAFT", "REJECTED"].includes(report.status)) {
    throw new Error("Chỉ có thể gửi báo cáo nháp hoặc bị từ chối");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const rep = await tx.siteReport.update({
      where: { id: reportId },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date()
      }
    });

    await tx.auditLog.create({
      data: {
        userId: session.id,
        projectId: rep.projectId,
        action: "SITE_REPORT_SUBMITTED",
        entityType: "SiteReport",
        entityId: reportId,
        beforeData: JSON.stringify({ status: report.status }),
        afterData: JSON.stringify({ status: "SUBMITTED" })
      }
    });
    return rep;
  });

  revalidatePath("/reports");
  return { success: true, status: updated.status };
}

export async function approveSiteReport(reportId: string, note?: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
  const isSystemAdmin = user && ['ADMIN', 'DIRECTOR'].includes(user.role);
  
  if (!isSystemAdmin) {
    throw new Error("Không có quyền duyệt báo cáo");
  }

  const report = await prisma.siteReport.findUnique({ where: { id: reportId } });
  if (!report) throw new Error("Không tìm thấy báo cáo");

  if (report.status !== "SUBMITTED") {
    throw new Error("Báo cáo không ở trạng thái chờ duyệt");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const rep = await tx.siteReport.update({
      where: { id: reportId },
      data: {
        status: "APPROVED",
        approvedById: session.id,
        approvedAt: new Date(),
        // We can append the note to summary or leave it in audit log. Better in audit log.
      }
    });

    await tx.auditLog.create({
      data: {
        userId: session.id,
        projectId: rep.projectId,
        action: "SITE_REPORT_APPROVED",
        entityType: "SiteReport",
        entityId: reportId,
        beforeData: JSON.stringify({ status: report.status }),
        afterData: JSON.stringify({ status: "APPROVED", note })
      }
    });
    return rep;
  });

  revalidatePath("/reports");
  return { success: true, status: updated.status };
}

export async function rejectSiteReport(reportId: string, reason: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  if (!reason || reason.trim() === "") {
    throw new Error("Bắt buộc nhập lý do từ chối");
  }

  const user = await prisma.user.findUnique({ where: { id: session.id }, select: { role: true } });
  const isSystemAdmin = user && ['ADMIN', 'DIRECTOR'].includes(user.role);
  
  if (!isSystemAdmin) {
    throw new Error("Không có quyền từ chối báo cáo");
  }

  const report = await prisma.siteReport.findUnique({ where: { id: reportId } });
  if (!report) throw new Error("Không tìm thấy báo cáo");

  if (report.status !== "SUBMITTED") {
    throw new Error("Báo cáo không ở trạng thái chờ duyệt");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const rep = await tx.siteReport.update({
      where: { id: reportId },
      data: {
        status: "REJECTED",
        rejectedReason: reason
      }
    });

    await tx.auditLog.create({
      data: {
        userId: session.id,
        projectId: rep.projectId,
        action: "SITE_REPORT_REJECTED",
        entityType: "SiteReport",
        entityId: reportId,
        beforeData: JSON.stringify({ status: report.status }),
        afterData: JSON.stringify({ status: "REJECTED", reason })
      }
    });
    return rep;
  });

  revalidatePath("/reports");
  return { success: true, status: updated.status };
}

export async function getSiteReportAuditLogs(reportId: string) {
  const logs = await prisma.auditLog.findMany({
    where: { entityType: "SiteReport", entityId: reportId },
    include: { user: { select: { name: true, avatar: true } } },
    orderBy: { createdAt: 'desc' }
  });
  
  return logs.map(log => {
    let detail = "";
    if (log.afterData) {
      try {
        const parsed = JSON.parse(log.afterData);
        if (parsed.reason) detail = parsed.reason;
        else if (parsed.note) detail = parsed.note;
      } catch (e) {
        // ignore
      }
    }
    
    return {
      id: log.id,
      action: log.action,
      actorName: log.user?.name || "Người dùng",
      createdAt: log.createdAt,
      detail
    };
  });
}

// === PHASE 5: WEEKLY AGGREGATION ===

export async function getWeeklyReportPreview(projectId: string, weekStartDate: Date, weekEndDate: Date) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

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
  const itemMap = new Map<string, any>();
  
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
      entry.totalQuantity += Number(line.quantityToday || 0);
      entry.sourceReportIds.add(report.id);
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
        summary: input.summary,
        issues: input.issues,
        recommendations: input.recommendations,
        weatherCondition: input.weatherCondition as any || "SUNNY",
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

    // Write audit log
    if (status === "SUBMITTED") {
      await tx.siteReport.update({
        where: { id: report.id },
        data: { submittedAt: new Date() }
      });
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
