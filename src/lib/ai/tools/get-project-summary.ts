import { z } from "zod";
import prisma from "@/lib/prisma";
import { calculateProjectActualProgress } from "@/lib/dashboard/project-progress-aggregate";
import { AIToolDefinition, AIToolPayload } from "../types";
import { AIFieldPolicyEngine } from "../authorization/ai-field-policy";
import { ProjectSummaryRoleSafeDTO } from "../authorization/project-summary-policy";

export const getProjectSummaryInputSchema = z
  .object({
    projectId: z.string().min(1, "Mã ID hoặc mã Code của công trình không được để trống"),
  })
  .strict();

export type GetProjectSummaryInput = z.infer<typeof getProjectSummaryInputSchema>;

export interface ProjectOperationalSummary extends ProjectSummaryRoleSafeDTO {
  deadline: {
    status: "NO_DEADLINE" | "ON_TRACK" | "DUE_SOON" | "OVERDUE";
    daysRemaining: number | null;
    label: string;
  };
  actualProgress: {
    status: string;
    percent: number | null;
    approvedEntryCount: number;
    lastApprovedAt: string | null;
  };
  pendingItemsCount: number | null;
  latestFieldReport: {
    id: string;
    reportNo: string;
    reportDate: string;
    narrativeAvailable: boolean;
  } | null;
  materialAvailability: {
    trackedItems: number;
    lowStockItems: number;
    totalStock: number;
  } | null;
  riskFlags: string[];
  dataQuality: {
    summary: string;
    missingDomains: string[];
  };
}

type Settled<T> = PromiseSettledResult<T>;
const valueOr = <T>(result: Settled<T>, fallback: T): T =>
  result.status === "fulfilled" ? result.value : fallback;

export const getProjectSummaryTool: AIToolDefinition<
  GetProjectSummaryInput,
  AIToolPayload<ProjectOperationalSummary | null>
