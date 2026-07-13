import type {
  ApprovalRequestType,
  ApprovalRequestStatus,
  ProjectRole,
  UserRole,
} from "@prisma/client";
import { canApproveByRequestType } from "./approval-policy";

export type ApprovalActor = {
  id: string;
  role: UserRole;
};

export type ApprovalPermissionContext = {
  id: string;
  projectId: string | null;
  requesterId: string;
  status: ApprovalRequestStatus;
  type: ApprovalRequestType;
  deletedAt?: Date | string | null;
};

export type ApprovalPermissionSet = {
  canView: boolean;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
  canSoftDelete: boolean;
  canEdit: boolean;
};

const HIGH_LEVEL_VIEW_ROLES: UserRole[] = [
  "ADMIN",
  "DIRECTOR",
  "DEPUTY_DIRECTOR",
  "MANAGER",
];

const COMPANY_WIDE_DECISION_ROLES: UserRole[] = [
  "ADMIN",
  "DIRECTOR",
  "DEPUTY_DIRECTOR",
];

function isDeleted(approval: ApprovalPermissionContext) {
  return approval.deletedAt !== null && approval.deletedAt !== undefined;
}

function getProjectRole(
  approval: ApprovalPermissionContext,
  projectRoles: ReadonlyMap<string, ProjectRole>,
) {
  return approval.projectId ? projectRoles.get(approval.projectId) ?? null : null;
}

export function isApprovalAdmin(actor: ApprovalActor) {
  return actor.role === "ADMIN";
}

export function canViewApproval(
  actor: ApprovalActor,
  approval: ApprovalPermissionContext,
  projectRoles: ReadonlyMap<string, ProjectRole>,
) {
  if (isDeleted(approval)) return false;
  if (HIGH_LEVEL_VIEW_ROLES.includes(actor.role)) return true;
  if (approval.requesterId === actor.id) return true;
  if (actor.role === "ACCOUNTANT" && approval.type === "PAYMENT") return true;

  const projectRole = getProjectRole(approval, projectRoles);
  return projectRole !== null;
}

export function canApproveApproval(
  actor: ApprovalActor,
  approval: ApprovalPermissionContext,
  projectRoles: ReadonlyMap<string, ProjectRole>,
) {
  if (isDeleted(approval)) return false;
  if (approval.status !== "PENDING") return false;

  const projectRole = getProjectRole(approval, projectRoles);
  return canApproveByRequestType({
    userRole: actor.role,
    projectRole,
    requestType: approval.type,
    actorId: actor.id,
    requesterId: approval.requesterId,
  });
}

export function canRejectApproval(
  actor: ApprovalActor,
  approval: ApprovalPermissionContext,
  projectRoles: ReadonlyMap<string, ProjectRole>,
) {
  return canApproveApproval(actor, approval, projectRoles);
}

export function canCancelApproval(
  actor: ApprovalActor,
  approval: ApprovalPermissionContext,
  projectRoles: ReadonlyMap<string, ProjectRole>,
) {
  if (isDeleted(approval)) return false;
  if (approval.status !== "PENDING") return false;
  if (approval.requesterId === actor.id) return true;
  if (COMPANY_WIDE_DECISION_ROLES.includes(actor.role)) return true;

  return false;
}

export function canSoftDeleteApproval(
  actor: ApprovalActor,
  approval: ApprovalPermissionContext,
  projectRoles: ReadonlyMap<string, ProjectRole>,
) {
  if (isApprovalAdmin(actor)) return true;
  if (COMPANY_WIDE_DECISION_ROLES.includes(actor.role)) return true;
  
  if (approval.requesterId === actor.id && approval.status === "PENDING") return true;

  return false;
}

export function canEditApproval(
  actor: ApprovalActor,
  approval: ApprovalPermissionContext,
  projectRoles: ReadonlyMap<string, ProjectRole>,
) {
  if (isDeleted(approval)) return false;
  if (approval.status !== "PENDING") return false;
  
  if (isApprovalAdmin(actor)) return true;
  if (COMPANY_WIDE_DECISION_ROLES.includes(actor.role)) return true;
  
  if (approval.requesterId === actor.id) return true;
  
  return false;
}

