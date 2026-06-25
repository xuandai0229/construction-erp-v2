import { UserRole, ProjectRole } from "@prisma/client";

export type MaterialPermission =
  | "materials.view"
  | "materials.item.create"
  | "materials.item.update"
  | "materials.item.delete"
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
  canImport: boolean;
  canExport: boolean;
  canViewTransactions: boolean;
  canViewPurchase: boolean;
}

export function getMaterialPermissions(
  userRole?: UserRole,
  projectRole?: ProjectRole | null
): MaterialPermissionSet {
  // ADMIN always has full access
  if (userRole === "ADMIN") {
    return {
      canView: true,
      canCreate: true,
      canUpdate: true,
      canDelete: true,
      canImport: true,
      canExport: true,
      canViewTransactions: true,
      canViewPurchase: true,
    };
  }

  // If not admin and no project role, no access
  if (!projectRole) {
    return {
      canView: false,
      canCreate: false,
      canUpdate: false,
      canDelete: false,
      canImport: false,
      canExport: false,
      canViewTransactions: false,
      canViewPurchase: false,
    };
  }

  // Management roles have full access
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
      canImport: true,
      canExport: true,
      canViewTransactions: true,
      canViewPurchase: true,
    };
  }

  // Other roles only have view access
  return {
    canView: true,
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canImport: false,
    canExport: false,
    canViewTransactions: true,
    canViewPurchase: true,
  };
}
