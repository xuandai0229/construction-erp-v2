import { NextResponse } from 'next/server';
import { SafetyPlanService } from '@/lib/safety-reporting/plan-service';

export async function GET(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const { planId } = await params;
    const plan = await SafetyPlanService.getPlanById(planId);
    if (!plan) {
      return NextResponse.json({ error: 'Không tìm thấy kế hoạch' }, { status: 404 });
    }
    return NextResponse.json(plan);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi server' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const { planId } = await params;
    const { searchParams } = new URL(request.url);
    const actorId = searchParams.get('actorId') || 'system-user';
    const reason = searchParams.get('reason') || undefined;

    const result = await SafetyPlanService.deleteOrCancelPlan(actorId, planId, reason);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Lỗi xóa kế hoạch' }, { status: 400 });
  }
}
