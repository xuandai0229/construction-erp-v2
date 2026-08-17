import { EmployeeStatus, Prisma } from "@prisma/client";

/**
 * Canonical definition of "Current Workforce" (Nhân sự hiện tại)
 * Status MUST be either ACTIVE (Đang làm việc) or PROBATION (Thử việc).
 */
export const ACTIVE_WORKFORCE_STATUSES: EmployeeStatus[] = [
  EmployeeStatus.ACTIVE,
  EmployeeStatus.PROBATION,
];

/**
 * Builds standard Prisma condition for active/current workforce.
 */
export function buildCurrentWorkforceCondition(): Prisma.EmployeeWhereInput {
  return {
    status: { in: ACTIVE_WORKFORCE_STATUSES },
  };
}

/**
 * Helper to build standard active project assignment condition.
 */
export function buildActiveProjectAssignmentCondition(now: Date = new Date()) {
  return {
    status: "ACTIVE" as const,
    OR: [{ endDate: null }, { endDate: { gte: now } }],
  };
}

/**
 * Helper to build standard active primary org assignment condition.
 */
export function buildActivePrimaryOrgCondition() {
  return {
    isPrimary: true,
    endDate: null,
  };
}
