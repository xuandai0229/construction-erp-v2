import type { Prisma, ProjectStatus, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ROLE_DISPLAY_NAMES, getAccessibleProjectIds } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";
import { addWorkDays, formatWorkDate, getWorkDateRange, parseWorkDate, todayWorkDate } from "@/lib/date/work-date";
import { groupEntriesByItemAndDate } from "@/lib/field-progress";
import { buildFieldProgressRollupTree } from "@/lib/field-progress/rollup";
import {
  canViewApprovalDashboard,
  canViewCompanyWideDashboard,
  canViewFinanceDashboard,
  getDashboardProjectScope,
} from "./dashboard-permissions";

export type DashboardPeriod = "7d" | "30d" | "month";

export type DashboardKpi = {
  id: string;
  label: string;
  value: string;
  description: string;
  tone: "blue" | "emerald" | "amber" | "rose" | "slate" | "violet";
  href?: string;
};

export type DashboardActionItem = {
  id: string;
  title: string;
  projectName: string;
  type: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: string;
  createdAt: Date | null;
  href: string;
};

export type DashboardProjectOverview = {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  progressPercent: number | null;
  itemCount: number;
  recentEntryCount: number;
  updatedAt: Date;
  endDate: Date | null;
  daysRemaining: number | null;
  health: "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED" | "NO_DATA";
  warning: string;
};

export type DashboardFinanceSummary = {
  totalContractValue: number;
  activeContracts: number;
  pendingPaymentAmount: number;
  pendingPaymentCount: number;
  recentPayments: {
    id: string;
    title: string;
    projectName: string;
    status: string;
    amount: number;
    createdAt: Date;
    href: string;
  }[];
} | null;

export type DashboardDocumentItem = {
  id: string;
  title: string;
  projectName: string;
  extension: string;
  uploadedBy: string;
  createdAt: Date;
  href: string;
};

export type DashboardSiteReportItem = {
  id: string;
  title: string;
  projectName: string;
  reporterName: string;
  status: string;
  type: string;
  reportDate: Date;
  hasIssue: boolean;
  href: string;
};

export type DashboardActivityItem = {
  id: string;
  title: string;
  actorName: string;
  projectName: string;
  createdAt: Date;
  href: string;
  tone: "blue" | "emerald" | "amber" | "rose" | "slate" | "violet";
};

export type DashboardData = {
  session: {
    id: string;
    name: string;
    role: UserRole;
    roleDisplayName: string;
  };
  permissions: {
    canViewCompanyWideDashboard: boolean;
    canViewFinanceDashboard: boolean;
    canViewApprovalDashboard: boolean;
  };
  period: {
    value: DashboardPeriod;
    label: string;
    start: Date;
    end: Date;
  };
  quickActions: {
    label: string;
    href: string;
    tone: "primary" | "secondary";
  }[];
  kpis: DashboardKpi[];
  actionItems: DashboardActionItem[];
  pendingApprovals: DashboardActionItem[];
  projectOverview: DashboardProjectOverview[];
  financeSummary: DashboardFinanceSummary;
  recentDocuments: DashboardDocumentItem[];
  recentSiteReports: DashboardSiteReportItem[];
  activityTimeline: DashboardActivityItem[];
};

function normalizePeriod(period: string | undefined): DashboardPeriod {
  if (period === "30d" || period === "month") return period;
  return "7d";
}

function getPeriodRange(period: DashboardPeriod) {
  const today = todayWorkDate();
  const todayRange = getWorkDateRange(today);
  let startWorkDate = today;
  let label = "7 ngày gần đây";

  if (period === "7d") startWorkDate = formatWorkDate(addWorkDays(parseWorkDate(today), -6));
  if (period === "30d") {
    startWorkDate = formatWorkDate(addWorkDays(parseWorkDate(today), -29));
    label = "30 ngày gần đây";
  }
  if (period === "month") {
    startWorkDate = `${today.slice(0, 8)}01`;
    label = "Tháng này";
  }

  return {
    value: period,
    label,
    start: getWorkDateRange(startWorkDate).start,
    end: todayRange.end,
  };
}

function getProjectWhere(accessibleProjectIds: string[] | null): Prisma.ProjectWhereInput {
  return accessibleProjectIds === null
    ? { deletedAt: null }
    : { deletedAt: null, id: { in: accessibleProjectIds } };
}

