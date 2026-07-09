import { Prisma, type FieldProgressEntryStatus } from "@prisma/client";
import { getWorkDateRange } from "@/lib/date/work-date";

export type VolumeBalanceOptions = {
  /**
   * The ID of the current report or entry being edited.
   * Quantities from this report/entry will be EXCLUDED from the entered sum
   * to avoid double-counting.
   */
  excludeSourceMarker?: string;
  
  /**
   * The target work date (YYYY-MM-DD). If provided, calculates `sameDateEnteredQuantity`
   */
  targetDate?: string;
};

export type VolumeBalanceResult = {
  plannedQuantity: number;
  totalActiveEnteredQuantity: number;
  sameDateEnteredQuantity: number;
  remainingQuantity: number;
  progressPercent: number;
};

const ACTIVE_STATUSES: FieldProgressEntryStatus[] = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REVISION_REQUESTED"
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
      note: true,
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

  const totalsMap = new Map<string, { total: number; sameDate: number }>();
  for (const itemId of itemIds) {
    totalsMap.set(itemId, { total: 0, sameDate: 0 });
  }

  for (const entry of activeEntries) {
    // Exclude the entry if it matches the excludeSourceMarker (e.g. current report being edited)
    if (options?.excludeSourceMarker && entry.note?.includes(options.excludeSourceMarker)) {
      continue;
    }

    const qty = Number(entry.quantity || 0);
    const itemTotals = totalsMap.get(entry.itemId);
    
    if (itemTotals) {
      itemTotals.total += qty;

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

  // 4. Calculate final balances
  for (const itemId of itemIds) {
    const planned = designQuantityMap.get(itemId) || 0;
    const totals = totalsMap.get(itemId)!;
    const remaining = Math.max(0, planned - totals.total);
    const progressPercent = planned > 0 ? Math.min(999.99, (totals.total / planned) * 100) : 0;

    result.set(itemId, {
      plannedQuantity: planned,
      totalActiveEnteredQuantity: totals.total,
      sameDateEnteredQuantity: totals.sameDate,
      remainingQuantity: remaining,
      progressPercent: progressPercent,
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
    throw new Error(`Item ${itemId} not found`);
  }
  return result;
}
