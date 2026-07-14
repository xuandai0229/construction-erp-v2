import { WORK_MANAGEMENT_PERMISSIONS, type WorkManagementPermission } from "./contract";

export type WorkManagementPermissionMetadata = { key: WorkManagementPermission; feature: "work-management"; defaultAssigned: false; activated: false };

/** Pure metadata adapter. It deliberately does not mutate the existing RBAC registry or grant any role. */
export function getUnactivatedWorkManagementPermissionMetadata(): readonly WorkManagementPermissionMetadata[] {
  return WORK_MANAGEMENT_PERMISSIONS.map((key) => ({ key, feature: "work-management", defaultAssigned: false, activated: false }));
}
