import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/v1-auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== auth.user.id) {
      return apiError('NOT_FOUND', 'Không tìm thấy thông báo hoặc bạn không có quyền thao tác.', 404);
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return apiSuccess({
      id: updated.id,
      isRead: updated.isRead,
      readAt: updated.readAt,
    });
  } catch (error: any) {
    console.error('[API V1 Mark Notification Read Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi cập nhật trạng thái thông báo.', 500);
  }
}
