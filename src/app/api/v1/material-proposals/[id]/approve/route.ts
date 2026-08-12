import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';
import { decideMaterialProposal } from '@/lib/material-proposals/actions';
import { MaterialProposalApprovalStage } from '@prisma/client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { id } = await params;
    const proposal = await prisma.materialProposal.findUnique({
      where: { id },
      include: { approvals: true },
    });

    if (!proposal) {
      return apiError('NOT_FOUND', 'Không tìm thấy đề xuất vật tư.', 404);
    }

    const scopeErr = await verifyProjectScope(auth.session, proposal.projectId);
    if (scopeErr) return scopeErr;

    const body = await request.json().catch(() => ({}));
    const note = typeof body.note === 'string' ? body.note : undefined;
    const idempotencyKey = typeof body.idempotencyKey === 'string' ? body.idempotencyKey : `appr_${Date.now()}`;

    // Determine current pending stage
    const pendingApproval = proposal.approvals.find((a) => a.status === 'PENDING');
    const stage = pendingApproval ? pendingApproval.stage : MaterialProposalApprovalStage.TECHNICAL;

    const result = await decideMaterialProposal({
      proposalId: id,
      stage,
      decision: 'APPROVED',
      note,
      idempotencyKey,
    });

    return apiSuccess({
      id: proposal.id,
      stage,
      approved: result.ok,
    });
  } catch (error: any) {
    console.error('[API V1 Approve Material Proposal Error]', error);
    return apiError('BAD_REQUEST', error.message || 'Lỗi khi phê duyệt đề xuất vật tư.', 400);
  }
}
