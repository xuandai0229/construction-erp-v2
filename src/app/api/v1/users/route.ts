import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/v1-auth-guard';
import { apiList, apiError, parsePaginationParams } from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { page, pageSize, skip, limit, search } = parsePaginationParams(request.url);

    const where: any = {
      isActive: true,
      deletedAt: null,
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    return apiList(users, page, pageSize, total);
  } catch (error: any) {
    console.error('[API V1 Users Directory Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải danh sách người dùng.', 500);
  }
}
