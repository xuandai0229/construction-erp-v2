import prisma from "@/lib/prisma";
import type { ExecutiveDashboardScope } from "./dashboard-scope";
import { scopeWhereProject, scopeWhereProjectId } from "./dashboard-scope";
import { todayWorkDate, getWorkDateRange } from "@/lib/date/work-date";

export type ExecutiveActionItem = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  type: "RISK" | "REPORT" | "MATERIAL" | "APPROVAL";
  typeLabel: string;
  reason: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: string;
  assignee: string;
  dueDate: string | null;
  overdueDuration: string | null;
  createdAt: string;
  targetType: string;
  targetId: string;
  isFutureReport?: boolean;
};

export type ExecutiveActionItemsResult = {
  scope: {
    mode: "ALL_PROJECTS" | "SINGLE_PROJECT";
    projectId: string | null;
  };
  total: number;
  breakdown: {
    approvals: number;
    reports: number;
    materials: number;
    tasks: number;
    risks: number;
  };
  highPriority: number;
  overdue: number;
  awaitingMyDecision: number;
  topItems: ExecutiveActionItem[];
  allItems: ExecutiveActionItem[];
};

export async function getExecutiveActionItems(
  scope: ExecutiveDashboardScope,
  topLimit: number = 4
): Promise<ExecutiveActionItemsResult> {
  const projectWhere = scopeWhereProject(scope);
  const projectIdWhere = scopeWhereProjectId(scope);

  const today = todayWorkDate();
  const todayRange = getWorkDateRange(today);
  const todayEnd = todayRange.end;

  // 1. Delayed Projects (Risks)
  const projects = await prisma.project.findMany({
    where: {
      ...projectWhere,
      status: "ACTIVE",
    },
    select: {
      id: true,
      code: true,
      name: true,
      endDate: true,
      members: {
        select: { user: { select: { name: true } } },
        take: 1,
      },
    },
  });

  const riskItems: ExecutiveActionItem[] = [];
  for (const p of projects) {
    if (p.endDate) {
      const end = new Date(p.endDate);
      end.setUTCHours(0, 0, 0, 0);
      const daysRemaining = Math.ceil((end.getTime() - todayRange.start.getTime()) / 86_400_000);
      if (daysRemaining < 0) {
        riskItems.push({
          id: `project-${p.id}`,
          projectId: p.id,
          projectName: p.name,
          title: "Công trình trễ tiến độ thi công",
          type: "RISK",
          typeLabel: "Tiến độ",
          reason: `Đã quá hạn kết thúc thi công ${Math.abs(daysRemaining)} ngày.`,
          priority: "HIGH",
          status: "Cần chú ý",
          assignee: p.members[0]?.user.name ?? "Chỉ huy trưởng",
          dueDate: new Date(p.endDate).toLocaleDateString("vi-VN"),
          overdueDuration: `${Math.abs(daysRemaining)} ngày`,
          createdAt: new Date().toLocaleDateString("vi-VN"),
          targetType: "PROJECT",
          targetId: p.id,
        });
      }
    }
  }

  // 2. Issue Site Reports (Báo cáo hiện trường có vấn đề / chờ duyệt)
  const reports = await prisma.siteReport.findMany({
    where: {
      ...projectIdWhere,
      OR: [
        { status: { in: ["SUBMITTED", "REVISION_REQUESTED"] } },
        { issues: { not: null } },
      ],
    },
    orderBy: { reportDate: "desc" },
    take: 30,
    include: {
      project: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
  });

  const reportItems: ExecutiveActionItem[] = reports.map((r) => {
    const isFuture = r.reportDate > todayEnd;
    const isRevision = r.status === "REVISION_REQUESTED";
    return {
      id: `report-${r.id}`,
      projectId: r.projectId,
      projectName: r.project.name,
      title: r.title || `Báo cáo ngày ${new Date(r.reportDate).toLocaleDateString("vi-VN")}`,
      type: "REPORT",
      typeLabel: "Báo cáo",
      reason: isFuture
        ? `Báo cáo dự kiến ngày ${new Date(r.reportDate).toLocaleDateString("vi-VN")} (Chưa tới kỳ)`
        : isRevision
        ? "Báo cáo hiện trường bị yêu cầu chỉnh sửa"
        : "Báo cáo hiện trường chờ phê duyệt",
      priority: isRevision ? "HIGH" : "MEDIUM",
      status: isFuture ? "Dự kiến" : isRevision ? "Cần sửa" : "Chờ duyệt",
      assignee: r.createdBy.name,
      dueDate: null,
      overdueDuration: null,
      createdAt: new Date(r.createdAt).toLocaleDateString("vi-VN"),
      targetType: "SITE_REPORT",
      targetId: r.id,
      isFutureReport: isFuture,
    };
  });

  // 3. Material Requests (Đề xuất vật tư)
  const [materialRequests, fieldMaterialRequests] = await Promise.all([
    prisma.materialRequest.findMany({
      where: { ...projectIdWhere, status: { in: ["REQUESTED", "SUBMITTED"] } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { project: { select: { id: true, name: true } }, requestedBy: { select: { name: true } } },
    }),
    prisma.fieldMaterialRequest.findMany({
      where: { ...projectIdWhere, status: "SUBMITTED" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { project: { select: { id: true, name: true } }, requestedBy: { select: { name: true } } },
    }),
  ]);

  const materialItems: ExecutiveActionItem[] = [
    ...materialRequests.map((m) => ({
      id: `material-${m.id}`,
      projectId: m.projectId,
      projectName: m.project.name,
      title: `Yêu cầu cấp vật tư ${m.requestNo}`,
      type: "MATERIAL" as const,
      typeLabel: "Vật tư",
      reason: "Yêu cầu cấp vật tư chờ duyệt xuất kho",
      priority: m.priority === "URGENT" || m.priority === "HIGH" ? ("HIGH" as const) : ("MEDIUM" as const),
      status: "Chờ duyệt",
      assignee: m.requestedBy.name,
      dueDate: m.neededDate ? new Date(m.neededDate).toLocaleDateString("vi-VN") : null,
      overdueDuration: null,
      createdAt: new Date(m.createdAt).toLocaleDateString("vi-VN"),
      targetType: "MATERIAL_REQUEST",
      targetId: m.id,
    })),
    ...fieldMaterialRequests.map((fm) => ({
      id: `field-material-${fm.id}`,
      projectId: fm.projectId,
      projectName: fm.project.name,
      title: "Đề xuất vật tư hiện trường",
      type: "MATERIAL" as const,
      typeLabel: "Vật tư",
      reason: "Đề xuất vật tư hiện trường bổ sung chờ phê duyệt",
      priority: fm.priority === "URGENT" || fm.priority === "HIGH" ? ("HIGH" as const) : ("MEDIUM" as const),
      status: "Chờ duyệt",
      assignee: fm.requestedBy.name,
      dueDate: null,
      overdueDuration: null,
      createdAt: new Date(fm.createdAt).toLocaleDateString("vi-VN"),
      targetType: "FIELD_MATERIAL_REQUEST",
      targetId: fm.id,
    })),
  ];

  // Combine and sort all items
  const allItems = [...riskItems, ...reportItems, ...materialItems].sort((a, b) => {
    // Non-future reports first
    if (a.isFutureReport !== b.isFutureReport) {
      return a.isFutureReport ? 1 : -1;
    }
    // High priority first
    const pScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const pDiff = pScore[b.priority] - pScore[a.priority];
    if (pDiff !== 0) return pDiff;
    return 0;
  });

  const total = allItems.length;
  const breakdown = {
    approvals: 0, // Pending approvals are in pendingApprovals service
    reports: reportItems.length,
    materials: materialItems.length,
    tasks: 0,
    risks: riskItems.length,
  };

  const highPriority = allItems.filter((i) => i.priority === "HIGH").length;
  const overdue = riskItems.length;
  const awaitingMyDecision = total;

  const topItems = allItems.slice(0, topLimit);

  return {
    scope: {
      mode: scope.mode,
      projectId: scope.projectId,
    },
    total,
    breakdown,
    highPriority,
    overdue,
    awaitingMyDecision,
    topItems,
    allItems,
  };
}
