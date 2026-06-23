export type ReportStatusLike = string;

const CONTENT_WRITABLE_STATUSES = new Set<ReportStatusLike>([
  "DRAFT",
  "REJECTED",
]);
const REVIEWABLE_STATUSES = new Set<ReportStatusLike>(["SUBMITTED"]);

export function canEditReportContent(status: ReportStatusLike): boolean {
  return CONTENT_WRITABLE_STATUSES.has(status);
}

export function canUploadReportAttachment(status: ReportStatusLike): boolean {
  return CONTENT_WRITABLE_STATUSES.has(status);
}

export function canDeleteReportAttachment(status: ReportStatusLike): boolean {
  return CONTENT_WRITABLE_STATUSES.has(status);
}

export function canSubmitReport(status: ReportStatusLike): boolean {
  return CONTENT_WRITABLE_STATUSES.has(status);
}

export function canApproveReport(status: ReportStatusLike): boolean {
  return REVIEWABLE_STATUSES.has(status);
}

export function canRejectReport(status: ReportStatusLike): boolean {
  return REVIEWABLE_STATUSES.has(status);
}

export function canSoftDeleteReport(status: ReportStatusLike): boolean {
  return CONTENT_WRITABLE_STATUSES.has(status);
}

export function assertReportWritableForAttachment(report: {
  status: ReportStatusLike;
}): void {
  if (!canUploadReportAttachment(report.status)) {
    throw new Error(
      "Báo cáo đã gửi/đã duyệt nên không thể thêm file đính kèm.",
    );
  }
}
