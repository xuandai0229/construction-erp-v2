import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { getAccessibleProjectIds } from '@/lib/rbac';
import type { SessionUser } from '@/lib/auth';
import { getProjectStatusMeta, isPreparationProjectStatus } from '@/lib/project-status';
import {
  buildApprovalNotificationTarget,
  buildReportNotificationTarget,
  type NotificationTargetType,
} from '@/lib/notifications/notification-routing';

export type GlobalProjectContext = {
  selectedProjectId: string | null;
  accessibleProjects: {
    id: string;
    code: string;
    name: string;
    status: string;
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

export async function getGlobalProjectContext(
  session: SessionUser,
  searchParamsProjectId?: string
): Promise<GlobalProjectContext> {
  const accessibleProjectIds = await getAccessibleProjectIds(session);
  const cookieStore = await cookies();
  const cookieProjectId = cookieStore.get('selectedProjectId')?.value;

  // 1. Resolve projectId: URL > Cookie > All
  let rawProjectId = searchParamsProjectId || cookieProjectId || null;
  if (rawProjectId === 'all') rawProjectId = null;

  // 2. Validate RBAC
  let selectedProjectId: string | null = null;
  if (rawProjectId) {
    if (accessibleProjectIds === null || accessibleProjectIds.includes(rawProjectId)) {
      selectedProjectId = rawProjectId;
    }
  }

  // 3. Fetch light list of all accessible projects
  const allAccessibleProjectWhere = accessibleProjectIds === null
    ? { deletedAt: null }
    : { deletedAt: null, id: { in: accessibleProjectIds } };

  const accessibleProjects = await prisma.project.findMany({
    where: allAccessibleProjectWhere,
    select: { id: true, code: true, name: true, status: true },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });

  // 4. Fetch overview data for the selected project (for the topbar badge)
  let overviewData = null;
  if (selectedProjectId) {
    const project = await prisma.project.findUnique({
      where: { id: selectedProjectId },
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
    });

    if (project) {
      // Simplified health check for the global topbar
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
    } else {
      // If project was not found, invalid
      selectedProjectId = null;
    }
  }

  // 5. Compute global notifications (Phase A - computed from data)
  const notifications: GlobalProjectContext['notifications'] = [];

  // Pending Approvals
  const pendingApprovals = await prisma.approvalRequest.findMany({
    where: {
      deletedAt: null,
      status: "PENDING",
      ...(selectedProjectId ? { projectId: selectedProjectId } : (accessibleProjectIds === null ? {} : { projectId: { in: accessibleProjectIds } }))
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    take: 5,
    include: { project: { select: { name: true } } },
  });

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

  // Issue Reports
  const rawIssueReports = await prisma.siteReport.findMany({
    where: {
      deletedAt: null,
      ...(selectedProjectId ? { projectId: selectedProjectId } : (accessibleProjectIds === null ? {} : { projectId: { in: accessibleProjectIds } })),
      OR: [
        { status: { in: ["SUBMITTED", "REVISION_REQUESTED"] } },
        { issues: { not: null } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 20, // Fetch a bit more to account for JS filtering
    include: { project: { select: { name: true } } },
  });

  const issueReports = rawIssueReports.filter(r => {
    if (r.status === "SUBMITTED" || r.status === "REVISION_REQUESTED") return true;

    if (!r.issues) return false;
    const cleanIssues = r.issues.trim().toLowerCase();

    const ignoredValues = ["", "không có", "khong co", "không có vấn đề", "không có vấn đề gì", "none", "n/a", "na"];
    if (ignoredValues.includes(cleanIssues)) return false;
    if (cleanIssues.startsWith("không có") || cleanIssues.startsWith("khong co")) return false;

    return true;
  }).slice(0, 3); // Apply limit after filtering

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
      message: r.summary ? `Nội dung: ${r.summary}` : 'Báo cáo hiện trường cần chú ý',
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
      // If same key exists, keep the one with higher severity or newer date
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
  const visibleNotifications = uniqueNotifications.slice(0, 5); // Limit to 5 max in search popup
  const readRows = visibleNotifications.length > 0
    ? await prisma.notification.findMany({
      where: {
        userId: session.id,
        id: { in: visibleNotifications.map((notification) => `${session.id}:${notification.id}`) },
        isRead: true,
      },
      select: { id: true },
    })
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
