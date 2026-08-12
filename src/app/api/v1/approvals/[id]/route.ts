import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const approval = await prisma.approvalRequest.findFirst({
      where: { id, deletedAt: null },
      include: {
        project: { select: { id: true, name: true, code: true } },
        requester: { select: { id: true, name: true, email: true, role: true } },
        decidedBy: { select: { id: true, name: true, role: true } },
      },
    });

    if (!approval) {
      return apiError('NOT_FOUND', 'Không tìm thấy yêu cầu trình duyệt.', 404);
    }

    const scopeErr = await verifyProjectScope(auth.session, approval.projectId);
    if (scopeErr) return scopeErr;

    return apiSuccess({
      id: approval.id,
      code: approval.code,
      title: approval.title,
      description: approval.description,
      type: approval.type,
      status: approval.status,
      priority: approval.priority,
      dueDate: approval.dueDate,
      entityType: approval.entityType,
      entityId: approval.entityId,
      project: approval.project,
      requester: approval.requester,
      decidedBy: approval.decidedBy,
      decidedAt: approval.decidedAt,
      decisionNote: approval.decisionNote,
      createdAt: approval.createdAt,
    });
  } catch (error: any) {
    console.error('[API V1 Approval Detail Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải thông tin trình duyệt.', 500);
  }
}
