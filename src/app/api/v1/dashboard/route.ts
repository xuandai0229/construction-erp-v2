import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/v1-auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getProjectAccessScope, projectScopeWhere } from '@/lib/rbac';

const ALLOWED_GLOBAL_DASHBOARD_ROLES = [
  'ADMIN',
  'DIRECTOR',
  'DEPUTY_DIRECTOR',
  'CHIEF_COMMANDER',
  'MANAGER',
  'SUPERVISION_HEAD',
];

export async function GET() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    if (!ALLOWED_GLOBAL_DASHBOARD_ROLES.includes(auth.user.role)) {
      return apiError('FORBIDDEN', 'Bạn không có quyền truy cập bảng điều khiển tổng quan toàn công ty.', 403);
    }

    const scope = await getProjectAccessScope(auth.user);
    const scopeClause = projectScopeWhere(scope);

    const [
      activeProjectsCount,
      pendingApprovalsCount,
      pendingProposalsCount,
      unreadNotificationsCount,
      recentReports,
    ] = await Promise.all([
      prisma.project.count({
        where: { ...scopeClause, deletedAt: null },
      }),
      prisma.approvalRequest.count({
        where: { ...scopeClause, status: 'PENDING', deletedAt: null },
      }),
      prisma.materialProposal.count({
        where: { ...scopeClause, status: 'SUBMITTED' },
      }),
      prisma.notification.count({
        where: { userId: auth.user.id, isRead: false },
      }),
      prisma.siteReport.findMany({
        where: { ...scopeClause, deletedAt: null },
        select: {
          id: true,
          reportNo: true,
          title: true,
          status: true,
          reportDate: true,
          project: { select: { id: true, name: true, code: true } },
        },
        orderBy: { reportDate: 'desc' },
        take: 5,
      }),
    ]);

    return apiSuccess({
      summary: {
        activeProjectsCount,
        pendingApprovalsCount,
        pendingProposalsCount,
        unreadNotificationsCount,
      },
      recentReports,
    });
  } catch (error: any) {
    console.error('[API V1 Global Dashboard Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải tổng quan bảng điều khiển.', 500);
  }
}
