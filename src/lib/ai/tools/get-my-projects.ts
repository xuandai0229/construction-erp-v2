import { z } from "zod";
import prisma from "@/lib/prisma";
import { projectScopeWhere } from "@/lib/rbac";
import { AIRequestContext, AIToolDefinition, AIToolPayload } from "../types";

export const getMyProjectsInputSchema = z
  .object({
    limit: z.number().int().min(1).max(50).optional().default(15),
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
  deadlineStatus: "NO_DEADLINE" | "ON_TRACK" | "DUE_SOON" | "OVERDUE";
  daysToDeadline: number | null;
  updatedAt: string;
}

export const getMyProjectsTool: AIToolDefinition<GetMyProjectsInput, AIToolPayload<ProjectSummaryItem[]>> = {
  name: "get_my_projects",
  version: "1.0.0",
  description: "Lấy danh sách các công trình mà người dùng hiện tại có quyền truy cập.",
  riskLevel: "READ_SAFE",
  operation: "READ",
  aiAllowed: true,
  requiresProjectScopeCheck: false,
  inputSchema: getMyProjectsInputSchema,
  execute: async (input: GetMyProjectsInput, context: AIRequestContext): Promise<AIToolPayload<ProjectSummaryItem[]>> => {
    const asOf = new Date();
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
      take: Math.min(input.limit || 15, 50),
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
        updatedAt: true,
        _count: {
          select: {
            members: {
              where: { deletedAt: null, isActive: true },
            },
          },
        },
      },
    });

    const data = projects.map((p) => {
      const daysToDeadline = p.endDate
        ? Math.ceil((p.endDate.getTime() - asOf.getTime()) / 86_400_000)
        : null;
      const deadlineStatus = daysToDeadline === null
        ? "NO_DEADLINE" as const
        : daysToDeadline < 0
          ? "OVERDUE" as const
          : daysToDeadline <= 14
            ? "DUE_SOON" as const
            : "ON_TRACK" as const;
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        displayName: p.displayName,
        status: p.status,
        location: p.location || null,
        startDate: p.startDate ? p.startDate.toISOString() : null,
        endDate: p.endDate ? p.endDate.toISOString() : null,
        membersCount: p._count.members,
        deadlineStatus,
        daysToDeadline,
        updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : asOf.toISOString(),
      };
    });

    return {
      data,
      asOf: asOf.toISOString(),
      coverage: {
        status: data.length > 0 ? "AVAILABLE" : "NO_DATA",
        summary: data.length > 0
          ? `${data.length} công trình trong phạm vi được cấp quyền.`
          : "Không có công trình nào trong phạm vi được cấp quyền.",
      },
      qualityFlags: data.some((project) => project.deadlineStatus === "NO_DEADLINE")
        ? ["SOME_PROJECTS_MISSING_DEADLINE"]
        : [],
      warnings: [],
      sources: data.map((project) => ({
        sourceType: "PROJECT" as const,
        recordId: project.id,
        projectId: project.id,
        title: `[${project.code}] ${project.name}`,
        route: `/projects/${project.id}`,
        asOf: project.updatedAt,
        label: project.code,
      })),
    };
  },
};
