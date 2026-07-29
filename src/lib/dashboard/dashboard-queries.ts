import type { Prisma, ProjectStatus, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";
import { ROLE_DISPLAY_NAMES, getProjectAccessScope, projectScopeAllows, projectScopeWhere, type ProjectAccessScope } from "@/lib/rbac";
import type { SessionUser } from "@/lib/auth";
import { addWorkDays, formatWorkDate, getWorkDateRange, parseWorkDate, todayWorkDate } from "@/lib/date/work-date";
import { isPreparationProjectStatus } from "@/lib/project-status";
import { assertCanAccessExecutiveDashboard } from "@/lib/roles/role-workspace-policy";
import {
  canViewApprovalDashboard,
  canViewCompanyWideDashboard,
} from "./dashboard-permissions";

import { resolveExecutiveDashboardScope } from "./dashboard-scope";
import { getExecutiveActionItems } from "./executive-action-service";
import {
  calculateProjectActualProgress,
  deriveCompletenessCategory,
  type ActualProgressDataStatus,
  type CompletenessCategory,
  type ProjectProgressWarning,
} from "./project-progress-aggregate";
import { calculatePlannedProgress, getProgressHealth } from "./progress-utils";

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
  projectId: string | null;
  title: string;
  projectName: string;
  type: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: string;
  createdAt: Date | null;
  href: string;
  reason: string | null;
  targetType: string | null;
  targetId: string | null;
};

