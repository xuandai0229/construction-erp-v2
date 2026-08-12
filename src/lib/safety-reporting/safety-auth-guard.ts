import { NextResponse } from 'next/server';
import { getSession, SessionUser } from '@/lib/auth';
import { canAccessProject } from '@/lib/rbac';
import { z } from 'zod';

export interface SafetyAuthContext {
  session: SessionUser;
  user: {
    id: string;
    role: SessionUser['role'];
    name: string;
  };
}

export function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
      },
    },
    { status }
  );
}

export function successResponse(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * 1. Require Authenticated Session (401 Unauthorized)
 */
export async function getSafetyAuth(): Promise<SafetyAuthContext | NextResponse> {
  const session = await getSession();
  if (!session || !session.id) {
    return errorResponse('UNAUTHENTICATED', 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.', 401);
  }
  return {
    session,
    user: {
      id: session.id,
      role: session.role,
      name: session.name,
    },
  };
}

/**
 * 2. Verify Project Scope Access (403 Forbidden)
 */
export async function verifySafetyProjectAccess(
  session: SessionUser,
  projectIds: (string | null | undefined)[]
): Promise<NextResponse | null> {
  const cleanProjectIds = Array.from(new Set(projectIds.filter((id): id is string => Boolean(id && typeof id === 'string' && id.trim()))));

  for (const projectId of cleanProjectIds) {
    const hasAccess = await canAccessProject({ id: session.id, role: session.role }, projectId);
    if (!hasAccess) {
      return errorResponse('FORBIDDEN', `Bạn không có quyền truy cập dữ liệu an toàn lao động của công trình (ID: ${projectId}).`, 403);
    }
  }

  return null;
}

/**
 * 3. Verify Approver Permission / Role (403 Forbidden)
 */
export function verifySafetyApproverRole(session: SessionUser): NextResponse | null {
  const approverRoles = ['ADMIN', 'EXECUTIVE', 'DIRECTOR', 'DEPUTY_DIRECTOR', 'PROJECT_MANAGER', 'SUPERVISION_HEAD', 'TECHNICAL_HEAD'];
  if (!approverRoles.includes(session.role)) {
    return errorResponse('FORBIDDEN', 'Bạn không có quyền phê duyệt hoặc yêu cầu chỉnh sửa hồ sơ an toàn lao động.', 403);
  }
  return null;
}

/**
 * Zod Validation Schemas
 */
export const SafetyApproveSchema = z.object({
  approve: z.boolean(),
  reason: z.string().optional(),
});

export const CreateSafetyPlanApiSchema = z.object({
  title: z.string().optional(),
  createdDate: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  legalBases: z.array(z.string()).optional(),
  recipients: z.array(z.string()).optional(),
  purpose: z.string().optional(),
  note: z.string().optional(),
  entries: z
    .array(
      z.object({
        inspectionDate: z.string(),
        shift: z.enum(['MORNING', 'AFTERNOON', 'EVENING']).optional(),
        projectId: z.string(),
        constructionType: z.enum(['BUILDING', 'INFRASTRUCTURE', 'INTERIOR', 'OTHER']).optional(),
        inspectionContent: z.string().optional(),
        trainingContent: z.string().optional(),
        collaborators: z.string().optional(),
        location: z.string().optional(),
        note: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .optional(),
});

export const CreateSafetyAssessmentApiSchema = z.object({
  sourcePlanId: z.string().optional(),
  initFromPlan: z.boolean().optional(),
  title: z.string().optional(),
  createdDate: z.string().optional(),
  periodStart: z.string().optional(),
  periodEnd: z.string().optional(),
  entries: z
    .array(
      z.object({
        inspectionDate: z.string(),
        shift: z.enum(['MORNING', 'AFTERNOON', 'EVENING']).optional(),
        projectId: z.string().optional().nullable(),
        customProjectName: z.string().optional().nullable(),
        inspectionContent: z.string().optional(),
        assessment: z.string().optional(),
        recommendation: z.string().optional(),
        implementationResult: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .optional(),
});
