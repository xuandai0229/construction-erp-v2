import { NextResponse } from 'next/server';
import { SafetyPlanService } from '@/lib/safety-reporting/plan-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    const search = searchParams.get('search') || undefined;

    const result = await SafetyPlanService.listPlans({ status, search });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const actorId = body.actorId || 'system-user'; // Replace with session user ID

    const plan = await SafetyPlanService.createPlan(actorId, {
      title: body.title || 'KẾ HOẠCH KIỂM TRA ATLĐ, PCCC, VSMT CÔNG TRÌNH HÀNG TUẦN',
      createdDate: new Date(body.createdDate || Date.now()),
      periodStart: new Date(body.periodStart || Date.now()),
      periodEnd: new Date(body.periodEnd || Date.now() + 6 * 86400000),
      legalBases: body.legalBases,
      recipients: body.recipients,
      purpose: body.purpose,
      note: body.note,
      entries: (body.entries || []).map((e: any) => ({
        inspectionDate: new Date(e.inspectionDate),
        shift: e.shift || 'MORNING',
        projectId: e.projectId,
        constructionType: e.constructionType || 'BUILDING',
        inspectionContent: e.inspectionContent || 'Kiểm tra ATLĐ, PCCC',
        trainingContent: e.trainingContent,
        collaborators: e.collaborators,
        location: e.location,
        note: e.note,
        sortOrder: e.sortOrder,
      })),
    });

    return NextResponse.json(plan, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi tạo kế hoạch' }, { status: 400 });
  }
}
