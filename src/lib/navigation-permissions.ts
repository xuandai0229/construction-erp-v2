import type { UserRole } from "@prisma/client";
import { canRoleAccessRoute } from "./roles/role-workspace-policy";

const COMPANY_WIDE: string[] = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"];
const OPERATIONAL_READ_ALL: string[] = ["CONSTRUCTION_SUPERVISOR"];
export function canViewNavigationItem(role: UserRole, href: string) {
  return canRoleAccessRoute(role, href);
}

export function projectNavName(role: UserRole, href: string, name: string) {
  if (href === "/projects" && !COMPANY_WIDE.includes(role) && !OPERATIONAL_READ_ALL.includes(role)) return "Công trình của tôi";
  return name;
}
