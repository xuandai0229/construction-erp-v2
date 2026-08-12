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
    const reason = typeof body.reason === 'string' ? body.reason : undefined;

    if (!reason?.trim()) {
      return apiError('BAD_REQUEST', 'Vui lòng nhập lý do từ chối.', 400);
    }

    const updated = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        decidedById: auth.user.id,
        decidedAt: new Date(),
        decisionNote: reason.trim(),
      },
    });

    return apiSuccess({
      id: updated.id,
      status: updated.status,
      decidedAt: updated.decidedAt,
      decisionNote: updated.decisionNote,
    });
  } catch (error: any) {
    console.error('[API V1 Reject Request Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi từ chối yêu cầu.', 500);
  }
}
