/**
 * The dashboard's project-progress aggregate intentionally mirrors the
 * approved-only rollup used by field-progress summary. It is pure so callers
 * cannot quietly substitute planned progress for actual progress.
 */

export type ActualProgressDataStatus =
  | "AVAILABLE"
  | "NO_PROGRESS_ITEMS"
  | "NO_APPROVED_ENTRIES"
  | "MISSING_DESIGN_QUANTITY"
  | "INVALID_QUANTITY"
  | "DATA_SCOPE_MISMATCH";

export type CompletenessCategory =
  | "COMPLETE"
  | "MISSING_PLAN"
  | "MISSING_ACTUAL"
  | "MISSING_BOTH";

export type ProjectProgressWarning =
  | "MULTIPLE_ACTIVE_TEMPLATES"
  | "MISSING_DESIGN_QUANTITY"
  | "INVALID_QUANTITY"
  | "DATA_SCOPE_MISMATCH"
  | "FUTURE_ENTRY_IGNORED"
  | "DUPLICATE_ENTRY_ID"
  | "ACTUAL_EXCEEDS_DESIGN_FOR_ITEM"
  | "ACTUAL_EXCEEDS_TOTAL_DESIGN";

type NumericValue = number | string | { toString(): string } | null | undefined;

export type ProjectProgressItemInput = {
  id: string;
  projectId: string;
  itemType: string;
  designQuantity: NumericValue;
  deletedAt: Date | null;
};

export type ProjectProgressEntryInput = {
  id: string;
  projectId: string;
  itemId: string;
  quantity: NumericValue;
  status: string;
  entryDate: Date;
  approvedAt: Date | null;
  deletedAt: Date | null;
};

export type ProjectActualProgressAggregate = {
  totalDesignQuantity: number | null;
  approvedActualQuantity: number | null;
  actualProgressPercent: number | null;
  actualProgressDataStatus: ActualProgressDataStatus;
  lastActualProgressAt: Date | null;
  eligibleWorkItemCount: number;
  approvedEntryCount: number;
  warnings: ProjectProgressWarning[];
};

function asFiniteNonNegativeNumber(value: NumericValue): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
}

function resultWithoutActual(input: {
  status: Exclude<ActualProgressDataStatus, "AVAILABLE">;
  eligibleWorkItemCount: number;
  approvedEntryCount?: number;
  totalDesignQuantity?: number | null;
  warnings: ProjectProgressWarning[];
}): ProjectActualProgressAggregate {
  return {
    totalDesignQuantity: input.totalDesignQuantity ?? null,
    approvedActualQuantity: null,
    actualProgressPercent: null,
    actualProgressDataStatus: input.status,
    lastActualProgressAt: null,
    eligibleWorkItemCount: input.eligibleWorkItemCount,
    approvedEntryCount: input.approvedEntryCount ?? 0,
    warnings: input.warnings,
  };
}

/**
 * Computes actual progress as the same project-wide approved quantity/design
 * quantity ratio that the summary rollup derives from WORK items. The caller
 * must provide already-authorized project data; this function also rejects
 * cross-project and soft-deleted records defensively.
 */
