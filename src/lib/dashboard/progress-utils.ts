export function calculatePlannedProgress(
  startDate: Date | null,
  endDate: Date | null,
  today: Date = new Date()
): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);
  const current = new Date(today);
  current.setUTCHours(0, 0, 0, 0);

  if (start >= end) return null; // Invalid dates
  if (current <= start) return 0;
  if (current >= end) return 100;

  const totalDays = (end.getTime() - start.getTime()) / 86_400_000;
  const elapsedDays = (current.getTime() - start.getTime()) / 86_400_000;

  return Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
}

export function getProgressVariance(
  actualProgress: number | null,
  plannedProgress: number | null
): number | null {
  if (actualProgress === null || plannedProgress === null) return null;
  return actualProgress - plannedProgress;
}

export function getProgressHealth(
  actualProgress: number | null,
  plannedProgress: number | null
): "ON_TRACK" | "AT_RISK" | "DELAYED" | "NO_DATA" {
  if (actualProgress === null && plannedProgress === null) return "NO_DATA";
  if (actualProgress === null || plannedProgress === null) return "NO_DATA"; // Or maybe "ON_TRACK" if we don't know? Let's say NO_DATA

  const variance = getProgressVariance(actualProgress, plannedProgress) ?? 0;

  if (variance >= -2) return "ON_TRACK"; // Within 2% is fine
  if (variance >= -10) return "AT_RISK"; // 2% to 10% behind
  return "DELAYED"; // > 10% behind
}
