import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/v1-auth-guard';
import { apiList, apiError, parsePaginationParams } from '@/lib/api-response';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { page, pageSize, skip, limit } = parsePaginationParams(request.url);

    const where: any = {
      deletedAt: null,
    };

    const [total, packages] = await Promise.all([
      prisma.supervisionWeeklyPackage.count({ where }),
      prisma.supervisionWeeklyPackage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const items = packages.map((pkg) => ({
      id: pkg.id,
      reportNumber: pkg.reportNumber,
      weekStart: pkg.weekStart,
      weekEnd: pkg.weekEnd,
      status: pkg.status,
      place: pkg.place,
      recipientName: pkg.recipientName,
      createdById: pkg.createdById,
      createdAt: pkg.createdAt,
    }));

    return apiList(items, page, pageSize, total);
  } catch (error: any) {
    console.error('[API V1 Supervision Packages GET Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải hồ sơ giám sát tuần.', 500);
  }
}
