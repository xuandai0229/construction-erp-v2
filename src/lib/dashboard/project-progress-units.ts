export type ProjectProgressUnitStatus = "SINGLE_UNIT" | "MIXED_UNITS" | "MISSING_UNIT" | "NOT_APPLICABLE";

export type ProjectProgressUnitSummary = {
  status: ProjectProgressUnitStatus;
  unit: string | null;
  distinctUnitCount: number;
  units: string[];
};

type ProgressUnitItem = {
  designQuantity: unknown;
  unit: string | null;
};

function validDesignQuantity(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0;
}

/**
 * Describes whether raw quantity totals are dimensionally safe to present.
 * This does not alter the approved progress aggregate or invent unit conversion.
 */
export function summarizeProjectProgressUnits(items: ProgressUnitItem[]): ProjectProgressUnitSummary {
  const eligible = items.filter((item) => validDesignQuantity(item.designQuantity));
  if (eligible.length === 0) {
    return { status: "NOT_APPLICABLE", unit: null, distinctUnitCount: 0, units: [] };
  }

  const hasMissingUnit = eligible.some((item) => !item.unit?.trim());
  const unitsByKey = new Map<string, string>();
  for (const item of eligible) {
    const displayUnit = item.unit?.trim();
    if (!displayUnit) continue;
    const key = displayUnit.toLocaleLowerCase("vi-VN");
    if (!unitsByKey.has(key)) unitsByKey.set(key, displayUnit);
  }
  const units = [...unitsByKey.values()].sort((left, right) => left.localeCompare(right, "vi"));

  if (hasMissingUnit) {
    return { status: "MISSING_UNIT", unit: null, distinctUnitCount: units.length, units };
  }
  if (units.length > 1) {
    return { status: "MIXED_UNITS", unit: null, distinctUnitCount: units.length, units };
  }
  return { status: "SINGLE_UNIT", unit: units[0] ?? null, distinctUnitCount: units.length, units };
}
