import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiList, apiSuccess, apiError, parsePaginationParams } from '@/lib/api-response';
import { z } from 'zod';

const CreateDailyProgressSchema = z.object({
  templateId: z.string().min(1, 'Mã template không được để trống.'),
  itemId: z.string().min(1, 'Mã hạng mục công việc không được để trống.'),
  entryDate: z.string().min(1, 'Ngày ghi nhận nhật ký không được để trống.'),
  quantity: z.number().min(0, 'Khối lượng ghi nhận phải lớn hơn hoặc bằng 0.'),
  note: z.string().optional(),
  issueNote: z.string().optional(),
  proposalNote: z.string().optional(),
});

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

    const { page, pageSize, skip, limit } = parsePaginationParams(request.url);

    const [total, entries] = await Promise.all([
      prisma.fieldProgressEntry.count({
        where: { projectId, deletedAt: null },
      }),
      prisma.fieldProgressEntry.findMany({
        where: { projectId, deletedAt: null },
        include: {
          item: { select: { id: true, code: true, workContent: true, unit: true } },
          createdBy: { select: { id: true, name: true, role: true } },
          approvedBy: { select: { id: true, name: true, role: true } },
        },
        orderBy: { entryDate: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const items = entries.map((e) => ({
      id: e.id,
      entryDate: e.entryDate,
      quantity: Number(e.quantity),
      status: e.status,
      note: e.note,
      issueNote: e.issueNote,
      proposalNote: e.proposalNote,
      item: e.item ? { id: e.item.id, code: e.item.code, workContent: e.item.workContent, unit: e.item.unit } : null,
      createdBy: e.createdBy ? { id: e.createdBy.id, name: e.createdBy.name, role: e.createdBy.role } : null,
      approvedBy: e.approvedBy ? { id: e.approvedBy.id, name: e.approvedBy.name, role: e.approvedBy.role } : null,
      createdAt: e.createdAt,
    }));

    return apiList(items, page, pageSize, total);
  } catch (error: any) {
    console.error('[API V1 Daily Progress GET Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải nhật ký tiến độ hàng ngày.', 500);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { projectId } = await params;
    const scopeErr = await verifyProjectScope(auth.session, projectId);
    if (scopeErr) return scopeErr;

    const body = await request.json().catch(() => ({}));
    const parseResult = CreateDailyProgressSchema.safeParse(body);
    if (!parseResult.success) {
      const msg = parseResult.error.issues[0]?.message || 'Dữ liệu không hợp lệ.';
      return apiError('BAD_REQUEST', msg, 400);
    }

    const { templateId, itemId, entryDate, quantity, note, issueNote, proposalNote } = parseResult.data;

    const newEntry = await prisma.fieldProgressEntry.create({
      data: {
        projectId,
        templateId,
        itemId,
        entryDate: new Date(entryDate),
        quantity,
        note: note || null,
        issueNote: issueNote || null,
        proposalNote: proposalNote || null,
        createdById: auth.user.id,
        status: 'DRAFT',
      },
    });

    return apiSuccess(
      {
        id: newEntry.id,
        projectId: newEntry.projectId,
        entryDate: newEntry.entryDate,
        quantity: Number(newEntry.quantity),
        status: newEntry.status,
        createdAt: newEntry.createdAt,
      },
      201
    );
  } catch (error: any) {
    console.error('[API V1 Daily Progress POST Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tạo nhật ký tiến độ.', 500);
  }
}
