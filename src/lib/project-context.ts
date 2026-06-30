import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { getAccessibleProjectIds } from '@/lib/rbac';
import type { SessionUser } from '@/lib/auth';

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
    createdAt: Date;
    href: string | null;
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
    ? { deletedAt: null, status: { in: ["ACTIVE", "PLANNING", "ON_HOLD"] as any[] } } 
    : { deletedAt: null, status: { in: ["ACTIVE", "PLANNING", "ON_HOLD"] as any[] }, id: { in: accessibleProjectIds } };
    
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
      const end = project.endDate ? new Date(project.endDate).setUTCHours(0,0,0,0) : null;
      const today = new Date().setUTCHours(0,0,0,0);
      const daysRemaining = end ? Math.ceil((end - today) / 86400000) : null;
      
      let health: "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED" | "NO_DATA" = "ON_TRACK";
      let warning = "Đang thi công";

      if (project.status === "COMPLETED") {
        health = "COMPLETED";
        warning = "Hoàn thành";
      } else if (noWbs) {
        health = "NO_DATA";
        warning = "Chưa thiết lập WBS";
      } else if (daysRemaining !== null && daysRemaining < 0) {
        health = "DELAYED";
        warning = "Trễ tiến độ";
      } else if (noRecentEntry) {
        health = "AT_RISK";
        warning = "Chưa có nhập liệu gần đây";
      } else if (daysRemaining !== null && daysRemaining <= 14) {
        health = "AT_RISK";
        warning = "Sắp đến hạn";
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
    notifications.push({
      id: `app-${app.id}`,
      type: 'APPROVAL',
      severity: app.priority === 'HIGH' || app.priority === 'URGENT' ? 'HIGH' : 'MEDIUM',
      title: app.title,
      message: 'Hồ sơ chờ phê duyệt',
      projectName: app.project.name,
      createdAt: app.createdAt,
      href: `/approvals?projectId=${app.projectId}&requestId=${app.id}`,
      isRead: false
    });
  });

  // Issue Reports
  const issueReports = await prisma.siteReport.findMany({
    where: {
      deletedAt: null,
      ...(selectedProjectId ? { projectId: selectedProjectId } : (accessibleProjectIds === null ? {} : { projectId: { in: accessibleProjectIds } })),
      OR: [
        { status: { in: ["SUBMITTED", "REVISION_REQUESTED"] } },
        { issues: { not: null } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 3,
    include: { project: { select: { name: true } } },
  });

  issueReports.forEach(r => {
    const isPending = r.status === "SUBMITTED";
    const reportDateStr = new Date(r.reportDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    notifications.push({
      id: `rep-${r.id}`,
      type: 'REPORT',
      severity: 'HIGH',
      title: isPending ? `Báo cáo ngày ${reportDateStr} chờ duyệt` : `Báo cáo ngày ${reportDateStr} có vấn đề`,
      message: r.summary ? `Nội dung: ${r.summary}` : 'Báo cáo hiện trường cần chú ý',
      projectName: r.project.name,
      createdAt: r.updatedAt,
      href: `/reports?projectId=${r.projectId}&reportId=${r.id}&status=${isPending ? 'PENDING' : 'ISSUE'}`,
      isRead: false
    });
  });

  // Sort by date
  notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return {
    selectedProjectId,
    accessibleProjects,
    overviewData,
    notifications: notifications.slice(0, 5)
  };
}