export type DashboardProjectOverview = {
  id: string;
  code: string;
  name: string;
  status: ProjectStatus;
  plannedProgressPercent: number | null;
  actualProgressPercent: number | null;
  variancePercent: number | null;
  actualProgressDataStatus: ActualProgressDataStatus | "MULTIPLE_ACTIVE_TEMPLATES";
  completenessCategory: CompletenessCategory;
  approvedActualQuantity: number | null;
  totalDesignQuantity: number | null;
  lastActualProgressAt: Date | null;
  actualProgressWarnings: ProjectProgressWarning[];
  workItemCount: number;
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
  totalActionCount: number;
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

function getProjectWhere(scope: ProjectAccessScope): Prisma.ProjectWhereInput {
  return { deletedAt: null, ...projectScopeWhere(scope) };
}

function projectIdScope(scope: ProjectAccessScope) {
  return scope.kind === "ALL_PROJECTS"
    ? {}
    : { projectId: { in: scope.kind === "PROJECT_IDS" ? scope.projectIds : [] } };
}

function projectRelationScope(scope: ProjectAccessScope) {
  return { project: { deletedAt: null, ...projectScopeWhere(scope) } };
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

export async function getDashboardData(session: SessionUser, rawPeriod?: string, rawProjectId?: string): Promise<DashboardData> {
  assertCanAccessExecutiveDashboard(session.role);
  const period = getPeriodRange(normalizePeriod(rawPeriod));
  
  // Base access
  let accessScope = await getProjectAccessScope(session);

  // Fetch light list of all accessible projects for the switcher
  const allAccessibleProjectWhere: Prisma.ProjectWhereInput = getProjectWhere(accessScope);
    
  const allAccessibleProjectsList = await prisma.project.findMany({
    where: allAccessibleProjectWhere,
    select: { id: true, code: true, name: true, status: true },
    orderBy: { updatedAt: "desc" },
    take: 50, // Limit to recent 50 to avoid massive payloads
  });

  // Apply project filter if requested
  let selectedProjectId: string | null = null;
  if (rawProjectId && rawProjectId !== 'all') {
    if (!projectScopeAllows(accessScope, rawProjectId)) {
      accessScope = { kind: "NO_PROJECTS" };
    } else {
      accessScope = { kind: "PROJECT_IDS", projectIds: [rawProjectId] };
      selectedProjectId = rawProjectId;
    }
  }

  const projectWhere = getProjectWhere(accessScope);
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
      where: { deletedAt: null, reportDate: { gte: period.start, lt: period.end }, ...projectIdScope(accessScope) },
    }),
    prisma.document.count({
      where: { deletedAt: null, createdAt: { gte: period.start, lt: period.end }, ...projectRelationScope(accessScope) },
    }),
    prisma.fieldProgressEntry.count({
      where: { deletedAt: null, entryDate: { gte: todayRange.start, lt: todayRange.end }, ...projectIdScope(accessScope) },
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
      where: { deletedAt: null, ...projectRelationScope(accessScope) },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { project: { select: { id: true, name: true } }, uploadedBy: { select: { name: true } } },
    }),
    prisma.siteReport.findMany({
      where: { deletedAt: null, ...projectIdScope(accessScope) },
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
        ...projectIdScope(accessScope),
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
      where: { deletedAt: null, status: { in: ["REQUESTED", "SUBMITTED"] }, ...projectIdScope(accessScope) },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { project: { select: { name: true } } },
    }),
    prisma.fieldMaterialRequest.findMany({
      where: { deletedAt: null, status: "SUBMITTED", ...projectIdScope(accessScope) },
      orderBy: { createdAt: "desc" },
      take: 4,
      include: { project: { select: { name: true } } },
    }),
    prisma.auditLog.findMany({
      where: {
        ...projectIdScope(accessScope),
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
          where: { deletedAt: null, status: "PENDING", ...projectIdScope(accessScope) },
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

  const overviewProjectIds = overviewProjects.map((project) => project.id);
  const [progressTemplates, progressItems, progressEntries] = await Promise.all([
    prisma.fieldProgressTemplate.findMany({
      where: { projectId: { in: overviewProjectIds }, deletedAt: null },
      select: { id: true, projectId: true },
    }),
    prisma.fieldProgressItem.findMany({
      where: {
        projectId: { in: overviewProjectIds },
        deletedAt: null,
        itemType: "WORK",
        template: { deletedAt: null },
      },
      select: { id: true, projectId: true, itemType: true, designQuantity: true, deletedAt: true },
    }),
    prisma.fieldProgressEntry.findMany({
      where: {
        projectId: { in: overviewProjectIds },
        deletedAt: null,
        status: "APPROVED",
        entryDate: { lt: todayRange.end },
        template: { deletedAt: null },
      },
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
  ]);

  const templateCountByProjectId = new Map<string, number>();
  for (const template of progressTemplates) {
    templateCountByProjectId.set(template.projectId, (templateCountByProjectId.get(template.projectId) ?? 0) + 1);
  }
  const progressItemsByProjectId = new Map<string, typeof progressItems>();
  for (const item of progressItems) {
    const current = progressItemsByProjectId.get(item.projectId) ?? [];
    current.push(item);
    progressItemsByProjectId.set(item.projectId, current);
  }
  const progressEntriesByProjectId = new Map<string, typeof progressEntries>();
  for (const entry of progressEntries) {
    const current = progressEntriesByProjectId.get(entry.projectId) ?? [];
    current.push(entry);
    progressEntriesByProjectId.set(entry.projectId, current);
  }

  const projectOverview: DashboardProjectOverview[] = overviewProjects.map((project) => {
    const daysRemaining = getDaysRemaining(project.endDate, todayStart);
    const plannedProgressPercent = calculatePlannedProgress(project.startDate, project.endDate, todayStart);
    const aggregate = calculateProjectActualProgress({
      projectId: project.id,
      asOf: new Date(todayRange.end.getTime() - 1),
      items: progressItemsByProjectId.get(project.id) ?? [],
      entries: progressEntriesByProjectId.get(project.id) ?? [],
    });
    const hasMultipleActiveTemplates = (templateCountByProjectId.get(project.id) ?? 0) > 1;
    const actualProgressPercent = hasMultipleActiveTemplates ? null : aggregate.actualProgressPercent;
    const actualProgressDataStatus = hasMultipleActiveTemplates
      ? "MULTIPLE_ACTIVE_TEMPLATES" as const
      : aggregate.actualProgressDataStatus;
    const actualProgressWarnings = hasMultipleActiveTemplates
      ? [...aggregate.warnings, "MULTIPLE_ACTIVE_TEMPLATES" as const]
      : aggregate.warnings;
    const completenessCategory = deriveCompletenessCategory(plannedProgressPercent, actualProgressPercent);
    const variancePercent = actualProgressPercent !== null && plannedProgressPercent !== null
      ? actualProgressPercent - plannedProgressPercent
      : null;
    const calculatedHealth = getProgressHealth(actualProgressPercent, plannedProgressPercent);
    const health = project.status === "COMPLETED" && completenessCategory === "COMPLETE"
      ? "COMPLETED"
      : calculatedHealth;
    const warning = actualProgressDataStatus === "MULTIPLE_ACTIVE_TEMPLATES"
      ? "Có nhiều bảng khối lượng đang hoạt động"
      : actualProgressDataStatus !== "AVAILABLE"
        ? "Chưa đủ dữ liệu thực tế"
        : plannedProgressPercent === null
          ? "Chưa có kế hoạch"
          : health === "DELAYED"
            ? "Trễ tiến độ"
            : health === "AT_RISK"
              ? "Có nguy cơ chậm tiến độ"
              : project.status === "COMPLETED"
                ? "Hoàn thành"
                : "Đang ổn";

    return {
      id: project.id,
      code: project.code,
      name: project.name,
      status: project.status,
      plannedProgressPercent,
      actualProgressPercent,
      variancePercent,
      actualProgressDataStatus,
      completenessCategory,
      approvedActualQuantity: hasMultipleActiveTemplates ? null : aggregate.approvedActualQuantity,
      totalDesignQuantity: hasMultipleActiveTemplates ? null : aggregate.totalDesignQuantity,
      lastActualProgressAt: hasMultipleActiveTemplates ? null : aggregate.lastActualProgressAt,
      actualProgressWarnings,
      workItemCount: aggregate.eligibleWorkItemCount,
      updatedAt: project.updatedAt,
      startDate: project.startDate,
      endDate: project.endDate,
      daysRemaining,
      health,
      warning,
    };
  });

  const approvalItems: DashboardActionItem[] = pendingApprovals.map((approval) => ({
    id: `approval-${approval.id}`,
    projectId: approval.projectId,
    title: approval.title,
    projectName: approval.project.name,
    type: "Phê duyệt",
    priority: approval.priority === "URGENT" || approval.priority === "HIGH" ? "HIGH" : "MEDIUM",
    status: statusLabel(approval.status),
    createdAt: approval.createdAt,
    href: "/approvals",
    reason: "Hồ sơ đang chờ phê duyệt.",
    targetType: "APPROVAL",
    targetId: approval.id,
  }));

  const projectActions: DashboardActionItem[] = [];
  
  projectActions.push(...attentionProjects.slice(0, 5).map(({ project, reason, priority }) => ({
    id: `project-${project.id}-${reason}`,
    projectId: project.id,
    title: reason,
    projectName: project.name,
    type: "Tiến độ",
    priority,
    status: "Cần xử lý",
    createdAt: null,
    href: `/projects/${project.id}`,
    reason,
    targetType: "PROJECT",
    targetId: project.id,
  })));

  const executiveScope = await resolveExecutiveDashboardScope(session, rawProjectId);
  const actionResult = await getExecutiveActionItems(executiveScope, 5);

  const actionItems: DashboardActionItem[] = actionResult.allItems.map((item) => ({
    id: item.id,
    projectId: item.projectId,
    title: item.title,
    projectName: item.projectName,
    type: item.typeLabel,
    priority: item.priority,
    status: item.status,
    createdAt: null,
    href: item.targetType === "PROJECT"
      ? `/projects/${item.projectId}`
      : item.targetType === "SITE_REPORT"
        ? `/reports?projectId=${item.projectId}`
        : item.targetType === "MATERIAL_REQUEST"
          ? `/projects/${item.projectId}/material-requests`
          : item.targetType === "WORK_TASK"
            ? `/tasks?projectId=${item.projectId}`
            : `/projects/${item.projectId}`,
    reason: item.reason,
    targetType: item.targetType,
    targetId: item.targetId,
  }));

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
  const reportActions: DashboardActionItem[] = issueReports
    .filter((report) => report.status === "SUBMITTED" || report.status === "REVISION_REQUESTED" || (hasReportIssue(report) && report.status !== "APPROVED"))
    .slice(0, 3)
    .map((report) => ({
      id: `report-${report.id}`,
      projectId: report.projectId,
      title: report.status === "SUBMITTED" ? "Báo cáo chờ duyệt" : "Báo cáo có vấn đề",
      projectName: report.project.name,
      type: "Báo cáo",
      priority: hasReportIssue(report) ? "HIGH" as const : "MEDIUM" as const,
      status: statusLabel(report.status),
      createdAt: report.updatedAt,
      href: `/reports?projectId=${report.projectId}`,
      reason: report.issues,
      targetType: "SITE_REPORT",
      targetId: report.id,
    }));

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
  const quickActions = (session.role === "CONSTRUCTION_SUPERVISOR" ? [] : [
    activeProjectForAction ? { label: "Tạo báo cáo", href: `/reports?projectId=${activeProjectForAction.id}`, tone: "primary" as const } : null,
    activeProjectForAction ? { label: "Khối lượng thực hiện", href: `/projects/${activeProjectForAction.id}/field-progress/daily`, tone: "secondary" as const } : null,
    activeProjectForAction ? { label: "Tải tài liệu lên", href: `/documents/${activeProjectForAction.id}`, tone: "secondary" as const } : null,
    canViewApprovals ? { label: "Trung tâm phê duyệt", href: "/approvals", tone: "secondary" as const } : null,
  ]).filter((action): action is NonNullable<typeof action> => Boolean(action));

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
      value: String(actionResult.total),
      description: "Yêu cầu hành động ngay",
      tone: actionResult.total > 0 ? "rose" : "emerald",
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
    totalActionCount: actionResult.total,
    pendingApprovals: approvalItems,
    projectOverview,
    recentDocuments: recentDocuments.map((doc) => ({
      id: doc.id,
      title: doc.displayName || doc.originalName,
      projectName: doc.project.name,
      extension: doc.extension,
      uploadedBy: doc.uploadedBy.name,
      createdAt: doc.createdAt,
      href: `/documents/${doc.projectId}`,
    })),
    recentSiteReports: recentSiteReports.map((report) => ({
      id: report.id,
      title: report.title || `Báo cáo ngày ${new Date(report.reportDate).toLocaleDateString("vi-VN")}`,
      projectName: report.project.name,
      reporterName: report.createdBy.name,
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
