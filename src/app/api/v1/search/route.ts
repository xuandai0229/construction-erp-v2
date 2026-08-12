import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/v1-auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';
import { getProjectAccessScope, projectScopeWhere } from '@/lib/rbac';

export async function GET(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || searchParams.get('query') || '').trim();

    if (!query || query.length < 2) {
      return apiError('BAD_REQUEST', 'Từ khóa tìm kiếm phải có ít nhất 2 ký tự.', 400);
    }
    if (query.length > 100) {
      return apiError('BAD_REQUEST', 'Từ khóa tìm kiếm vượt quá độ dài tối đa (100 ký tự).', 400);
    }

    const scope = await getProjectAccessScope(auth.user);
    const scopeClause = projectScopeWhere(scope);

    const [projects, reports, proposals] = await Promise.all([
      prisma.project.findMany({
        where: {
          ...scopeClause,
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { code: { contains: query, mode: 'insensitive' } },
            { investor: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: { id: true, name: true, code: true, status: true },
        take: 5,
      }),
      prisma.siteReport.findMany({
        where: {
          ...scopeClause,
          deletedAt: null,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { reportNo: { contains: query, mode: 'insensitive' } },
            { summary: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: { id: true, reportNo: true, title: true, status: true, projectId: true },
        take: 5,
      }),
      prisma.materialProposal.findMany({
        where: {
          ...scopeClause,
          OR: [
            { proposalNo: { contains: query, mode: 'insensitive' } },
            { purchaseReason: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: { id: true, proposalNo: true, purchaseReason: true, status: true, projectId: true },
        take: 5,
      }),
    ]);

    return apiSuccess({
      query,
      results: {
        projects: projects.map((p) => ({ type: 'PROJECT', id: p.id, title: `${p.code} - ${p.name}`, status: p.status, href: `/projects/${p.id}` })),
        reports: reports.map((r) => ({ type: 'REPORT', id: r.id, title: r.title || r.reportNo, status: r.status, href: `/reports/field/${r.id}` })),
        proposals: proposals.map((m) => ({ type: 'MATERIAL_PROPOSAL', id: m.id, title: m.proposalNo, status: m.status, href: `/materials/proposals/${m.id}` })),
      },
    });
  } catch (error: any) {
    console.error('[API V1 Global Search Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tìm kiếm.', 500);
  }
}
