import { UserRole, ProjectRole } from "@prisma/client";

export interface AccountingPermissionSet {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canMarkPaid: boolean;
}

export function getAccountingPermissions(
  userRole?: UserRole,
  projectRole?: ProjectRole | null
): AccountingPermissionSet {
  const perms: AccountingPermissionSet = {
    canView: false,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canApprove: false,
    canMarkPaid: false,
  };

  if (!userRole) return perms;

  // Global Admins / Directors see everything
  if (userRole === "ADMIN" || userRole === "DIRECTOR" || userRole === "DEPUTY_DIRECTOR") {
    perms.canView = true;
    perms.canCreate = true;
    perms.canUpdate = true;
    perms.canDelete = true;
    perms.canApprove = true;
    perms.canMarkPaid = true;
    return perms;
  }

  if (!projectRole) return perms;

  // Project role is authoritative inside a project. VIEWER remains read-only
  // even if the user's global role is ACCOUNTANT or MANAGER.
  if (projectRole === "VIEWER") {
    perms.canView = true;
    return perms;
  }

  perms.canView = true;

  switch (projectRole) {
    case "PROJECT_MANAGER":
    case "SITE_COMMANDER":
    case "CHIEF_COMMANDER":
    case "ASSISTANT_COMMANDER":
      perms.canCreate = true;
      perms.canUpdate = true;
      break;
    case "QA_QC":
    case "HSE":
    case "SUPERVISOR":
      break;
  }

  if (userRole === "ACCOUNTANT") {
    perms.canCreate = true;
    perms.canUpdate = true;
    perms.canMarkPaid = true;
  }

  return perms;
}
