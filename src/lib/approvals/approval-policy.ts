import type { ApprovalRequestType, ProjectRole, UserRole } from "@prisma/client";

const COMPANY_WIDE_APPROVERS: UserRole[] = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"];
const MATERIAL_PROJECT_APPROVERS: ProjectRole[] = ["PROJECT_MANAGER", "SITE_COMMANDER", "CHIEF_COMMANDER"];
const PROGRESS_PROJECT_APPROVERS: ProjectRole[] = ["PROJECT_MANAGER", "SITE_COMMANDER", "CHIEF_COMMANDER"];

export type ApprovalPolicyInput = {
  userRole: UserRole;
  projectRole?: ProjectRole | null;
  requestType: ApprovalRequestType;
  actorId?: string;
  requesterId?: string;
};

export function canApproveOwnRequest(input: ApprovalPolicyInput): boolean {
  return input.userRole === "ADMIN";
}

export function canApproveMaterialRequest(input: ApprovalPolicyInput): boolean {
  if (COMPANY_WIDE_APPROVERS.includes(input.userRole)) return true;
  return Boolean(input.projectRole && MATERIAL_PROJECT_APPROVERS.includes(input.projectRole));
}

export function canApproveReport(input: ApprovalPolicyInput): boolean {
  return COMPANY_WIDE_APPROVERS.includes(input.userRole);
}

export function canApprovePayment(input: ApprovalPolicyInput): boolean {
  return COMPANY_WIDE_APPROVERS.includes(input.userRole);
}

export function canApproveContract(input: ApprovalPolicyInput): boolean {
  return COMPANY_WIDE_APPROVERS.includes(input.userRole);
}

export function canApproveProgress(input: ApprovalPolicyInput): boolean {
  if (COMPANY_WIDE_APPROVERS.includes(input.userRole)) return true;
  return Boolean(input.projectRole && PROGRESS_PROJECT_APPROVERS.includes(input.projectRole));
}

export function canApproveByRequestType(input: ApprovalPolicyInput): boolean {
  if (input.actorId && input.requesterId && input.actorId === input.requesterId && !canApproveOwnRequest(input)) {
    return false;
  }

  switch (input.requestType) {
    case "MATERIAL":
      return canApproveMaterialRequest(input);
    case "REPORT":
      return canApproveReport(input);
    case "PAYMENT":
      return canApprovePayment(input);
    case "CONTRACT":
    case "CHANGE_ORDER":
      return canApproveContract(input);
    case "OTHER":
    default:
      return COMPANY_WIDE_APPROVERS.includes(input.userRole);
  }
}
