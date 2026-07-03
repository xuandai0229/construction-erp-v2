export const ACTIVE_REPORT_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "REVISION_REQUESTED",
  "LOCKED",
  "CANCELLED",
] as const;

export type ReportStatsInput = {
  status: string | null;
  issues?: string | null;
  lines?: Array<{ issueNote?: string | null }> | null;
};

export type ReportStats = {
  total: number;
  draft: number;
  submitted: number;
  approved: number;
  rejected: number;
  revisionRequested: number;
  pending: number;
  needsAction: number;
  issues: number;
  approvalRate: number;
  byStatus: Record<string, number>;
};

function hasMeaningfulIssueText(value?: string | null): boolean {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return false;
  return !normalized.startsWith("khong co") && !normalized.startsWith("không có");
}

export function reportHasIssues(report: Pick<ReportStatsInput, "issues" | "lines">): boolean {
  if (hasMeaningfulIssueText(report.issues)) return true;
  return Boolean(report.lines?.some((line) => hasMeaningfulIssueText(line.issueNote)));
}

export function computeReportStats(reports: ReportStatsInput[]): ReportStats {
  const byStatus = reports.reduce<Record<string, number>>((acc, report) => {
    const status = report.status || "UNKNOWN";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  const total = reports.length;
  const approved = byStatus.APPROVED || 0;
  const submitted = byStatus.SUBMITTED || 0;
  const rejected = byStatus.REJECTED || 0;
  const revisionRequested = byStatus.REVISION_REQUESTED || 0;

  return {
    total,
    draft: byStatus.DRAFT || 0,
    submitted,
    approved,
    rejected,
    revisionRequested,
    pending: submitted,
    needsAction: submitted + revisionRequested,
    issues: reports.filter(reportHasIssues).length,
    approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
    byStatus,
  };
}

export function formatReportCreatorName(report: {
  reporterName?: string | null;
  createdBy?: { name?: string | null; email?: string | null } | null;
}): string {
  return (
    report.reporterName?.trim() ||
    report.createdBy?.name?.trim() ||
    report.createdBy?.email?.trim() ||
    "Người dùng đã xóa/không xác định"
  );
}
