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
import {
  canApproveReport,
  canCreateReport,
  canDeleteReport,
  canRejectReport,
  canSubmitReport,
  canUpdateReport,
  canViewReportHistory,
} from "@/lib/reports/report-workflow-policy";
import { Prisma, UserRole } from "@prisma/client";
import { canAccessProject, getAccessibleProjectIds } from "@/lib/rbac";
import { computeReportStats } from "@/lib/reports/report-stats";
import { WeeklyGeneralNote, serializeWeeklyGeneralNote } from "@/lib/reports/weekly-report-utils";
import {
  getVietnamCustomDateRange,
  getVietnamDateString,
  getVietnamMonthRange,
  getVietnamTodayRange,
  getVietnamWeekRange,
  vietnamDateTimeToUtc,
  vietnamEndOfDayUtc,
  vietnamStartOfDayUtc,
} from "@/lib/reports/report-timezone";
import { getWorkDateRange } from "@/lib/date/work-date";
import { evaluateVolumeGuard } from "@/lib/field-progress/volume-guard";
import { getReportProgressSourceMarker } from "@/lib/reports/report-progress-sync";

const Decimal = Prisma.Decimal;

export async function getActiveProjects() {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");
  
  const user = { id: session.id, role: session.role as UserRole };
  const accessibleProjectIds = await getAccessibleProjectIds(user);
  
  const projects = await prisma.project.findMany({
    where: { 
      deletedAt: null, 
      status: { in: ["PLANNING", "ACTIVE", "ON_HOLD"] },
      ...(accessibleProjectIds !== null ? { id: { in: accessibleProjectIds } } : {})
    },
    select: { id: true, name: true, code: true },
    orderBy: { createdAt: "desc" },
  });
  return projects;
}

type ReportLineBuildClient = Prisma.TransactionClient;

type BuiltDailyLine = {
  projectId: string;
  fieldProgressItemId: string;
  workContent: string;
  workName: string;
  area?: string | null;
  constructionCrew?: string | null;
  quantityToday: Prisma.Decimal;
  unit?: string | null;
  designQuantity: Prisma.Decimal;
  quantityBefore: Prisma.Decimal;
  quantityCumulative: Prisma.Decimal;
  progressPercent: Prisma.Decimal;
  note?: string | null;
  issueNote?: string | null;
  proposalNote?: string | null;
  sortOrder: number;
};

function pickFieldProgressItemId(line: Record<string, unknown>) {
  const raw = line.fieldProgressItemId || line.wbsItemId;
  return raw ? String(raw) : "";
}

function parseQuantityToday(value: unknown) {
  if (value === undefined || value === null || value === "") return 0;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error("Khối lượng hôm nay không hợp lệ");
  }
  return num;
}

