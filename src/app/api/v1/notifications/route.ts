import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/v1-auth-guard';
import { apiList, apiError, parsePaginationParams } from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { page, pageSize, skip, limit } = parsePaginationParams(request.url);
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const where: any = {
      userId: auth.user.id,
    };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [total, unreadCount, notifications] = await Promise.all([
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId: auth.user.id, isRead: false } }),
      prisma.notification.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const items = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      severity: n.severity,
      title: n.title,
      message: n.message,
      href: n.href,
      isRead: n.isRead,
      createdAt: n.createdAt,
      readAt: n.readAt,
      project: n.project ? { id: n.project.id, name: n.project.name, code: n.project.code } : null,
    }));

    return apiList(items, page, pageSize, total, { unreadCount });
  } catch (error: any) {
    console.error('[API V1 List Notifications Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải danh sách thông báo.', 500);
  }
}
