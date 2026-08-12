import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';
import { submitMaterialProposal } from '@/lib/material-proposals/actions';

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
    });

    if (!proposal) {
      return apiError('NOT_FOUND', 'Không tìm thấy đề xuất vật tư.', 404);
    }

    const scopeErr = await verifyProjectScope(auth.session, proposal.projectId);
    if (scopeErr) return scopeErr;

    const result = await submitMaterialProposal(id);

    return apiSuccess({
      id: proposal.id,
      submitted: result.ok,
    });
  } catch (error: any) {
    console.error('[API V1 Submit Material Proposal Error]', error);
    return apiError('BAD_REQUEST', error.message || 'Lỗi khi gửi đề xuất vật tư.', 400);
  }
}
