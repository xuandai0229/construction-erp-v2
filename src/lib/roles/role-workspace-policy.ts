import type { UserRole } from "@prisma/client";
import { canAccessSettings } from "@/lib/settings/settings-permissions";

export type RoleWorkspaceGroup = "EXECUTIVE_DASHBOARD" | "OPERATIONAL_WORKSPACE";

export interface RoleWorkspaceDefinition {
  group: RoleWorkspaceGroup;
  defaultRoute: string;
  defaultNavigationHref: string;
  dashboardEnabled: boolean;
}

export const ROLE_WORKSPACE_REGISTRY: Record<UserRole, RoleWorkspaceDefinition> = {
  ADMIN: { group: "EXECUTIVE_DASHBOARD", defaultRoute: "/dashboard", defaultNavigationHref: "/dashboard", dashboardEnabled: true },
  DIRECTOR: { group: "EXECUTIVE_DASHBOARD", defaultRoute: "/dashboard", defaultNavigationHref: "/dashboard", dashboardEnabled: true },
  DEPUTY_DIRECTOR: { group: "EXECUTIVE_DASHBOARD", defaultRoute: "/dashboard", defaultNavigationHref: "/dashboard", dashboardEnabled: true },
  SUPERVISION_HEAD: { group: "OPERATIONAL_WORKSPACE", defaultRoute: "/reports/weekly-inspection", defaultNavigationHref: "/reports", dashboardEnabled: false },
  CONSTRUCTION_SUPERVISOR: { group: "OPERATIONAL_WORKSPACE", defaultRoute: "/reports/weekly-inspection", defaultNavigationHref: "/reports", dashboardEnabled: false },
  CHIEF_COMMANDER: { group: "OPERATIONAL_WORKSPACE", defaultRoute: "/projects", defaultNavigationHref: "/projects", dashboardEnabled: false },
  MANAGER: { group: "OPERATIONAL_WORKSPACE", defaultRoute: "/projects", defaultNavigationHref: "/projects", dashboardEnabled: false },
  ENGINEER: { group: "OPERATIONAL_WORKSPACE", defaultRoute: "/projects", defaultNavigationHref: "/projects", dashboardEnabled: false },
  STAFF: { group: "OPERATIONAL_WORKSPACE", defaultRoute: "/projects", defaultNavigationHref: "/projects", dashboardEnabled: false },
};

const COMPANY_WIDE = new Set<UserRole>(["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"]);
const OPERATIONAL_READ_ALL = new Set<UserRole>(["CONSTRUCTION_SUPERVISOR"]);
const PROJECT_BUSINESS_ROLES = new Set<UserRole>(["CHIEF_COMMANDER", "MANAGER", "ENGINEER", "STAFF", "SUPERVISION_HEAD"]);

export function canAccessExecutiveDashboard(role: UserRole): boolean {
  return ROLE_WORKSPACE_REGISTRY[role].dashboardEnabled;
}

export function assertCanAccessExecutiveDashboard(role: UserRole): void {
  if (!canAccessExecutiveDashboard(role)) {
    throw new Error("FORBIDDEN_EXECUTIVE_DASHBOARD");
  }
}

export function getDefaultRouteForRole(role: UserRole): string {
  return ROLE_WORKSPACE_REGISTRY[role].defaultRoute;
}

export function getDefaultNavigationHrefForRole(role: UserRole): string {
  return ROLE_WORKSPACE_REGISTRY[role].defaultNavigationHref;
}

export function canRoleAccessRoute(role: UserRole, pathname: string): boolean {
  if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) return canAccessExecutiveDashboard(role);
  if (pathname === "/projects" || pathname.startsWith("/projects/")) return true;
  if (pathname === "/documents" || pathname.startsWith("/documents/") || pathname === "/materials" || pathname.startsWith("/materials/")) {
    return COMPANY_WIDE.has(role) || OPERATIONAL_READ_ALL.has(role) || PROJECT_BUSINESS_ROLES.has(role);
  }
  if (pathname === "/reports" || pathname.startsWith("/reports/")) {
    return COMPANY_WIDE.has(role) || OPERATIONAL_READ_ALL.has(role) || PROJECT_BUSINESS_ROLES.has(role);
  }
  if (pathname === "/supervision/weekly" || pathname.startsWith("/supervision/weekly/")) {
    return COMPANY_WIDE.has(role) || OPERATIONAL_READ_ALL.has(role) || role === "SUPERVISION_HEAD";
  }
  if (pathname === "/approvals" || pathname.startsWith("/approvals/")) {
    return COMPANY_WIDE.has(role) || OPERATIONAL_READ_ALL.has(role) || role === "CHIEF_COMMANDER" || role === "MANAGER";
  }
  if (pathname === "/settings" || pathname.startsWith("/settings/")) return canAccessSettings(role);
  if (pathname === "/users" || pathname.startsWith("/users/")) {
    return COMPANY_WIDE.has(role);
  }
  return false;
}

export function resolvePostLoginRoute(role: UserRole, requestedRoute?: string | null): string {
  const fallback = getDefaultRouteForRole(role);
  if (!requestedRoute) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(requestedRoute, "http://local.invalid");
  } catch {
    return fallback;
  }

  if (parsed.origin !== "http://local.invalid" || !parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
    return fallback;
  }

  return canRoleAccessRoute(role, parsed.pathname)
    ? `${parsed.pathname}${parsed.search}${parsed.hash}`
    : fallback;
}
