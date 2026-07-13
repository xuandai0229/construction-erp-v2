import type { UserRole } from "@prisma/client";

const COMPANY_WIDE: UserRole[] = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"];
const PROJECT_BUSINESS_ROLES: UserRole[] = [
  "CHIEF_COMMANDER",
  "MANAGER",
  "ENGINEER",
  "ACCOUNTANT",
  "STAFF",
];

export function canViewNavigationItem(role: UserRole, href: string) {
  if (href === "/dashboard" || href === "/projects") return true;

  if (["/documents", "/reports", "/materials"].includes(href)) {
    return COMPANY_WIDE.includes(role) || PROJECT_BUSINESS_ROLES.includes(role);
  }

  if (["/suppliers", "/contracts", "/accounting", "/approvals"].includes(href)) {
    return COMPANY_WIDE.includes(role) || ["CHIEF_COMMANDER", "MANAGER", "ACCOUNTANT"].includes(role);
  }

  if (["/users", "/settings"].includes(href)) {
    return COMPANY_WIDE.includes(role);
  }

  return true;
}

export function projectNavName(role: UserRole, href: string, name: string) {
  if (href === "/projects" && !COMPANY_WIDE.includes(role)) return "Công trình của tôi";
  return name;
}