function projectIdScope(accessibleProjectIds: string[] | null) {
  return accessibleProjectIds === null ? {} : { projectId: { in: accessibleProjectIds } };
}

function projectRelationScope(accessibleProjectIds: string[] | null) {
  return accessibleProjectIds === null
    ? { project: { deletedAt: null } }
    : { project: { deletedAt: null, id: { in: accessibleProjectIds } } };
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Chờ duyệt",
    SUBMITTED: "Chờ duyệt",
    REQUESTED: "Đã yêu cầu",
    DRAFT: "Nháp",
    APPROVED: "Đã duyệt",
    PAID: "Đã thanh toán",
    REJECTED: "Từ chối",
    REVISION_REQUESTED: "Cần sửa",
    CANCELLED: "Đã hủy",
  };
  return labels[status] ?? status;
}

function hasReportIssue(report: { issues: string | null; lines?: { issueNote: string | null }[] }) {
  const issue = (report.issues ?? "").trim().toLowerCase();
  const issueIsMeaningful = issue.length > 0 && !issue.startsWith("không") && !issue.startsWith("khong");
  return issueIsMeaningful || Boolean(report.lines?.some((line) => (line.issueNote ?? "").trim().length > 0));
}

function getDaysRemaining(endDate: Date | null, todayStart: Date) {
  if (!endDate) return null;
  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - todayStart.getTime()) / 86_400_000);
}

function getHealth(project: {
  status: ProjectStatus;
  progressPercent: number | null;
  itemCount: number;
  recentEntryCount: number;
  daysRemaining: number | null;
}): { health: DashboardProjectOverview["health"]; warning: string } {
  if (project.status === "COMPLETED") return { health: "COMPLETED", warning: "Hoàn thành" };
  if (project.itemCount === 0) return { health: "NO_DATA", warning: "Chưa thiết lập WBS" };
  if (project.daysRemaining !== null && project.daysRemaining < 0) return { health: "DELAYED", warning: "Trễ tiến độ" };
  if (project.recentEntryCount === 0) return { health: "AT_RISK", warning: "Chưa có nhập liệu gần đây" };
  if (project.daysRemaining !== null && project.daysRemaining <= 14 && (project.progressPercent ?? 0) < 90) {
    return { health: "AT_RISK", warning: "Có nguy cơ trễ" };
  }
  return { health: "ON_TRACK", warning: "Đang ổn" };
}

function calculateProjectProgress(
  template: {
    id: string;
    items: {
      id: string;
      parentId: string | null;
      itemType: string;
      sortOrder: number;
      categoryName: string | null;
      workContent: string | null;
      constructionCrew: string | null;
      unit: string | null;
      designQuantity: unknown;
    }[];
  } | null,
  entries: { itemId: string; entryDate: Date; quantity: Prisma.Decimal | number | string | null }[],
) {
  if (!template || template.items.length === 0) return { progressPercent: null, itemCount: 0 };

  const workItems = template.items.filter((item) => item.itemType === "WORK");
  const availableDates = new Set(entries.map((entry) => formatWorkDate(new Date(entry.entryDate))));
  const dynamicDates = Array.from(availableDates).sort().map((date) => parseWorkDate(date));
  const groupedEntries = groupEntriesByItemAndDate(entries);
  const { itemTree } = buildFieldProgressRollupTree({
    items: template.items,
    groupedEntries,
    cumulativeBeforeMap: {},
    dynamicDates,
  });

  const totals = itemTree.reduce(
    (sum, item) => ({
      design: sum.design + item.designQty,
      cumulative: sum.cumulative + item.cumulative,
    }),
    { design: 0, cumulative: 0 },
  );

  return {
    progressPercent: totals.design > 0 ? Math.min(100, (totals.cumulative / totals.design) * 100) : null,
    itemCount: workItems.length,
  };
}

