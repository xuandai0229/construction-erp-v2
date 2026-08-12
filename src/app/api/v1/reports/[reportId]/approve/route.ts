import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';
import { approveSiteReportTransition } from '@/lib/reports/report-transition-service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { reportId } = await params;
    const report = await prisma.siteReport.findFirst({
      where: { id: reportId, deletedAt: null },
    });
    if (!report) {
      return apiError('NOT_FOUND', 'Không tìm thấy báo cáo.', 404);
    }

    const scopeErr = await verifyProjectScope(auth.session, report.projectId);
    if (scopeErr) return scopeErr;

    const body = await request.json().catch(() => ({}));
    const note = typeof body.note === 'string' ? body.note : undefined;

    const result = await approveSiteReportTransition(prisma, reportId, auth.user, note);

    return apiSuccess({
      id: result.id,
      status: result.status,
      approvedAt: result.approvedAt,
    });
  } catch (error: any) {
    console.error('[API V1 Approve Report Error]', error);
    return apiError('BAD_REQUEST', error.message || 'Lỗi khi phê duyệt báo cáo.', 400);
  }
}
