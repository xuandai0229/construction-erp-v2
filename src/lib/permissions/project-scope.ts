import type { ProjectRole, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

const COMPANY_WIDE: UserRole[] = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"];
const ALL_PROJECT_OPERATIONAL_READ: UserRole[] = ["CONSTRUCTION_SUPERVISOR"];

export type ProjectMembership = { projectId: string; role: ProjectRole };

export async function getActiveProjectMembership(userId: string, projectId: string): Promise<ProjectMembership | null> {
  return prisma.projectMember.findFirst({
    where: { userId, projectId, isActive: true, deletedAt: null, leftAt: null },
    select: { projectId: true, role: true },
  });
}

export function isCompanyWideRole(role: UserRole): boolean {
  return COMPANY_WIDE.includes(role);
}

export function hasAllProjectOperationalRead(role: UserRole): boolean {
  return COMPANY_WIDE.includes(role) || ALL_PROJECT_OPERATIONAL_READ.includes(role);
}
