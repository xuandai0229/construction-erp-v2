import { z } from "zod";
import prisma from "@/lib/prisma";
import { SiteReportStatus } from "@prisma/client";
import { AIToolDefinition, AIToolPayload } from "../types";
import { AIFieldPolicyEngine } from "../authorization/ai-field-policy";

export const getLatestFieldReportsInputSchema = z
  .object({
    projectId: z.string().min(1, "Mã ID hoặc mã Code của công trình không được để trống"),
    limit: z.number().int().min(1).max(50).optional().default(10),
    status: z.nativeEnum(SiteReportStatus).optional(),
  })
  .strict();

export type GetLatestFieldReportsInput = z.infer<typeof getLatestFieldReportsInputSchema>;

export interface FieldReportBriefDTO {
  id: string;
  reportNo: string;
  reportDate: string;
  status: string;
  weather?: string;
  author?: string;
  workItemsCount: number;
  photosCount: number;
  summary: string | null;
  issues: string | null;
  recommendations: string | null;
  labor: string | null;
  equipment: string | null;
  quality: string | null;
  lines: Array<{
    workName: string | null;
    workContent: string;
    progressPercent: number;
    issueNote: string | null;
    proposalNote: string | null;
  }>;
  updatedAt: string;
}

export const getLatestFieldReportsTool: AIToolDefinition<
  GetLatestFieldReportsInput,
  AIToolPayload<FieldReportBriefDTO[]>
> = {
  name: "get_latest_field_reports",
  version: "2.0.0",
  description: "Lấy các báo cáo hiện trường gần nhất cùng nội dung, vấn đề, kiến nghị và dòng công việc có thật.",
  riskLevel: "READ_SAFE",
  operation: "READ",
  aiAllowed: true,
  requiresProjectScopeCheck: true,
  inputSchema: getLatestFieldReportsInputSchema,
  execute: async (input, context) => {
    const asOf = new Date();
    const rawReports = await prisma.siteReport.findMany({
      where: {
        projectId: input.projectId,
        deletedAt: null,
        ...(input.status ? { status: input.status } : {}),
      },
      take: Math.min(input.limit || 10, 50),
      orderBy: { reportDate: "desc" },
      select: {
        id: true,
        reportNo: true,
        reportDate: true,
        status: true,
        weather: true,
        weatherCondition: true,
        summary: true,
        issues: true,
        recommendations: true,
        labor: true,
        equipment: true,
        quality: true,
        createdAt: true,
        updatedAt: true,
        createdBy: { select: { name: true, username: true } },
        lines: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          take: 20,
          select: {
            workName: true,
            workContent: true,
            progressPercent: true,
            issueNote: true,
            proposalNote: true,
          },
        },
        _count: { select: { lines: true, photos: true } },
      },
    });

    const safeBase = AIFieldPolicyEngine.filterReports(rawReports, {
      userId: context.userId,
      role: context.role,
      projectScope: context.projectScope,
    });
    const rawById = new Map(rawReports.map((report) => [report.id, report]));
    const data: FieldReportBriefDTO[] = safeBase.map((base) => {
      const raw = rawById.get(base.id)!;
      return {
        ...base,
        summary: raw.summary,
        issues: raw.issues,
        recommendations: raw.recommendations,
        labor: raw.labor,
        equipment: raw.equipment,
        quality: raw.quality,
        lines: (raw.lines || []).map((line) => ({
          ...line,
          progressPercent: Number(line.progressPercent),
        })),
        updatedAt: raw.updatedAt instanceof Date ? raw.updatedAt.toISOString() : asOf.toISOString(),
      };
    });
    const contentCount = data.filter((report) =>
      report.summary || report.issues || report.recommendations || report.labor ||
      report.equipment || report.quality || report.lines.length > 0,
    ).length;
    const coverageStatus = data.length === 0 ? "NO_DATA" : contentCount === 0 ? "PARTIAL" : "AVAILABLE";

    return {
      data,
      asOf: asOf.toISOString(),
      coverage: {
        status: coverageStatus,
        summary: data.length === 0
          ? "Chưa có báo cáo hiện trường cho công trình."
          : contentCount === 0
            ? "Có bản ghi báo cáo nhưng chưa có nội dung đủ để lập briefing."
            : `${contentCount}/${data.length} báo cáo có nội dung nghiệp vụ để đọc.`,
        domains: { fieldReports: coverageStatus },
      },
      qualityFlags: [
        ...(data.length === 0 ? ["NO_FIELD_REPORTS"] : []),
        ...(data.length > 0 && contentCount === 0 ? ["NO_REPORT_CONTENT"] : []),
        ...(contentCount < data.length && contentCount > 0 ? ["SOME_REPORTS_MISSING_CONTENT"] : []),
      ],
      warnings: contentCount === 0 && data.length > 0
        ? ["Không suy diễn diễn biến hiện trường từ metadata báo cáo trống."]
        : [],
      sources: data.map((report) => ({
        sourceType: "FIELD_REPORT" as const,
        recordId: report.id,
        projectId: input.projectId,
        title: `Báo cáo ${report.reportNo}`,
        route: `/reports/field/${report.id}`,
        asOf: report.updatedAt,
        label: report.reportNo,
      })),
    };
  },
};
