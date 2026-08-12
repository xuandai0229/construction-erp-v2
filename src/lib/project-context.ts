import { cache } from 'react';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { getProjectAccessScope, projectScopeAllows, projectScopeWhere } from '@/lib/rbac';
import type { SessionUser } from '@/lib/auth';
import { getProjectStatusMeta, isPreparationProjectStatus } from '@/lib/project-status';
import {
  buildApprovalNotificationTarget,
  buildReportNotificationTarget,
  type NotificationTargetType,
} from '@/lib/notifications/notification-routing';
import { measureServerPhase } from '@/lib/performance/server';

export type GlobalProjectContext = {
  selectedProjectId: string | null;
  accessibleProjects: {
    id: string;
    code: string;
    name: string;
    displayName: string | null;
    status: string;
    investor: string | null;
    location: string | null;
    commanderName: string | null;
    executionUnit: string | null;
    durationLabel: string;
  }[];
  overviewData: {
    health: "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED" | "NO_DATA";
    warning: string;
  } | null;
  notifications: {
    id: string;
    type: string;
    severity: string;
    title: string;
    message: string | null;
    projectName: string | null;
    projectId: string | null;
    createdAt: Date;
    href: string | null;
    actionUrl: string | null;
    targetType: NotificationTargetType;
    targetId: string | null;
    isRead: boolean;
  }[];
};

export const getGlobalProjectContext = cache(async (
  session: SessionUser,
  searchParamsProjectId?: string
): Promise<GlobalProjectContext> => {
  return measureServerPhase('global-project-context', () =>
    getGlobalProjectContextImpl(session, searchParamsProjectId),
  );
});

