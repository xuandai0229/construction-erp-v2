import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiList, apiError, parsePaginationParams } from '@/lib/api-response';
import { getProjectAccessScope, projectScopeWhere } from '@/lib/rbac';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { page, pageSize, skip, limit } = parsePaginationParams(request.url);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;
    const status = searchParams.get('status') || undefined;

    const scope = await getProjectAccessScope(auth.user);
    const scopeClause = projectScopeWhere(scope);

    const where: any = {
      ...scopeClause,
      deletedAt: null,
    };
    if (projectId) {
      const scopeErr = await verifyProjectScope(auth.session, projectId);
      if (scopeErr) return scopeErr;
      where.projectId = projectId;
    }
    if (status) {
      where.status = status;
    }

    const [total, approvals] = await Promise.all([
      prisma.approvalRequest.count({ where }),
      prisma.approvalRequest.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, code: true } },
          requester: { select: { id: true, name: true, role: true } },
          decidedBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const items = approvals.map((a) => ({
      id: a.id,
      code: a.code,
      title: a.title,
      description: a.description,
      type: a.type,
      status: a.status,
      priority: a.priority,
      dueDate: a.dueDate,
      entityType: a.entityType,
      entityId: a.entityId,
      project: a.project,
      requester: a.requester,
      decidedBy: a.decidedBy,
      decidedAt: a.decidedAt,
      decisionNote: a.decisionNote,
      createdAt: a.createdAt,
    }));

    return apiList(items, page, pageSize, total);
  } catch (error: any) {
    console.error('[API V1 List Approvals Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải danh sách trình duyệt.', 500);
  }
}
