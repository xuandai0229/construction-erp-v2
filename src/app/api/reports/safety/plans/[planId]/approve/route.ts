import { NextResponse } from 'next/server';
import { SafetyPlanService } from '@/lib/safety-reporting/plan-service';
import {
  getSafetyAuth,
  verifySafetyProjectAccess,
  verifySafetyApproverRole,
  SafetyApproveSchema,
  errorResponse,
} from '@/lib/safety-reporting/safety-auth-guard';

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const auth = await getSafetyAuth();
    if (auth instanceof NextResponse) return auth;

    const approverErr = verifySafetyApproverRole(auth.session);
    if (approverErr) return approverErr;

    const { planId } = await params;
    const body = await request.json();
    const parseResult = SafetyApproveSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse('BAD_REQUEST', 'Dữ liệu duyệt không hợp lệ.', 400);
    }

    const { approve, reason } = parseResult.data;

    const plan = await SafetyPlanService.getPlanById(planId);
    if (!plan) {
      return errorResponse('NOT_FOUND', 'Không tìm thấy kế hoạch để duyệt.', 404);
    }

    const projectIds = (plan.entries || []).map((e: any) => e.projectId).filter(Boolean);
    const scopeErr = await verifySafetyProjectAccess(auth.session, projectIds);
    if (scopeErr) return scopeErr;

    const updated = await SafetyPlanService.decidePlan(auth.user.id, planId, approve, reason);
    return NextResponse.json(updated);
  } catch (error: any) {
    return errorResponse('BAD_REQUEST', error.message || 'Lỗi khi xử lý phê duyệt kế hoạch.', 400);
  }
}
