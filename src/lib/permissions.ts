import { UserRole } from '@prisma/client';
import prisma from './prisma';

const HIGH_LEVEL_ROLES: UserRole[] = ['ADMIN', 'DIRECTOR', 'DEPUTY_DIRECTOR'];

export async function canViewProject(userId: string, userRole: UserRole, projectId: string): Promise<boolean> {
  if (HIGH_LEVEL_ROLES.includes(userRole)) return true;

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
  });

  return !!member && member.isActive && !member.deletedAt;
}

export async function canEditProject(userId: string, userRole: UserRole, projectId: string): Promise<boolean> {
  if (HIGH_LEVEL_ROLES.includes(userRole)) return true;

  // Chief commanders assigned to a project can edit data within it
  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
  });

  if (!member || !member.isActive || member.deletedAt) return false;
  return member.role === 'PROJECT_MANAGER' || member.role === 'SITE_COMMANDER' || member.role === 'CHIEF_COMMANDER';
}
