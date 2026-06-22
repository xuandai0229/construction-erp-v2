import { formatWorkDate } from "@/lib/date/work-date";

export interface FieldProgressItemRaw {
  id: string;
  parentId?: string | null;
  itemType: string;
  sortOrder: number;
  categoryName?: string | null;
  workContent?: string | null;
  constructionCrew?: string | null;
  unit?: string | null;
  designQuantity?: unknown;
  [key: string]: unknown;
}

import { Prisma } from "@prisma/client";

export interface FieldProgressEntryRecord {
  quantity?: number | string | null | Prisma.Decimal;
  [key: string]: unknown;
}

export type GroupedEntriesByItemAndDate = Record<string, Record<string, FieldProgressEntryRecord[]>>;

export interface FieldProgressRollupItem extends FieldProgressItemRaw {
  designQty: number;
  cumulativeBefore: number;
  periodTotal: number;
  cumulative: number;
  dayTotals: Record<string, number>;
  dayEntries: Record<string, FieldProgressEntryRecord[]>;
  displayLevel: number;
  children: FieldProgressRollupItem[];
}

export interface BuildFieldProgressRollupTreeInput {
  items: FieldProgressItemRaw[];
  groupedEntries: GroupedEntriesByItemAndDate;
  cumulativeBeforeMap: Record<string, number>;
  dynamicDates: Date[];
}

export interface BuildFieldProgressRollupTreeResult {
  itemTree: FieldProgressRollupItem[];
  displayItems: FieldProgressRollupItem[];
}

function safeNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const num = Number(value as number | string);
  return Number.isFinite(num) && !Number.isNaN(num) ? num : 0;
}

function buildTreeItems(items: FieldProgressRollupItem[]) {
  const itemMap: Record<string, FieldProgressRollupItem> = {};
  const roots: FieldProgressRollupItem[] = [];

  const sortedItems = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const item of sortedItems) {
    itemMap[item.id] = { ...item, children: [] };
  }

  for (const item of sortedItems) {
    const node = itemMap[item.id];
    if (item.parentId && itemMap[item.parentId]) {
      itemMap[item.parentId].children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function flattenTreeForTable(tree: FieldProgressRollupItem[], level = 0): FieldProgressRollupItem[] {
  const result: FieldProgressRollupItem[] = [];
  for (const node of tree) {
    result.push({ ...node, displayLevel: level });
    if (node.children && node.children.length > 0) {
      result.push(...flattenTreeForTable(node.children, level + 1));
    }
  }
  return result;
}

export function buildFieldProgressRollupTree({
  items,
  groupedEntries,
  cumulativeBeforeMap,
  dynamicDates,
}: BuildFieldProgressRollupTreeInput): BuildFieldProgressRollupTreeResult {
  const dateKeys = dynamicDates.map((date) => formatWorkDate(date));

  const itemNodes: FieldProgressRollupItem[] = items.map((item) => {
    const isWork = item.itemType === "WORK";
    const dayEntries = isWork ? groupedEntries[item.id] ?? {} : {};
    const dayTotals: Record<string, number> = {};

    for (const dateKey of dateKeys) {
      const entries = dayEntries[dateKey] ?? [];
      dayTotals[dateKey] = entries.reduce((sum, entry) => sum + safeNumber(entry.quantity), 0);
    }

    const designQty = isWork ? safeNumber(item.designQuantity) : 0;
    const cumulativeBefore = isWork ? cumulativeBeforeMap[item.id] ?? 0 : 0;
    const periodTotal = isWork ? Object.values(dayTotals).reduce((sum, value) => sum + value, 0) : 0;
    const cumulative = cumulativeBefore + periodTotal;

    return {
      ...item,
      designQty,
      cumulativeBefore,
      periodTotal,
      cumulative,
      dayEntries,
      dayTotals,
      displayLevel: 0,
      children: [],
    };
  });

  const itemTree = buildTreeItems(itemNodes);

  function rollup(node: FieldProgressRollupItem): void {
    if (node.itemType === "GROUP") {
      node.designQty = 0;
      node.cumulativeBefore = 0;
      node.periodTotal = 0;
      node.cumulative = 0;
      node.dayTotals = {};
      node.dayEntries = {};

      for (const dateKey of dateKeys) {
        node.dayTotals[dateKey] = 0;
      }

      for (const child of node.children) {
        rollup(child);

        node.designQty += safeNumber(child.designQty);
        node.cumulativeBefore += safeNumber(child.cumulativeBefore);
        node.periodTotal += safeNumber(child.periodTotal);
        node.cumulative += safeNumber(child.cumulative);

        for (const dateKey of dateKeys) {
          node.dayTotals[dateKey] += safeNumber(child.dayTotals[dateKey]);
        }
      }
    }
  }

  for (const root of itemTree) {
    rollup(root);
  }

  const displayItems = flattenTreeForTable(itemTree);

  return { itemTree, displayItems };
}
