import { z } from "zod";
import prisma from "@/lib/prisma";
import { AIRequestContext, AIToolDefinition } from "../types";
import { AIFieldPolicyEngine } from "../authorization/ai-field-policy";
import { MaterialItemRoleSafeDTO } from "../authorization/material-policy";

export const getProjectMaterialSummaryInputSchema = z
  .object({
    projectId: z.string().min(1, "Mã ID hoặc mã Code của công trình không được để trống"),
    limit: z.number().int().min(1).max(100).optional().default(50),
    search: z.string().optional(),
  })
  .strict();

export type GetProjectMaterialSummaryInput = z.infer<typeof getProjectMaterialSummaryInputSchema>;

export const getProjectMaterialSummaryTool: AIToolDefinition<GetProjectMaterialSummaryInput, MaterialItemRoleSafeDTO[]> = {
  name: "get_project_material_summary",
  version: "1.1.0",
  description: "Lấy danh mục và thông tin vật tư của công trình theo đúng phân quyền vai trò.",
  riskLevel: "READ_SAFE",
  operation: "READ",
  aiAllowed: true,
  requiresProjectScopeCheck: true,
  inputSchema: getProjectMaterialSummaryInputSchema,
  execute: async (input: GetProjectMaterialSummaryInput, context: AIRequestContext): Promise<MaterialItemRoleSafeDTO[]> => {
    const rawItems = await prisma.materialItem.findMany({
      where: {
        isActive: true,
        ...(input.search
          ? {
              OR: [
                { name: { contains: input.search, mode: "insensitive" } },
                { code: { contains: input.search, mode: "insensitive" } },
                { description: { contains: input.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      take: Math.min(input.limit || 50, 100),
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        unit: true,
        description: true,
        manufacturer: true,
        origin: true,
        group: true,
        isActive: true,
      },
    });

    return AIFieldPolicyEngine.filterMaterials(rawItems, {
      userId: context.userId,
      role: context.role,
      projectScope: context.projectScope,
    });
  },
};