export function getApprovalPermissionSet(
  actor: ApprovalActor,
  approval: ApprovalPermissionContext,
  projectRoles: ReadonlyMap<string, ProjectRole>,
): ApprovalPermissionSet {
  return {
    canView: canViewApproval(actor, approval, projectRoles),
    canApprove: canApproveApproval(actor, approval, projectRoles),
    canReject: canRejectApproval(actor, approval, projectRoles),
    canCancel: canCancelApproval(actor, approval, projectRoles),
    canSoftDelete: canSoftDeleteApproval(actor, approval, projectRoles),
    canEdit: canEditApproval(actor, approval, projectRoles),
  };
}

export function assertCanViewApproval(
  actor: ApprovalActor,
  approval: ApprovalPermissionContext,
  projectRoles: ReadonlyMap<string, ProjectRole>,
) {
  if (!canViewApproval(actor, approval, projectRoles)) {
    throw new Error("Bạn không có quyền xem yêu cầu phê duyệt này");
  }
}

export function assertCanApproveApproval(
  actor: ApprovalActor,
  approval: ApprovalPermissionContext,
  projectRoles: ReadonlyMap<string, ProjectRole>,
) {
  if (approval.status !== "PENDING") {
    throw new Error("Chỉ có thể duyệt yêu cầu đang chờ duyệt");
  }
  if (approval.requesterId === actor.id && !isApprovalAdmin(actor)) {
    throw new Error("Bạn không thể tự duyệt yêu cầu của chính mình");
  }
  if (!canApproveApproval(actor, approval, projectRoles)) {
    throw new Error("Bạn không có quyền duyệt yêu cầu này");
  }
}

export function assertCanRejectApproval(
  actor: ApprovalActor,
  approval: ApprovalPermissionContext,
  projectRoles: ReadonlyMap<string, ProjectRole>,
  reason: string,
) {
  if (reason.trim().length < 10) {
    throw new Error("Lý do từ chối tối thiểu 10 ký tự");
  }
  if (approval.status !== "PENDING") {
    throw new Error("Chỉ có thể từ chối yêu cầu đang chờ duyệt");
  }
  if (approval.requesterId === actor.id && !isApprovalAdmin(actor)) {
    throw new Error("Bạn không thể tự từ chối yêu cầu của chính mình");
  }
  if (!canRejectApproval(actor, approval, projectRoles)) {
    throw new Error("Bạn không có quyền từ chối yêu cầu này");
  }
}

export function assertCanCancelApproval(
  actor: ApprovalActor,
  approval: ApprovalPermissionContext,
  projectRoles: ReadonlyMap<string, ProjectRole>,
) {
  if (approval.status !== "PENDING") {
    throw new Error("Chỉ có thể hủy yêu cầu đang chờ duyệt");
  }
  if (!canCancelApproval(actor, approval, projectRoles)) {
    throw new Error("Bạn không có quyền hủy yêu cầu này");
  }
}

export function assertCanSoftDeleteApproval(
  actor: ApprovalActor,
  approval: ApprovalPermissionContext,
  projectRoles: ReadonlyMap<string, ProjectRole>,
) {
  if (!canSoftDeleteApproval(actor, approval, projectRoles)) {
    throw new Error("Bạn không có quyền xóa yêu cầu này");
  }
}

export function assertCanUpdateApproval(
  actor: ApprovalActor,
  approval: ApprovalPermissionContext,
  projectRoles: ReadonlyMap<string, ProjectRole>,
) {
  if (approval.status !== "PENDING") {
    throw new Error("Chỉ có thể sửa yêu cầu đang chờ duyệt");
  }
  if (!canEditApproval(actor, approval, projectRoles)) {
    throw new Error("Bạn không có quyền sửa yêu cầu này");
  }
}
