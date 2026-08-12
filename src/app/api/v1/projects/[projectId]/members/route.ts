import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiList, apiError } from '@/lib/api-response';

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

    const members = await prisma.projectMember.findMany({
      where: {
        projectId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    const items = members.map((m) => ({
      memberId: m.id,
      userId: m.userId,
      role: m.role,
      user: m.user,
      canApproveMaterialProposalTechnical: m.canApproveMaterialProposalTechnical,
      joinedAt: m.joinedAt,
    }));

    return apiList(items);
  } catch (error: any) {
    console.error('[API V1 List Project Members Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải danh sách thành viên dự án.', 500);
  }
}
