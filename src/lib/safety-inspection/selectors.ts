import { isSafetyFindingOverdue } from "./finding-domain";
import type { SafetyFindingStatus } from "./types";

export type SafetyFindingSummaryInput = {
  id: string;
  status: SafetyFindingStatus;
  effectiveDueAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
};

export type SafetyFindingSummary = {
  total: number;
  open: number;
  completed: number;
  cancelled: number;
  overdue: number;
};

export function summarizeSafetyFindings(
  findings: readonly SafetyFindingSummaryInput[],
  now: Date,
): SafetyFindingSummary {
  const unique = new Map(findings.map((finding) => [finding.id, finding]));
  const values = [...unique.values()];
  return {
    total: values.length,
    open: values.filter(
      (finding) =>
        finding.status !== "COMPLETED" && finding.status !== "CANCELLED",
    ).length,
    completed: values.filter((finding) => finding.status === "COMPLETED").length,
    cancelled: values.filter((finding) => finding.status === "CANCELLED").length,
    overdue: values.filter((finding) =>
      isSafetyFindingOverdue(finding, now),
    ).length,
  };
}
