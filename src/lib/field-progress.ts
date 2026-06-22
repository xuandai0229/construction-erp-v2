import { Prisma } from "@prisma/client";
import { addWorkDays, formatWorkDate, parseWorkDate } from "@/lib/date/work-date";
const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

export function validateQuantity(quantity: unknown): Decimal | null {
  if (quantity === null || quantity === undefined || quantity === "") return null;
  const num = Number(quantity);
  if (isNaN(num)) return null;
  if (num < 0) return null; // No negative quantities
  return new Decimal(num);
}

export interface ProgressEntryInput {
  status: string;
  quantity?: Decimal | number | string | null;
}

export function calculateCumulativeQuantity(entries: ProgressEntryInput[], includeDraft = false): Decimal {
  let total = new Decimal(0);
  for (const entry of entries) {
    if (entry.status === "APPROVED" || (includeDraft && ["DRAFT", "SUBMITTED", "REVISION_REQUESTED"].includes(entry.status))) {
      total = total.add(entry.quantity || 0);
    }
  }
  return total;
}

export function calculateProgressPercent(cumulative: Decimal | number, designQuantity: Decimal | number | null | undefined): string | null {
  if (!designQuantity) return null;
  const dq = Number(designQuantity);
  if (dq === 0) return null;
  
  const cum = Number(cumulative);
  const percent = (cum / dq) * 100;
  return percent.toFixed(2);
}

export function formatQuantity(quantity: Decimal | number | string | null | undefined): string {
  if (quantity === null || quantity === undefined) return "0";
  const num = Number(quantity);
  if (isNaN(num)) return "0";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 4 }).format(num);
}

export function formatPercent(percent: string | number | null | undefined): string {
  if (percent === null || percent === undefined) return "-";
  return `${percent}%`;
}

export function buildDateColumns(fromDate: Date | string, toDate: Date | string, mode: "ALL_DAYS" | "HAS_DATA_ONLY", availableDateStrings: Set<string>): Date[] {
  const dates: Date[] = [];
  let current = typeof fromDate === "string" ? parseWorkDate(fromDate) : parseWorkDate(formatWorkDate(fromDate));
  const end = typeof toDate === "string" ? parseWorkDate(toDate) : parseWorkDate(formatWorkDate(toDate));

  while (current <= end) {
    const dateStr = formatWorkDate(current);
    if (mode === "ALL_DAYS" || availableDateStrings.has(dateStr)) {
      dates.push(new Date(current));
    }
    current = addWorkDays(current, 1);
  }
  return dates;
}

export function groupEntriesByItemAndDate<T extends { itemId: string; entryDate: Date | string }>(entries: T[]) {
  const grouped: Record<string, Record<string, T[]>> = {};
  
  for (const entry of entries) {
    if (!grouped[entry.itemId]) {
      grouped[entry.itemId] = {};
    }
    const dateStr = formatWorkDate(new Date(entry.entryDate));
    if (!grouped[entry.itemId][dateStr]) {
      grouped[entry.itemId][dateStr] = [];
    }
    grouped[entry.itemId][dateStr].push(entry);
  }
  
  return grouped;
}

export type TreeNode<T> = T & { children: TreeNode<T>[] };

export function buildTreeItems<T extends { id: string; parentId: string | null; sortOrder: number }>(items: T[]) {
  const itemMap: Record<string, TreeNode<T>> = {};
  const roots: TreeNode<T>[] = [];

  // Sort by sortOrder first
  const sortedItems = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  // Initialize map with empty children arrays
  for (const item of sortedItems) {
    itemMap[item.id] = { ...item, children: [] } as unknown as TreeNode<T>;
  }

  // Build tree
  for (const item of sortedItems) {
    if (item.parentId && itemMap[item.parentId]) {
      itemMap[item.parentId].children.push(itemMap[item.id]);
    } else {
      roots.push(itemMap[item.id]);
    }
  }

  return roots;
}

export function flattenTreeForTable<T extends { children?: T[] }>(tree: T[], level = 0): (T & { displayLevel: number })[] {
  let result: (T & { displayLevel: number })[] = [];
  for (const node of tree) {
    result.push({ ...node, displayLevel: level });
    if (node.children && node.children.length > 0) {
      result = result.concat(flattenTreeForTable(node.children, level + 1));
    }
  }
  return result;
}

export interface RollupNode {
  id: string;
  parentId: string | null;
  designQuantity?: Decimal | number | string | null;
  rollupDesignQuantity?: Decimal;
  rollupCumulative?: Decimal;
  rollupPercent?: string | null;
}

export function calculateParentRollup<T extends { id: string; parentId: string | null; designQuantity?: Decimal | number | string | null }>(flatTree: T[], entriesMap: Record<string, ProgressEntryInput[]>) {
  const result = flatTree as (T & RollupNode)[];
  const nodeMap = new Map<string, T & RollupNode>();
  for (const node of result) {
    node.rollupDesignQuantity = new Decimal(node.designQuantity || 0);
    node.rollupCumulative = calculateCumulativeQuantity(entriesMap[node.id] || [], false);
    nodeMap.set(node.id, node);
  }

  const reversed = [...result].reverse();
  for (const node of reversed) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId);
      if (parent && parent.rollupDesignQuantity && node.rollupDesignQuantity && parent.rollupCumulative && node.rollupCumulative) {
        parent.rollupDesignQuantity = parent.rollupDesignQuantity.add(node.rollupDesignQuantity);
        parent.rollupCumulative = parent.rollupCumulative.add(node.rollupCumulative);
      }
    }
  }
  
  for (const node of result) {
    if (node.rollupCumulative && node.rollupDesignQuantity) {
      node.rollupPercent = calculateProgressPercent(node.rollupCumulative, node.rollupDesignQuantity);
    }
  }
  
  return result;
}