async function buildDailyReportLines(input: {
  client: ReportLineBuildClient;
  projectId: string;
  reportDate: Date;
  workLines: Record<string, unknown>[];
  existingReportId?: string;
}) {
  if (input.workLines.length === 0) {
    return [];
  }

  const normalized = input.workLines.map((line, index) => {
    const fieldProgressItemId = pickFieldProgressItemId(line);
    if (!fieldProgressItemId) {
      throw new Error("Khối lượng thi công phải chọn từ bảng khối lượng gốc");
    }
    return {
      raw: line,
      index,
      fieldProgressItemId,
      quantityToday: parseQuantityToday(line.quantityToday),
    };
  });

  const duplicateItem = normalized.find((line, index) =>
    normalized.findIndex((candidate) => candidate.fieldProgressItemId === line.fieldProgressItemId) !== index
  );
  if (duplicateItem) {
    throw new Error("Công việc này đã có trong báo cáo.");
  }

  const itemIds = normalized.map((line) => line.fieldProgressItemId);
  const items = await input.client.fieldProgressItem.findMany({
    where: {
      id: { in: itemIds },
      projectId: input.projectId,
      deletedAt: null,
      itemType: "WORK",
    },
    select: {
      id: true,
      templateId: true,
      code: true,
      categoryName: true,
      constructionCrew: true,
      workContent: true,
      designQuantity: true,
      unit: true,
    },
  });
  const itemById = new Map(items.map((item) => [item.id, item]));
  const missingId = itemIds.find((itemId) => !itemById.has(itemId));
  if (missingId) {
    throw new Error(`Công việc khối lượng gốc không hợp lệ hoặc đã bị xóa: ${missingId}`);
  }

  const reportWorkDate = getVietnamDateString(input.reportDate);
  
  const { getBulkWorkQuantityBalance } = await import("@/lib/field-progress/volume-balance");
  const balances = await getBulkWorkQuantityBalance(input.client, input.projectId, itemIds, {
    targetDate: reportWorkDate,
    excludeSourceMarker: input.existingReportId ? getReportProgressSourceMarker(input.existingReportId) : undefined,
  });

  const built: BuiltDailyLine[] = [];
  for (const line of normalized) {
    const item = itemById.get(line.fieldProgressItemId)!;
    const balance = balances.get(line.fieldProgressItemId)!;

    const designQuantity = balance.plannedQuantity;
    const cumulativeBefore = balance.totalActiveEnteredQuantity;
    
    const guard = evaluateVolumeGuard({
      designQuantity,
      cumulativeBefore,
      todayQuantity: line.quantityToday,
      status: "SUBMITTED",
      note: line.raw.note ? String(line.raw.note) : undefined,
      issueNote: line.raw.issueNote ? String(line.raw.issueNote) : undefined,
      proposalNote: line.raw.proposalNote ? String(line.raw.proposalNote) : undefined,
    });
    
    if (!guard.canSubmit) {
      throw new Error(`Khối lượng nhập vượt phần còn lại. Thiết kế: ${designQuantity}, đã nhập: ${cumulativeBefore}, còn lại: ${balance.remainingQuantity}.`);
    }

    const progressPercent = designQuantity > 0 ? Math.min(999.99, (guard.projectedCumulative / designQuantity) * 100) : 0;
    built.push({
      projectId: input.projectId,
      fieldProgressItemId: item.id,
      workContent: item.workContent || item.code || String(line.raw.workContent || "No content"),
      workName: item.workContent || item.code || String(line.raw.workContent || "No content"),
      area: item.categoryName,
      constructionCrew: item.constructionCrew,
      quantityToday: new Decimal(line.quantityToday),
      unit: item.unit || (line.raw.unit ? String(line.raw.unit) : null),
      designQuantity: new Decimal(designQuantity),
      quantityBefore: new Decimal(cumulativeBefore),
      quantityCumulative: new Decimal(guard.projectedCumulative),
      progressPercent: new Decimal(progressPercent),
      note: line.raw.note ? String(line.raw.note) : null,
      issueNote: line.raw.issueNote ? String(line.raw.issueNote) : null,
      proposalNote: line.raw.proposalNote ? String(line.raw.proposalNote) : null,
      sortOrder: line.index,
    });
  }

  return built;
}

