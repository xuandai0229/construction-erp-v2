import type {
  ApprovalPriority,
  ApprovalRequestType,
  ApprovalRequestStatus,
  Prisma,
} from "@prisma/client";
import type { ApprovalPermissionSet } from "./approval-permissions";

export type ApprovalSourceType =
  | "PAYMENT_REQUEST"
  | "MATERIAL_REQUEST"
  | "SITE_REPORT"
  | "CONTRACT"
  | "FIELD_PROGRESS"
  | "CHANGE_ORDER"
  | "DOCUMENT"
  | "PURCHASE_REQUEST"
  | "OTHER";

export type ApprovalProjectOptionDto = {
  id: string;
  code: string;
  name: string;
};

export type ApprovalUserOptionDto = {
  id: string;
  name: string;
};

export type ApprovalRequestDto = {
  id: string;
  code: string;
  projectId: string;
  title: string;
  description: string | null;
  type: ApprovalRequestType;
  status: ApprovalRequestStatus;
  priority: ApprovalPriority;
  amount: number | null;
  dueDate: string | null;
  requesterId: string;
  decidedById: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  sourceType: ApprovalSourceType | string | null;
  sourceId: string | null;
  createdAt: string;
  updatedAt: string;
  project: ApprovalProjectOptionDto;
  requester: ApprovalUserOptionDto;
  decidedBy: ApprovalUserOptionDto | null;
  permissions?: ApprovalPermissionSet;
};

export type ApprovalSummaryDto = {
  pendingCount: number;
  overdueCount: number;
  approvedCount: number;
  rejectedCount: number;
  cancelledCount: number;
  pendingAmount: number;
};

export type ApprovalRequestSerializableRecord = {
  id: string;
  code: string | null;
  projectId: string | null;
  title: string | null;
  description: string | null;
  type: ApprovalRequestType;
  status: ApprovalRequestStatus;
  priority: ApprovalPriority;
  amount: Prisma.Decimal | number | string | null;
  dueDate: Date | string | null;
  requesterId: string;
  decidedById: string | null;
  decidedAt: Date | string | null;
  decisionNote: string | null;
  sourceType: string | null;
  sourceId: string | null;
  deletedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  project: ApprovalProjectOptionDto | null;
  requester: ApprovalUserOptionDto;
  decidedBy: ApprovalUserOptionDto | null;
};

function decimalToNumber(value: Prisma.Decimal | number | string | null) {
  if (value === null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return Number(value.toString());
}

function dateToIso(value: Date | string | null) {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function requiredText(value: string | null, fallback: string) {
  const text = value?.trim();
  return text && text.length > 0 ? text : fallback;
}

export function serializeApprovalRequest(
  approval: ApprovalRequestSerializableRecord,
): ApprovalRequestDto {
  if (!approval.project || !approval.projectId) {
    throw new Error("ApprovalRequest DTO requires project data");
  }

  return {
    id: approval.id,
    code: requiredText(approval.code, approval.id),
    projectId: approval.projectId,
    title: requiredText(approval.title, "Yêu cầu phê duyệt"),
    description: approval.description,
    type: approval.type,
    status: approval.status,
    priority: approval.priority,
    amount: decimalToNumber(approval.amount),
    dueDate: dateToIso(approval.dueDate),
    requesterId: approval.requesterId,
    decidedById: approval.decidedById,
    decidedAt: dateToIso(approval.decidedAt),
    decisionNote: approval.decisionNote,
    sourceType: approval.sourceType,
    sourceId: approval.sourceId,
    createdAt: dateToIso(approval.createdAt) ?? new Date(0).toISOString(),
    updatedAt: dateToIso(approval.updatedAt) ?? new Date(0).toISOString(),
    project: approval.project,
    requester: approval.requester,
    decidedBy: approval.decidedBy,
  };
}

function dateKey(value: Date | string) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value.slice(0, 10);
}

export function isApprovalOverdue(
  approval: Pick<ApprovalRequestDto, "status" | "dueDate">,
  now = new Date(),
) {
  if (approval.status !== "PENDING" || !approval.dueDate) return false;
  return dateKey(approval.dueDate) < dateKey(now);
}

export function buildApprovalSummary(
  approvals: ApprovalRequestDto[],
  now = new Date(),
): ApprovalSummaryDto {
  return approvals.reduce<ApprovalSummaryDto>(
    (summary, approval) => {
      if (approval.status === "PENDING") {
        summary.pendingCount += 1;
        summary.pendingAmount += approval.amount ?? 0;
        if (isApprovalOverdue(approval, now)) summary.overdueCount += 1;
      }
      if (approval.status === "APPROVED") summary.approvedCount += 1;
      if (approval.status === "REJECTED") summary.rejectedCount += 1;
      if (approval.status === "CANCELLED") summary.cancelledCount += 1;
      return summary;
    },
    {
      pendingCount: 0,
      overdueCount: 0,
      approvedCount: 0,
      rejectedCount: 0,
      cancelledCount: 0,
      pendingAmount: 0,
    },
  );
}
