import { NextResponse } from 'next/server';
import { SafetyAssessmentService } from '@/lib/safety-reporting/assessment-service';
import { SafetyPlanService } from '@/lib/safety-reporting/plan-service';
import {
  getSafetyAuth,
  verifySafetyProjectAccess,
  CreateSafetyAssessmentApiSchema,
  errorResponse,
} from '@/lib/safety-reporting/safety-auth-guard';

export async function GET(request: Request) {
  try {
    const auth = await getSafetyAuth();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as any;
    const search = searchParams.get('search') || undefined;
    const projectId = searchParams.get('projectId') || undefined;

    if (projectId) {
      const scopeErr = await verifySafetyProjectAccess(auth.session, [projectId]);
      if (scopeErr) return scopeErr;
    }

    const result = await SafetyAssessmentService.listReports({ status, search, projectId });
    return NextResponse.json(result);
  } catch (error: any) {
    return errorResponse('SERVER_ERROR', error.message || 'Lỗi hệ thống khi tải danh sách báo cáo.', 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getSafetyAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const parseResult = CreateSafetyAssessmentApiSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse('BAD_REQUEST', parseResult.error.issues[0]?.message || 'Dữ liệu báo cáo không hợp lệ.', 400);
    }

    const validData = parseResult.data;

    if (validData.sourcePlanId && validData.initFromPlan) {
      const plan = await SafetyPlanService.getPlanById(validData.sourcePlanId);
      if (!plan) {
        return errorResponse('NOT_FOUND', 'Không tìm thấy Kế hoạch kiểm tra nguồn.', 404);
      }

      const planProjectIds = (plan.entries || []).map((e: any) => e.projectId).filter(Boolean);
      const scopeErr = await verifySafetyProjectAccess(auth.session, planProjectIds);
      if (scopeErr) return scopeErr;

      const report = await SafetyAssessmentService.createFromPlan(auth.user.id, validData.sourcePlanId);
      return NextResponse.json(report, { status: 201 });
    }

    const projectIds = (validData.entries || []).map((e) => e.projectId).filter(Boolean);
    const scopeErr = await verifySafetyProjectAccess(auth.session, projectIds);
    if (scopeErr) return scopeErr;

    const report = await SafetyAssessmentService.createReport(auth.user.id, {
      sourcePlanId: validData.sourcePlanId,
      title: validData.title || 'BÁO CÁO TỰ ĐÁNH GIÁ KẾT QUẢ KIỂM TRA ATLĐ, PCCC, VSMT',
      createdDate: new Date(validData.createdDate || Date.now()),
      periodStart: new Date(validData.periodStart || Date.now()),
      periodEnd: new Date(validData.periodEnd || Date.now() + 6 * 86400000),
      entries: (validData.entries || []).map((e: any) => ({
        inspectionDate: new Date(e.inspectionDate),
        shift: e.shift || 'MORNING',
        projectId: e.projectId,
        customProjectName: e.customProjectName,
        inspectionContent: e.inspectionContent || 'Kiểm tra ATLĐ',
        assessment: e.assessment,
        recommendation: e.recommendation,
        implementationResult: e.implementationResult,
        sortOrder: e.sortOrder,
      })),
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error: any) {
    return errorResponse('BAD_REQUEST', error.message || 'Lỗi khi tạo báo cáo tự đánh giá.', 400);
  }
}