export async function getProjectWorkItems(projectId: string, reportDate?: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = { id: session.id, role: session.role as UserRole };
  const accessibleProjectIds = await getAccessibleProjectIds(user);
  if (accessibleProjectIds !== null && !accessibleProjectIds.includes(projectId)) {
    throw new Error("Không có quyền truy cập dự án này");
  }

  const richFieldItems = await prisma.fieldProgressItem.findMany({
    where: { projectId, deletedAt: null, itemType: "WORK" },
    select: {
      id: true,
      code: true,
      categoryName: true,
      workContent: true,
      designQuantity: true,
      unit: true,
      status: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: "asc" },
  });

  if (richFieldItems.length === 0) return [];

  const itemIds = richFieldItems.map((item) => item.id);
  
  // Use the new volume balance service
  const { getBulkWorkQuantityBalance } = await import("@/lib/field-progress/volume-balance");
  const balances = await getBulkWorkQuantityBalance(prisma, projectId, itemIds, {
    targetDate: reportDate,
  });

  return richFieldItems.map((item) => {
    const balance = balances.get(item.id)!;
    return {
      id: item.id,
      fieldProgressItemId: item.id,
      code: item.code,
      categoryName: item.categoryName,
      name: item.workContent || "Chua dat ten",
      workContent: item.workContent || "Chua dat ten",
      designQuantity: balance.plannedQuantity,
      approvedCumulative: balance.totalActiveEnteredQuantity, // Renaming field logically to total active
      todayQuantity: balance.sameDateEnteredQuantity,
      remainingQuantity: balance.remainingQuantity,
      unit: item.unit || "Lan",
      status: item.status,
      source: "FIELD_PROGRESS",
    };
  });

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

  const hasProjectAccess = accessibleProjectIds === null || accessibleProjectIds.includes(pId);
  if (!canCreateReport(user, hasProjectAccess)) {
    throw new Error("KhÃ´ng cÃ³ quyá»n táº¡o bÃ¡o cÃ¡o hiá»‡n trÆ°á»ng.");
  }

  const status = isDraft ? "DRAFT" : "SUBMITTED";
  const reportDate = vietnamDateTimeToUtc(String(data.date), String(data.time || "07:00"));
  const dailyLines =
    type === "DAILY"
      ? await buildDailyReportLines({
          client: prisma,
          projectId: pId,
          reportDate,
          workLines,
        })
      : [];
  const report = await createSiteReportWithAudit(
    prisma,
    session,
    {
      projectId: String(data.projectId),
      type: (data.type as "DAILY" | "WEEKLY") || "DAILY",
      reportDate,
      weekStartDate: data.weekStartDate ? vietnamStartOfDayUtc(String(data.weekStartDate)) : undefined,
      weekEndDate: data.weekEndDate ? vietnamEndOfDayUtc(String(data.weekEndDate)) : undefined,
      weatherCondition: (data.weatherCondition as "SUNNY" | "CLOUDY" | "OVERCAST" | "LIGHT_RAIN" | "HEAVY_RAIN" | "WINDY" | "STORM" | "OTHER") || undefined,
      weatherTemperature: data.weatherTemperature ? Number(data.weatherTemperature) : undefined,
      gpsLat: data.gpsLat ? Number(data.gpsLat) : undefined,
      gpsLng: data.gpsLng ? Number(data.gpsLng) : undefined,
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
      },
      ...(type === "DAILY" ? { lines: { create: dailyLines } } : {})
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
      project: { select: { name: true, status: true } },
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

const VALID_REPORT_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "REVISION_REQUESTED",
  "LOCKED",
  "CANCELLED",
] as const;

const ISSUE_REPORT_WHERE: Prisma.SiteReportWhereInput = {
  OR: [
    {
      AND: [
        { issues: { not: null, notIn: ["", " "] } },
        { NOT: { issues: { startsWith: "Không có" } } },
        { NOT: { issues: { startsWith: "không có" } } },
        { NOT: { issues: { startsWith: "KhÃ´ng cÃ³" } } },
        { NOT: { issues: { startsWith: "khÃ´ng cÃ³" } } },
      ],
    },
    {
      lines: {
        some: {
          issueNote: { not: null, notIn: ["", " "] },
        },
      },
    },
  ],
};

function addAnd(where: Prisma.SiteReportWhereInput, clause: Prisma.SiteReportWhereInput) {
  const existing = where.AND;
  where.AND = Array.isArray(existing) ? [...existing, clause] : existing ? [existing, clause] : [clause];
}

function isValidReportStatus(status: unknown): status is (typeof VALID_REPORT_STATUSES)[number] {
  return typeof status === "string" && VALID_REPORT_STATUSES.includes(status as (typeof VALID_REPORT_STATUSES)[number]);
}

function applyDateRange(where: Prisma.SiteReportWhereInput, dateRange?: string) {
  if (!dateRange) return;

  if (dateRange === "today") {
    const range = getVietnamTodayRange();
    where.reportDate = { gte: range.start, lte: range.end };
    return;
  }

  if (dateRange === "thisWeek") {
    const range = getVietnamWeekRange();
    where.reportDate = { gte: range.start, lte: range.end };
    return;
  }

  if (dateRange === "thisMonth") {
    const range = getVietnamMonthRange();
    where.reportDate = { gte: range.start, lte: range.end };
    return;
  }

  if (dateRange.includes("_")) {
    const [startStr, endStr] = dateRange.split("_");
    if (startStr && endStr) {
      const range = getVietnamCustomDateRange(startStr, endStr);
      where.reportDate = { gte: range.start, lte: range.end };
    }
  }
}

function buildSiteReportsWhere(
  filters: ReportPageFilters | Record<string, unknown>,
  accessibleProjectIds: string[] | null,
): Prisma.SiteReportWhereInput {
  const where: Prisma.SiteReportWhereInput = {
    deletedAt: null,
    project: { deletedAt: null },
  };

  if (accessibleProjectIds !== null) {
    where.projectId = { in: accessibleProjectIds };
  }

  if (filters.tab === "daily") where.type = "DAILY";
  if (filters.tab === "weekly") where.type = "WEEKLY";
  if (filters.tab === "pending") where.status = "SUBMITTED";
  if (filters.tab === "rejected") where.status = "REJECTED";
  if (filters.tab === "revision") where.status = "REVISION_REQUESTED";
  if (filters.tab === "needsAction") where.status = { in: ["SUBMITTED", "REVISION_REQUESTED"] };
  if (filters.tab === "issues") addAnd(where, ISSUE_REPORT_WHERE);

  if (typeof filters.reportId === "string" && filters.reportId) {
    where.id = filters.reportId;
  }

  if (typeof filters.projectId === "string" && filters.projectId !== "all" && filters.projectId !== "ALL") {
    if (accessibleProjectIds !== null && !accessibleProjectIds.includes(filters.projectId)) {
      where.id = "__NO_ACCESS__";
      return where;
    }
    where.projectId = filters.projectId;
  }

  const tabLocksType = typeof filters.tab === "string" && /^(daily|weekly)$/.test(filters.tab);
  if (typeof filters.type === "string" && filters.type !== "all" && filters.type !== "ALL" && !tabLocksType) {
    if (filters.type === "DAILY" || filters.type === "WEEKLY") where.type = filters.type;
  }

  const tabLocksStatus =
    typeof filters.tab === "string" && /^(pending|rejected|revision|needsAction)$/.test(filters.tab);
  if (typeof filters.status === "string" && filters.status !== "all" && filters.status !== "ALL" && !tabLocksStatus) {
    if (filters.status === "NEEDS_ACTION") {
      where.status = { in: ["SUBMITTED", "REVISION_REQUESTED"] };
    } else if (filters.status === "ISSUE") {
      addAnd(where, ISSUE_REPORT_WHERE);
    } else if (isValidReportStatus(filters.status)) {
      where.status = filters.status;
    }
  }

  if (typeof filters.q === "string" && filters.q.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { reportNo: { contains: q } },
      { title: { contains: q } },
      { reporterName: { contains: q } },
      { createdBy: { name: { contains: q } } },
      { createdBy: { email: { contains: q } } },
      { project: { name: { contains: q } } },
      { project: { code: { contains: q } } },
      { lines: { some: { workContent: { contains: q } } } },
    ];
  }

  applyDateRange(where, typeof filters.dateRange === "string" ? filters.dateRange : undefined);
  return where;
}

