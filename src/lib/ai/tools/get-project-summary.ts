import { z } from "zod";
import prisma from "@/lib/prisma";
import { AIRequestContext, AIToolDefinition } from "../types";
import { AIFieldPolicyEngine } from "../authorization/ai-field-policy";
import { ProjectSummaryRoleSafeDTO } from "../authorization/project-summary-policy";

export const getProjectSummaryInputSchema = z
  .object({
    projectId: z.string().min(1, "Mã ID hoặc mã Code của công trình không được để trống"),
  })
  .strict();

export type GetProjectSummaryInput = z.infer<typeof getProjectSummaryInputSchema>;

export const getProjectSummaryTool: AIToolDefinition<GetProjectSummaryInput, ProjectSummaryRoleSafeDTO | null> = {
  name: "get_project_summary",
  version: "1.1.0",
  description: "Lấy thông tin tổng hợp, chỉ số và trạng thái của một công trình theo đúng phân quyền vai trò.",
  riskLevel: "READ_SAFE",
  operation: "READ",
  aiAllowed: true,
  requiresProjectScopeCheck: true,
  inputSchema: getProjectSummaryInputSchema,
  execute: async (input: GetProjectSummaryInput, context: AIRequestContext): Promise<ProjectSummaryRoleSafeDTO | null> => {
    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: input.projectId }, { code: input.projectId }],
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        displayName: true,
        status: true,
        location: true,
        startDate: true,
        endDate: true,
        budget: true,
        _count: {
          select: {
            members: { where: { deletedAt: null, isActive: true } },
            siteReports: { where: { deletedAt: null } },
            documents: { where: { deletedAt: null } },
            materialItems: true,
          },
        },
      },
    });

    if (!project) return null;

    // Apply Field-Level Authorization Policy (Omit budget for unauthorized roles)
    return AIFieldPolicyEngine.filterProjectSummary(project, {
      userId: context.userId,
      role: context.role,
      projectScope: context.projectScope,
    });
  },
};
