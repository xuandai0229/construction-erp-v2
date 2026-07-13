import type { ProjectRole, UserRole } from "@prisma/client";
import type { Permission, PermissionScope } from "./permission-types";

export type PermissionDefinition = {
  globalRoles?: readonly UserRole[];
  projectRoles?: readonly ProjectRole[];
  allowOwnRecord?: boolean;
  defaultScope: PermissionScope;
  sourcePolicy: string;
};

const COMPANY_WIDE: UserRole[] = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"];
const PROJECT_MANAGERS: ProjectRole[] = ["PROJECT_MANAGER", "SITE_COMMANDER", "CHIEF_COMMANDER", "ASSISTANT_COMMANDER"];
const PROJECT_APPROVERS: ProjectRole[] = ["PROJECT_MANAGER", "SITE_COMMANDER", "CHIEF_COMMANDER"];
export const PROJECT_OPERATORS: ProjectRole[] = [...PROJECT_MANAGERS, "QA_QC", "HSE", "SUPERVISOR"];
const ANY_PROJECT_MEMBER: ProjectRole[] = [...PROJECT_OPERATORS, "VIEWER"];

/**
 * Phase 2 policy registry. It is deliberately explicit about legacy ADMIN
 * inheritance so that a later business decision can narrow it without a schema
 * migration. Project-scoped defaults follow least privilege.
 */
export const PERMISSION_REGISTRY: Record<Permission, PermissionDefinition> = {
  "users.view": { globalRoles: COMPANY_WIDE, defaultScope: "GLOBAL", sourcePolicy: "users-company-admin" },
  "users.create": { globalRoles: COMPANY_WIDE, defaultScope: "GLOBAL", sourcePolicy: "users-company-admin" },
  "users.update_profile": { globalRoles: COMPANY_WIDE, defaultScope: "GLOBAL", sourcePolicy: "users-company-admin" },
  "users.assign_system_role": { globalRoles: COMPANY_WIDE, defaultScope: "GLOBAL", sourcePolicy: "users-hierarchy" },
  "users.assign_project_role": { globalRoles: COMPANY_WIDE, defaultScope: "GLOBAL", sourcePolicy: "users-company-admin" },
  "users.lock": { globalRoles: COMPANY_WIDE, defaultScope: "GLOBAL", sourcePolicy: "users-hierarchy" },
  "users.deactivate": { globalRoles: COMPANY_WIDE, defaultScope: "GLOBAL", sourcePolicy: "users-hierarchy" },

  "projects.view": { globalRoles: COMPANY_WIDE, projectRoles: ANY_PROJECT_MEMBER, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "project-membership" },
  "projects.create": { globalRoles: COMPANY_WIDE, defaultScope: "GLOBAL", sourcePolicy: "projects-company-admin" },
  "projects.update": { globalRoles: COMPANY_WIDE, defaultScope: "GLOBAL", sourcePolicy: "projects-company-admin" },
  "projects.assign_member": { globalRoles: COMPANY_WIDE, defaultScope: "GLOBAL", sourcePolicy: "projects-company-admin" },

  "documents.view": { globalRoles: COMPANY_WIDE, projectRoles: ANY_PROJECT_MEMBER, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "documents-project-scope" },
  "documents.upload": { globalRoles: COMPANY_WIDE, projectRoles: PROJECT_OPERATORS, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "documents-folder-policy" },
  "documents.update": { globalRoles: COMPANY_WIDE, projectRoles: PROJECT_OPERATORS, allowOwnRecord: true, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "documents-folder-owner-policy" },
  "documents.delete": { globalRoles: COMPANY_WIDE, projectRoles: PROJECT_OPERATORS, allowOwnRecord: true, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "documents-folder-owner-policy" },
  "documents.download": { globalRoles: COMPANY_WIDE, projectRoles: ANY_PROJECT_MEMBER, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "documents-project-scope" },

  "reports.view": { globalRoles: COMPANY_WIDE, projectRoles: ANY_PROJECT_MEMBER, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "reports-project-scope" },
  "reports.create": { globalRoles: COMPANY_WIDE, projectRoles: PROJECT_OPERATORS, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "reports-project-scope" },
  "reports.update": { globalRoles: COMPANY_WIDE, projectRoles: ANY_PROJECT_MEMBER, allowOwnRecord: true, defaultScope: "OWN_RECORDS", sourcePolicy: "reports-owner-policy" },
  "reports.submit": { globalRoles: COMPANY_WIDE, projectRoles: ANY_PROJECT_MEMBER, allowOwnRecord: true, defaultScope: "OWN_RECORDS", sourcePolicy: "reports-owner-policy" },
  "reports.approve": { globalRoles: COMPANY_WIDE, defaultScope: "GLOBAL", sourcePolicy: "reports-company-approver" },
  "reports.reject": { globalRoles: COMPANY_WIDE, defaultScope: "GLOBAL", sourcePolicy: "reports-company-approver" },
  "reports.export": { globalRoles: COMPANY_WIDE, projectRoles: ANY_PROJECT_MEMBER, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "reports-project-scope" },

  "materials.view": { globalRoles: COMPANY_WIDE, projectRoles: ANY_PROJECT_MEMBER, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "materials-project-scope" },
  "materials.request": { globalRoles: COMPANY_WIDE, projectRoles: PROJECT_MANAGERS, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "materials-project-role" },
  "materials.update": { globalRoles: COMPANY_WIDE, projectRoles: PROJECT_MANAGERS, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "materials-project-role" },
  "materials.approve": { globalRoles: COMPANY_WIDE, projectRoles: PROJECT_APPROVERS, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "materials-approval-policy" },
  "materials.receive": { globalRoles: COMPANY_WIDE, projectRoles: PROJECT_MANAGERS, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "materials-project-role" },
  "materials.issue": { globalRoles: COMPANY_WIDE, projectRoles: PROJECT_MANAGERS, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "materials-project-role" },

  "approvals.view": { globalRoles: COMPANY_WIDE, projectRoles: ANY_PROJECT_MEMBER, allowOwnRecord: true, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "approvals-least-privilege" },
  // A viewer can inspect approvals in an assigned project, but cannot initiate a workflow.
  "approvals.create": { globalRoles: COMPANY_WIDE, projectRoles: PROJECT_OPERATORS, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "approvals-least-privilege" },
  "approvals.decide": { globalRoles: COMPANY_WIDE, projectRoles: PROJECT_APPROVERS, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "approvals-project-approver" },

  "audit.view_global": { globalRoles: ["ADMIN"], defaultScope: "GLOBAL", sourcePolicy: "audit-system-admin" },
  "audit.view_project": { globalRoles: COMPANY_WIDE, projectRoles: PROJECT_MANAGERS, defaultScope: "ASSIGNED_PROJECTS", sourcePolicy: "audit-project-scope" },
  "audit.export": { globalRoles: ["ADMIN"], defaultScope: "GLOBAL", sourcePolicy: "audit-system-admin" },
  "settings.company": { globalRoles: COMPANY_WIDE, defaultScope: "GLOBAL", sourcePolicy: "settings-company" },
  "settings.system": { globalRoles: ["ADMIN"], defaultScope: "GLOBAL", sourcePolicy: "settings-system-admin" },
};
