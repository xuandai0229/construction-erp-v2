import { NextResponse } from 'next/server';
import { SafetyPlanService } from '@/lib/safety-reporting/plan-service';
import {
  getSafetyAuth,
  verifySafetyProjectAccess,
  CreateSafetyPlanApiSchema,
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

    const result = await SafetyPlanService.listPlans({ status, search });
    return NextResponse.json(result);
  } catch (error: any) {
    return errorResponse('SERVER_ERROR', error.message || 'Lỗi hệ thống khi tải danh sách kế hoạch.', 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await getSafetyAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const parseResult = CreateSafetyPlanApiSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse('BAD_REQUEST', parseResult.error.issues[0]?.message || 'Dữ liệu không hợp lệ.', 400);
    }

    const validData = parseResult.data;
    const projectIds = (validData.entries || []).map((e) => e.projectId).filter(Boolean);

    const scopeErr = await verifySafetyProjectAccess(auth.session, projectIds);
    if (scopeErr) return scopeErr;

    const plan = await SafetyPlanService.createPlan(auth.user.id, {
      title: validData.title || 'KẾ HOẠCH KIỂM TRA ATLĐ, PCCC, VSMT CÔNG TRÌNH HÀNG TUẦN',
      createdDate: new Date(validData.createdDate || Date.now()),
      periodStart: new Date(validData.periodStart || Date.now()),
      periodEnd: new Date(validData.periodEnd || Date.now() + 6 * 86400000),
      legalBases: validData.legalBases,
      recipients: validData.recipients,
      purpose: validData.purpose,
      note: validData.note,
      entries: (validData.entries || []).map((e: any) => ({
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
    return errorResponse('BAD_REQUEST', error.message || 'Lỗi khi tạo kế hoạch kiểm tra.', 400);
  }
}
