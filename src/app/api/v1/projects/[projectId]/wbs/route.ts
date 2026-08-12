import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiList, apiError } from '@/lib/api-response';

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

    const wbsItems = await prisma.wBSItem.findMany({
      where: {
        projectId,
        deletedAt: null,
      },
      orderBy: [
        { parentId: 'asc' },
        { code: 'asc' },
      ],
      select: {
        id: true,
        code: true,
        name: true,
        unit: true,
        designQuantity: true,
        progress: true,
        status: true,
        description: true,
        plannedStartDate: true,
        plannedEndDate: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const items = wbsItems.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      unit: item.unit,
      designQuantity: item.designQuantity ? Number(item.designQuantity) : null,
      progressPercent: item.progress ? Number(item.progress) : 0,
      status: item.status,
      description: item.description,
      plannedStartDate: item.plannedStartDate,
      plannedEndDate: item.plannedEndDate,
      parentId: item.parentId,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return apiList(items);
  } catch (error: any) {
    console.error('[API V1 WBS List Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải hạng mục công việc (WBS).', 500);
  }
}
