import type { Prisma, ProjectStatus, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ROLE_DISPLAY_NAMES, getAccessibleProjectIds } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";
import { addWorkDays, formatWorkDate, getWorkDateRange, parseWorkDate, todayWorkDate } from "@/lib/date/work-date";
import { groupEntriesByItemAndDate } from "@/lib/field-progress";
import { buildFieldProgressRollupTree } from "@/lib/field-progress/rollup";
import { isPreparationProjectStatus } from "@/lib/project-status";
import {
  canViewApprovalDashboard,
  canViewCompanyWideDashboard,
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
  updatedAt: Date;
  startDate: Date | null;
  endDate: Date | null;
  daysRemaining: number | null;
  health: "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED" | "NO_DATA";
  warning: string;
};

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

export type DashboardNotification = {
  id: string;
  type: string;
  severity: "HIGH" | "MEDIUM" | "LOW" | "INFO";
  title: string;
  message: string | null;
  href: string | null;
  createdAt: Date;
  isRead: boolean;
  projectName: string | null;
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
  recentDocuments: DashboardDocumentItem[];
  recentSiteReports: DashboardSiteReportItem[];
  activityTimeline: DashboardActivityItem[];
  selectedProjectId: string | null;
  accessibleProjects: { id: string; code: string; name: string; status: string }[];
  notifications: DashboardNotification[];
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
  if (isPreparationProjectStatus(project.status)) return { health: "NO_DATA", warning: "Công tác chuẩn bị" };
  if (project.itemCount === 0) return { health: "NO_DATA", warning: "Chưa thiết lập WBS" };
  if (project.daysRemaining !== null && project.daysRemaining < 0) return { health: "DELAYED", warning: "Trễ tiến độ" };
  if (project.recentEntryCount === 0) return { health: "AT_RISK", warning: "Chưa có nhập liệu gần đây" };
  
  const prog = project.progressPercent ?? 0;
  if (project.daysRemaining !== null && project.daysRemaining > 0) {
    if (prog < 30) return { health: "DELAYED", warning: "Rủi ro chậm tiến độ" };
    if (prog < 50) return { health: "AT_RISK", warning: "Cần chú ý" };
  }
  
  if (project.daysRemaining !== null && project.daysRemaining <= 14 && prog < 90) {
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

export async function getDashboardData(session: SessionUser, rawPeriod?: string, rawProjectId?: string): Promise<DashboardData> {
  const period = getPeriodRange(normalizePeriod(rawPeriod));
  
  // Base access
  let accessibleProjectIds = await getAccessibleProjectIds(session);
  const scope = getDashboardProjectScope(accessibleProjectIds);

  // Fetch light list of all accessible projects for the switcher
  const allAccessibleProjectWhere: Prisma.ProjectWhereInput = accessibleProjectIds === null 
    ? { deletedAt: null } 
    : { deletedAt: null, id: { in: accessibleProjectIds } };
    
  const allAccessibleProjectsList = await prisma.project.findMany({
    where: allAccessibleProjectWhere,
    select: { id: true, code: true, name: true, status: true },
    orderBy: { updatedAt: "desc" },
    take: 50, // Limit to recent 50 to avoid massive payloads
  });

  // Apply project filter if requested
  let selectedProjectId: string | null = null;
  if (rawProjectId && rawProjectId !== 'all') {
    if (accessibleProjectIds !== null && !accessibleProjectIds.includes(rawProjectId)) {
      accessibleProjectIds = []; // User doesn't have access to this project
    } else {
      accessibleProjectIds = [rawProjectId]; // Restrict scope to this project
      selectedProjectId = rawProjectId;
    }
  }

  const projectWhere = getProjectWhere(accessibleProjectIds);
  const today = todayWorkDate();
  const todayRange = getWorkDateRange(today);
  const lastSevenStart = getWorkDateRange(formatWorkDate(addWorkDays(parseWorkDate(today), -6))).start;
  const canViewApprovals = canViewApprovalDashboard(session.role);
  const canViewCompanyWide = canViewCompanyWideDashboard(session.role);
  const activeProjectWhere: Prisma.ProjectWhereInput = { ...projectWhere, status: "ACTIVE" };
  const visibleProjectWhere: Prisma.ProjectWhereInput = {
    ...projectWhere,
    status: { in: ["PLANNING", "ACTIVE", "ON_HOLD", "COMPLETED"] },
  };

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
      where: visibleProjectWhere,
      select: {
        id: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.project.findMany({
      where: visibleProjectWhere,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        startDate: true,
        endDate: true,
        updatedAt: true,
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
      where: {
        ...(scope.allProjects ? {} : { projectId: { in: scope.projectIds ?? [] } }),
        entityType: { 
          in: [
            "FieldProgressEntry", "FIELD_PROGRESS_ENTRY",
            "Document", "DOCUMENT",
            "SiteReport", "SITE_REPORT",
            "ApprovalRequest", "APPROVAL_REQUEST",
            "MaterialRequest", "MATERIAL_REQUEST",
            "FieldMaterialRequest", "FIELD_MATERIAL_REQUEST"
          ] 
        },
        action: { notIn: ["RESET_PASSWORD", "LOGIN", "LOGOUT", "UPDATE_PASSWORD"] },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const pendingApprovals = await (
    canViewApprovals
      ? prisma.approvalRequest.findMany({
          where: { deletedAt: null, status: "PENDING", ...projectIdScope(accessibleProjectIds) },
          orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
          take: 5,
          include: { project: { select: { name: true } }, requester: { select: { name: true } } },
        })
      : Promise.resolve([])
  );

  const todayStart = todayRange.start;
  const attentionProjects = activeProjectsForAttention
    .map((project) => {
      const daysRemaining = getDaysRemaining(project.endDate, todayStart);
      if (isPreparationProjectStatus(project.status)) {
        return null;
      }
      const delayed = daysRemaining !== null && daysRemaining < 0;
      if (!delayed) return null;
      return {
        project,
        reason: "Trễ tiến độ",
        priority: "HIGH" as const,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const { calculatePlannedProgress } = await import("./progress-utils");

  const projectOverview = overviewProjects.map((project) => {
    const daysRemaining = getDaysRemaining(project.endDate, todayStart);
    
    const progressPercent = calculatePlannedProgress(project.startDate, project.endDate, todayStart);

    const health = getHealth({
      status: project.status,
      progressPercent: progressPercent,
      itemCount: 1,
      recentEntryCount: 1,
      daysRemaining,
    });
    
    return {
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status,
      progressPercent,
      itemCount: 0,
      updatedAt: project.updatedAt,
      startDate: project.startDate,
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

  const projectActions: DashboardActionItem[] = [];
  
  projectActions.push(...attentionProjects.slice(0, 5).map(({ project, reason, priority }) => ({
    id: `project-${project.id}-${reason}`,
    title: reason,
    projectName: project.name,
    type: "Tiến độ",
    priority,
    status: "Cần xử lý",
    createdAt: null,
    href: `/projects/${project.id}`,
  })));

  const reportActions: DashboardActionItem[] = issueReports
    .filter((report) => report.status === "SUBMITTED" || report.status === "REVISION_REQUESTED" || (hasReportIssue(report) && report.status !== "APPROVED"))
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

  const forbiddenStatuses = ["APPROVED", "COMPLETED", "DONE", "FINISHED", "RESOLVED", "Đã duyệt", "Hoàn thành"];
  
  // Do NOT include approvalItems in actionItems to separate them
  const actionItems = [...projectActions, ...reportActions, ...materialActions]
    .filter((item) => !forbiddenStatuses.includes(item.status) && !forbiddenStatuses.includes(item.status.toUpperCase()))
    .sort((a, b) => {
      const priorityScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      const priorityDiff = priorityScore[b.priority] - priorityScore[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0);
    })
    .slice(0, 5); // strict max 5 items

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
  })).slice(0, 4); // strict max 4 items

  const notifications: DashboardNotification[] = [];

  // 1. Pending Approvals
  approvalItems.forEach(item => {
    notifications.push({
      id: `notif-${item.id}`,
      type: 'APPROVAL',
      severity: item.priority === 'HIGH' ? 'HIGH' : 'MEDIUM',
      title: item.title,
      message: 'Hồ sơ chờ phê duyệt',
      href: item.href,
      createdAt: item.createdAt ?? new Date(),
      isRead: false,
      projectName: item.projectName,
    });
  });

  // 2. Delayed Projects (from attentionProjects)
  attentionProjects.filter(p => p.priority === 'HIGH').forEach(p => {
    notifications.push({
      id: `notif-delay-${p.project.id}`,
      type: 'PROJECT',
      severity: 'HIGH',
      title: `Cảnh báo: ${p.reason}`,
      message: 'Công trình đang có nguy cơ trễ tiến độ',
      href: `/projects/${p.project.id}/field-progress`,
      createdAt: new Date(), // Realtime status
      isRead: false,
      projectName: p.project.name,
    });
  });

  // 3. Reports with issues
  reportActions.filter(r => r.priority === 'HIGH').forEach(r => {
    notifications.push({
      id: `notif-${r.id}`,
      type: 'REPORT',
      severity: 'HIGH',
      title: r.title,
      message: 'Báo cáo hiện trường có ghi nhận vấn đề',
      href: r.href,
      createdAt: r.createdAt ?? new Date(),
      isRead: false,
      projectName: r.projectName,
    });
  });

  // Sort notifications by severity and date
  notifications.sort((a, b) => {
    const score = { HIGH: 3, MEDIUM: 2, LOW: 1, INFO: 0 };
    const diff = score[b.severity] - score[a.severity];
    if (diff !== 0) return diff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const activeProjectForAction = overviewProjects[0] ?? null;
  const quickActions = [
    activeProjectForAction ? { label: "Tạo báo cáo", href: `/reports?projectId=${activeProjectForAction.id}`, tone: "primary" as const } : null,
    activeProjectForAction ? { label: "Khối lượng thực hiện", href: `/projects/${activeProjectForAction.id}/field-progress/daily`, tone: "secondary" as const } : null,
    activeProjectForAction ? { label: "Tải tài liệu lên", href: `/documents/${activeProjectForAction.id}`, tone: "secondary" as const } : null,
    canViewApprovals ? { label: "Trung tâm phê duyệt", href: "/approvals", tone: "secondary" as const } : null,
  ].filter((action): action is NonNullable<typeof action> => Boolean(action));

  const atRiskCount = projectOverview.filter(p => p.health === "DELAYED").length;
  const warningCount = projectOverview.filter(p => p.health === "AT_RISK").length;

  const kpis: DashboardKpi[] = [
    {
      id: "projects",
      label: canViewCompanyWide ? "Tổng công trình" : "Công trình",
      value: String(activeProjects),
      description: `${activeProjects}/${allProjects} đang thi công`,
      tone: "blue",
      href: "/projects",
    },
    {
      id: "action-items",
      label: "Việc cần xử lý",
      value: String(actionItems.length),
      description: "Yêu cầu hành động ngay",
      tone: actionItems.length > 0 ? "rose" : "emerald",
    },
    {
      id: "entries-today",
      label: "Khối lượng thực hiện",
      value: String(entriesToday),
      description: "Hôm nay",
      tone: entriesToday > 0 ? "emerald" : "amber",
    },
    {
      id: "documents-reports",
      label: "Báo cáo / Tài liệu",
      value: String(periodReports + periodDocuments),
      description: `Trong ${period.label.toLowerCase()}`,
      tone: "violet",
    },
    {
      id: "attention",
      label: "Công trình rủi ro",
      value: String(atRiskCount + warningCount),
      description: atRiskCount > 0 ? `${atRiskCount} rủi ro, ${warningCount} cần chú ý` : "Không có rủi ro",
      tone: atRiskCount > 0 ? "rose" : (warningCount > 0 ? "amber" : "emerald"),
    },
  ];

  return {
    session: {
      id: session.id,
      name: session.name,
      role: session.role,
      roleDisplayName: ROLE_DISPLAY_NAMES[session.role] ?? session.role,
    },
    permissions: {
      canViewCompanyWideDashboard: canViewCompanyWide,
      canViewApprovalDashboard: canViewApprovals,
    },
    period,
    quickActions,
    kpis,
    actionItems,
    pendingApprovals: approvalItems,
    projectOverview,
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
      title: report.title && !report.title.includes("ngày 202") ? report.title : `Báo cáo ngày ${new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(report.reportDate)}`,
      projectName: report.project.name,
      reporterName: report.reporterName || report.createdBy.name,
      status: statusLabel(report.status),
      type: report.type,
      reportDate: report.reportDate,
      hasIssue: hasReportIssue(report),
      href: `/reports?projectId=${report.projectId}`,
    })),
    activityTimeline,
    selectedProjectId,
    accessibleProjects: allAccessibleProjectsList,
    notifications,
  };
}

function getAuditTitle(action: string, entityType: string) {
  let entityName = entityType;
  const t = entityType.toUpperCase();
  if (t === "FIELDPROGRESSENTRY" || t === "FIELD_PROGRESS_ENTRY") entityName = "tiến độ";
  else if (t === "DOCUMENT") entityName = "tài liệu";
  else if (t === "SITEREPORT" || t === "SITE_REPORT") entityName = "báo cáo";
  else if (t === "APPROVALREQUEST" || t === "APPROVAL_REQUEST") entityName = "hồ sơ";
  else if (t === "MATERIALREQUEST" || t === "MATERIAL_REQUEST" || t === "FIELDMATERIALREQUEST" || t === "FIELD_MATERIAL_REQUEST") entityName = "yêu cầu vật tư";
  else if (t === "PROJECT") entityName = "công trình";

  const act = action.toUpperCase();
  
  if (t === "DOCUMENT" && (act.includes("CREATED") || act.includes("UPLOAD"))) return `Tải tài liệu lên`;
  if (t === "SITEREPORT" && (act.includes("CREATED") || act.includes("CREATE"))) return `Tạo báo cáo`;

  if (act.includes("APPROVED")) return `Duyệt ${entityName}`;
  if (act.includes("REJECTED")) return `Từ chối ${entityName}`;
  if (act.includes("CREATED") || act.includes("CREATE")) return `Tạo ${entityName}`;
  if (act.includes("UPDATED") || act.includes("UPDATE")) return `Cập nhật ${entityName}`;
  if (act.includes("DELETED") || act.includes("DELETE")) return `Xóa ${entityName}`;
  if (act.includes("SUBMITTED") || act.includes("SUBMIT")) return `Gửi ${entityName}`;
  
  return `Cập nhật ${entityName}`;
}

function getAuditTone(action: string): DashboardActivityItem["tone"] {
  if (action.includes("APPROVED")) return "emerald";
  if (action.includes("REJECTED") || action.includes("DELETE")) return "rose";
  if (action.includes("DOCUMENT")) return "blue";
  return "slate";
}
