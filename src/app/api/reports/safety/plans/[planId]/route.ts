import { NextResponse } from 'next/server';
import { SafetyPlanService } from '@/lib/safety-reporting/plan-service';
import {
  getSafetyAuth,
  verifySafetyProjectAccess,
  errorResponse,
} from '@/lib/safety-reporting/safety-auth-guard';

export async function GET(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const auth = await getSafetyAuth();
    if (auth instanceof NextResponse) return auth;

    const { planId } = await params;
    const plan = await SafetyPlanService.getPlanById(planId);
    if (!plan) {
      return errorResponse('NOT_FOUND', 'Không tìm thấy kế hoạch kiểm tra an toàn.', 404);
    }

    const projectIds = (plan.entries || []).map((e: any) => e.projectId).filter(Boolean);
    const scopeErr = await verifySafetyProjectAccess(auth.session, projectIds);
    if (scopeErr) return scopeErr;

    return NextResponse.json(plan);
  } catch (error: any) {
    return errorResponse('SERVER_ERROR', error.message || 'Lỗi hệ thống khi đọc thông tin kế hoạch.', 500);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  try {
    const auth = await getSafetyAuth();
    if (auth instanceof NextResponse) return auth;

    const { planId } = await params;
    const { searchParams } = new URL(request.url);
    const reason = searchParams.get('reason') || undefined;

    const plan = await SafetyPlanService.getPlanById(planId);
    if (!plan) {
      return errorResponse('NOT_FOUND', 'Không tìm thấy kế hoạch kiểm tra để xóa.', 404);
    }

    const projectIds = (plan.entries || []).map((e: any) => e.projectId).filter(Boolean);
    const scopeErr = await verifySafetyProjectAccess(auth.session, projectIds);
    if (scopeErr) return scopeErr;

    const result = await SafetyPlanService.deleteOrCancelPlan(auth.user.id, planId, reason);
    return NextResponse.json(result);
  } catch (error: any) {
    return errorResponse('BAD_REQUEST', error.message || 'Lỗi khi xóa hoặc hủy kế hoạch.', 400);
  }
}
