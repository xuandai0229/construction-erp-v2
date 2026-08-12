import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/v1-auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';
import { isCompanyWideRole } from '@/lib/permissions/project-scope';

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        id: true,
        email: true,
        username: true,
        name: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!user) {
      return apiError('NOT_FOUND', 'Không tìm thấy thông tin tài khoản.', 404);
    }

    let assignedProjects: { id: string; name: string; code: string | null; role: string }[] = [];

    if (isCompanyWideRole(user.role)) {
      const allProjects = await prisma.project.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      });
      assignedProjects = allProjects.map((p) => ({
        id: p.id,
        name: p.name,
        code: p.code,
        role: 'COMPANY_WIDE',
      }));
    } else {
      const memberships = await prisma.projectMember.findMany({
        where: {
          userId: user.id,
          isActive: true,
          deletedAt: null,
          leftAt: null,
          project: { deletedAt: null },
        },
        select: {
          role: true,
          project: {
            select: { id: true, name: true, code: true },
          },
        },
      });
      assignedProjects = memberships.map((m) => ({
        id: m.project.id,
        name: m.project.name,
        code: m.project.code,
        role: m.role,
      }));
    }

    return apiSuccess({
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role,
      phone: user.phone,
      createdAt: user.createdAt,
      assignedProjects,
    });
  } catch (error: any) {
    console.error('[API V1 ME Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải thông tin cá nhân.', 500);
  }
}
