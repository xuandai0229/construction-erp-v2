import type { UserRole } from "@prisma/client";
import { evaluatePermissionPolicy } from "@/lib/permissions/evaluate-permission-policy";
import type { Permission } from "@/lib/permissions/permission-types";

function isAllowed(role: UserRole, permission: Permission) {
  return evaluatePermissionPolicy({
    actorUserId: "settings-policy",
    systemRole: role,
    permission,
  }).allowed;
}

export type SettingsAccess = {
  canView: boolean;
  canViewCompany: boolean;
  canManageCompany: boolean;
  canViewDocuments: boolean;
  canManageDocuments: boolean;
  canViewAdministration: boolean;
};

/** Single policy projection for Settings navigation, page rendering and UI capability hints. */
export function getSettingsAccess(role: UserRole): SettingsAccess {
  return {
    canView: isAllowed(role, "settings.view"),
    canViewCompany: isAllowed(role, "settings.company.view"),
    canManageCompany: isAllowed(role, "settings.company.manage"),
    canViewDocuments: isAllowed(role, "settings.documents.view"),
    canManageDocuments: isAllowed(role, "settings.documents.manage"),
    canViewAdministration: isAllowed(role, "settings.administration.view"),
  };
}

export function canAccessSettings(role: UserRole): boolean {
  return getSettingsAccess(role).canView;
}