export async function getDashboardData(session: SessionUser, rawPeriod?: string): Promise<DashboardData> {
  const period = getPeriodRange(normalizePeriod(rawPeriod));
  const accessibleProjectIds = await getAccessibleProjectIds(session);
  const scope = getDashboardProjectScope(accessibleProjectIds);
  const projectWhere = getProjectWhere(accessibleProjectIds);
  const today = todayWorkDate();
  const todayRange = getWorkDateRange(today);
  const lastSevenStart = getWorkDateRange(formatWorkDate(addWorkDays(parseWorkDate(today), -6))).start;
  const canViewFinance = canViewFinanceDashboard(session.role);
  const canViewApprovals = canViewApprovalDashboard(session.role);
  const canViewCompanyWide = canViewCompanyWideDashboard(session.role);
  const activeProjectWhere: Prisma.ProjectWhereInput = { ...projectWhere, status: "ACTIVE" };

  const [
    allProjects,
    activeProjects,
    periodReports,
    periodDocuments,
    entriesToday,
    activeProjectsForAttention,
    overviewProjects,
    recentDocuments,
    recentSiteReports,
    issueReports,
    materialRequests,
    fieldMaterialRequests,
    auditLogs,
  ] = await Promise.all([
    prisma.project.count({ where: projectWhere }),
    prisma.project.count({ where: activeProjectWhere }),
    prisma.siteReport.count({
      where: { deletedAt: null, reportDate: { gte: period.start, lt: period.end }, ...projectIdScope(accessibleProjectIds) },
    }),
    prisma.document.count({
      where: { deletedAt: null, createdAt: { gte: period.start, lt: period.end }, ...projectRelationScope(accessibleProjectIds) },
    }),
    prisma.fieldProgressEntry.count({
      where: { deletedAt: null, entryDate: { gte: todayRange.start, lt: todayRange.end }, ...projectIdScope(accessibleProjectIds) },
    }),
    prisma.project.findMany({
      where: activeProjectWhere,
      select: {
        id: true,
        name: true,
        endDate: true,
        fieldProgressTemplates: { where: { deletedAt: null }, select: { id: true }, take: 1 },
        _count: {
          select: {
            fieldProgressEntries: { where: { deletedAt: null, entryDate: { gte: lastSevenStart, lt: period.end } } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({
      where: activeProjectWhere,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        endDate: true,
        updatedAt: true,
        fieldProgressTemplates: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            items: {
              where: { deletedAt: null },
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                parentId: true,
                itemType: true,
                sortOrder: true,
                categoryName: true,
                workContent: true,
                constructionCrew: true,
                unit: true,
                designQuantity: true,
              },
            },
          },
        },
        _count: {
          select: {
            fieldProgressEntries: { where: { deletedAt: null, entryDate: { gte: lastSevenStart, lt: period.end } } },
          },
        },
      },
    }),
    prisma.document.findMany({
      where: { deletedAt: null, ...projectRelationScope(accessibleProjectIds) },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { project: { select: { id: true, name: true } }, uploadedBy: { select: { name: true } } },
    }),
    prisma.siteReport.findMany({
      where: { deletedAt: null, ...projectIdScope(accessibleProjectIds) },
      orderBy: { reportDate: "desc" },
      take: 5,
      include: {
        project: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        lines: { select: { issueNote: true }, take: 8 },
      },
    }),
    prisma.siteReport.findMany({
      where: {
        deletedAt: null,
        ...projectIdScope(accessibleProjectIds),
        OR: [
          { status: { in: ["SUBMITTED", "REVISION_REQUESTED"] } },
          { issues: { not: null } },
          { lines: { some: { issueNote: { not: null } } } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 8,
      include: { project: { select: { name: true } }, lines: { select: { issueNote: true }, take: 8 } },
    }),
    prisma.materialRequest.findMany({
      where: { deletedAt: null, status: { in: ["REQUESTED", "SUBMITTED"] }, ...projectIdScope(accessibleProjectIds) },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { project: { select: { name: true } } },
    }),
    prisma.fieldMaterialRequest.findMany({
      where: { deletedAt: null, status: "SUBMITTED", ...projectIdScope(accessibleProjectIds) },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { project: { select: { name: true } } },
    }),
    prisma.auditLog.findMany({
      where: scope.allProjects ? {} : { projectId: { in: scope.projectIds ?? [] } },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const overviewProjectIds = overviewProjects.map((project) => project.id);
  const overviewTemplateIds = overviewProjects.map((project) => project.fieldProgressTemplates[0]?.id).filter((id): id is string => Boolean(id));
  const [overviewEntries, pendingApprovals, financeSummary] = await Promise.all([
    overviewTemplateIds.length > 0
      ? prisma.fieldProgressEntry.findMany({
          where: { deletedAt: null, status: "APPROVED", projectId: { in: overviewProjectIds }, templateId: { in: overviewTemplateIds } },
          select: { itemId: true, templateId: true, entryDate: true, quantity: true },
        })
      : Promise.resolve([]),
    canViewApprovals
      ? prisma.approvalRequest.findMany({
          where: { deletedAt: null, status: "PENDING", ...projectIdScope(accessibleProjectIds) },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          take: 5,
          include: { project: { select: { name: true } }, requester: { select: { name: true } } },
        })
      : Promise.resolve([]),
    canViewFinance ? getFinanceSummary(accessibleProjectIds) : Promise.resolve(null),
  ]);

  const todayStart = todayRange.start;
  const attentionProjects = activeProjectsForAttention
    .map((project) => {
      const daysRemaining = getDaysRemaining(project.endDate, todayStart);
      const noWbs = project.fieldProgressTemplates.length === 0;
      const noRecentEntry = project._count.fieldProgressEntries === 0;
      const delayed = daysRemaining !== null && daysRemaining < 0;
      if (!noWbs && !noRecentEntry && !delayed) return null;
      return {
        project,
        reason: delayed ? "Trễ tiến độ" : noWbs ? "Chưa thiết lập WBS" : "Chưa có nhập liệu gần đây",
        priority: delayed || noWbs ? "HIGH" as const : "MEDIUM" as const,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const projectOverview = overviewProjects.map((project) => {
    const template = project.fieldProgressTemplates[0] ?? null;
    const entries = template ? overviewEntries.filter((entry) => entry.templateId === template.id) : [];
    const progress = calculateProjectProgress(template, entries);
    const daysRemaining = getDaysRemaining(project.endDate, todayStart);
    const health = getHealth({
      status: project.status,
      progressPercent: progress.progressPercent,
      itemCount: progress.itemCount,
      recentEntryCount: project._count.fieldProgressEntries,
      daysRemaining,
    });
    return {
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status,
      progressPercent: progress.progressPercent,
      itemCount: progress.itemCount,
      recentEntryCount: project._count.fieldProgressEntries,
      updatedAt: project.updatedAt,
      endDate: project.endDate,
      daysRemaining,
      ...health,
    };
  });

  const approvalItems: DashboardActionItem[] = pendingApprovals.map((approval) => ({
    id: `approval-${approval.id}`,
    title: approval.title,
    projectName: approval.project.name,
    type: "Phê duyệt",
    priority: approval.priority === "URGENT" || approval.priority === "HIGH" ? "HIGH" : "MEDIUM",
    status: statusLabel(approval.status),
    createdAt: approval.createdAt,
    href: "/approvals",
  }));

  const financeActions: DashboardActionItem[] =
    financeSummary?.recentPayments
      .filter((payment) => payment.status === "SUBMITTED" || payment.status === "APPROVED")
      .slice(0, 3)
      .map((payment) => ({
        id: `payment-${payment.id}`,
        title: payment.title,
        projectName: payment.projectName,
        type: "Thanh toán",
        priority: payment.status === "SUBMITTED" ? "HIGH" as const : "MEDIUM" as const,
        status: statusLabel(payment.status),
        createdAt: payment.createdAt,
        href: payment.href,
      })) ?? [];

  const projectActions: DashboardActionItem[] = attentionProjects.slice(0, 5).map(({ project, reason, priority }) => ({
    id: `project-${project.id}-${reason}`,
    title: reason,
    projectName: project.name,
    type: "Tiến độ",
    priority,
    status: "Cần xử lý",
    createdAt: null,
    href: `/projects/${project.id}/field-progress`,
  }));

  const reportActions: DashboardActionItem[] = issueReports
    .filter((report) => report.status === "SUBMITTED" || report.status === "REVISION_REQUESTED" || hasReportIssue(report))
    .slice(0, 3)
    .map((report) => ({
      id: `report-${report.id}`,
      title: report.status === "SUBMITTED" ? "Báo cáo chờ duyệt" : "Báo cáo có vấn đề",
      projectName: report.project.name,
      type: "Báo cáo",
      priority: hasReportIssue(report) ? "HIGH" as const : "MEDIUM" as const,
      status: statusLabel(report.status),
      createdAt: report.updatedAt,
      href: `/reports?projectId=${report.projectId}`,
    }));

  const materialActions: DashboardActionItem[] = [
    ...materialRequests.map((request) => ({
      id: `material-${request.id}`,
      title: `Yêu cầu vật tư ${request.requestNo}`,
      projectName: request.project.name,
      type: "Vật tư",
      priority: "MEDIUM" as const,
      status: statusLabel(request.status),
      createdAt: request.createdAt,
      href: `/projects/${request.projectId}/material-requests`,
    })),
    ...fieldMaterialRequests.map((request) => ({
      id: `field-material-${request.id}`,
      title: "Đề xuất vật tư hiện trường",
      projectName: request.project.name,
      type: "Vật tư",
      priority: request.priority === "URGENT" || request.priority === "HIGH" ? "HIGH" as const : "MEDIUM" as const,
      status: statusLabel(request.status),
      createdAt: request.createdAt,
      href: `/projects/${request.projectId}/material-requests`,
    })),
  ].slice(0, 4);

  const actionItems = [...approvalItems, ...financeActions, ...projectActions, ...reportActions, ...materialActions]
    .sort((a, b) => {
      const priorityScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const priorityDiff = priorityScore[b.priority] - priorityScore[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
    })
    .slice(0, 8);

  const projectNameById = new Map([
    ...overviewProjects.map((project) => [project.id, project.name] as const),
    ...recentDocuments.map((document) => [document.project.id, document.project.name] as const),
    ...recentSiteReports.map((report) => [report.project.id, report.project.name] as const),
  ]);
  const activityTimeline: DashboardActivityItem[] = auditLogs.map((log) => ({
    id: log.id,
    title: getAuditTitle(log.action, log.entityType),
    actorName: log.user?.name ?? "Hệ thống",
    projectName: log.projectId ? projectNameById.get(log.projectId) ?? "Công trình" : "Hệ thống",
    createdAt: log.createdAt,
    href: log.projectId ? `/projects/${log.projectId}` : "/dashboard",
    tone: getAuditTone(log.action),
  }));

  const activeProjectForAction = overviewProjects[0] ?? null;
  const quickActions = [
    activeProjectForAction ? { label: "Tạo báo cáo", href: `/reports?projectId=${activeProjectForAction.id}`, tone: "primary" as const } : null,
    activeProjectForAction ? { label: "Nhập khối lượng", href: `/projects/${activeProjectForAction.id}/field-progress/daily`, tone: "secondary" as const } : null,
    activeProjectForAction ? { label: "Upload tài liệu", href: `/documents/${activeProjectForAction.id}`, tone: "secondary" as const } : null,
    canViewApprovals ? { label: "Trung tâm phê duyệt", href: "/approvals", tone: "secondary" as const } : null,
  ].filter((action): action is NonNullable<typeof action> => Boolean(action));

  const kpis: DashboardKpi[] = [
    {
      id: "projects",
      label: canViewCompanyWide ? "Tổng công trình" : "Công trình được truy cập",
      value: String(allProjects),
      description: `${activeProjects} đang thi công`,
      tone: "blue",
      href: "/projects",
    },
    {
      id: "entries-today",
      label: "Nhập khối lượng hôm nay",
      value: String(entriesToday),
      description: "Theo ngày nghiệp vụ hiện trường",
      tone: entriesToday > 0 ? "emerald" : "amber",
    },
    {
      id: "reports-period",
      label: `Báo cáo ${period.label.toLowerCase()}`,
      value: String(periodReports),
      description: "Báo cáo hiện trường",
      tone: "violet",
      href: "/reports",
    },
    {
      id: "documents-period",
      label: `Tài liệu ${period.label.toLowerCase()}`,
      value: String(periodDocuments),
      description: "File mới upload",
      tone: "slate",
      href: "/documents",
    },
    {
      id: "attention",
      label: "Công trình cần chú ý",
      value: String(attentionProjects.length + issueReports.filter(hasReportIssue).length),
      description: "Thiếu WBS, thiếu nhập liệu hoặc có vấn đề",
      tone: attentionProjects.length > 0 ? "amber" : "emerald",
    },
  ];

  if (canViewApprovals) {
    kpis.push({
      id: "pending-approvals",
      label: "Đề xuất chờ duyệt",
      value: String(pendingApprovals.length),
      description: "Theo phạm vi công trình được phép",
      tone: pendingApprovals.length > 0 ? "amber" : "emerald",
      href: "/approvals",
    });
  }
  if (financeSummary) {
    kpis.push({
      id: "pending-payments",
      label: "Thanh toán chờ xử lý",
      value: String(financeSummary.pendingPaymentCount),
      description: "Hồ sơ thanh toán chưa hoàn tất",
      tone: financeSummary.pendingPaymentCount > 0 ? "rose" : "emerald",
      href: "/accounting",
    });
  }

  return {
    session: {
      id: session.id,
      name: session.name,
      role: session.role,
      roleDisplayName: ROLE_DISPLAY_NAMES[session.role] ?? session.role,
    },
    permissions: {
      canViewCompanyWideDashboard: canViewCompanyWide,
      canViewFinanceDashboard: canViewFinance,
      canViewApprovalDashboard: canViewApprovals,
    },
    period,
    quickActions,
    kpis,
    actionItems,
    pendingApprovals: approvalItems,
    projectOverview,
    financeSummary,
    recentDocuments: recentDocuments.map((document) => ({
      id: document.id,
      title: document.displayName || document.originalName,
      projectName: document.project.name,
      extension: document.extension,
      uploadedBy: document.uploadedBy.name,
      createdAt: document.createdAt,
      href: `/documents/${document.projectId}`,
    })),
    recentSiteReports: recentSiteReports.map((report) => ({
      id: report.id,
      title: report.title || report.reportNo,
      projectName: report.project.name,
      reporterName: report.reporterName || report.createdBy.name,
      status: statusLabel(report.status),
      type: report.type,
      reportDate: report.reportDate,
      hasIssue: hasReportIssue(report),
      href: `/reports?projectId=${report.projectId}`,
    })),
    activityTimeline,
  };
}

async function getFinanceSummary(accessibleProjectIds: string[] | null): Promise<DashboardFinanceSummary> {
  const contractWhere: Prisma.ContractWhereInput = { deletedAt: null, ...projectIdScope(accessibleProjectIds) };
  const paymentWhere: Prisma.PaymentRequestWhereInput = { deletedAt: null, ...projectIdScope(accessibleProjectIds) };
  const [contractSum, activeContracts, pendingPaymentSum, pendingPaymentCount, recentPayments] = await Promise.all([
    prisma.contract.aggregate({ where: contractWhere, _sum: { value: true } }),
    prisma.contract.count({ where: { ...contractWhere, status: "ACTIVE" } }),
    prisma.paymentRequest.aggregate({ where: { ...paymentWhere, status: { in: ["SUBMITTED", "APPROVED"] } }, _sum: { totalAmount: true } }),
    prisma.paymentRequest.count({ where: { ...paymentWhere, status: { in: ["SUBMITTED", "APPROVED"] } } }),
    prisma.paymentRequest.findMany({
      where: paymentWhere,
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { project: { select: { name: true } } },
    }),
  ]);

  return {
    totalContractValue: Number(contractSum._sum.value ?? 0),
    activeContracts,
    pendingPaymentAmount: Number(pendingPaymentSum._sum.totalAmount ?? 0),
    pendingPaymentCount,
    recentPayments: recentPayments.map((payment) => ({
      id: payment.id,
      title: payment.title,
      projectName: payment.project.name,
      status: payment.status,
      amount: Number(payment.totalAmount),
      createdAt: payment.createdAt,
      href: "/accounting",
    })),
  };
}

function getAuditTitle(action: string, entityType: string) {
  const normalized = action.replaceAll("_", " ").toLowerCase();
  if (action.includes("APPROVED")) return `Đã duyệt ${entityType}`;
  if (action.includes("REJECTED")) return `Từ chối ${entityType}`;
  if (action.includes("CREATED") || action.includes("CREATE")) return `Tạo mới ${entityType}`;
  if (action.includes("UPDATED") || action.includes("UPDATE")) return `Cập nhật ${entityType}`;
  if (action.includes("DELETED") || action.includes("DELETE")) return `Xóa ${entityType}`;
  return `${entityType}: ${normalized}`;
}

function getAuditTone(action: string): DashboardActivityItem["tone"] {
  if (action.includes("APPROVED")) return "emerald";
  if (action.includes("REJECTED") || action.includes("DELETE")) return "rose";
  if (action.includes("PAYMENT") || action.includes("CONTRACT")) return "amber";
  if (action.includes("DOCUMENT")) return "blue";
  return "slate";
}
