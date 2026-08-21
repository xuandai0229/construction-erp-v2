import { z } from "zod";
import prisma from "@/lib/prisma";
import { projectScopeWhere } from "@/lib/rbac";
import { AIRequestContext, AIToolDefinition, AIToolPayload } from "../types";

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
  deadlineStatus: "NO_DEADLINE" | "ON_TRACK" | "DUE_SOON" | "OVERDUE";
  daysToDeadline: number | null;
  updatedAt: string;
}

export interface GetMyProjectsResult {
  authorizedTotalCount: number;
  returnedCount: number;
  hasMore: boolean;
  items: ProjectSummaryItem[];
}

export const getMyProjectsTool: AIToolDefinition<GetMyProjectsInput, AIToolPayload<GetMyProjectsResult>> = {
  name: "get_my_projects",
  version: "1.1.0",
  description: "Lấy danh sách các công trình mà người dùng hiện tại có quyền truy cập trong hệ thống ERP.",
  riskLevel: "READ_SAFE",
  operation: "READ",
  aiAllowed: true,
  requiresProjectScopeCheck: false,
  inputSchema: getMyProjectsInputSchema,
  execute: async (input: GetMyProjectsInput, context: AIRequestContext): Promise<AIToolPayload<GetMyProjectsResult>> => {
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

    const takeLimit = Math.min(input.limit || 50, 100);

    const [authorizedTotalCount, projects] = await Promise.all([
      prisma.project.count({ where: whereClause }),
      prisma.project.findMany({
        where: whereClause,
        take: takeLimit,
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
      }),
    ]);

    const items = projects.map((p) => {
      const daysToDeadline = p.endDate
        ? Math.ceil((p.endDate.getTime() - asOf.getTime()) / 86_400_000)
        : null;
      const deadlineStatus = daysToDeadline === null
        ? ("NO_DEADLINE" as const)
        : daysToDeadline < 0
          ? ("OVERDUE" as const)
          : daysToDeadline <= 14
            ? ("DUE_SOON" as const)
            : ("ON_TRACK" as const);
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

    const hasMore = authorizedTotalCount > items.length;

    const data: GetMyProjectsResult = {
      authorizedTotalCount,
      returnedCount: items.length,
      hasMore,
      items,
    };

    return {
      data,
      asOf: asOf.toISOString(),
      coverage: {
        status: items.length > 0 ? "AVAILABLE" : "NO_DATA",
        summary: items.length > 0
          ? `${items.length}/${authorizedTotalCount} công trình trong phạm vi được cấp quyền.`
          : "Không có công trình nào trong phạm vi được cấp quyền.",
      },
      qualityFlags: items.some((project) => project.deadlineStatus === "NO_DEADLINE")
        ? ["SOME_PROJECTS_MISSING_DEADLINE"]
        : [],
      warnings: hasMore
        ? [`Đang hiển thị ${items.length} trên tổng số ${authorizedTotalCount} công trình được phân quyền.`]
        : [],
      sources: items.map((project) => ({
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