export function calculateProjectActualProgress(input: {
  projectId: string;
  asOf: Date;
  items: ProjectProgressItemInput[];
  entries: ProjectProgressEntryInput[];
}): ProjectActualProgressAggregate {
  const warnings = new Set<ProjectProgressWarning>();
  const workItems = input.items.filter(
    (item) => item.projectId === input.projectId && item.itemType === "WORK" && item.deletedAt === null,
  );

  if (workItems.length === 0) {
    return resultWithoutActual({
      status: "NO_PROGRESS_ITEMS",
      eligibleWorkItemCount: 0,
      warnings: [],
    });
  }

  const workItemById = new Map(workItems.map((item) => [item.id, item]));
  const designByItemId = new Map<string, number>();
  let hasMissingDesignQuantity = false;

  for (const workItem of workItems) {
    const designQuantity = asFiniteNonNegativeNumber(workItem.designQuantity);
    if (designQuantity === null || designQuantity === 0) {
      hasMissingDesignQuantity = true;
      warnings.add("MISSING_DESIGN_QUANTITY");
      continue;
    }
    designByItemId.set(workItem.id, designQuantity);
  }

  if (hasMissingDesignQuantity) {
    return resultWithoutActual({
      status: "MISSING_DESIGN_QUANTITY",
      eligibleWorkItemCount: workItems.length,
      warnings: [...warnings],
    });
  }

  const totalDesignQuantity = [...designByItemId.values()].reduce((total, quantity) => total + quantity, 0);

  const processedEntryIds = new Set<string>();
  const approvedByItemId = new Map<string, number>();
  let approvedEntryCount = 0;
  let lastActualProgressAt: Date | null = null;
  let hasInvalidQuantity = false;
  let hasScopeMismatch = false;

  for (const entry of input.entries) {
    if (entry.deletedAt !== null || entry.status !== "APPROVED") continue;
    if (entry.entryDate > input.asOf) {
      warnings.add("FUTURE_ENTRY_IGNORED");
      continue;
    }
    if (processedEntryIds.has(entry.id)) {
      warnings.add("DUPLICATE_ENTRY_ID");
      continue;
    }
    processedEntryIds.add(entry.id);

    if (entry.projectId !== input.projectId || !workItemById.has(entry.itemId)) {
      warnings.add("DATA_SCOPE_MISMATCH");
      hasScopeMismatch = true;
      continue;
    }

    const quantity = asFiniteNonNegativeNumber(entry.quantity);
    if (quantity === null) {
      warnings.add("INVALID_QUANTITY");
      hasInvalidQuantity = true;
      continue;
    }

    approvedEntryCount += 1;
    approvedByItemId.set(entry.itemId, (approvedByItemId.get(entry.itemId) ?? 0) + quantity);
    const effectiveTimestamp = entry.approvedAt ?? entry.entryDate;
    if (lastActualProgressAt === null || effectiveTimestamp > lastActualProgressAt) {
      lastActualProgressAt = effectiveTimestamp;
    }
  }

  if (hasInvalidQuantity) {
    return resultWithoutActual({
      status: "INVALID_QUANTITY",
      eligibleWorkItemCount: workItems.length,
      approvedEntryCount,
      totalDesignQuantity,
      warnings: [...warnings],
    });
  }

  if (approvedEntryCount === 0) {
    return resultWithoutActual({
      status: hasScopeMismatch ? "DATA_SCOPE_MISMATCH" : "NO_APPROVED_ENTRIES",
      eligibleWorkItemCount: workItems.length,
      approvedEntryCount,
      totalDesignQuantity,
      warnings: [...warnings],
    });
  }

  const approvedActualQuantity = [...approvedByItemId.values()].reduce((total, quantity) => total + quantity, 0);

  for (const [itemId, approvedQuantity] of approvedByItemId) {
    if (approvedQuantity > (designByItemId.get(itemId) ?? 0)) {
      warnings.add("ACTUAL_EXCEEDS_DESIGN_FOR_ITEM");
    }
  }
  if (approvedActualQuantity > totalDesignQuantity) {
    warnings.add("ACTUAL_EXCEEDS_TOTAL_DESIGN");
  }

  return {
    totalDesignQuantity,
    approvedActualQuantity,
    actualProgressPercent: (approvedActualQuantity / totalDesignQuantity) * 100,
    actualProgressDataStatus: "AVAILABLE",
    lastActualProgressAt,
    eligibleWorkItemCount: workItems.length,
    approvedEntryCount,
    warnings: [...warnings],
  };
}

export function deriveCompletenessCategory(
  plannedProgressPercent: number | null,
  actualProgressPercent: number | null,
): CompletenessCategory {
  if (plannedProgressPercent !== null && actualProgressPercent !== null) return "COMPLETE";
  if (plannedProgressPercent === null && actualProgressPercent !== null) return "MISSING_PLAN";
  if (plannedProgressPercent !== null && actualProgressPercent === null) return "MISSING_ACTUAL";
  return "MISSING_BOTH";
}
