import { NextResponse } from 'next/server';
import { SafetyPlanService } from '@/lib/safety-reporting/plan-service';

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const { planId } = await params;
    const body = await request.json();
    const actorId = body.actorId || 'system-user';
    const approve = body.approve === true;
    const reason = body.reason;

    const updated = await SafetyPlanService.decidePlan(actorId, planId, approve, reason);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi duyệt kế hoạch' }, { status: 400 });
  }
}
