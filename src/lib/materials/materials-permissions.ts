import { UserRole, ProjectRole } from "@prisma/client";

export type MaterialPermission =
  | "materials.view"
  | "materials.item.create"
  | "materials.item.update"
  | "materials.item.delete"
  | "materials.item.restore"
  | "materials.stock.view"
  | "materials.stock.import"
  | "materials.stock.export"
  | "materials.transaction.view"
  | "materials.purchase.view"
  | "materials.purchase.create";

export interface MaterialPermissionSet {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canRestore: boolean;
  canImport: boolean;
  canExport: boolean;
  canViewTransactions: boolean;
  canViewPurchase: boolean;
  canApproveRequest: boolean;
  canUpdateMaterialRequests: boolean;
}

const NO_MATERIAL_PERMISSIONS: MaterialPermissionSet = {
  canView: false,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canRestore: false,
  canImport: false,
  canExport: false,
  canViewTransactions: false,
  canViewPurchase: false,
  canApproveRequest: false,
  canUpdateMaterialRequests: false,
};

const READ_ONLY_MATERIAL_PERMISSIONS: MaterialPermissionSet = {
  canView: true,
  canCreate: false,
  canUpdate: false,
  canDelete: false,
  canRestore: false,
  canImport: false,
  canExport: false,
  canViewTransactions: true,
  canViewPurchase: true,
  canApproveRequest: false,
  canUpdateMaterialRequests: false,
};

const FULL_MATERIAL_PERMISSIONS: MaterialPermissionSet = {
  canView: true,
  canCreate: true,
  canUpdate: true,
  canDelete: true,
  canRestore: true,
  canImport: true,
  canExport: true,
  canViewTransactions: true,
  canViewPurchase: true,
  canApproveRequest: true,
  canUpdateMaterialRequests: true,
};

export function getMaterialPermissions(
  userRole?: UserRole,
  projectRole?: ProjectRole | null
): MaterialPermissionSet {
  // System admin and company-wide leadership have full business visibility.
  if (userRole === "ADMIN" || userRole === "DIRECTOR" || userRole === "DEPUTY_DIRECTOR") {
    return FULL_MATERIAL_PERMISSIONS;
  }

  // If not admin and no project role, no access
  if (!projectRole) {
    return NO_MATERIAL_PERMISSIONS;
  }

  // Project role is authoritative for project-scoped operations. VIEWER is
  // always read-only, even if the global role is ACCOUNTANT/ENGINEER/STAFF.
  if (projectRole === "VIEWER") {
    return READ_ONLY_MATERIAL_PERMISSIONS;
  }

  // Project operations roles have full materials operations within the project.
  const isManager =
    projectRole === "PROJECT_MANAGER" ||
    projectRole === "SITE_COMMANDER" ||
    projectRole === "CHIEF_COMMANDER" ||
    projectRole === "ASSISTANT_COMMANDER";

  if (isManager) {
    return FULL_MATERIAL_PERMISSIONS;
  }

  // Other roles only have view access
  return READ_ONLY_MATERIAL_PERMISSIONS;
}
