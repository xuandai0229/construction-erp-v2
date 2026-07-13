import type { ProjectRole, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

const COMPANY_WIDE: UserRole[] = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"];

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