> = {
  name: "get_project_summary",
  version: "2.0.0",
  description: "Lấy tóm tắt điều hành read-only gồm tiến độ đã duyệt, thời hạn, báo cáo, việc chờ và tồn kho của một công trình.",
  riskLevel: "READ_SAFE",
  operation: "READ",
  aiAllowed: true,
  requiresProjectScopeCheck: true,
  inputSchema: getProjectSummaryInputSchema,
  execute: async (input, context) => {
    const asOf = new Date();
    const project = await prisma.project.findFirst({
      where: {
        OR: [{ id: input.projectId }, { code: { equals: input.projectId, mode: "insensitive" } }],
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
        updatedAt: true,
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

    if (!project) {
      return {
        data: null,
        asOf: asOf.toISOString(),
        coverage: { status: "NO_DATA", summary: "Không tìm thấy công trình hợp lệ trong phạm vi được cấp quyền." },
        qualityFlags: ["PROJECT_RECORD_NOT_FOUND"],
        warnings: [],
        sources: [],
      };
    }

    const [itemsResult, entriesResult, reportResult, pendingResult, stocksResult] = await Promise.allSettled([
      prisma.fieldProgressItem.findMany({
        where: { projectId: project.id, itemType: "WORK", deletedAt: null },
        select: { id: true, projectId: true, itemType: true, designQuantity: true, deletedAt: true },
      }),
      prisma.fieldProgressEntry.findMany({
        where: { projectId: project.id, deletedAt: null },
        select: {
          id: true,
          projectId: true,
          itemId: true,
          quantity: true,
          status: true,
          entryDate: true,
          approvedAt: true,
          deletedAt: true,
        },
      }),
      prisma.siteReport.findFirst({
        where: { projectId: project.id, deletedAt: null },
        orderBy: { reportDate: "desc" },
        select: {
          id: true,
          reportNo: true,
          reportDate: true,
          updatedAt: true,
          summary: true,
          issues: true,
          recommendations: true,
          _count: { select: { lines: true } },
        },
      }),
      prisma.approvalRequest.count({
        where: { projectId: project.id, status: "PENDING", deletedAt: null },
      }),
      prisma.projectMaterialStock.findMany({
        where: { projectId: project.id },
        select: { stock: true, minStockLevel: true, lastUpdated: true },
      }),
    ]);

    const items = valueOr(itemsResult, []);
    const entries = valueOr(entriesResult, []);
    const latestReport = valueOr(reportResult, null);
    const pendingItemsCount = valueOr(pendingResult, null);
    const stocks = valueOr(stocksResult, []);
    const actual = calculateProjectActualProgress({
      projectId: project.id,
      asOf,
      items,
      entries,
    });
    const safeProject = AIFieldPolicyEngine.filterProjectSummary(project, {
      userId: context.userId,
      role: context.role,
      projectScope: context.projectScope,
    });

    const daysRemaining = project.endDate
      ? Math.ceil((project.endDate.getTime() - asOf.getTime()) / 86_400_000)
      : null;
    const deadlineStatus = daysRemaining === null
      ? "NO_DEADLINE" as const
      : daysRemaining < 0
        ? "OVERDUE" as const
        : daysRemaining <= 14
          ? "DUE_SOON" as const
          : "ON_TRACK" as const;
    const missingDomains: string[] = [];
    if (itemsResult.status === "rejected" || entriesResult.status === "rejected") missingDomains.push("actual_progress");
    if (reportResult.status === "rejected") missingDomains.push("field_reports");
    if (pendingResult.status === "rejected") missingDomains.push("pending_items");
    if (stocksResult.status === "rejected") missingDomains.push("material_stock");
    if (project.endDate === null) missingDomains.push("deadline");

    const lowStockItems = stocks.filter((stock) => Number(stock.stock) <= Number(stock.minStockLevel)).length;
    const riskFlags: string[] = [];
    if (deadlineStatus === "OVERDUE") riskFlags.push("PROJECT_OVERDUE");
    if (deadlineStatus === "DUE_SOON") riskFlags.push("DEADLINE_DUE_SOON");
    if (lowStockItems > 0) riskFlags.push("LOW_STOCK");
    if ((pendingItemsCount || 0) > 0) riskFlags.push("PENDING_ITEMS");
    if (latestReport?.issues) riskFlags.push("LATEST_REPORT_HAS_ISSUES");
    riskFlags.push(...actual.warnings);

    const data: ProjectOperationalSummary = {
      ...safeProject,
      deadline: {
        status: deadlineStatus,
        daysRemaining,
        label: daysRemaining === null
          ? "Chưa cập nhật hạn hoàn thành"
          : daysRemaining < 0
            ? `Quá hạn ${Math.abs(daysRemaining)} ngày`
            : `Còn ${daysRemaining} ngày`,
      },
      actualProgress: {
        status: actual.actualProgressDataStatus,
        percent: actual.actualProgressPercent,
        approvedEntryCount: actual.approvedEntryCount,
        lastApprovedAt: actual.lastActualProgressAt?.toISOString() || null,
      },
      pendingItemsCount,
      latestFieldReport: latestReport
        ? {
            id: latestReport.id,
            reportNo: latestReport.reportNo,
            reportDate: latestReport.reportDate.toISOString().slice(0, 10),
            narrativeAvailable: Boolean(
              latestReport.summary || latestReport.issues || latestReport.recommendations || latestReport._count.lines,
            ),
          }
        : null,
      materialAvailability: stocksResult.status === "fulfilled"
        ? {
            trackedItems: stocks.length,
            lowStockItems,
            totalStock: stocks.reduce((sum, stock) => sum + Number(stock.stock), 0),
          }
        : null,
      riskFlags: [...new Set(riskFlags)],
      dataQuality: {
        summary: missingDomains.length === 0
          ? "Các miền dữ liệu điều hành đã truy vấn thành công; miền trống được báo rõ, không nội suy."
          : `Không truy vấn được: ${missingDomains.join(", ")}.`,
        missingDomains,
      },
    };

    const qualityFlags = [...missingDomains.map((domain) => `UNAVAILABLE_${domain.toUpperCase()}`)];
    if (actual.actualProgressDataStatus !== "AVAILABLE") qualityFlags.push(actual.actualProgressDataStatus);
    if (!latestReport) qualityFlags.push("NO_FIELD_REPORTS");
    if (stocks.length === 0) qualityFlags.push("NO_MATERIAL_STOCK_DATA");

    return {
      data,
      asOf: asOf.toISOString(),
      coverage: {
        status: missingDomains.length > 0 ? "PARTIAL" : "AVAILABLE",
        summary: missingDomains.length > 0
          ? "Tóm tắt công trình chỉ bao phủ một phần dữ liệu điều hành."
          : "Tóm tắt công trình được tổng hợp từ các nguồn ERP read-only hiện có.",
        domains: {
          project: "AVAILABLE",
          actualProgress: actual.actualProgressDataStatus === "AVAILABLE" ? "AVAILABLE" : "NO_DATA",
          fieldReports: latestReport ? "AVAILABLE" : "NO_DATA",
          pendingItems: pendingResult.status === "fulfilled" ? "AVAILABLE" : "UNAVAILABLE",
          materialStock: stocks.length > 0 ? "AVAILABLE" : "NO_DATA",
        },
      },
      qualityFlags: [...new Set(qualityFlags)],
      warnings: [],
      sources: [
        {
          sourceType: "PROJECT",
          recordId: project.id,
          projectId: project.id,
          title: `[${project.code}] ${project.name}`,
          route: `/projects/${project.id}`,
          asOf: project.updatedAt instanceof Date ? project.updatedAt.toISOString() : asOf.toISOString(),
          label: project.code,
        },
        ...(latestReport ? [{
          sourceType: "FIELD_REPORT" as const,
          recordId: latestReport.id,
          projectId: project.id,
          title: `Báo cáo ${latestReport.reportNo}`,
          route: `/reports/field/${latestReport.id}`,
          asOf: latestReport.updatedAt.toISOString(),
          label: latestReport.reportNo,
        }] : []),
      ],
    };
  },
};
