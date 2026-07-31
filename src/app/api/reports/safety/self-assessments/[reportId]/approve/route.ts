import { NextResponse } from 'next/server';
import { SafetyAssessmentService } from '@/lib/safety-reporting/assessment-service';

export async function POST(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const { reportId } = await params;
    const body = await request.json();
    const actorId = body.actorId || 'system-user';
    const approve = body.approve === true;
    const reason = body.reason;

    const updated = await SafetyAssessmentService.decideReport(actorId, reportId, approve, reason);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi duyệt Báo cáo' }, { status: 400 });
  }
}
