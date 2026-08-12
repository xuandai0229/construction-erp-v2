import { NextResponse } from 'next/server';
import { SafetyPlanService } from '@/lib/safety-reporting/plan-service';
import {
  getSafetyAuth,
  verifySafetyProjectAccess,
  errorResponse,
} from '@/lib/safety-reporting/safety-auth-guard';

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const auth = await getSafetyAuth();
    if (auth instanceof NextResponse) return auth;

    const { planId } = await params;

    const plan = await SafetyPlanService.getPlanById(planId);
    if (!plan) {
      return errorResponse('NOT_FOUND', 'Không tìm thấy kế hoạch để trình duyệt.', 404);
    }

    const projectIds = (plan.entries || []).map((e: any) => e.projectId).filter(Boolean);
    const scopeErr = await verifySafetyProjectAccess(auth.session, projectIds);
    if (scopeErr) return scopeErr;

    const updated = await SafetyPlanService.submitPlan(auth.user.id, planId);
    return NextResponse.json(updated);
  } catch (error: any) {
    return errorResponse('BAD_REQUEST', error.message || 'Lỗi khi trình duyệt kế hoạch.', 400);
  }
}
