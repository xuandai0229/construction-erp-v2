import type { ProjectRole, UserRole } from "@prisma/client";

export type FieldProgressPermissionSet = {
  canViewProgress: boolean;
  canUpdateProgress: boolean;
  canApproveProgress: boolean;
  canLockProgress: boolean;
};

const PROJECT_OPERATIONS_ROLES: ProjectRole[] = [
  "PROJECT_MANAGER",
  "SITE_COMMANDER",
  "CHIEF_COMMANDER",
  "ASSISTANT_COMMANDER",
  "QA_QC",
  "HSE",
  "SUPERVISOR",
];

const PROJECT_APPROVER_ROLES: ProjectRole[] = [
  "PROJECT_MANAGER",
  "SITE_COMMANDER",
  "CHIEF_COMMANDER",
];

export function getFieldProgressPermissions(
  userRole?: UserRole,
  projectRole?: ProjectRole | null,
): FieldProgressPermissionSet {
  const empty = {
    canViewProgress: false,
    canUpdateProgress: false,
    canApproveProgress: false,
    canLockProgress: false,
  };

  if (!userRole) return empty;

  if (userRole === "ADMIN" || userRole === "DIRECTOR" || userRole === "DEPUTY_DIRECTOR") {
    return {
      canViewProgress: true,
      canUpdateProgress: true,
      canApproveProgress: true,
      canLockProgress: true,
    };
  }

  if (!projectRole) return empty;

  return {
    canViewProgress: true,
    canUpdateProgress: PROJECT_OPERATIONS_ROLES.includes(projectRole),
    canApproveProgress: PROJECT_APPROVER_ROLES.includes(projectRole),
    canLockProgress: false,
  };
}

export function assertFieldProgressPermission(
  permissions: FieldProgressPermissionSet,
  action: keyof FieldProgressPermissionSet,
) {
  if (!permissions[action]) {
    throw new Error("Bạn không có quyền thực hiện thao tác khối lượng này.");
  }
}
