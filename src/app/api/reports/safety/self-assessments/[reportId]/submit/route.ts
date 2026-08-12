import { NextResponse } from 'next/server';
import { SafetyAssessmentService } from '@/lib/safety-reporting/assessment-service';
import {
  getSafetyAuth,
  verifySafetyProjectAccess,
  errorResponse,
} from '@/lib/safety-reporting/safety-auth-guard';

export async function POST(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const auth = await getSafetyAuth();
    if (auth instanceof NextResponse) return auth;

    const { reportId } = await params;

    const report = await SafetyAssessmentService.getReportById(reportId);
    if (!report) {
      return errorResponse('NOT_FOUND', 'Không tìm thấy báo cáo để trình duyệt.', 404);
    }

    const projectIds = (report.entries || []).map((e: any) => e.projectId).filter(Boolean);
    const scopeErr = await verifySafetyProjectAccess(auth.session, projectIds);
    if (scopeErr) return scopeErr;

    const updated = await SafetyAssessmentService.submitReport(auth.user.id, reportId);
    return NextResponse.json(updated);
  } catch (error: any) {
    return errorResponse('BAD_REQUEST', error.message || 'Lỗi khi trình duyệt báo cáo.', 400);
  }
}
