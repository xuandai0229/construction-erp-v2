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

    const [
      project,
      totalWbsItems,
      totalDailyLogs,
      pendingProposals,
      pendingApprovals,
      activePersonnel,
    ] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true, code: true, status: true, startDate: true, endDate: true },
      }),
      prisma.wBSItem.count({ where: { projectId, deletedAt: null } }),
      prisma.fieldProgressEntry.count({ where: { projectId, deletedAt: null } }),
      prisma.materialProposal.count({ where: { projectId, status: 'SUBMITTED' } }),
      prisma.approvalRequest.count({ where: { projectId, status: 'PENDING', deletedAt: null } }),
      prisma.employeeProjectAssignment.count({ where: { projectId, status: 'ACTIVE' } }),
    ]);

    if (!project) return apiError('NOT_FOUND', 'Không tìm thấy dự án.', 404);

    return apiSuccess({
      project,
      metrics: {
        totalWbsItems,
        totalDailyLogs,
        pendingProposals,
        pendingApprovals,
        activePersonnel,
      },
    });
  } catch (error: any) {
    console.error('[API V1 Project Dashboard Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải bảng điều khiển dự án.', 500);
  }
}
