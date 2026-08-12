import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';
import { rejectSiteReportTransition } from '@/lib/reports/report-transition-service';

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
    const reason = typeof body.reason === 'string' ? body.reason : '';

    if (!reason.trim()) {
      return apiError('BAD_REQUEST', 'Vui lòng cung cấp lý do từ chối.', 400);
    }

    const result = await rejectSiteReportTransition(prisma, reportId, auth.user, reason);

    return apiSuccess({
      id: result.id,
      status: result.status,
      rejectedReason: result.rejectedReason,
    });
  } catch (error: any) {
    console.error('[API V1 Reject Report Error]', error);
    return apiError('BAD_REQUEST', error.message || 'Lỗi khi từ chối báo cáo.', 400);
  }
}
