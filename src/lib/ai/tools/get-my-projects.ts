import { z } from "zod";
import prisma from "@/lib/prisma";
import { projectScopeWhere } from "@/lib/rbac";
import { AIRequestContext, AIToolDefinition } from "../types";

export const getMyProjectsInputSchema = z
  .object({
    limit: z.number().int().min(1).max(100).optional().default(50),
    search: z.string().max(100).optional(),
  })
  .strict();

export type GetMyProjectsInput = z.infer<typeof getMyProjectsInputSchema>;

export interface ProjectSummaryItem {
  id: string;
  code: string;
  name: string;
  displayName: string | null;
  status: string;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  membersCount: number;
}

export const getMyProjectsTool: AIToolDefinition<GetMyProjectsInput, ProjectSummaryItem[]> = {
  name: "get_my_projects",
  version: "1.0.0",
  description: "Lấy danh sách các công trình mà người dùng hiện tại có quyền truy cập.",
  riskLevel: "READ_SAFE",
  operation: "READ",
  aiAllowed: true,
  requiresProjectScopeCheck: false,
  inputSchema: getMyProjectsInputSchema,
  execute: async (input: GetMyProjectsInput, context: AIRequestContext): Promise<ProjectSummaryItem[]> => {
    const scopeWhere = projectScopeWhere(context.projectScope);

    const whereClause: any = {
      ...scopeWhere,
      deletedAt: null,
    };

    if (input.search && input.search.trim()) {
      const q = input.search.trim();
      whereClause.OR = [
        { code: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { displayName: { contains: q, mode: "insensitive" } },
      ];
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      take: Math.min(input.limit || 50, 100),
      orderBy: { code: "asc" },
      select: {
        id: true,
        code: true,
        name: true,
        displayName: true,
        status: true,
        location: true,
        startDate: true,
        endDate: true,
        _count: {
          select: {
            members: {
              where: { deletedAt: null, isActive: true },
            },
          },
        },
      },
    });

    return projects.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      displayName: p.displayName,
      status: p.status,
      location: p.location || null,
      startDate: p.startDate ? p.startDate.toISOString() : null,
      endDate: p.endDate ? p.endDate.toISOString() : null,
      membersCount: p._count.members,
    }));
  },
};
