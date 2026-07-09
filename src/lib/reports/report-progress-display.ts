import type { ReportType } from "@/components/reports/types";

type NullableNumber = number | null;

export type ReportProgressLineInput = {
  reportType: ReportType;
  designQuantity?: unknown;
  quantityBefore?: unknown;
  quantityToday?: unknown;
  quantityCumulative?: unknown;
  remainingQuantity?: unknown;
  progressPercent?: unknown;
};

export type NormalizedReportProgressLine = {
  designQuantity: number;
  quantityBefore: number;
  quantityToday: number;
  quantityCumulative: number;
  remainingQuantity: NullableNumber;
  progressPercent: NullableNumber;
  hasDesignQuantity: boolean;
  inferredCumulative: boolean;
};

function toFiniteNumber(value: unknown, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function hasExplicitPositiveNumber(value: unknown) {
  return value !== null && value !== undefined && value !== "" && toFiniteNumber(value) > 0;
}

export function normalizeReportProgressLine(input: ReportProgressLineInput): NormalizedReportProgressLine {
  const designQuantity = Math.max(0, toFiniteNumber(input.designQuantity));
  const quantityBefore = Math.max(0, toFiniteNumber(input.quantityBefore));
  const quantityToday = Math.max(0, toFiniteNumber(input.quantityToday));
  const rawCumulative = Math.max(0, toFiniteNumber(input.quantityCumulative));

  const shouldInferWeeklyCumulative =
    input.reportType === "WEEKLY" &&
    rawCumulative === 0 &&
    (quantityBefore > 0 || quantityToday > 0) &&
    !hasExplicitPositiveNumber(input.quantityCumulative);

  const quantityCumulative = shouldInferWeeklyCumulative
    ? quantityBefore + quantityToday
    : rawCumulative;

  const hasDesignQuantity = designQuantity > 0;
  const remainingQuantity = hasDesignQuantity
    ? Math.max(0, designQuantity - quantityCumulative)
    : null;
  const progressPercent = hasDesignQuantity
    ? Math.min(999.99, (quantityCumulative / designQuantity) * 100)
    : null;

  return {
    designQuantity,
    quantityBefore,
    quantityToday,
    quantityCumulative,
    remainingQuantity,
    progressPercent,
    hasDesignQuantity,
    inferredCumulative: shouldInferWeeklyCumulative,
  };
}

export function formatProgressQuantityDisplay(value: NullableNumber | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatProgressPercentDisplay(value: NullableNumber | undefined) {
  if (value === null || value === undefined) return "—";
  return `${formatProgressQuantityDisplay(value)}%`;
}
