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
  if (userRole === "ADMIN" || userRole === "DIRECTOR") {
    perms.canView = true;
    perms.canCreate = true;
    perms.canUpdate = true;
    perms.canDelete = true;
    perms.canApprove = true;
    perms.canMarkPaid = true;
    return perms;
  }

  if (userRole === "ACCOUNTANT") {
    perms.canView = true;
    perms.canCreate = true;
    perms.canUpdate = true;
    perms.canDelete = false; // accountants usually don't delete
    perms.canApprove = false; // usually PD or manager approves
    perms.canMarkPaid = true;
    return perms;
  }

  if (userRole === "DEPUTY_DIRECTOR" || userRole === "MANAGER") {
    perms.canView = true;
    perms.canCreate = true;
    perms.canUpdate = true;
    perms.canApprove = true;
  }

  // Project scoped roles
  if (projectRole) {
    perms.canView = true;

    switch (projectRole) {
      case "PROJECT_MANAGER":
      case "SITE_COMMANDER":
        perms.canCreate = true;
        perms.canUpdate = true;
        perms.canApprove = true; // Can approve payment requests at site level
        break;
      case "CHIEF_COMMANDER":
      case "ASSISTANT_COMMANDER":
        perms.canCreate = true;
        perms.canUpdate = true;
        break;
      case "QA_QC":
      case "HSE":
      case "SUPERVISOR":
        perms.canCreate = true;
        break;
      case "VIEWER":
        // just view
        break;
    }
  }

  return perms;
}
