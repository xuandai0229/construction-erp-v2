import { Prisma, type FieldProgressEntryStatus, type UserRole } from "@prisma/client";

import { getWorkDateRange } from "@/lib/date/work-date";
import { evaluateVolumeGuard } from "@/lib/field-progress/volume-guard";
import { getVietnamDateString } from "@/lib/reports/report-timezone";

export type ReportProgressSyncMode = "SAVE" | "SUBMIT" | "APPROVE" | "REJECT" | "CANCEL";

export type ReportProgressSyncActor = {
  id: string;
  name?: string | null;
  role: UserRole;
};

export type ReportProgressSyncInput = {
  reportId: string;
  mode: ReportProgressSyncMode;
  actor: ReportProgressSyncActor;
  qaTag?: string;
};

export type ReportProgressSyncResult = {
  reportId: string;
  projectId: string;
  created: number;
  updated: number;
  skipped: number;
  blocked: number;
  errors: string[];
};

export type ReportProgressSyncClient = {
  $transaction<T>(
    callback: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T>;
};

const Decimal = Prisma.Decimal;

const PROGRESS_WRITE_ROLES: UserRole[] = [
  "ADMIN",
  "DIRECTOR",
  "DEPUTY_DIRECTOR",
  "CHIEF_COMMANDER",
  "MANAGER",
  "ENGINEER",
];

const PROGRESS_REVIEW_ROLES: UserRole[] = ["ADMIN", "DIRECTOR"];

export function getReportProgressSourceMarker(reportId: string) {
  return `[SOURCE:SITE_REPORT:${reportId}]`;
}

function getReportProgressLineMarker(lineId: string) {
  return `[SOURCE_LINE:${lineId}]`;
}

function getQaMarker(qaTag?: string) {
  return qaTag ? `[QA:${qaTag}]` : "";
}

function hasReportSource(note: string | null | undefined, reportId: string) {
  return Boolean(note?.includes(getReportProgressSourceMarker(reportId)));
}

function buildEntryNote(input: {
  note?: string | null;
  reportId: string;
  lineId: string;
  qaTag?: string;
}) {
  const base = input.note?.trim();
  const markers = [
    getReportProgressSourceMarker(input.reportId),
    getReportProgressLineMarker(input.lineId),
    getQaMarker(input.qaTag),
  ]
    .filter(Boolean)
    .join(" ");
  return base ? `${base}\n${markers}` : markers;
}

async function assertProjectAccess(
  tx: Prisma.TransactionClient,
  projectId: string,
  actor: ReportProgressSyncActor,
) {
  if (["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"].includes(actor.role)) return;

  const member = await tx.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: actor.id } },
    select: { isActive: true, deletedAt: true, leftAt: true },
  });

  if (!member || !member.isActive || member.deletedAt || member.leftAt) {
    throw new Error("Không có quyền nhập khối lượng cho công trình này");
  }
}

function assertActorAllowed(input: {
  mode: ReportProgressSyncMode;
  report: { createdById: string };
  actor: ReportProgressSyncActor;
}) {
  if (!PROGRESS_WRITE_ROLES.includes(input.actor.role)) {
    throw new Error("Không có quyền nhập khối lượng từ báo cáo hiện trường");
  }

  if (input.mode === "SUBMIT" && input.report.createdById !== input.actor.id) {
    throw new Error("Không có quyền gửi khối lượng cho báo cáo này");
  }

  if ((input.mode === "APPROVE" || input.mode === "REJECT") && !PROGRESS_REVIEW_ROLES.includes(input.actor.role)) {
    throw new Error("Không có quyền duyệt/từ chối khối lượng báo cáo");
  }
}