async function getSiteReportsPageLegacy(filters: ReportPageFilters) {
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
  if (filters.tab === "rejected") where.status = "REJECTED";
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
    if (filters.status === "NEEDS_ACTION") {
      where.status = { in: ["SUBMITTED", "REVISION_REQUESTED"] };
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
      project: { select: { name: true, status: true } },
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

export async function getSiteReportsPage(filters: ReportPageFilters) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = { id: session.id, role: session.role as UserRole };
  const accessibleProjectIds = await getAccessibleProjectIds(user);
  const where = buildSiteReportsWhere(filters, accessibleProjectIds);

  const total = await prisma.siteReport.count({ where });
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.max(1, Math.min(50, filters.pageSize || 20));
  const skip = (page - 1) * pageSize;

  const [items, statsSource] = await Promise.all([
    prisma.siteReport.findMany({
      where,
      include: {
        project: { select: { name: true, status: true } },
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        lines: { orderBy: { sortOrder: "asc" } },
        attachments: true,
      },
      orderBy: { reportDate: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.siteReport.findMany({
      where,
      select: {
        status: true,
        issues: true,
        lines: { select: { issueNote: true } },
      },
    }),
  ]);

  return {
    items,
    total,
    stats: computeReportStats(statsSource),
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function submitSiteReport(reportId: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = { id: session.id, role: session.role as UserRole };
  const report = await prisma.siteReport.findFirst({
    where: { id: reportId, deletedAt: null, project: { deletedAt: null } },
    select: { id: true, projectId: true, status: true, createdById: true, deletedAt: true },
  });
  if (!report) throw new Error("KhÃ´ng tÃ¬m tháº¥y bÃ¡o cÃ¡o");

  const hasProjectAccess = await canAccessProject(user, report.projectId);
  if (!canSubmitReport(report, user, hasProjectAccess)) {
    throw new Error("KhÃ´ng cÃ³ quyá»n gá»­i bÃ¡o cÃ¡o nÃ y.");
  }

  const updated = await submitSiteReportTransition(prisma, reportId, session);

  revalidatePath("/reports");
  return { success: true, status: updated.status };
}

export async function approveSiteReport(reportId: string, note?: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = { id: session.id, role: session.role as UserRole };
  const report = await prisma.siteReport.findFirst({
    where: { id: reportId, deletedAt: null, project: { deletedAt: null } },
    select: { id: true, projectId: true, status: true, createdById: true, deletedAt: true },
  });
  if (!report) throw new Error("KhÃ´ng tÃ¬m tháº¥y bÃ¡o cÃ¡o");

  const hasProjectAccess = await canAccessProject(user, report.projectId);
  if (!canApproveReport(report, user, hasProjectAccess)) {
    throw new Error("KhÃ´ng cÃ³ quyá»n duyá»‡t bÃ¡o cÃ¡o nÃ y.");
  }

  const updated = await approveSiteReportTransition(prisma, reportId, session, note);

  revalidatePath("/reports");
  return { success: true, status: updated.status };
}

export async function rejectSiteReport(reportId: string, reason: string) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = { id: session.id, role: session.role as UserRole };
  const report = await prisma.siteReport.findFirst({
    where: { id: reportId, deletedAt: null, project: { deletedAt: null } },
    select: { id: true, projectId: true, status: true, createdById: true, deletedAt: true },
  });
  if (!report) throw new Error("KhÃ´ng tÃ¬m tháº¥y bÃ¡o cÃ¡o");

  const hasProjectAccess = await canAccessProject(user, report.projectId);
  if (!canRejectReport(report, user, hasProjectAccess)) {
    throw new Error("KhÃ´ng cÃ³ quyá»n tá»« chá»‘i bÃ¡o cÃ¡o nÃ y.");
  }

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
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = { id: session.id, role: session.role as UserRole };
  const report = await prisma.siteReport.findFirst({
    where: { id: reportId, deletedAt: null, project: { deletedAt: null } },
    select: { id: true, projectId: true, status: true, createdById: true, deletedAt: true },
  });
  if (!report) throw new Error("KhÃ´ng tÃ¬m tháº¥y bÃ¡o cÃ¡o");

  const hasProjectAccess = await canAccessProject(user, report.projectId);
  if (!canViewReportHistory(report, user, hasProjectAccess)) {
    throw new Error("KhÃ´ng cÃ³ quyá»n xem lá»‹ch sá»­ bÃ¡o cÃ¡o nÃ y.");
  }

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
      createdAt: log.createdAt ? log.createdAt.toISOString() : null,
      detail
    };
  });
}

// === PHASE 5: WEEKLY AGGREGATION ===

export async function getWeeklyReportSummary(projectId: string, start: Date, end: Date, options?: { includeSubmitted?: boolean, includeDraft?: boolean }) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = { id: session.id, role: session.role as import('@prisma/client').UserRole };
  const hasProjectAccess = await canAccessProject(user, projectId);
  if (!hasProjectAccess) throw new Error("Unauthorized");

  const fromDate = start.toISOString().split("T")[0];
  const toDate = end.toISOString().split("T")[0];

  const statuses = ["APPROVED"];
  if (options?.includeSubmitted) statuses.push("SUBMITTED", "REVISION_REQUESTED");
  if (options?.includeDraft) statuses.push("DRAFT");

  const reports = await prisma.siteReport.findMany({
    where: {
      projectId,
      type: "DAILY",
      deletedAt: null,
      status: { in: statuses as any[] },
      reportDate: { gte: start, lte: end }
    },
    include: {
      lines: true,
      attachments: { select: { id: true, kind: true } }
    },
    orderBy: { reportDate: "asc" }
  });

  const dayStatuses: any[] = [];
  const curr = new Date(start);
  while (curr <= end) {
    const dStr = curr.toISOString().split("T")[0];
    const dayReps = reports.filter(r => (r.reportDate as Date).toISOString().split("T")[0] === dStr);
    dayStatuses.push({
      date: dStr,
      hasReport: dayReps.length > 0,
      approvedCount: dayReps.filter(r => r.status === "APPROVED").length,
      submittedCount: dayReps.filter(r => r.status === "SUBMITTED" || r.status === "REVISION_REQUESTED").length,
      draftCount: dayReps.filter(r => r.status === "DRAFT").length,
      rejectedCount: dayReps.filter(r => r.status === "REJECTED").length,
      hasIssues: dayReps.some(r => r.issues && r.issues.trim() !== "Không có")
    });
    curr.setDate(curr.getDate() + 1);
  }

  const approvedReports = reports.filter(r => r.status === "APPROVED");
  
  let emptyReason = null;
  if (approvedReports.length === 0 && reports.length === 0) {
    emptyReason = "NO_REPORTS_IN_RANGE";
  } else if (approvedReports.length === 0 && reports.length > 0) {
    emptyReason = "NO_APPROVED_REPORTS";
  }

  const stats = {
    approvedReports: approvedReports.length,
    submittedReports: reports.filter(r => r.status === "SUBMITTED" || r.status === "REVISION_REQUESTED").length,
    rejectedReports: reports.filter(r => r.status === "REJECTED").length,
    emptyDays: dayStatuses.filter(d => !d.hasReport).length,
    workLineCount: 0,
    attachmentCount: reports.reduce((acc, r) => acc + r.attachments.length, 0)
  };

  const groupMap = new Map<string, { categoryId: string, categoryName: string, itemsMap: Map<string, any> }>();

  for (const rep of approvedReports) {
    const repDate = (rep.reportDate as Date).toISOString().split("T")[0];
    for (const line of rep.lines) {
      stats.workLineCount++;
      // Determine category (using wbsItemId or area or default)
      const categoryId = line.area || "default";
      const categoryName = line.area || "Chưa phân hạng mục";

      if (!groupMap.has(categoryId)) {
        groupMap.set(categoryId, { categoryId, categoryName, itemsMap: new Map() });
      }
      
      const group = groupMap.get(categoryId)!;
      const workKey = line.fieldProgressItemId || `${line.workName || line.workContent}_${line.unit || ''}`;
      
      if (!group.itemsMap.has(workKey)) {
        group.itemsMap.set(workKey, {
          workItemId: line.fieldProgressItemId,
          workContent: line.workName || line.workContent,
          unit: line.unit,
          quantity: 0,
          dates: new Set<string>(),
          sourceReports: [],
          sourceStatus: rep.status,
          hasIssue: false,
          issueNote: "",
          attachmentCount: 0
        });
      }

      const item = group.itemsMap.get(workKey)!;
      item.quantity += Number(line.quantityToday || 0);
      item.dates.add(repDate);
      if (!item.sourceReports.find((sr: any) => sr.id === rep.id)) {
        item.sourceReports.push({ id: rep.id, reportNo: rep.reportNo, date: repDate });
      }
      if (line.issueNote) {
        item.hasIssue = true;
        item.issueNote = (item.issueNote ? item.issueNote + " | " : "") + line.issueNote;
      }
      // approximation for line attachments
      item.attachmentCount += rep.attachments.length; // simplify for now
    }
  }

  const groups = Array.from(groupMap.values()).map(g => ({
    categoryId: g.categoryId,
    categoryName: g.categoryName,
    items: Array.from(g.itemsMap.values()).map(item => ({
      ...item,
      dates: Array.from(item.dates),
      quantity: item.quantity
    }))
  }));

  if (approvedReports.length > 0 && stats.workLineCount === 0) {
    emptyReason = "HAS_REPORTS_BUT_NO_WORK_LINES";
  }

  return {
    range: { fromDate, toDate },
    dayStatuses,
    stats,
    groups,
    emptyReason
  };
}

export async function createWeeklyReportFromApprovedDailyReports(input: {
  projectId: string;
  weekStartDate: string;
  weekEndDate: string;
  summary?: string;
  materials?: string;
  labor?: string;
  quality?: string;
  issues?: string;
  recommendations?: string;
  weatherCondition?: string;
  nextWeekStartDate?: string;
  nextWeekEndDate?: string;
  nextWeekPlans?: Record<string, unknown>[];
  weeklyNote?: any;
  isDraft: boolean;
}) {
  const session = await getSession();
  if (!session) throw new Error("Unauthorized");

  const user = { id: session.id, role: session.role as UserRole };
  const hasProjectAccess = await canAccessProject(user, input.projectId);
  if (!canCreateReport(user, hasProjectAccess)) {
    throw new Error("KhÃ´ng cÃ³ quyá»n táº¡o bÃ¡o cÃ¡o tuáº§n.");
  }

  const start = vietnamStartOfDayUtc(input.weekStartDate);
  const end = vietnamEndOfDayUtc(input.weekEndDate);

  // Re-run preview to get exact lines
  const preview = await getWeeklyReportSummary(input.projectId, start, end);
  
  if (!input.isDraft && preview.stats.approvedReports === 0) {
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
        reportDate: vietnamDateTimeToUtc(input.weekEndDate, "17:00"),
        weekStartDate: start,
        weekEndDate: end,
        status,
        createdById: session.id,
        reporterName: session.name,
        submittedAt: status === "SUBMITTED" ? new Date() : null,
        summary: input.summary,
        materials: input.materials,
        labor: input.labor,
        quality: input.quality,
        issues: input.issues,
        recommendations: input.recommendations,
        weatherCondition: (input.weatherCondition as "SUNNY" | "CLOUDY" | "OVERCAST" | "LIGHT_RAIN" | "HEAVY_RAIN" | "WINDY" | "STORM" | "OTHER") || "SUNNY",
        generalNote: input.weeklyNote ? serializeWeeklyGeneralNote(input.weeklyNote) : null,
        lines: {
          create: preview.groups.flatMap(group => 
            group.items.map(item => ({
              projectId: input.projectId,
              workContent: item.workContent,
              workName: item.workContent,
              unit: item.unit,
              quantityToday: item.quantity,
              note: `Hạng mục: ${group.categoryName}`
            }))
          ).map((line, index) => ({ ...line, sortOrder: index }))
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
  const policyUser = { id: session.id, role: (user?.role || session.role) as UserRole };
  const hasProjectAccess = await canAccessProject(policyUser, report.projectId);

  if (!canUpdateReport(report, policyUser, hasProjectAccess)) {
    if (report.status !== "DRAFT" && report.status !== "REJECTED") {
      throw new Error("Chỉ được sửa báo cáo nháp hoặc báo cáo bị từ chối.");
    }
    throw new Error("Không có quyền sửa báo cáo này.");
  }

  const workLines = (data.workLines as Record<string, unknown>[]) || [];

  const updatedReport = await prisma.$transaction(async (tx) => {
    const nextReportDate = data.date ? vietnamDateTimeToUtc(String(data.date), String(data.time || "07:00")) : report.reportDate;
    const dailyLines =
      report.type === "DAILY"
        ? await buildDailyReportLines({
            client: tx,
            projectId: report.projectId,
            reportDate: nextReportDate,
            workLines,
            existingReportId: reportId,
          })
        : [];

    // Delete existing lines
    await tx.siteReportLine.deleteMany({
      where: { siteReportId: reportId }
    });

    // Update report and create new lines
    const result = await tx.siteReport.update({
      where: { id: reportId },
      data: {
        reportDate: nextReportDate,
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
        generalNote: report.type === 'WEEKLY' ? (data.weeklyNote ? serializeWeeklyGeneralNote(data.weeklyNote as any) : null) : report.generalNote,
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
        },
        ...(report.type === "DAILY" ? { lines: { create: dailyLines } } : {})
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

    if (report.type === "DAILY") {
      const { syncSiteReportProgressEntriesInTransaction } = await import("@/lib/reports/report-progress-sync");
      await syncSiteReportProgressEntriesInTransaction(tx, {
        reportId: result.id,
        mode: result.status === "SUBMITTED" ? "SUBMIT" : "SAVE",
        actor: { id: policyUser.id, role: policyUser.role, name: session.name }
      });
    }

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

  const policyUser = { id: session.id, role: (user?.role || session.role) as UserRole };
  const hasProjectAccess = await canAccessProject(policyUser, report.projectId);

  if (!canDeleteReport(report, policyUser, hasProjectAccess)) {
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
