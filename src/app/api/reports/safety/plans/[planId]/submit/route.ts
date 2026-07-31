import { NextResponse } from 'next/server';
import { SafetyPlanService } from '@/lib/safety-reporting/plan-service';

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const { planId } = await params;
    const body = await request.json();
    const actorId = body.actorId || 'system-user';

    const updated = await SafetyPlanService.submitPlan(actorId, planId);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi trình duyệt' }, { status: 400 });
  }
}
