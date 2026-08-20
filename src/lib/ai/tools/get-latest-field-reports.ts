import { z } from "zod";
import prisma from "@/lib/prisma";
import { AIRequestContext, AIToolDefinition } from "../types";
import { SiteReportStatus } from "@prisma/client";
import { AIFieldPolicyEngine } from "../authorization/ai-field-policy";
import { FieldReportRoleSafeDTO } from "../authorization/report-policy";

export const getLatestFieldReportsInputSchema = z
  .object({
    projectId: z.string().min(1, "Mã ID hoặc mã Code của công trình không được để trống"),
    limit: z.number().int().min(1).max(50).optional().default(10),
    status: z.nativeEnum(SiteReportStatus).optional(),
  })
  .strict();

export type GetLatestFieldReportsInput = z.infer<typeof getLatestFieldReportsInputSchema>;

export const getLatestFieldReportsTool: AIToolDefinition<GetLatestFieldReportsInput, FieldReportRoleSafeDTO[]> = {
  name: "get_latest_field_reports",
  version: "1.1.0",
  description: "Lấy danh sách các báo cáo nhật ký thi công gần nhất của công trình theo đúng phân quyền vai trò.",
  riskLevel: "READ_SAFE",
  operation: "READ",
  aiAllowed: true,
  requiresProjectScopeCheck: true,
  inputSchema: getLatestFieldReportsInputSchema,
  execute: async (input: GetLatestFieldReportsInput, context: AIRequestContext): Promise<FieldReportRoleSafeDTO[]> => {
    const rawReports = await prisma.siteReport.findMany({
      where: {
        project: {
          OR: [{ id: input.projectId }, { code: input.projectId }],
        },
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
        createdAt: true,
        createdBy: {
          select: {
            name: true,
            username: true,
          },
        },
        _count: {
          select: {
            lines: true,
            photos: true,
          },
        },
      },
    });

    return AIFieldPolicyEngine.filterReports(rawReports, {
      userId: context.userId,
      role: context.role,
      projectScope: context.projectScope,
    });
  },
};
