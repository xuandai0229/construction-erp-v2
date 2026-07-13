import type { ApprovalRequestType } from "@prisma/client";

export type NotificationTargetType =
  | "MATERIAL_REQUEST"
  | "APPROVAL_REQUEST"
  | "SITE_REPORT"
  | "DOCUMENT"
  | "PROJECT"
  | "SYSTEM";

type ApprovalNotificationInput = {
  approvalId: string;
  projectId: string;
  approvalType: ApprovalRequestType;
  sourceType: string | null;
  sourceId: string | null;
  notificationId: string;
};

type ReportNotificationInput = {
  reportId: string;
  projectId: string;
  status: "PENDING" | "ISSUE";
  notificationId: string;
};

export type NotificationTarget = {
  targetType: NotificationTargetType;
  targetId: string;
  actionUrl: string;
};

const APPROVAL_TYPE_QUERY: Record<ApprovalRequestType, string> = {
  MATERIAL: "material-request",
  REPORT: "site-report",
  VOLUME: "field-progress",
  INSPECTION: "inspection",
  PLAN: "plan",
  DRAWING: "drawing",
  METHOD_STATEMENT: "method-statement",
  SAFETY: "safety",
  QUALITY: "quality",
  SITE_ISSUE: "site-issue",
  CHANGE_ORDER: "change-order",
  OTHER: "approval-request",
};

const SOURCE_TARGET_TYPES = new Set<NotificationTargetType>([
  "MATERIAL_REQUEST",
  "SITE_REPORT",
  "DOCUMENT",
]);

function buildPath(pathname: string, params: [string, string][]) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of params) {
    searchParams.set(key, value);
  }
  return `${pathname}?${searchParams.toString()}`;
}

export function buildApprovalNotificationTarget(input: ApprovalNotificationInput): NotificationTarget {
  const sourceTargetType = SOURCE_TARGET_TYPES.has(input.sourceType as NotificationTargetType)
    ? input.sourceType as NotificationTargetType
    : null;
  const targetType = sourceTargetType ?? "APPROVAL_REQUEST";
  const targetId = sourceTargetType && input.sourceId ? input.sourceId : input.approvalId;

  return {
    targetType,
    targetId,
    actionUrl: buildPath("/approvals", [
      ["projectId", input.projectId],
      ["approvalId", input.approvalId],
      ["id", targetId],
      ["type", APPROVAL_TYPE_QUERY[input.approvalType]],
      ["open", "1"],
      ["notificationId", input.notificationId],
    ]),
  };
}

export function buildReportNotificationTarget(input: ReportNotificationInput): NotificationTarget {
  return {
    targetType: "SITE_REPORT",
    targetId: input.reportId,
    actionUrl: buildPath("/reports", [
      ["projectId", input.projectId],
      ["reportId", input.reportId],
      ["id", input.reportId],
      ["open", "1"],
      ["status", input.status],
      ["notificationId", input.notificationId],
    ]),
  };
}
