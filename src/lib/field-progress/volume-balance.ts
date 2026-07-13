import { Prisma, type FieldProgressEntryStatus } from "@prisma/client";
import { getWorkDateRange } from "@/lib/date/work-date";

export type VolumeBalanceOptions = {
  /**
   * The ID of the current report or entry being edited.
   * Quantities from this report/entry will be EXCLUDED from the entered sum
   * to avoid double-counting.
   */
  excludeSourceReportId?: string;
  
  /**
   * The target work date (YYYY-MM-DD). If provided, calculates `sameDateEnteredQuantity`
   */
  targetDate?: string;
};

export type VolumeBalanceResult = {
  designQuantity: number;
  plannedQuantity: number;
  totalActiveEnteredQuantity: number; // All dates total
  todayQuantity: number; // Alias for sameDateEnteredQuantity for UI compatibility
  sameDateEnteredQuantity: number; // Today only
  cumulativeBeforeDate: number; // Total before target date
  cumulativeAfterDate: number; // beforeDate + today
  approvedQuantity: number;
  submittedQuantity: number;
  draftQuantity: number;
  pendingQuantity: number;
  remainingQuantity: number; // Overall remaining (planned - totalActiveAllDates)
  remainingAtDate: number; // Remaining at target date
  progressPercent: number; // Overall percent
  progressPercentAtDate: number; // Percent at target date
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "OVER";
};

const ACTIVE_STATUSES: FieldProgressEntryStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED"
];

export async function getBulkWorkQuantityBalance(
  client: Prisma.TransactionClient,
  projectId: string,
  itemIds: string[],
  options?: VolumeBalanceOptions
): Promise<Map<string, VolumeBalanceResult>> {
  const result = new Map<string, VolumeBalanceResult>();

  if (!itemIds || itemIds.length === 0) {
    return result;
  }

  // 1. Get original design quantities
  const items = await client.fieldProgressItem.findMany({
    where: {
      projectId,
      id: { in: itemIds },
      itemType: "WORK",
      deletedAt: null,
    },
    select: { id: true, designQuantity: true },
  });

  const designQuantityMap = new Map<string, number>();
  for (const item of items) {
    designQuantityMap.set(item.id, Number(item.designQuantity || 0));
  }

  // 2. Query all active entries for these items
  const activeEntries = await client.fieldProgressEntry.findMany({
    where: {
      projectId,
      itemId: { in: itemIds },
      status: { in: ACTIVE_STATUSES },
      deletedAt: null,
    },
    select: {
      itemId: true,
      quantity: true,
      entryDate: true,
      status: true,
      sourceReportId: true,
    }
  });

  // 3. Process entries
  let targetStart: Date | null = null;
  let targetEnd: Date | null = null;

  if (options?.targetDate) {
    const range = getWorkDateRange(options.targetDate);
    targetStart = range.start;
    targetEnd = range.end;
  }

  const totalsMap = new Map<string, { total: number; sameDate: number; beforeDate: number; approved: number; submitted: number; draft: number }>();
  for (const itemId of itemIds) {
    totalsMap.set(itemId, { total: 0, sameDate: 0, beforeDate: 0, approved: 0, submitted: 0, draft: 0 });
  }

  for (const entry of activeEntries) {
    // Exclude the entry if it matches the excludeSourceReportId (e.g. current report being edited)
    if (options?.excludeSourceReportId && entry.sourceReportId === options.excludeSourceReportId) {
      continue;
    }

    const qty = Number(entry.quantity || 0);
    const itemTotals = totalsMap.get(entry.itemId);
    
    if (itemTotals) {
      itemTotals.total += qty;
      if (entry.status === "APPROVED") itemTotals.approved += qty;
      if (entry.status === "SUBMITTED") itemTotals.submitted += qty;
      if (entry.status === "DRAFT") itemTotals.draft += qty;

      if (targetStart && entry.entryDate < targetStart) {
        itemTotals.beforeDate += qty;
      }

      if (
        targetStart &&
        targetEnd &&
        entry.entryDate >= targetStart &&
        entry.entryDate < targetEnd
      ) {
        itemTotals.sameDate += qty;
      }
    }
  }

  for (const itemId of itemIds) {
    const planned = designQuantityMap.get(itemId) || 0;
    const totals = totalsMap.get(itemId)!;
    
    // Overall calculations
    const remainingOverall = Math.max(0, planned - totals.total);
    const progressPercentOverall = planned > 0 ? Math.min(999.99, (totals.total / planned) * 100) : 0;

    // Date-bounded calculations
    const beforeDate = targetStart ? totals.beforeDate : totals.total;
    const sameDate = targetStart ? totals.sameDate : 0;
    const afterDate = beforeDate + sameDate;
    const remainingAtDate = Math.max(0, planned - afterDate);
    const progressPercentAtDate = planned > 0 ? Math.min(999.99, (afterDate / planned) * 100) : 0;
    const status =
      totals.total > planned && planned > 0
        ? "OVER"
        : planned > 0 && totals.total >= planned
          ? "COMPLETED"
          : totals.total > 0
            ? "IN_PROGRESS"
            : "NOT_STARTED";

    result.set(itemId, {
      designQuantity: planned,
      plannedQuantity: planned,
      totalActiveEnteredQuantity: totals.total,
      cumulativeBeforeDate: beforeDate,
      todayQuantity: sameDate,
      sameDateEnteredQuantity: sameDate,
      cumulativeAfterDate: afterDate,
      approvedQuantity: totals.approved,
      submittedQuantity: totals.submitted,
      draftQuantity: totals.draft,
      pendingQuantity: totals.submitted + totals.draft,
      remainingQuantity: remainingOverall,
      remainingAtDate: remainingAtDate,
      progressPercent: progressPercentOverall,
      progressPercentAtDate: progressPercentAtDate,
      status,
    });
  }

  return result;
}

export async function getWorkQuantityBalance(
  client: Prisma.TransactionClient,
  projectId: string,
  itemId: string,
  options?: VolumeBalanceOptions
): Promise<VolumeBalanceResult> {
  const map = await getBulkWorkQuantityBalance(client, projectId, [itemId], options);
  const result = map.get(itemId);
  if (!result) {
    throw new Error(`Không tìm thấy hạng mục có mã ${itemId}.`);
  }
  return result;
}
