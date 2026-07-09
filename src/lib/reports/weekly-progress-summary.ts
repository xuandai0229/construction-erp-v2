import type { Prisma, SiteReportStatus } from "@prisma/client";
import { getVietnamDateString } from "./report-timezone";

type WeeklySummaryOptions = {
  projectId: string;
  start: Date;
  end: Date;
  includeSubmitted?: boolean;
  includeDraft?: boolean;
};

type WeeklySourceReport = {
  id: string;
  reportNo: string;
  date: string;
};

type WeeklyProgressItem = {
  fieldProgressItemId?: string | null;
  workItemId?: string | null;
  code?: string | null;
  workContent: string;
  unit?: string | null;
  designQuantity: number;
  quantityBeforeWeek: number;
  quantityInWeek: number;
  quantity: number;
  quantityToDate: number;
  remainingQuantity: number;
  progressPercent: number;
  dates: string[];
  sourceReports: WeeklySourceReport[];
  sourceStatus: SiteReportStatus;
  hasIssue: boolean;
  issueNote: string;
  attachmentCount: number;
};

type WeeklyProgressGroup = {
  categoryId: string;
  categoryName: string;
  items: WeeklyProgressItem[];
};

function toDateKey(date: Date) {
  return getVietnamDateString(date);
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getNumber(value: unknown) {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function computePercent(quantity: number, designQuantity: number) {
  if (designQuantity <= 0) return 0;
  return Math.min(999.99, (quantity / designQuantity) * 100);
}

export async function getWeeklyProgressSummaryForProject(
  client: Prisma.TransactionClient,
  options: WeeklySummaryOptions,
) {
  const statuses: SiteReportStatus[] = ["APPROVED"];
  if (options.includeSubmitted) statuses.push("SUBMITTED", "REVISION_REQUESTED");
  if (options.includeDraft) statuses.push("DRAFT");

  const reports = await client.siteReport.findMany({
    where: {
      projectId: options.projectId,
      type: "DAILY",
      deletedAt: null,
      status: { in: statuses },
      reportDate: { gte: options.start, lte: options.end },
    },
    include: {
      attachments: { select: { id: true, kind: true } },
      lines: {
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
        include: {
          fieldProgressItem: {
            select: {
              id: true,
              code: true,
              categoryName: true,
              workContent: true,
              unit: true,
              designQuantity: true,
            },
          },
        },
      },
    },
    orderBy: { reportDate: "asc" },
  });

  const dayStatuses = [];
  for (let cursor = new Date(options.start); cursor <= options.end; cursor = addUtcDays(cursor, 1)) {
    const date = toDateKey(cursor);
    const dayReports = reports.filter((report) => toDateKey(report.reportDate) === date);
    dayStatuses.push({
      date,
      hasReport: dayReports.length > 0,
      approvedCount: dayReports.filter((report) => report.status === "APPROVED").length,
      submittedCount: dayReports.filter((report) => report.status === "SUBMITTED" || report.status === "REVISION_REQUESTED").length,
      draftCount: dayReports.filter((report) => report.status === "DRAFT").length,
      rejectedCount: dayReports.filter((report) => report.status === "REJECTED").length,
      hasIssues: dayReports.some((report) => Boolean(report.issues?.trim())),
    });
  }

  const approvedReports = reports.filter((report) => report.status === "APPROVED");
  const stats = {
    approvedReports: approvedReports.length,
    submittedReports: reports.filter((report) => report.status === "SUBMITTED" || report.status === "REVISION_REQUESTED").length,
    rejectedReports: reports.filter((report) => report.status === "REJECTED").length,
    draftReports: reports.filter((report) => report.status === "DRAFT").length,
    emptyDays: dayStatuses.filter((day) => !day.hasReport).length,
    workLineCount: 0,
    workItemCount: 0,
    attachmentCount: reports.reduce((sum, report) => sum + report.attachments.length, 0),
    issueCount: 0,
    totalQuantityInWeek: 0,
  };

  const groupMap = new Map<string, { categoryId: string; categoryName: string; itemsMap: Map<string, WeeklyProgressItem> }>();

  for (const report of approvedReports) {
    const reportDate = toDateKey(report.reportDate);
    for (const line of report.lines) {
      const fieldItem = line.fieldProgressItem;
      const categoryName = fieldItem?.categoryName || line.area || "Chua phan hang muc";
      const categoryId = categoryName;
      const workContent = fieldItem?.workContent || line.workName || line.workContent || "Cong viec chua ro";
      const unit = fieldItem?.unit || line.unit;
      const designQuantity = getNumber(line.designQuantity ?? fieldItem?.designQuantity);
      const quantityToday = getNumber(line.quantityToday);
      const quantityBefore = getNumber(line.quantityBefore);

      stats.workLineCount++;
      stats.totalQuantityInWeek += quantityToday;
      if (line.issueNote?.trim()) stats.issueCount++;

      if (!groupMap.has(categoryId)) {
        groupMap.set(categoryId, { categoryId, categoryName, itemsMap: new Map() });
      }

      const group = groupMap.get(categoryId)!;
      const itemKey = line.fieldProgressItemId || `${workContent}|${unit || ""}`;
      const existing = group.itemsMap.get(itemKey);

      if (!existing) {
        group.itemsMap.set(itemKey, {
          fieldProgressItemId: line.fieldProgressItemId,
          workItemId: line.fieldProgressItemId,
          code: fieldItem?.code || null,
          workContent,
          unit,
          designQuantity,
          quantityBeforeWeek: quantityBefore,
          quantityInWeek: quantityToday,
          quantity: quantityToday,
          quantityToDate: quantityBefore + quantityToday,
          remainingQuantity: Math.max(0, designQuantity - (quantityBefore + quantityToday)),
          progressPercent: computePercent(quantityBefore + quantityToday, designQuantity),
          dates: [reportDate],
          sourceReports: [{ id: report.id, reportNo: report.reportNo, date: reportDate }],
          sourceStatus: report.status,
          hasIssue: Boolean(line.issueNote?.trim()),
          issueNote: line.issueNote?.trim() || "",
          attachmentCount: report.attachments.length,
        });
        continue;
      }

      existing.quantityBeforeWeek = Math.min(existing.quantityBeforeWeek, quantityBefore);
      existing.quantityInWeek += quantityToday;
      existing.quantity = existing.quantityInWeek;
      existing.quantityToDate = existing.quantityBeforeWeek + existing.quantityInWeek;
      existing.remainingQuantity = Math.max(0, existing.designQuantity - existing.quantityToDate);
      existing.progressPercent = computePercent(existing.quantityToDate, existing.designQuantity);
      if (!existing.dates.includes(reportDate)) existing.dates.push(reportDate);
      if (!existing.sourceReports.some((source) => source.id === report.id)) {
        existing.sourceReports.push({ id: report.id, reportNo: report.reportNo, date: reportDate });
      }
      if (line.issueNote?.trim()) {
        existing.hasIssue = true;
        existing.issueNote = existing.issueNote ? `${existing.issueNote} | ${line.issueNote.trim()}` : line.issueNote.trim();
      }
      existing.attachmentCount += report.attachments.length;
    }
  }

  const groups: WeeklyProgressGroup[] = Array.from(groupMap.values()).map((group) => ({
    categoryId: group.categoryId,
    categoryName: group.categoryName,
    items: Array.from(group.itemsMap.values()).map((item) => ({
      ...item,
      designQuantity: item.designQuantity ?? 0,
      quantityBeforeWeek: item.quantityBeforeWeek ?? 0,
      quantityInWeek: item.quantityInWeek ?? 0,
      quantity: item.quantity ?? 0,
      quantityToDate: item.quantityToDate ?? 0,
      remainingQuantity: item.remainingQuantity ?? 0,
      progressPercent: item.progressPercent ?? 0,
      dates: item.dates ? [...item.dates].sort() : [],
      sourceReports: item.sourceReports ? [...item.sourceReports].sort((a, b) => a.date.localeCompare(b.date)) : [],
    })),
  }));
  stats.workItemCount = groups.reduce((sum, group) => sum + group.items.length, 0);

  let emptyReason: string | null = null;
  if (approvedReports.length === 0 && reports.length === 0) emptyReason = "NO_REPORTS_IN_RANGE";
  else if (approvedReports.length === 0 && reports.length > 0) emptyReason = "NO_APPROVED_REPORTS";
  else if (approvedReports.length > 0 && stats.workLineCount === 0) emptyReason = "HAS_REPORTS_BUT_NO_WORK_LINES";

  return {
    range: {
      fromDate: toDateKey(options.start),
      toDate: toDateKey(options.end),
    },
    dayStatuses,
    stats,
    groups,
    emptyReason,
  };
}
