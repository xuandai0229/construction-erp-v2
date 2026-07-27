export const SYSTEM_ADMIN_ROLE_NAMES = ["ADMIN"] as const;
export const COMPANY_WIDE_ROLE_NAMES = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"] as const;
export const ALL_PROJECT_OPERATIONAL_READ_ROLE_NAMES = ["CONSTRUCTION_SUPERVISOR"] as const;

export function isSystemAdminRole(role?: string | null): boolean {
  return role === "ADMIN";
}

export function isCompanyWideRole(role?: string | null): boolean {
  return Boolean(role && (COMPANY_WIDE_ROLE_NAMES as readonly string[]).includes(role));
}

export function hasAllProjectOperationalRead(role?: string | null): boolean {
  return Boolean(role && (
    (COMPANY_WIDE_ROLE_NAMES as readonly string[]).includes(role)
    || (ALL_PROJECT_OPERATIONAL_READ_ROLE_NAMES as readonly string[]).includes(role)
  ));
}
