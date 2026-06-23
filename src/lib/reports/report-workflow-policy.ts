export type ReportStatusLike = string;

const CONTENT_WRITABLE_STATUSES = new Set<ReportStatusLike>([
  "DRAFT",
  "REJECTED",
]);
const REVIEWABLE_STATUSES = new Set<ReportStatusLike>(["SUBMITTED"]);

import { UserRole } from "@prisma/client";
import { isHighLevelUser } from "../rbac";

export function canEditReportContent(
  reportOrStatus: ReportStatusLike | { status: ReportStatusLike; createdById: string; deletedAt?: Date | null },
  user?: { id: string; role: UserRole }
): boolean {
  if (typeof reportOrStatus === 'string') {
    return CONTENT_WRITABLE_STATUSES.has(reportOrStatus);
  }

  if (reportOrStatus.deletedAt) return false;
  if (!CONTENT_WRITABLE_STATUSES.has(reportOrStatus.status)) return false;

  if (user) {
    if (isHighLevelUser(user as { role: UserRole })) return true;
    return user.id === reportOrStatus.createdById;
  }
  return true;
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

export function canSoftDeleteReport(
  reportOrStatus: ReportStatusLike | { status: ReportStatusLike; deletedAt?: Date | null },
  user?: { id: string; role: UserRole }
): boolean {
  if (typeof reportOrStatus === 'string') {
    // For simple string checks (like in tests), we might want to return true for SUBMITTED as well,
    // or keep it strict. Let's keep it to DRAFT | REJECTED for generic checks.
    return CONTENT_WRITABLE_STATUSES.has(reportOrStatus);
  }

  if (reportOrStatus.deletedAt) return false;
  
  // Xóa mềm cho phép DRAFT, REJECTED, và SUBMITTED (chỉ cho admin)
  if (!CONTENT_WRITABLE_STATUSES.has(reportOrStatus.status) && reportOrStatus.status !== "SUBMITTED") {
    return false;
  }

  if (user) {
    // Nếu là SUBMITTED, CHỈ Admin mới được xóa
    if (reportOrStatus.status === "SUBMITTED") {
      return isHighLevelUser(user as { role: UserRole });
    }
    // Với DRAFT/REJECTED, cũng chỉ Admin mới được xóa theo rule hiện tại
    return isHighLevelUser(user as { role: UserRole });
  }
  
  // Fallback
  return CONTENT_WRITABLE_STATUSES.has(reportOrStatus.status);
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
