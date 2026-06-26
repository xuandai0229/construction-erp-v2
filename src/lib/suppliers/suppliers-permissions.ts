import { UserRole, ProjectRole } from "@prisma/client";

export interface SupplierPermissionSet {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export function getSupplierPermissions(
  userRole?: UserRole,
  projectRole?: ProjectRole | null
): SupplierPermissionSet {
  // ADMIN always has full access
  if (userRole === "ADMIN") {
    return {
      canView: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    };
  }

  // Director / Deputy Director have full access
  if (userRole === "DIRECTOR" || userRole === "DEPUTY_DIRECTOR") {
    return {
      canView: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    };
  }

  // If no project role, check system role
  if (!projectRole) {
    // MANAGER and ACCOUNTANT can view/create/update but not delete
    if (userRole === "MANAGER" || userRole === "ACCOUNTANT") {
      return {
        canView: true,
        canCreate: true,
        canUpdate: true,
        canDelete: false,
      };
    }

    // Other system roles: view only
    return {
      canView: true,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
    };
  }

  // Management project roles have full access
  const isManager =
    projectRole === "PROJECT_MANAGER" ||
    projectRole === "SITE_COMMANDER" ||
    projectRole === "CHIEF_COMMANDER" ||
    projectRole === "ASSISTANT_COMMANDER";

  if (isManager) {
    return {
      canView: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
    };
  }

  // Other project roles: view only
  return {
    canView: true,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
  };
}
