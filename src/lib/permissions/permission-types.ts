import type { ProjectRole, UserRole } from "@prisma/client";

export const PERMISSIONS = [
  "users.view", "users.create", "users.update_profile", "users.assign_system_role", "users.assign_project_role", "users.lock", "users.deactivate",
  "projects.view", "projects.create", "projects.update", "projects.assign_member",
  "documents.view", "documents.upload", "documents.update", "documents.delete", "documents.download",
  "reports.view", "reports.create", "reports.update", "reports.submit", "reports.approve", "reports.reject", "reports.export",
  "materials.view", "materials.request", "materials.update", "materials.approve", "materials.receive", "materials.issue",
  "contracts.view", "contracts.create", "contracts.update", "contracts.delete",
  "payments.view", "payments.create", "payments.update", "payments.review", "payments.approve", "payments.mark_paid", "payments.export",
  "approvals.view", "approvals.create", "approvals.decide",
  "suppliers.view", "suppliers.manage",
  "audit.view_global", "audit.view_project", "audit.export",
  "settings.company", "settings.system",
] as const;

export type Permission = (typeof PERMISSIONS)[number];
export type PermissionScope = "GLOBAL" | "ASSIGNED_PROJECTS" | "OWN_RECORDS" | "SPECIFIC_PROJECTS" | "DEPARTMENT" | "NONE";

export type PermissionContext = {
  projectId?: string | null;
  ownerId?: string | null;
  membership?: { projectId: string; role: ProjectRole } | null;
};

export type PermissionResolution = {
  permission: Permission;
  allowed: boolean;
  scope: PermissionScope;
  reason: string;
  sourcePolicy: string;
  membership: { projectId: string; role: ProjectRole } | null;
};

export type PermissionActor = Pick<{ id: string; role: UserRole }, "id" | "role">;

