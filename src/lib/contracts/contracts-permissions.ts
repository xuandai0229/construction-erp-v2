import { UserRole, ProjectRole, ContractStatus } from "@prisma/client";

export type ContractDisplayStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "TERMINATED" | "OVERDUE" | "EXPIRING";

export function getContractDisplayStatus(
  status: ContractStatus,
  endDate: Date | string | null
): ContractDisplayStatus {
  if (status === "DRAFT") return "DRAFT";
  if (status === "COMPLETED") return "COMPLETED";
  if (status === "TERMINATED") return "TERMINATED";
  
  if (status === "ACTIVE" && endDate) {
    const end = new Date(endDate);
    const today = new Date();
    // Reset hours to compare dates only
    today.setHours(0, 0, 0, 0);
    const endCompare = new Date(end);
    endCompare.setHours(0, 0, 0, 0);

    if (endCompare < today) {
      return "OVERDUE";
    }
    
    const next30Days = new Date(today);
    next30Days.setDate(today.getDate() + 30);
    if (endCompare <= next30Days) {
      return "EXPIRING";
    }
  }
  
  return "ACTIVE";
}

export interface ContractPermissionSet {
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}


export function getContractPermissions(
  userRole?: UserRole,
  projectRole?: ProjectRole | null
): ContractPermissionSet {
  // ADMIN always has full access
  if (userRole === "ADMIN") {
    return { canView: true, canCreate: true, canUpdate: true, canDelete: true };
  }

  // Director / Deputy Director have full access
  if (userRole === "DIRECTOR" || userRole === "DEPUTY_DIRECTOR") {
    return { canView: true, canCreate: true, canUpdate: true, canDelete: true };
  }

  // Non company-wide roles must be project-scoped. Without a project assignment,
  // they cannot view or mutate contract data.
  if (!projectRole) {
    return { canView: false, canCreate: false, canUpdate: false, canDelete: false };
  }

  // Management project roles have full access within their project
  const isManager =
    projectRole === "PROJECT_MANAGER" ||
    projectRole === "SITE_COMMANDER" ||
    projectRole === "CHIEF_COMMANDER" ||
    projectRole === "ASSISTANT_COMMANDER";

  if (isManager) {
    return { canView: true, canCreate: true, canUpdate: true, canDelete: true };
  }

  // Other project roles: view only
  return { canView: true, canCreate: false, canUpdate: false, canDelete: false };
}
