import type { ProjectRole, UserRole } from "@prisma/client";

const HIGH_LEVEL: UserRole[] = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"];

export function isHighLevel(role: UserRole) {
  return HIGH_LEVEL.includes(role);
}

export function canAccessProjectProposal(input: { userRole: UserRole; projectRole: ProjectRole | null }) {
  return isHighLevel(input.userRole) || input.projectRole !== null;
}

export function canCreateProposal(input: { userRole: UserRole; projectRole: ProjectRole | null }) {
  return isHighLevel(input.userRole) || (input.projectRole !== null && input.projectRole !== "VIEWER");
}

export function canTechnicalApprove(input: { userRole: UserRole; canApprove: boolean }) {
  // Requirement 20: ADMIN does NOT automatically become a business signer unless explicitly assigned/authorized.
  return Boolean(input.canApprove);
}

export function canFinalApprove(userRole: UserRole) {
  return userRole === "DEPUTY_DIRECTOR" || userRole === "DIRECTOR";
}
