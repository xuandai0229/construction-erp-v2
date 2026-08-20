import { z } from "zod";
import prisma from "@/lib/prisma";
import { projectScopeWhere } from "@/lib/rbac";
import { AIRequestContext, AIToolDefinition } from "../types";
import { AIFieldPolicyEngine } from "../authorization/ai-field-policy";
import { PendingItemRoleSafeDTO, PendingItemRawData } from "../authorization/pending-items-policy";

export const getPendingItemsInputSchema = z
  .object({
    projectId: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional().default(20),
  })
  .strict();

export type GetPendingItemsInput = z.infer<typeof getPendingItemsInputSchema>;

export const getPendingItemsTool: AIToolDefinition<GetPendingItemsInput, PendingItemRoleSafeDTO[]> = {
  name: "get_pending_items",
  version: "1.1.0",
  description: "Lấy danh sách các yêu cầu hoặc báo cáo đang chờ xử lý theo đúng phân quyền vai trò.",
  riskLevel: "READ_SAFE",
  operation: "READ",
  aiAllowed: true,
  requiresProjectScopeCheck: false,
  inputSchema: getPendingItemsInputSchema,
  execute: async (input: GetPendingItemsInput, context: AIRequestContext): Promise<PendingItemRoleSafeDTO[]> => {
    const scopeWhere = projectScopeWhere(context.projectScope);

    let projectFilter: any = scopeWhere;
    if (input.projectId) {
      projectFilter = {
        OR: [{ id: input.projectId }, { code: input.projectId }],
        ...scopeWhere,
      };
    }

    const [pendingApprovals, submittedReports] = await Promise.all([
      prisma.approvalRequest.findMany({
        where: {
          status: "PENDING",
          ...(input.projectId ? { projectId: input.projectId } : {}),
          project: {
            is: {
              ...projectFilter,
              deletedAt: null,
            },
          },
        },
        take: Math.min(input.limit || 20, 50),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          projectId: true,
          status: true,
          createdAt: true,
          requesterId: true,
          project: { select: { code: true, name: true } },
          requester: { select: { name: true, username: true } },
        },
      }),
      prisma.siteReport.findMany({
        where: {
          status: "SUBMITTED",
          deletedAt: null,
          ...(input.projectId ? { projectId: input.projectId } : {}),
          project: {
            is: {
              ...projectFilter,
              deletedAt: null,
            },
          },
        },
        take: Math.min(input.limit || 20, 50),
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          reportNo: true,
          reportDate: true,
          projectId: true,
          status: true,
          createdAt: true,
          createdById: true,
          project: { select: { code: true, name: true } },
          createdBy: { select: { name: true, username: true } },
        },
      }),
    ]);

    const rawItems: PendingItemRawData[] = [];

    pendingApprovals.forEach((app) => {
      rawItems.push({
        id: app.id,
        category: "APPROVAL_REQUEST",
        title: app.title,
        projectId: app.projectId,
        projectCode: app.project?.code || undefined,
        projectName: app.project?.name || undefined,
        status: app.status,
        createdAt: app.createdAt,
        requesterId: app.requesterId || undefined,
        requesterName: app.requester?.name || app.requester?.username || undefined,
      });
    });

    submittedReports.forEach((rep) => {
      rawItems.push({
        id: rep.id,
        category: "SITE_REPORT_REVIEW",
        title: `Nhật ký thi công số ${rep.reportNo} (${rep.reportDate.toISOString().split("T")[0]})`,
        projectId: rep.projectId,
        projectCode: rep.project?.code || undefined,
        projectName: rep.project?.name || undefined,
        status: rep.status,
        createdAt: rep.createdAt,
        requesterId: rep.createdById,
        requesterName: rep.createdBy?.name || rep.createdBy?.username || undefined,
      });
    });

    // Apply Semantic Scope Filtering based on User Role & Identity
    return AIFieldPolicyEngine.filterPendingItems(rawItems, {
      userId: context.userId,
      role: context.role,
      projectScope: context.projectScope,
    });
  },
};
