import { NextResponse } from 'next/server';
import { SafetyAssessmentService } from '@/lib/safety-reporting/assessment-service';

export async function GET(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const { reportId } = await params;
    const report = await SafetyAssessmentService.getReportById(reportId);
    if (!report) {
      return NextResponse.json({ error: 'Không tìm thấy Báo cáo' }, { status: 404 });
    }
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const { reportId } = await params;
    const { searchParams } = new URL(request.url);
    const actorId = searchParams.get('actorId') || 'system-user';
    const reason = searchParams.get('reason') || undefined;

    const result = await SafetyAssessmentService.deleteOrCancelReport(actorId, reportId, reason);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xóa Báo cáo' }, { status: 400 });
  }
}
