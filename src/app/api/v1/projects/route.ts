import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/v1-auth-guard';
import { apiList, apiError, parsePaginationParams } from '@/lib/api-response';
import { getProjectAccessScope, projectScopeWhere } from '@/lib/rbac';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { page, pageSize, skip, limit, search } = parsePaginationParams(request.url);

    const scope = await getProjectAccessScope(auth.user);
    const scopeClause = projectScopeWhere(scope);

    const where: any = {
      ...scopeClause,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { investor: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, projects] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        include: {
          _count: {
            select: {
              members: true,
              wbsItems: true,
              siteReports: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const items = projects.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      displayName: p.displayName,
      investor: p.investor,
      location: p.location,
      status: p.status,
      startDate: p.startDate,
      endDate: p.endDate,
      budget: p.budget ? Number(p.budget) : null,
      stats: {
        memberCount: p._count.members,
        wbsItemCount: p._count.wbsItems,
        reportCount: p._count.siteReports,
      },
      createdAt: p.createdAt,
    }));

    return apiList(items, page, pageSize, total);
  } catch (error: any) {
    console.error('[API V1 List Projects Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải danh sách dự án.', 500);
  }
}
