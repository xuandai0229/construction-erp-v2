import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, verifyProjectScope } from '@/lib/v1-auth-guard';
import { apiList, apiSuccess, apiError, parsePaginationParams } from '@/lib/api-response';
import { getProjectAccessScope, projectScopeWhere } from '@/lib/rbac';
import { z } from 'zod';

const CreateReportSchema = z.object({
  projectId: z.string().min(1, 'Mã dự án không được để trống.'),
  title: z.string().optional(),
  reportDate: z.string().min(1, 'Ngày báo cáo không được để trống.'),
  type: z.enum(['DAILY', 'WEEKLY']).optional().default('DAILY'),
  weatherCondition: z.enum(['SUNNY', 'CLOUDY', 'OVERCAST', 'LIGHT_RAIN', 'HEAVY_RAIN', 'WINDY', 'STORM', 'OTHER']).optional(),
  summary: z.string().optional(),
  issues: z.string().optional(),
  recommendations: z.string().optional(),
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
      deletedAt: null,
    };
    if (projectId) {
      const scopeErr = await verifyProjectScope(auth.session, projectId);
      if (scopeErr) return scopeErr;
      where.projectId = projectId;
    }

    const [total, reports] = await Promise.all([
      prisma.siteReport.count({ where }),
      prisma.siteReport.findMany({
        where,
        include: {
          project: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, name: true, role: true } },
          approvedBy: { select: { id: true, name: true, role: true } },
          _count: { select: { lines: true, attachments: true, photos: true } },
        },
        orderBy: { reportDate: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const items = reports.map((r) => ({
      id: r.id,
      reportNo: r.reportNo,
      type: r.type,
      title: r.title,
      reportDate: r.reportDate,
      weatherCondition: r.weatherCondition,
      summary: r.summary,
      status: r.status,
      project: r.project,
      createdBy: r.createdBy,
      approvedBy: r.approvedBy,
      counts: {
        lines: r._count.lines,
        attachments: r._count.attachments,
        photos: r._count.photos,
      },
      createdAt: r.createdAt,
    }));

    return apiList(items, page, pageSize, total);
  } catch (error: any) {
    console.error('[API V1 List Reports Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tải danh sách báo cáo.', 500);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;

    const body = await request.json().catch(() => ({}));
    const parseResult = CreateReportSchema.safeParse(body);
    if (!parseResult.success) {
      return apiError('BAD_REQUEST', parseResult.error.issues[0]?.message || 'Dữ liệu không hợp lệ.', 400);
    }

    const { projectId, title, reportDate, type, weatherCondition, summary, issues, recommendations } = parseResult.data;

    const scopeErr = await verifyProjectScope(auth.session, projectId);
    if (scopeErr) return scopeErr;

    const newReport = await prisma.siteReport.create({
      data: {
        projectId,
        title: title || null,
        reportDate: new Date(reportDate),
        type,
        weatherCondition: weatherCondition || null,
        summary: summary || null,
        issues: issues || null,
        recommendations: recommendations || null,
        createdById: auth.user.id,
        reporterName: auth.user.name,
        status: 'DRAFT',
      },
    });

    return apiSuccess(
      {
        id: newReport.id,
        reportNo: newReport.reportNo,
        projectId: newReport.projectId,
        status: newReport.status,
        createdAt: newNewReportCreatedAt(newReport),
      },
      201
    );
  } catch (error: any) {
    console.error('[API V1 Create Report Error]', error);
    return apiError('SERVER_ERROR', 'Lỗi hệ thống khi tạo báo cáo.', 500);
  }
}

function newNewReportCreatedAt(r: any) {
  return r.createdAt;
}
