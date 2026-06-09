import { Prisma } from "@prisma/client";
const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

export function validateQuantity(quantity: any): Decimal | null {
  if (quantity === null || quantity === undefined || quantity === "") return null;
  const num = Number(quantity);
  if (isNaN(num)) return null;
  if (num < 0) return null; // No negative quantities
  return new Decimal(num);
}

export function calculateCumulativeQuantity(entries: any[], includeDraft = false): Decimal {
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
  let current = new Date(fromDate);
  const end = new Date(toDate);
  
  // Set time to midnight for safe comparison
  current.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    const dateStr = current.toISOString().split("T")[0];
    if (mode === "ALL_DAYS" || availableDateStrings.has(dateStr)) {
      dates.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export function groupEntriesByItemAndDate(entries: any[]) {
  const grouped: Record<string, Record<string, any[]>> = {};
  
  for (const entry of entries) {
    if (!grouped[entry.itemId]) {
      grouped[entry.itemId] = {};
    }
    const dateStr = new Date(entry.entryDate).toISOString().split("T")[0];
    if (!grouped[entry.itemId][dateStr]) {
      grouped[entry.itemId][dateStr] = [];
    }
    grouped[entry.itemId][dateStr].push(entry);
  }
  
  return grouped;
}

export function buildTreeItems(items: any[]) {
  const itemMap: Record<string, any> = {};
  const roots: any[] = [];

  // Sort by sortOrder first
  const sortedItems = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  // Initialize map with empty children arrays
  for (const item of sortedItems) {
    itemMap[item.id] = { ...item, children: [] };
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

export function flattenTreeForTable(tree: any[], level = 0): any[] {
  let result: any[] = [];
  for (const node of tree) {
    result.push({ ...node, displayLevel: level });
    if (node.children && node.children.length > 0) {
      result = result.concat(flattenTreeForTable(node.children, level + 1));
    }
  }
  return result;
}

export function calculateParentRollup(flatTree: any[], entriesMap: Record<string, any[]>) {
  // We process from bottom up to roll up values to parents
  // However, in our system, users input directly on WORK items.
  // The rollup just sums designQuantity and cumulative quantity.
  
  // Create a quick lookup
  const nodeMap = new Map();
  for (const node of flatTree) {
    node.rollupDesignQuantity = new Decimal(node.designQuantity || 0);
    node.rollupCumulative = calculateCumulativeQuantity(entriesMap[node.id] || [], false);
    nodeMap.set(node.id, node);
  }

  // Iterate backwards (assuming flatten puts children after parents, deeper first? No, flatten puts children immediately after parent)
  // To do proper bottom-up, reverse the array
  const reversed = [...flatTree].reverse();
  
  for (const node of reversed) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      const parent = nodeMap.get(node.parentId);
      parent.rollupDesignQuantity = parent.rollupDesignQuantity.add(node.rollupDesignQuantity);
      parent.rollupCumulative = parent.rollupCumulative.add(node.rollupCumulative);
    }
  }
  
  // Recalculate percent based on rolled up values
  for (const node of flatTree) {
    node.rollupPercent = calculateProgressPercent(node.rollupCumulative, node.rollupDesignQuantity);
  }
  
  return flatTree;
}
