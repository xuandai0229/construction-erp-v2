import type { ProjectRole, UserRole } from "@prisma/client";
import { PERMISSION_REGISTRY } from "./permission-registry";
import type { Permission, PermissionResolution, PermissionScope } from "./permission-types";

export type PermissionPolicyContext = {
  actorUserId: string;
  systemRole: UserRole;
  permission: Permission;
  requestedProjectId?: string | null;
  membership?: { projectId: string; role: ProjectRole; isActive?: boolean; deletedAt?: Date | string | null; leftAt?: Date | string | null } | null;
  actorActive?: boolean;
  actorDeletedAt?: Date | string | null;
  projectActive?: boolean;
  resourceExists?: boolean;
  resourceOwnerId?: string | null;
  resourceStatus?: string | null;
  resourceType?: string | null;
};

export type PermissionPolicyResult = PermissionResolution & { reasonCode: string };

function outcome(context: PermissionPolicyContext, allowed: boolean, scope: PermissionScope, reasonCode: string, reason: string): PermissionPolicyResult {
  const membership = context.membership ? { projectId: context.membership.projectId, role: context.membership.role } : null;
  return { permission: context.permission, allowed, scope, reasonCode, reason, sourcePolicy: PERMISSION_REGISTRY[context.permission].sourcePolicy, membership };
}

/** Pure policy layer: data access stays in permission-resolver.ts. */
export function evaluatePermissionPolicy(context: PermissionPolicyContext): PermissionPolicyResult {
  const definition = PERMISSION_REGISTRY[context.permission];
  const projectId = context.requestedProjectId ?? null;
  const membership = context.membership ?? null;
  if (context.actorActive === false || context.actorDeletedAt) return outcome(context, false, "NONE", "ACTOR_INACTIVE", "Tài khoản không còn hoạt động.");
  if (context.resourceExists === false) return outcome(context, false, "NONE", "RESOURCE_NOT_FOUND", "Không tìm thấy dữ liệu yêu cầu.");
  if (projectId && context.projectActive === false) return outcome(context, false, "NONE", "PROJECT_INACTIVE", "Công trình không còn hoạt động.");
  if (context.permission === "approvals.decide" && context.resourceOwnerId === context.actorUserId) return outcome(context, false, "NONE", "SELF_APPROVAL_FORBIDDEN", "Không thể tự phê duyệt yêu cầu của chính mình.");
  if (context.permission === "approvals.decide" && context.resourceStatus && context.resourceStatus !== "PENDING") return outcome(context, false, "NONE", "INVALID_WORKFLOW_STATUS", "Yêu cầu không ở trạng thái chờ phê duyệt.");
  if (context.permission === "approvals.decide" && context.resourceType && !["PAYMENT", "MATERIAL", "REPORT", "CONTRACT", "CHANGE_ORDER", "OTHER"].includes(context.resourceType)) return outcome(context, false, "NONE", "INVALID_RESOURCE_TYPE", "Loại yêu cầu không hợp lệ.");
  if (definition.globalRoles?.includes(context.systemRole)) return outcome(context, true, "GLOBAL", "GLOBAL_ROLE", "Vai trò có quyền toàn cục theo policy hiện hành.");
  if (!projectId) {
    if (context.permission === "suppliers.view") return outcome(context, true, "GLOBAL", "LEGACY_GLOBAL_MASTER_DATA", "Danh mục nhà cung cấp là master data dùng chung.");
    if (definition.allowOwnRecord && context.resourceOwnerId === context.actorUserId) return outcome(context, true, "OWN_RECORDS", "OWNER_SCOPE", "Bạn là người tạo bản ghi.");
    return outcome(context, false, "NONE", "PROJECT_REQUIRED", "Thao tác cần xác định công trình để kiểm tra phạm vi.");
  }
  if (!membership || membership.projectId !== projectId) return outcome(context, false, "NONE", "MEMBERSHIP_REQUIRED", "Bạn không được gán vào công trình này.");
  if (membership.isActive === false || membership.deletedAt || membership.leftAt) return outcome(context, false, "NONE", "MEMBERSHIP_INACTIVE", "Phân công tại công trình không còn hiệu lực.");
  if (context.systemRole === "ACCOUNTANT" && ["payments.create", "payments.update", "payments.mark_paid"].includes(context.permission) && membership.role !== "VIEWER") {
    return outcome(context, true, "ASSIGNED_PROJECTS", "ACCOUNTANT_ASSIGNED_PROJECT", "Kế toán có quyền tài chính tại công trình được gán.");
  }
  if (definition.projectRoles?.includes(membership.role)) {
    return outcome(context, true, "ASSIGNED_PROJECTS", "PROJECT_ROLE", "Quyền được cấp theo vai trò tại công trình.");
  }
  if (definition.allowOwnRecord && context.resourceOwnerId === context.actorUserId) return outcome(context, true, "OWN_RECORDS", "OWNER_SCOPE", "Bạn là người tạo bản ghi trong công trình được gán.");
  return outcome(context, false, "NONE", "PROJECT_ROLE_DENIED", "Vai trò tại công trình không có quyền thực hiện thao tác này.");
}
