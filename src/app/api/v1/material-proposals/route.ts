import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiList, apiSuccess, apiError, parsePaginationParams } from '@/lib/api-response';
import { getProjectAccessScope, projectScopeWhere } from '@/lib/rbac';
import { z } from 'zod';

const CreateProposalItemSchema = z.object({
  materialItemId: z.string().optional(),
  materialName: z.string().min(1, 'Tên vật tư không được để trống.'),
  unit: z.string().min(1, 'Đơn vị tính không được để trống.'),
  actualQuantity: z.number().positive('Số lượng phải lớn hơn 0.'),
  specification: z.string().optional(),
  manufacturerOrigin: z.string().optional(),
  note: z.string().optional(),
});

const CreateProposalSchema = z.object({
  projectId: z.string().min(1, 'Mã dự án không được để trống.'),
  purchaseReason: z.string().optional(),
  requiredDeliveryDate: z.string().optional(),
  items: z.array(CreateProposalItemSchema).min(1, 'Đề xuất phải có ít nhất 1 vật tư.'),
});

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { page, pageSize, skip, limit } = parsePaginationParams(request.url);
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || undefined;

    const scope = await getProjectAccessScope(auth.user);
    const scopeClause = projectScopeWhere(scope);

    const where: any = {
      ...scopeClause,
    };
    if (projectId) {
      const scopeErr = await verifyProjectScope(auth.session, projectId);
      if (scopeErr) return scopeErr;
      where.projectId = projectId;
    }

    const [total, proposals] = await Promise.all([
      prisma.materialProposal.count({ where }),
      prisma.materialProposal.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, code: true } },
          requestedBy: { select: { id: true, name: true, role: true } },
          items: true,
          approvals: { select: { stage: true, status: true, decidedAt: true, decisionNote: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const resultItems = proposals.map((p) => ({
      id: p.id,
      proposalNo: p.proposalNo,
      projectId: p.projectId,
      projectName: p.projectNameSnapshot,
      requesterName: p.requesterNameSnapshot,
      proposalDate: p.proposalDate,
      requiredDeliveryDate: p.requiredDeliveryDate,
      purchaseReason: p.purchaseReason,
      status: p.status,
      itemCount: p.items.length,
      approvals: p.approvals,
      createdAt: p.createdAt,
    }));

    return apiList(resultItems, page, pageSize, total);
  } catch (error: any) {
    console.error('[API V1 Material Proposals GET Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải danh sách đề xuất vật tư.', 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => ({}));
    const parseResult = CreateProposalSchema.safeParse(body);
    if (!parseResult.success) {
      return apiError('BAD_REQUEST', parseResult.error.issues[0]?.message || 'Dữ liệu không hợp lệ.', 400);
    }

    const { projectId, purchaseReason, requiredDeliveryDate, items } = parseResult.data;

    const scopeErr = await verifyProjectScope(auth.session, projectId);
    if (scopeErr) return scopeErr;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true, location: true },
    });
    if (!project) return apiError('NOT_FOUND', 'Không tìm thấy dự án.', 404);

    const proposalNo = `DXVT-${Date.now().toString().slice(-6)}`;

    const proposal = await prisma.materialProposal.create({
      data: {
        proposalNo,
        projectId,
        projectNameSnapshot: project.name,
        projectLocationSnapshot: project.location,
        requestedById: auth.user.id,
        requesterNameSnapshot: auth.user.name,
        requesterRoleSnapshot: auth.user.role,
        proposalDate: new Date(),
        purchaseReason: purchaseReason || null,
        requiredDeliveryDate: requiredDeliveryDate ? new Date(requiredDeliveryDate) : null,
        status: 'DRAFT',
        items: {
          create: items.map((item, idx) => ({
            sequence: idx + 1,
            materialItemId: item.materialItemId || null,
            materialName: item.materialName,
            unit: item.unit,
            actualQuantity: item.actualQuantity,
            specification: item.specification || null,
            manufacturerOrigin: item.manufacturerOrigin || null,
            note: item.note || null,
          })),
        },
      },
      include: { items: true },
    });

    return apiSuccess(
      {
        id: proposal.id,
        proposalNo: proposal.proposalNo,
        status: proposal.status,
        createdAt: proposal.createdAt,
      },
      201
    );
  } catch (error: any) {
    console.error('[API V1 Create Material Proposal Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tạo đề xuất vật tư.', 500);
  }
}
