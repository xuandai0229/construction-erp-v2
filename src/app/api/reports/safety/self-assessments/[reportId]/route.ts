import { NextResponse } from 'next/server';
import { SafetyAssessmentService } from '@/lib/safety-reporting/assessment-service';
import {
  getSafetyAuth,
  verifySafetyProjectAccess,
  errorResponse,
} from '@/lib/safety-reporting/safety-auth-guard';

export async function GET(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const auth = await getSafetyAuth();
    if (auth instanceof NextResponse) return auth;

    const { reportId } = await params;
    const report = await SafetyAssessmentService.getReportById(reportId);
    if (!report) {
      return errorResponse('NOT_FOUND', 'Không tìm thấy báo cáo tự đánh giá.', 404);
    }

    const projectIds = (report.entries || []).map((e: any) => e.projectId).filter(Boolean);
    const scopeErr = await verifySafetyProjectAccess(auth.session, projectIds);
    if (scopeErr) return scopeErr;

    return NextResponse.json(report);
  } catch (error: any) {
    return errorResponse('SERVER_ERROR', error.message || 'Lỗi hệ thống khi đọc báo cáo.', 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const auth = await getSafetyAuth();
    if (auth instanceof NextResponse) return auth;

    const { reportId } = await params;
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || undefined;

    const report = await SafetyAssessmentService.getReportById(reportId);
    if (!report) {
      return errorResponse('NOT_FOUND', 'Không tìm thấy báo cáo tự đánh giá để xóa.', 404);
    }

    const projectIds = (report.entries || []).map((e: any) => e.projectId).filter(Boolean);
    const scopeErr = await verifySafetyProjectAccess(auth.session, projectIds);
    if (scopeErr) return scopeErr;

    const result = await SafetyAssessmentService.deleteOrCancelReport(auth.user.id, reportId, reason);
    return NextResponse.json(result);
  } catch (error: any) {
    return errorResponse('BAD_REQUEST', error.message || 'Lỗi khi xóa báo cáo tự đánh giá.', 400);
  }
}
