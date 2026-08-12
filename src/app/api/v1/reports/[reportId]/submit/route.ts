import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';
import { submitSiteReportTransition } from '@/lib/reports/report-transition-service';

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

    const result = await submitSiteReportTransition(prisma, reportId, auth.user);

    return apiSuccess({
      id: result.id,
      status: result.status,
      submittedAt: result.submittedAt,
    });
  } catch (error: any) {
    console.error('[API V1 Submit Report Error]', error);
    return apiError('BAD_REQUEST', error.message || 'Lỗi khi gửi báo cáo.', 400);
  }
}
