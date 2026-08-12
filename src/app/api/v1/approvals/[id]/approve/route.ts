import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const approval = await prisma.approvalRequest.findFirst({
      where: { id, deletedAt: null },
    });

    if (!approval) {
      return apiError('NOT_FOUND', 'Không tìm thấy yêu cầu trình duyệt.', 404);
    }

    const scopeErr = await verifyProjectScope(auth.session, approval.projectId);
    if (scopeErr) return scopeErr;

    if (approval.status !== 'PENDING') {
      return apiError('BAD_REQUEST', 'Yêu cầu không ở trạng thái chờ duyệt.', 400);
    }

    const body = await request.json().catch(() => ({}));
    const decisionNote = typeof body.note === 'string' ? body.note : undefined;

    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        decidedById: auth.user.id,
        decidedAt: new Date(),
        decisionNote: decisionNote || null,
      },
    });

    return apiSuccess({
      id: updated.id,
      status: updated.status,
      decidedAt: updated.decidedAt,
    });
  } catch (error: any) {
    console.error('[API V1 Approve Request Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi phê duyệt yêu cầu.', 500);
  }
}
