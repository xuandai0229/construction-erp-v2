import { NextResponse } from 'next/server';
import { SafetyAssessmentService } from '@/lib/safety-reporting/assessment-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    const search = searchParams.get('search') || undefined;

    const result = await SafetyAssessmentService.listReports({ status, search });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const actorId = body.actorId || 'system-user';

    if (body.sourcePlanId && body.initFromPlan) {
      const report = await SafetyAssessmentService.createFromPlan(actorId, body.sourcePlanId);
      return NextResponse.json(report, { status: 201 });
    }

    const report = await SafetyAssessmentService.createReport(actorId, {
      sourcePlanId: body.sourcePlanId,
      title: body.title || 'BÁO CÁO TỰ ĐÁNH GIÁ KẾT QUẢ KIỂM TRA AT, VSLĐ',
      createdDate: new Date(body.createdDate || Date.now()),
      periodStart: new Date(body.periodStart || Date.now()),
      periodEnd: new Date(body.periodEnd || Date.now() + 6 * 86400000),
      legalBases: body.legalBases,
      recipients: body.recipients,
      previousWeekRemediation: body.previousWeekRemediation,
      reinspectionConfirmation: body.reinspectionConfirmation,
      managementRecommendation: body.managementRecommendation,
      otherOpinion: body.otherOpinion,
      entries: (body.entries || []).map((e: any) => ({
        inspectionDate: new Date(e.inspectionDate),
        shift: e.shift || 'MORNING',
        projectId: e.projectId,
        inspectionContent: e.inspectionContent || 'Kiểm tra ATLĐ',
        assessment: e.assessment,
        recommendation: e.recommendation,
        implementationResult: e.implementationResult,
        sortOrder: e.sortOrder,
      })),
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tạo báo cáo tự đánh giá' }, { status: 400 });
  }
}
