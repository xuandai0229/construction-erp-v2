import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;

    const proposal = await prisma.materialProposal.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, code: true } },
        requestedBy: { select: { id: true, name: true, email: true, phone: true, role: true } },
        items: { orderBy: { sequence: 'asc' } },
        approvals: {
          include: { approver: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!proposal) {
      return apiError('NOT_FOUND', 'Không tìm thấy đề xuất vật tư.', 404);
    }

    const scopeErr = await verifyProjectScope(auth.session, proposal.projectId);
    if (scopeErr) return scopeErr;

    return apiSuccess({
      id: proposal.id,
      proposalNo: proposal.proposalNo,
      projectId: proposal.projectId,
      projectName: proposal.projectNameSnapshot,
      projectLocation: proposal.projectLocationSnapshot,
      proposalDate: proposal.proposalDate,
      purchaseReason: proposal.purchaseReason,
      requiredDeliveryDate: proposal.requiredDeliveryDate,
      status: proposal.status,
      requestedBy: proposal.requestedBy,
      items: proposal.items.map((i) => ({
        id: i.id,
        sequence: i.sequence,
        materialName: i.materialName,
        unit: i.unit,
        actualQuantity: Number(i.actualQuantity),
        specification: i.specification,
        manufacturerOrigin: i.manufacturerOrigin,
        note: i.note,
      })),
      approvals: proposal.approvals.map((a) => ({
        id: a.id,
        stage: a.stage,
        status: a.status,
        decidedAt: a.decidedAt,
        decisionNote: a.decisionNote,
        approver: a.approver,
      })),
      createdAt: proposal.createdAt,
      updatedAt: proposal.updatedAt,
    });
  } catch (error: any) {
    console.error('[API V1 Material Proposal Detail Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải chi tiết đề xuất vật tư.', 500);
  }
}
