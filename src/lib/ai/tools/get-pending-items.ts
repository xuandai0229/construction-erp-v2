import { z } from "zod";
import prisma from "@/lib/prisma";
import { projectScopeWhere } from "@/lib/rbac";
import { AIToolDefinition, AIToolPayload } from "../types";
import { AIFieldPolicyEngine } from "../authorization/ai-field-policy";
import { PendingItemRawData } from "../authorization/pending-items-policy";

export const getPendingItemsInputSchema = z
  .object({
    projectId: z.string().optional(),
    limit: z.number().int().min(1).max(50).optional().default(20),
  })
  .strict();

export type GetPendingItemsInput = z.infer<typeof getPendingItemsInputSchema>;

export interface PendingWorkItemDTO {
  id: string;
  category: string;
  title: string;
  projectId: string;
  projectCode?: string;
  projectName?: string;
  status: string;
  createdAt: string;
  requesterName?: string;
  ageDays: number;
  dueDate: string | null;
  priority: string | null;
  pendingReason: string;
}

type PendingMetadata = {
  projectId: string;
  dueDate: Date | null;
  priority: string | null;
  pendingReason: string;
  updatedAt: Date;
};

export const getPendingItemsTool: AIToolDefinition<
  GetPendingItemsInput,
  AIToolPayload<PendingWorkItemDTO[]>
> = {
  name: "get_pending_items",
  version: "2.0.0",
  description: "Lấy yêu cầu phê duyệt và báo cáo đã gửi đang thực sự chờ xử lý, kèm tuổi, hạn và lý do chờ.",
  riskLevel: "READ_SAFE",
  operation: "READ",
  aiAllowed: true,
  requiresProjectScopeCheck: false,
  inputSchema: getPendingItemsInputSchema,
  execute: async (input, context) => {
    const asOf = new Date();
    const scopeWhere = projectScopeWhere(context.projectScope);
    const projectFilter = {
      ...scopeWhere,
      ...(input.projectId ? { id: input.projectId } : {}),
      deletedAt: null,
    };
    const limit = Math.min(input.limit || 20, 50);

    const [pendingApprovals, submittedReports] = await Promise.all([
      prisma.approvalRequest.findMany({
        where: {
          status: "PENDING",
          deletedAt: null,
          ...(input.projectId ? { projectId: input.projectId } : {}),
          project: { is: projectFilter },
        },
        take: limit,
        orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          projectId: true,
          status: true,
          priority: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,
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
          project: { is: projectFilter },
        },
        take: limit,
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          reportNo: true,
          reportDate: true,
          projectId: true,
          status: true,
          submittedAt: true,
          createdAt: true,
          updatedAt: true,
          createdById: true,
          project: { select: { code: true, name: true } },
          createdBy: { select: { name: true, username: true } },
        },
      }),
    ]);

    const rawItems: PendingItemRawData[] = [];
    const metadataById = new Map<string, PendingMetadata>();
    for (const approval of pendingApprovals) {
      rawItems.push({
        id: approval.id,
        category: "APPROVAL_REQUEST",
        title: approval.title,
        projectId: approval.projectId,
        projectCode: approval.project?.code || undefined,
        projectName: approval.project?.name || undefined,
        status: approval.status,
        createdAt: approval.createdAt,
        requesterId: approval.requesterId || undefined,
        requesterName: approval.requester?.name || approval.requester?.username || undefined,
      });
      metadataById.set(approval.id, {
        projectId: approval.projectId,
        dueDate: approval.dueDate,
        priority: approval.priority,
        pendingReason: approval.description?.trim() || `Yêu cầu ${approval.code || approval.id} đang chờ quyết định.`,
        updatedAt: approval.updatedAt instanceof Date ? approval.updatedAt : approval.createdAt,
      });
    }
    for (const report of submittedReports) {
      rawItems.push({
        id: report.id,
        category: "SITE_REPORT_REVIEW",
        title: `Nhật ký thi công ${report.reportNo} (${report.reportDate.toISOString().slice(0, 10)})`,
        projectId: report.projectId,
        projectCode: report.project?.code || undefined,
        projectName: report.project?.name || undefined,
        status: report.status,
        createdAt: report.submittedAt || report.createdAt,
        requesterId: report.createdById,
        requesterName: report.createdBy?.name || report.createdBy?.username || undefined,
      });
      metadataById.set(report.id, {
        projectId: report.projectId,
        dueDate: null,
        priority: null,
        pendingReason: "Báo cáo đã gửi và đang chờ rà soát/phê duyệt.",
        updatedAt: report.updatedAt instanceof Date ? report.updatedAt : report.createdAt,
      });
    }

    const safeItems = AIFieldPolicyEngine.filterPendingItems(rawItems, {
      userId: context.userId,
      role: context.role,
      projectScope: context.projectScope,
    });
    const data: PendingWorkItemDTO[] = safeItems
      .map((item) => {
        const metadata = metadataById.get(item.id)!;
        return {
          ...item,
          projectId: metadata.projectId,
          ageDays: Math.max(0, Math.floor((asOf.getTime() - new Date(item.createdAt).getTime()) / 86_400_000)),
          dueDate: metadata.dueDate?.toISOString() || null,
          priority: metadata.priority,
          pendingReason: metadata.pendingReason,
        };
      })
      .sort((a, b) => b.ageDays - a.ageDays)
      .slice(0, limit);

    return {
      data,
      asOf: asOf.toISOString(),
      coverage: {
        status: data.length > 0 ? "AVAILABLE" : "NO_DATA",
        summary: data.length > 0
          ? `${data.length} việc thuộc hai miền được hỗ trợ: yêu cầu phê duyệt và báo cáo đã gửi.`
          : "Không có việc chờ phù hợp trong hai miền dữ liệu hiện được hỗ trợ.",
        domains: {
          approvalRequests: pendingApprovals.length > 0 ? "AVAILABLE" : "NO_DATA",
          submittedReports: submittedReports.length > 0 ? "AVAILABLE" : "NO_DATA",
        },
      },
      qualityFlags: data.length === 0 ? ["NO_PENDING_ITEMS_IN_SUPPORTED_DOMAINS"] : [],
      warnings: ["Phạm vi semantic hiện chỉ gồm ApprovalRequest.PENDING và SiteReport.SUBMITTED."],
      sources: data.map((item) => {
        const metadata = metadataById.get(item.id)!;
        return {
          sourceType: item.category === "APPROVAL_REQUEST" ? "APPROVAL" as const : "FIELD_REPORT" as const,
          recordId: item.id,
          projectId: item.projectId,
          title: item.title,
          route: item.category === "APPROVAL_REQUEST"
            ? `/approvals?projectId=${encodeURIComponent(item.projectId)}&id=${encodeURIComponent(item.id)}`
            : `/reports/field/${item.id}`,
          asOf: metadata.updatedAt.toISOString(),
          label: item.projectCode ? `${item.projectCode} · ${item.category}` : item.category,
        };
      }),
    };
  },
};
