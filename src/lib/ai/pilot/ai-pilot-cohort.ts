import { UserRole } from "@prisma/client";

export interface PilotCohortUser {
  userId: string; // Immutable Database User.id (Source of Truth)
  username?: string;
  email?: string;
  role: UserRole;
  displayName: string;
  employeeCode?: string;
  pilotCohort: "PHASE_1B3_PILOT";
}

/**
 * Exact Pilot Allowlist for Phase 1B.3 based on Real Database User.role
 *
 * Security Invariants:
 * 1. Mapped 100% to real, existing User accounts in runtime database.
 * 2. Only ADMIN and CHIEF_COMMANDER accounts currently exist in the database (ENGINEER/SUPERVISOR = 0 in DB).
 * 3. Enforced strictly by immutable `User.id`.
 */
export const PHASE_1B3_PILOT_COHORT: PilotCohortUser[] = [
  {
    userId: "cmroatu6r0000mowklk61sv56",
    email: "daicongtu2910@gmail.com",
    role: "ADMIN",
    displayName: "Admin System (XĐ)",
    pilotCohort: "PHASE_1B3_PILOT",
  },
  {
    userId: "cmsraldrt00149ck5366am56m",
    username: "NV-2026-0002",
    employeeCode: "NV-2026-0002",
    role: "CHIEF_COMMANDER",
    displayName: "Lê Mạnh Hùng (Chỉ huy trưởng CT-2026-0002)",
    pilotCohort: "PHASE_1B3_PILOT",
  },
  {
    userId: "cmsraldzc00189ck5o32c3npg",
    username: "NV-2026-0003",
    employeeCode: "NV-2026-0003",
    role: "CHIEF_COMMANDER",
    displayName: "Đoàn Văn Giang (Chỉ huy trưởng CT-2026-0003/0004/0005)",
    pilotCohort: "PHASE_1B3_PILOT",
  },
  {
    userId: "cmsrale6l001e9ck5qmdgebtn",
    username: "NV-2026-0004",
    employeeCode: "NV-2026-0004",
    role: "CHIEF_COMMANDER",
    displayName: "Lê Trọng Hạ (Chỉ huy trưởng CT-2026-0006)",
    pilotCohort: "PHASE_1B3_PILOT",
  },
];

/**
 * Immutable Set of Enrolled Pilot User IDs
 */
export const ALLOWED_PILOT_USER_IDS: ReadonlySet<string> = new Set(
  PHASE_1B3_PILOT_COHORT.map((p) => p.userId)
);

/**
 * Verifies if an actor is explicitly enrolled in the Phase 1B.3 Internal Pilot Cohort.
 *
 * Security Invariants:
 * 1. Checks immutable `User.id` as primary source of truth.
 * 2. Secondary check matches login username / email.
 * 3. Any user outside this allowlist is blocked with HTTP 403 / PILOT_COHORT_RESTRICTED.
 */
export function isUserInPilotCohort(user: {
  id?: string;
  username?: string | null;
  email?: string | null;
  role?: UserRole;
}): boolean {
  if (process.env.AI_PILOT_ENFORCEMENT === "false") {
    return true;
  }

  // 1. Primary check: Immutable User.id
  if (user.id && ALLOWED_PILOT_USER_IDS.has(user.id)) {
    return true;
  }

  // 2. Secondary check: Normalized login identifier
  const userIdentifier = (user.username || user.email || "").toLowerCase().trim();
  if (userIdentifier) {
    return PHASE_1B3_PILOT_COHORT.some(
      (p) =>
        (p.email && p.email.toLowerCase() === userIdentifier) ||
        (p.username && p.username.toLowerCase() === userIdentifier)
    );
  }

  return false;
}
