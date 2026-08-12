import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiSuccess, apiError } from '@/lib/api-response';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { reportId } = await params;

    const report = await prisma.siteReport.findFirst({
      where: { id: reportId, deletedAt: null },
      include: {
        project: { select: { id: true, name: true, code: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        approvedBy: { select: { id: true, name: true, role: true } },
        lines: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
        },
        attachments: true,
        photos: true,
      },
    });

    if (!report) {
      return apiError('NOT_FOUND', 'Không tìm thấy báo cáo.', 404);
    }

    const scopeErr = await verifyProjectScope(auth.session, report.projectId);
    if (scopeErr) return scopeErr;

    return apiSuccess({
      id: report.id,
      reportNo: report.reportNo,
      type: report.type,
      title: report.title,
      reportDate: report.reportDate,
      weatherCondition: report.weatherCondition,
      weatherTemperature: report.weatherTemperature,
      weatherNote: report.weatherNote,
      summary: report.summary,
      materials: report.materials,
      labor: report.labor,
      equipment: report.equipment,
      quality: report.quality,
      issues: report.issues,
      recommendations: report.recommendations,
      status: report.status,
      rejectedReason: report.rejectedReason,
      project: report.project,
      createdBy: report.createdBy,
      approvedBy: report.approvedBy,
      submittedAt: report.submittedAt,
      approvedAt: report.approvedAt,
      lines: report.lines.map((l) => ({
        id: l.id,
        workContent: l.workContent,
        constructionCrew: l.constructionCrew,
        unit: l.unit,
        quantityToday: Number(l.quantityToday),
        note: l.note,
      })),
      attachments: report.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        sizeBytes: a.sizeBytes,
        publicUrl: a.publicUrl,
      })),
      photos: report.photos,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    });
  } catch (error: any) {
    console.error('[API V1 Get Report Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải chi tiết báo cáo.', 500);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const { reportId } = await params;

    const existing = await prisma.siteReport.findFirst({
      where: { id: reportId, deletedAt: null },
    });
    if (!existing) {
      return apiError('NOT_FOUND', 'Không tìm thấy báo cáo.', 404);
    }

    const scopeErr = await verifyProjectScope(auth.session, existing.projectId);
    if (scopeErr) return scopeErr;

    if (existing.createdById !== auth.user.id && auth.user.role !== 'ADMIN') {
      return apiError('FORBIDDEN', 'Bạn không có quyền cập nhật báo cáo này.', 403);
    }

    if (['APPROVED', 'SUBMITTED'].includes(existing.status)) {
      return apiError('FORBIDDEN', 'Không thể sửa báo cáo ở trạng thái hiện tại.', 403);
    }

    const body = await request.json().catch(() => ({}));
    const updated = await prisma.siteReport.update({
      where: { id: reportId },
      data: {
        title: typeof body.title === 'string' ? body.title : existing.title,
        summary: typeof body.summary === 'string' ? body.summary : existing.summary,
        issues: typeof body.issues === 'string' ? body.issues : existing.issues,
        recommendations: typeof body.recommendations === 'string' ? body.recommendations : existing.recommendations,
        materials: typeof body.materials === 'string' ? body.materials : existing.materials,
        labor: typeof body.labor === 'string' ? body.labor : existing.labor,
        equipment: typeof body.equipment === 'string' ? body.equipment : existing.equipment,
      },
    });

    return apiSuccess({
      id: updated.id,
      title: updated.title,
      summary: updated.summary,
      status: updated.status,
      updatedAt: updated.updatedAt,
    });
  } catch (error: any) {
    console.error('[API V1 PATCH Report Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi cập nhật báo cáo.', 500);
  }
}