async function getGlobalProjectContextImpl(
  session: SessionUser,
  searchParamsProjectId?: string
): Promise<GlobalProjectContext> {
  const accessScope = await measureServerPhase('global-project-context.access-scope', () => getProjectAccessScope(session));
  const cookieStore = await cookies();
  const cookieProjectId = cookieStore.get('selectedProjectId')?.value;

  // 1. Resolve projectId: URL > Cookie > All
  let rawProjectId = searchParamsProjectId || cookieProjectId || null;
  if (rawProjectId === 'all') rawProjectId = null;

  // 2. Validate RBAC
  let selectedProjectId: string | null = null;
  if (rawProjectId) {
    if (projectScopeAllows(accessScope, rawProjectId)) {
      selectedProjectId = rawProjectId;
    }
  }

  // 3. Fetch data concurrently
  const allAccessibleProjectWhere = { deletedAt: null, ...projectScopeWhere(accessScope) };
  const projectIdForOverview = selectedProjectId;

  const [accessibleProjectsRaw, overviewProjectRaw, pendingApprovals, rawIssueReports] = await Promise.all([
    measureServerPhase('global-project-context.accessible-projects', () => prisma.project.findMany({
      where: allAccessibleProjectWhere,
      select: { 
        id: true, 
        code: true, 
        name: true, 
        displayName: true, 
        status: true, 
        investor: true, 
        location: true, 
        sourceMetadata: true, 
        plannedDurationValue: true, 
        plannedDurationUnit: true,
        members: {
          where: { role: "CHIEF_COMMANDER", isActive: true, deletedAt: null },
          select: { user: { select: { name: true } } },
          take: 1
        }
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    })),
    projectIdForOverview
      ? measureServerPhase('global-project-context.selected-project-overview', () => prisma.project.findUnique({
          where: { id: projectIdForOverview },
          select: {
            status: true,
            endDate: true,
            fieldProgressTemplates: { where: { deletedAt: null }, select: { id: true }, take: 1 },
            _count: {
              select: {
                fieldProgressEntries: {
                  where: {
                    deletedAt: null,
                    entryDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
                  }
                },
              },
            },
          }
        }))
      : Promise.resolve(null),
    measureServerPhase('global-project-context.pending-approvals', () => prisma.approvalRequest.findMany({
      where: {
        deletedAt: null,
        status: "PENDING",
        ...(selectedProjectId ? { projectId: selectedProjectId } : { project: projectScopeWhere(accessScope) })
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      take: 5,
      include: { project: { select: { name: true } } },
    })),
    measureServerPhase('global-project-context.issue-reports', () => prisma.siteReport.findMany({
      where: {
        deletedAt: null,
        ...(selectedProjectId ? { projectId: selectedProjectId } : { project: projectScopeWhere(accessScope) }),
        OR: [
          { status: { in: ["SUBMITTED", "REVISION_REQUESTED"] } },
          { issues: { not: null } },
        ],
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: { project: { select: { name: true } } },
    })),
  ]);

  const accessibleProjects = accessibleProjectsRaw.map((project) => ({
    id: project.id,
    code: project.code,
    name: project.name,
    displayName: project.displayName,
    status: project.status,
    investor: project.investor,
    location: project.location,
    commanderName: project.members[0]?.user?.name || null,
    executionUnit: typeof project.sourceMetadata === "object" && project.sourceMetadata && "unit" in project.sourceMetadata ? String((project.sourceMetadata as { unit?: unknown }).unit ?? "") : null,
    durationLabel: project.plannedDurationValue && project.plannedDurationUnit ? `${project.plannedDurationValue} ${project.plannedDurationUnit === "MONTH" ? "tháng" : "ngày"}` : "Chưa cập nhật"
  }));

  // 4. Compute overview data for topbar
  let overviewData = null;
  if (overviewProjectRaw) {
    const project = overviewProjectRaw;
    const noWbs = project.fieldProgressTemplates.length === 0;
    const noRecentEntry = project._count.fieldProgressEntries === 0;
    const end = project.endDate ? new Date(project.endDate).setUTCHours(0, 0, 0, 0) : null;
    const today = new Date().setUTCHours(0, 0, 0, 0);
    const daysRemaining = end ? Math.ceil((end - today) / 86400000) : null;

    let health: "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED" | "NO_DATA" = "ON_TRACK";
    const warning = getProjectStatusMeta(project.status).label || "Chưa có trạng thái";

    if (project.status === "COMPLETED") {
      health = "COMPLETED";
    } else if (isPreparationProjectStatus(project.status)) {
      health = "NO_DATA";
    } else if (noWbs) {
      health = "NO_DATA";
    } else if (daysRemaining !== null && daysRemaining < 0) {
      health = "DELAYED";
    } else if (noRecentEntry) {
      health = "AT_RISK";
    } else if (daysRemaining !== null && daysRemaining <= 14) {
      health = "AT_RISK";
    }

    overviewData = { health, warning };
  } else if (projectIdForOverview) {
    selectedProjectId = null;
  }

  // 5. Compute global notifications
  const notifications: GlobalProjectContext['notifications'] = [];

  pendingApprovals.forEach(app => {
    const notificationId = `app-${app.id}`;
    const target = buildApprovalNotificationTarget({
      approvalId: app.id,
      projectId: app.projectId,
      approvalType: app.type,
      sourceType: app.sourceType,
      sourceId: app.sourceId,
      notificationId,
    });
    notifications.push({
      id: notificationId,
      type: 'APPROVAL',
      severity: app.priority === 'HIGH' || app.priority === 'URGENT' ? 'HIGH' : 'MEDIUM',
      title: app.title,
      message: 'Hồ sơ chờ phê duyệt',
      projectName: app.project.name,
      projectId: app.projectId,
      createdAt: app.createdAt,
      href: target.actionUrl,
      actionUrl: target.actionUrl,
      targetType: target.targetType,
      targetId: target.targetId,
      isRead: false
    });
  });

  const issueReports = rawIssueReports.filter(r => {
    if (r.status === "SUBMITTED" || r.status === "REVISION_REQUESTED") return true;

    if (!r.issues) return false;
    const cleanIssues = r.issues.trim().toLowerCase();

    const ignoredValues = ["", "không có", "khong co", "không có vấn đề", "không có vấn đề gì", "none", "n/a", "na"];
    if (ignoredValues.includes(cleanIssues)) return false;
    if (cleanIssues.startsWith("không có") || cleanIssues.startsWith("khong co")) return false;

    return true;
  }).slice(0, 3);

  issueReports.forEach(r => {
    const isPending = r.status === "SUBMITTED";
    const reportDateStr = new Date(r.reportDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    const notificationId = `rep-${r.id}`;
    const target = buildReportNotificationTarget({
      reportId: r.id,
      projectId: r.projectId,
      status: isPending ? "PENDING" : "ISSUE",
      notificationId,
    });
    notifications.push({
      id: notificationId,
      type: 'REPORT',
      severity: 'HIGH',
      title: isPending ? `Báo cáo ngày ${reportDateStr} chờ duyệt` : `Báo cáo ngày ${reportDateStr} có vấn đề`,
      message: r.summary ? `Nội dung: ${r.summary}` : 'Báo cáo Chỉ huy trưởng cần chú ý',
      projectName: r.project.name,
      projectId: r.projectId,
      createdAt: r.updatedAt,
      href: target.actionUrl,
      actionUrl: target.actionUrl,
      targetType: target.targetType,
      targetId: target.targetId,
      isRead: false
    });
  });

  // Deduplicate and sort by date
  const uniqueNotificationsMap = new Map<string, typeof notifications[0]>();
  for (const notification of notifications) {
    const dedupeKey = notification.targetType && notification.targetId
      ? `${notification.targetType}_${notification.targetId}`
      : notification.id;

    if (!uniqueNotificationsMap.has(dedupeKey)) {
      uniqueNotificationsMap.set(dedupeKey, notification);
    } else {
      const existing = uniqueNotificationsMap.get(dedupeKey)!;
      if (notification.severity === 'HIGH' && existing.severity !== 'HIGH') {
        uniqueNotificationsMap.set(dedupeKey, notification);
      } else if (notification.severity === existing.severity) {
        if (notification.createdAt.getTime() > existing.createdAt.getTime()) {
          uniqueNotificationsMap.set(dedupeKey, notification);
        }
      }
    }
  }

  const uniqueNotifications = Array.from(uniqueNotificationsMap.values());
  uniqueNotifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const visibleNotifications = uniqueNotifications.slice(0, 5);
  const readRows = visibleNotifications.length > 0
    ? await measureServerPhase('global-project-context.notification-read-state', () => prisma.notification.findMany({
      where: {
        userId: session.id,
        id: { in: visibleNotifications.map((notification) => `${session.id}:${notification.id}`) },
        isRead: true,
      },
      select: { id: true },
    }))
    : [];
  const readIds = new Set(readRows.map((notification) => notification.id.replace(`${session.id}:`, "")));

  return {
    selectedProjectId,
    accessibleProjects,
    overviewData,
    notifications: visibleNotifications.map((notification) => ({
      ...notification,
      isRead: readIds.has(notification.id),
    }))
  };
}
