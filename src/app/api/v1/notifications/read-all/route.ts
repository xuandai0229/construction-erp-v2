import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/v1-auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function POST() {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const result = await prisma.notification.updateMany({
      where: {
        userId: auth.user.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return apiSuccess({
      message: 'Đã đánh dấu đọc tất cả thông báo thành công.',
      updatedCount: result.count,
    });
  } catch (error: any) {
    console.error('[API V1 Read All Notifications Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi cập nhật thông báo.', 500);
  }
}
