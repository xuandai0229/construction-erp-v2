import { UserRole } from "@prisma/client";
import { isHighLevelUser } from "../rbac";

export type ReportStatusLike = string;

type ReportPolicyUser = { id: string; role: UserRole | string };
type ReportPolicyTarget = {
  status: ReportStatusLike;
  createdById: string;
  deletedAt?: Date | null;
  isDeleted?: boolean | null;
};
type ReportReadableTarget = Pick<ReportPolicyTarget, "status" | "deletedAt" | "isDeleted">;

const CONTENT_WRITABLE_STATUSES = new Set<ReportStatusLike>([
  "DRAFT",
  "REJECTED",
  "REVISION_REQUESTED",
]);
const REVIEWABLE_STATUSES = new Set<ReportStatusLike>(["SUBMITTED"]);
const DELETE_ALLOWED_STATUSES = new Set<ReportStatusLike>([
  "DRAFT",
  "SUBMITTED",
  "REJECTED",
  "REVISION_REQUESTED",
]);
const REPORT_CREATE_ROLES = new Set<string>([
  "ADMIN",
  "DIRECTOR",
  "DEPUTY_DIRECTOR",
  "CHIEF_COMMANDER",
  "MANAGER",
  "ENGINEER",
]);

function isDeletedReport(report: { deletedAt?: Date | null; isDeleted?: boolean | null }): boolean {
  return Boolean(report.deletedAt || report.isDeleted);
}

function isHighLevelReportUser(user?: ReportPolicyUser): boolean {
  return Boolean(user && isHighLevelUser(user as { role: UserRole }));
}

export function canCreateReport(user: ReportPolicyUser, hasProjectAccess: boolean): boolean {
  if (!hasProjectAccess) return false;
  return REPORT_CREATE_ROLES.has(user.role);
}

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

export function canUpdateReport(
  report: ReportPolicyTarget,
  user: ReportPolicyUser,
  hasProjectAccess: boolean,
): boolean {
  if (!hasProjectAccess) return false;
  if (isDeletedReport(report)) return false;
  if (!CONTENT_WRITABLE_STATUSES.has(report.status)) return false;
  if (isHighLevelReportUser(user)) return true;
  return user.id === report.createdById;
}

export function canUploadReportAttachment(status: ReportStatusLike): boolean {
  return CONTENT_WRITABLE_STATUSES.has(status);
}

export function canDeleteReportAttachment(status: ReportStatusLike): boolean {
  return CONTENT_WRITABLE_STATUSES.has(status);
}

export function canSubmitReport(status: ReportStatusLike): boolean;
export function canSubmitReport(
  report: ReportPolicyTarget,
  user: ReportPolicyUser,
  hasProjectAccess: boolean,
): boolean;
export function canSubmitReport(
  reportOrStatus: ReportStatusLike | ReportPolicyTarget,
  user?: ReportPolicyUser,
  hasProjectAccess: boolean = true,
): boolean {
  if (typeof reportOrStatus === 'string') {
    return CONTENT_WRITABLE_STATUSES.has(reportOrStatus);
  }

  if (!user || !hasProjectAccess) return false;
  if (isDeletedReport(reportOrStatus)) return false;
  if (!CONTENT_WRITABLE_STATUSES.has(reportOrStatus.status)) return false;
  return user.id === reportOrStatus.createdById;
}

export function canApproveReport(status: ReportStatusLike): boolean;
export function canApproveReport(
  report: ReportPolicyTarget,
  user: ReportPolicyUser,
  hasProjectAccess: boolean,
): boolean;
export function canApproveReport(
  reportOrStatus: ReportStatusLike | ReportPolicyTarget,
  user?: ReportPolicyUser,
  hasProjectAccess: boolean = true,
): boolean {
  if (typeof reportOrStatus === 'string') {
    return REVIEWABLE_STATUSES.has(reportOrStatus);
  }

  return Boolean(
    user &&
      hasProjectAccess &&
      !isDeletedReport(reportOrStatus) &&
      REVIEWABLE_STATUSES.has(reportOrStatus.status) &&
      ["ADMIN", "DIRECTOR"].includes(user.role),
  );
}

export function canRejectReport(status: ReportStatusLike): boolean;
export function canRejectReport(
  report: ReportPolicyTarget,
  user: ReportPolicyUser,
  hasProjectAccess: boolean,
): boolean;
export function canRejectReport(
  reportOrStatus: ReportStatusLike | ReportPolicyTarget,
  user?: ReportPolicyUser,
  hasProjectAccess: boolean = true,
): boolean {
  if (typeof reportOrStatus === 'string') {
    return REVIEWABLE_STATUSES.has(reportOrStatus);
  }

  return Boolean(
    user &&
      hasProjectAccess &&
      !isDeletedReport(reportOrStatus) &&
      REVIEWABLE_STATUSES.has(reportOrStatus.status) &&
      ["ADMIN", "DIRECTOR"].includes(user.role),
  );
}

export function canDeleteReport(
  report: ReportPolicyTarget,
  user: ReportPolicyUser,
  hasProjectAccess: boolean,
): boolean {
  if (!hasProjectAccess) return false;
  if (isDeletedReport(report)) return false;
  if (!DELETE_ALLOWED_STATUSES.has(report.status)) return false;
  return isHighLevelReportUser(user);
}

export function canPrintReport(
  report: ReportReadableTarget,
  _user: ReportPolicyUser,
  hasProjectAccess: boolean,
): boolean {
  if (!hasProjectAccess) return false;
  return !isDeletedReport(report);
}

export function canExportReport(
  report: ReportReadableTarget,
  user: ReportPolicyUser,
  hasProjectAccess: boolean,
): boolean {
  return canPrintReport(report, user, hasProjectAccess);
}

export function canViewReportHistory(
  report: ReportReadableTarget,
  user: ReportPolicyUser,
  hasProjectAccess: boolean,
): boolean {
  return canPrintReport(report, user, hasProjectAccess);
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
