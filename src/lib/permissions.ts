import { UserRole } from '@prisma/client';
import prisma from './prisma';

export async function canViewProject(userId: string, userRole: UserRole, projectId: string): Promise<boolean> {
  if (userRole === 'ADMIN' || userRole === 'DIRECTOR') return true;

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
  });

  return !!member;
}

export async function canEditProject(userId: string, userRole: UserRole, projectId: string): Promise<boolean> {
  if (userRole === 'ADMIN' || userRole === 'DIRECTOR') return true;

  const member = await prisma.projectMember.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
  });

  if (!member) return false;
  return member.role === 'PROJECT_MANAGER' || member.role === 'SITE_COMMANDER';
}
