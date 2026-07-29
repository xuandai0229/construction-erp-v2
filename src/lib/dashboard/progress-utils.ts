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

export const PROJECT_PROGRESS_STATUS_POLICY = {
  aheadVariancePercent: 2,
  attentionVariancePercent: -2,
  delayedVariancePercent: -10,
} as const;

export type ProjectProgressStatus = "AHEAD" | "ON_TRACK" | "AT_RISK" | "DELAYED" | "NO_DATA";

export function getProjectProgressStatus(
  actualProgress: number | null,
  plannedProgress: number | null,
): ProjectProgressStatus {
  const variance = getProgressVariance(actualProgress, plannedProgress);
  if (variance === null) return "NO_DATA";
  if (variance > PROJECT_PROGRESS_STATUS_POLICY.aheadVariancePercent) return "AHEAD";
  if (variance >= PROJECT_PROGRESS_STATUS_POLICY.attentionVariancePercent) return "ON_TRACK";
  if (variance >= PROJECT_PROGRESS_STATUS_POLICY.delayedVariancePercent) return "AT_RISK";
  return "DELAYED";
}

export function getProgressHealth(
  actualProgress: number | null,
  plannedProgress: number | null
): "ON_TRACK" | "AT_RISK" | "DELAYED" | "NO_DATA" {
  const status = getProjectProgressStatus(actualProgress, plannedProgress);
  if (status === "AHEAD" || status === "ON_TRACK") return "ON_TRACK";
  return status;
}