async function syncCancelledOrRejectedEntries(
  tx: Prisma.TransactionClient,
  input: ReportProgressSyncInput,
  targetStatus: Extract<FieldProgressEntryStatus, "REVISION_REQUESTED" | "CANCELLED">,
  report: { id: string; projectId: string; rejectedReason?: string | null },
): Promise<ReportProgressSyncResult> {
  const existing = await tx.fieldProgressEntry.findMany({
    where: {
      projectId: report.projectId,
      deletedAt: null,
      note: { contains: getReportProgressSourceMarker(report.id) },
    },
  });

  for (const entry of existing) {
    await tx.fieldProgressEntry.update({
      where: { id: entry.id },
      data: {
        status: targetStatus,
        rejectedReason: targetStatus === "REVISION_REQUESTED" ? report.rejectedReason : null,
        approvedAt: null,
        approvedById: null,
      },
    });
  }

  return {
    reportId: report.id,
    projectId: report.projectId,
    created: 0,
    updated: existing.length,
    skipped: 0,
    blocked: 0,
    errors: [],
  };
}

export async function syncSiteReportProgressEntriesInTransaction(
  tx: Prisma.TransactionClient,
  input: ReportProgressSyncInput,
): Promise<ReportProgressSyncResult> {
  const report = await tx.siteReport.findFirst({
    where: { id: input.reportId, deletedAt: null },
    include: {
      lines: {
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!report) {
    throw new Error("Không tìm thấy báo cáo hiện trường");
  }

  await assertProjectAccess(tx, report.projectId, input.actor);
  assertActorAllowed({ mode: input.mode, report, actor: input.actor });

  if (report.type !== "DAILY") {
    return {
      reportId: report.id,
      projectId: report.projectId,
      created: 0,
      updated: 0,
      skipped: report.lines.length,
      blocked: 0,
      errors: [],
    };
  }

  if (input.mode === "CANCEL") {
    return syncCancelledOrRejectedEntries(tx, input, "CANCELLED", report);
  }

  if (input.mode === "REJECT") {
    return syncCancelledOrRejectedEntries(tx, input, "REVISION_REQUESTED", report);
  }

  const progressLines = report.lines.filter((line) => Number(line.quantityToday || 0) > 0);
  if (progressLines.length === 0) {
    throw new Error("Báo cáo ngày cần ít nhất một dòng khối lượng lớn hơn 0");
  }

  for (const line of progressLines) {
    if (!line.fieldProgressItemId) {
      throw new Error("Dòng khối lượng phải chọn công việc từ khối lượng gốc");
    }
  }

  const itemIds = [...new Set(progressLines.map((line) => line.fieldProgressItemId!))];
  const items = await tx.fieldProgressItem.findMany({
    where: {
      id: { in: itemIds },
      projectId: report.projectId,
      itemType: "WORK",
      deletedAt: null,
    },
    select: {
      id: true,
      templateId: true,
      projectId: true,
      code: true,
      categoryName: true,
      workContent: true,
      designQuantity: true,
      unit: true,
    },
  });
  const itemById = new Map(items.map((item) => [item.id, item]));

  const missingItemId = itemIds.find((itemId) => !itemById.has(itemId));
  if (missingItemId) {
    throw new Error(`Công việc khối lượng gốc không hợp lệ hoặc đã bị xóa: ${missingItemId}`);
  }

  const reportWorkDate = getVietnamDateString(report.reportDate);
  const { start, end } = getWorkDateRange(reportWorkDate);

  const { getBulkWorkQuantityBalance } = await import("@/lib/field-progress/volume-balance");
  const balances = await getBulkWorkQuantityBalance(tx, report.projectId, itemIds, {
    excludeSourceMarker: getReportProgressSourceMarker(report.id),
  });

  const existingEntries = await tx.fieldProgressEntry.findMany({
    where: {
      projectId: report.projectId,
      itemId: { in: itemIds },
      note: { contains: getReportProgressSourceMarker(report.id) },
      deletedAt: null,
      status: { not: "CANCELLED" },
    },
  });

  const existingByItemId = new Map<string, typeof existingEntries[0]>();
  for (const entry of existingEntries) {
    existingByItemId.set(entry.itemId, entry);
  }

  const staleOwnEntries = await tx.fieldProgressEntry.findMany({
    where: {
      projectId: report.projectId,
      deletedAt: null,
      status: { not: "CANCELLED" },
      note: { contains: getReportProgressSourceMarker(report.id) },
      itemId: { notIn: itemIds },
    },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let blocked = 0;
  const errors: string[] = [];
  const targetStatus: FieldProgressEntryStatus =
    input.mode === "APPROVE" ? "APPROVED" : input.mode === "SAVE" ? "DRAFT" : "SUBMITTED";

  for (const staleEntry of staleOwnEntries) {
    await tx.fieldProgressEntry.update({
      where: { id: staleEntry.id },
      data: {
        status: "CANCELLED",
        approvedAt: null,
        approvedById: null,
      },
    });
    updated++;
  }

  for (const line of progressLines) {
    const itemId = line.fieldProgressItemId!;
    const item = itemById.get(itemId)!;
    const quantityToday = Number(line.quantityToday || 0);
    
    const balance = balances.get(itemId)!;
    const designQuantity = balance.plannedQuantity;
    const cumulativeBefore = balance.totalActiveEnteredQuantity;

    const existing = existingByItemId.get(itemId);

    const guard = evaluateVolumeGuard({
      designQuantity,
      cumulativeBefore,
      todayQuantity: quantityToday,
      status: targetStatus,
      note: line.note,
      issueNote: line.issueNote,
      proposalNote: line.proposalNote,
    });

    if (!guard.canSubmit) {
      blocked++;
      errors.push(`Khối lượng nhập vượt phần còn lại cho công việc ${item.code}. Thiết kế: ${designQuantity}, đã nhập: ${cumulativeBefore}, còn lại: ${balance.remainingQuantity}.`);
      continue;
    }

    const progressPercent = designQuantity > 0 ? Math.min(999.99, (guard.projectedCumulative / designQuantity) * 100) : 0;

    await tx.siteReportLine.update({
      where: { id: line.id },
      data: {
        workName: item.workContent || item.code || line.workName || line.workContent,
        workContent: item.workContent || line.workContent,
        area: item.categoryName || line.area,
        unit: item.unit || line.unit,
        designQuantity: new Decimal(designQuantity),
        quantityBefore: new Decimal(cumulativeBefore),
        quantityCumulative: new Decimal(guard.projectedCumulative),
        progressPercent: new Decimal(progressPercent),
      },
    });

    const entryData = {
      projectId: report.projectId,
      templateId: item.templateId,
      itemId,
      entryDate: start,
      quantity: new Decimal(quantityToday),
      issueNote: line.issueNote,
      proposalNote: line.proposalNote,
      note: buildEntryNote({
        note: line.note,
        reportId: report.id,
        lineId: line.id,
        qaTag: input.qaTag,
      }),
      status: targetStatus,
      submittedAt: new Date(),
      approvedAt: targetStatus === "APPROVED" ? new Date() : null,
      approvedById: targetStatus === "APPROVED" ? input.actor.id : null,
      rejectedReason: null,
      deletedAt: null,
    };

    if (existing) {
      await tx.fieldProgressEntry.update({
        where: { id: existing.id },
        data: entryData,
      });
      updated++;
    } else {
      await tx.fieldProgressEntry.create({
        data: {
          ...entryData,
          createdById: report.createdById,
        },
      });
      created++;
    }
  }

  if (blocked > 0) {
    throw new Error(errors.join("; "));
  }

  return {
    reportId: report.id,
    projectId: report.projectId,
    created,
    updated,
    skipped,
    blocked,
    errors,
  };
}

export async function syncSiteReportProgressEntries(
  client: ReportProgressSyncClient,
  input: ReportProgressSyncInput,
) {
  return client.$transaction((tx) => syncSiteReportProgressEntriesInTransaction(tx, input));
}
