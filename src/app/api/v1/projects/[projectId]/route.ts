import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { projectId } = await params;
    const scopeErr = await verifyProjectScope(auth.session, projectId);
    if (scopeErr) return scopeErr;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { isActive: true, deletedAt: null },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        _count: {
          select: {
            wbsItems: true,
            siteReports: true,
            materialProposals: true,
          },
        },
      },
    });

    if (!project || project.deletedAt) {
      return apiError('NOT_FOUND', 'Không tìm thấy thông tin dự án.', 404);
    }

    return apiSuccess({
      id: project.id,
      code: project.code,
      name: project.name,
      displayName: project.displayName,
      description: project.description,
      investor: project.investor,
      location: project.location,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      budget: project.budget ? Number(project.budget) : null,
      members: project.members.map((m) => ({
        id: m.id,
        role: m.role,
        user: m.user,
        joinedAt: m.joinedAt,
      })),
      stats: {
        wbsItemCount: project._count.wbsItems,
        reportCount: project._count.siteReports,
        proposalCount: project._count.materialProposals,
      },
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  } catch (error: any) {
    console.error('[API V1 Get Project Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải thông tin dự án.', 500);
  }
}
