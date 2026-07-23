export function normalizeReportNumber(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().replace(/^Số\s*:\s*/i, "").trim();
  return normalized || null;
}

export function formatReportNumber(value?: string | null): string {
  const normalized = normalizeReportNumber(value);
  return normalized ? `Số: ${normalized}` : "Số: ……./………";
}
