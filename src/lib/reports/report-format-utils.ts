export function toNumberSafe(value: unknown, fallback = 0): number {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function formatNumberSafe(value: unknown, options?: Intl.NumberFormatOptions): string {
  return toNumberSafe(value).toLocaleString("vi-VN", options);
}

export function formatPercentSafe(value: unknown, digits = 1): string {
  return `${toNumberSafe(value).toFixed(digits)}%`;
}
