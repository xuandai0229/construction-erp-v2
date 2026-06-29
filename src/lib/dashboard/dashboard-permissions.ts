import type { UserRole } from "@prisma/client";

const COMPANY_WIDE_ROLES: UserRole[] = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"];
const FINANCE_DASHBOARD_ROLES: UserRole[] = [
  "ADMIN",
  "DIRECTOR",
  "DEPUTY_DIRECTOR",
  "ACCOUNTANT",
];
const APPROVAL_DASHBOARD_ROLES: UserRole[] = [
  "ADMIN",
  "DIRECTOR",
  "DEPUTY_DIRECTOR",
  "MANAGER",
  "ACCOUNTANT",
];

export type DashboardProjectScope = {
  allProjects: boolean;
  projectIds: string[] | null;
};

export function canViewCompanyWideDashboard(role: UserRole) {
  return COMPANY_WIDE_ROLES.includes(role);
}

export function canViewFinanceDashboard(role: UserRole) {
  return FINANCE_DASHBOARD_ROLES.includes(role);
}

export function canViewApprovalDashboard(role: UserRole) {
  return APPROVAL_DASHBOARD_ROLES.includes(role);
}

export function getDashboardProjectScope(accessibleProjectIds: string[] | null): DashboardProjectScope {
  return {
    allProjects: accessibleProjectIds === null,
    projectIds: accessibleProjectIds,
  };
}
