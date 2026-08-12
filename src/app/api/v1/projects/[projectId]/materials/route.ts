import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiList, apiError, parsePaginationParams } from '@/lib/api-response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { projectId } = await params;
    const scopeErr = await verifyProjectScope(auth.session, projectId);
    if (scopeErr) return scopeErr;

    const { page, pageSize, skip, limit, search } = parsePaginationParams(request.url);

    const where: any = {
      projectId,
      isActive: true,
    };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, materials] = await Promise.all([
      prisma.materialItem.count({ where }),
      prisma.materialItem.findMany({
        where,
        include: {
          projectStocks: {
            where: { projectId },
            select: { stock: true, minStockLevel: true },
          },
        },
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
    ]);

    const items = materials.map((m) => {
      const stockRec = m.projectStocks[0];
      return {
        id: m.id,
        code: m.code,
        name: m.name,
        unit: m.unit,
        group: m.group,
        manufacturer: m.manufacturer,
        origin: m.origin,
        stock: stockRec ? Number(stockRec.stock) : 0,
        minStockLevel: stockRec ? Number(stockRec.minStockLevel) : 0,
      };
    });

    return apiList(items, page, pageSize, total);
  } catch (error: any) {
    console.error('[API V1 Materials Stock GET Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải danh mục vật tư.', 500);
  }
}
