import prisma from "@/lib/prisma";
import type { ExecutiveDashboardScope } from "./dashboard-scope";
import { scopeWhereProject, scopeWhereProjectId, scopeWhereTaskProjectId } from "./dashboard-scope";
import { todayWorkDate, getWorkDateRange } from "@/lib/date/work-date";
import { deriveOperationalIssueState } from "./operational-issue-service";

export type OperationalActionType = "RISK" | "REPORT" | "MATERIAL" | "TASK" | "APPROVAL";

export type ExecutiveActionItem = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  type: OperationalActionType;
  typeLabel: string;
  reason: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: string; // e.g. "Khẩn cấp" | "Cần xử lý" | "Có phát sinh"
  assignee: string;
  dueDate: string | null;
  overdueDuration: string | null;
  createdAt: string;
  occurredAt: Date;
  targetType: string;
  targetId: string;
};

export type ExecutiveActionItemsResult = {
  scope: {
    mode: "ALL_PROJECTS" | "SINGLE_PROJECT";
    projectId: string | null;
  };
  total: number;
  breakdown: {
    reports: number;
    materials: number;
    tasks: number;
    risks: number;
  };
  highPriority: number;
  criticalCount: number;
  overdue: number;
  topItems: ExecutiveActionItem[];
  allItems: ExecutiveActionItem[];
};

/**
 * Fetches operational action items strictly decoupled from administrative approval status.
 * Evaluates domain risks, site report issues, material shortages, and urgent tasks.
 */
export async function getExecutiveActionItems(
  scope: ExecutiveDashboardScope,
  topLimit: number = 5
): Promise<ExecutiveActionItemsResult> {
  const projectWhere = scopeWhereProject(scope);
  const projectIdWhere = scopeWhereProjectId(scope);
  const taskProjectIdWhere = scopeWhereTaskProjectId(scope);

  const today = todayWorkDate();
  const todayRange = getWorkDateRange(today);

  // 1. Delayed / At-Risk Projects
  const projects = await prisma.project.findMany({
    where: {
      ...projectWhere,
      deletedAt: null,
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
          status: "Trễ tiến độ",
          assignee: p.members[0]?.user.name ?? "Chỉ huy trưởng",
          dueDate: new Date(p.endDate).toLocaleDateString("vi-VN"),
          overdueDuration: `${Math.abs(daysRemaining)} ngày`,
          createdAt: todayRange.start.toLocaleDateString("vi-VN"),
          occurredAt: todayRange.start,
          targetType: "PROJECT",
          targetId: p.id,
        });
      }
    }
  }

  // 2. Operational Issue Site Reports (Filtered by business issue logic, NOT approval status)
  const reports = await prisma.siteReport.findMany({
    where: {
      ...projectIdWhere,
      deletedAt: null,
      issues: { not: null },
    },
    orderBy: { reportDate: "desc" },
    include: {
      project: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
    },
  });

  const reportItems: ExecutiveActionItem[] = [];
  for (const r of reports) {
    const issueState = deriveOperationalIssueState({
      issues: r.issues,
      recommendations: r.recommendations,
      qualityNote: r.quality,
      laborNote: r.labor,
      materialsNote: r.materials,
      safetyStatus: r.weatherCondition, // or safety field if present
      status: r.status,
    });

    if (issueState.hasIssue) {
      reportItems.push({
        id: `report-${r.id}`,
        projectId: r.projectId,
        projectName: r.project.name,
        title: r.title || `Ghi nhận vấn đề ngày ${new Date(r.reportDate).toLocaleDateString("vi-VN")}`,
        type: "REPORT",
        typeLabel: "Sự cố / Vướng mắc",
        reason: r.issues?.trim()
          || r.recommendations?.trim()
          || issueState.reasonCodes.join("; ")
          || "Ghi nhận sự cố tại công trường",
        priority: issueState.severity === "CRITICAL" || issueState.severity === "HIGH" ? "HIGH" : "MEDIUM",
        status: issueState.displayLabel,
        assignee: r.createdBy?.name ?? "Cán bộ hiện trường",
        dueDate: null,
        overdueDuration: null,
        createdAt: r.createdAt.toLocaleDateString("vi-VN"),
        occurredAt: r.createdAt,
        targetType: "SITE_REPORT",
        targetId: r.id,
      });
    }
  }

  // 3. Urgent / Critical Material Shortage Requests
  const [materialRequests, fieldMaterialRequests] = await Promise.all([
    prisma.materialRequest.findMany({
      where: {
        ...projectIdWhere,
        deletedAt: null,
        priority: { in: ["URGENT", "HIGH"] },
        status: { notIn: ["REJECTED", "CANCELLED"] },
      },
      orderBy: { createdAt: "desc" },
      include: { project: { select: { id: true, name: true } }, requestedBy: { select: { name: true } } },
    }),
    prisma.fieldMaterialRequest.findMany({
      where: {
        ...projectIdWhere,
        deletedAt: null,
        priority: { in: ["URGENT", "HIGH"] },
        status: { notIn: ["APPROVED", "REJECTED", "CANCELLED"] },
      },
      orderBy: { createdAt: "desc" },
      include: { project: { select: { id: true, name: true } }, requestedBy: { select: { name: true } } },
    }),
  ]);

  const materialItems: ExecutiveActionItem[] = [
    ...materialRequests.map((m) => ({
      id: `material-${m.id}`,
      projectId: m.projectId,
      projectName: m.project.name,
      title: `Cấp thiết vật tư: ${m.requestNo}`,
      type: "MATERIAL" as const,
      typeLabel: "Vật tư",
      reason: m.note || "Yêu cầu vật tư ưu tiên cao cho thi công",
      priority: "HIGH" as const,
      status: "Cần xử lý",
      assignee: m.requestedBy?.name ?? "Kỹ sư vật tư",
      dueDate: m.neededDate ? new Date(m.neededDate).toLocaleDateString("vi-VN") : null,
      overdueDuration: null,
      createdAt: m.createdAt.toLocaleDateString("vi-VN"),
      occurredAt: m.createdAt,
      targetType: "MATERIAL_REQUEST",
      targetId: m.id,
    })),
    ...fieldMaterialRequests.map((fm) => ({
      id: `field-material-${fm.id}`,
      projectId: fm.projectId,
      projectName: fm.project.name,
      title: "Đề xuất vật tư khẩn hiện trường",
      type: "MATERIAL" as const,
      typeLabel: "Vật tư",
      reason: fm.note || "Đề xuất cấp bổ sung vật tư khẩn cấp",
      priority: "HIGH" as const,
      status: "Khẩn cấp",
      assignee: fm.requestedBy?.name ?? "Cán bộ hiện trường",
      dueDate: null,
      overdueDuration: null,
      createdAt: fm.createdAt.toLocaleDateString("vi-VN"),
      occurredAt: fm.createdAt,
      targetType: "FIELD_MATERIAL_REQUEST",
      targetId: fm.id,
    })),
  ];

  // 4. Overdue Tasks
  const overdueTasks = await prisma.workTask.findMany({
    where: {
      ...taskProjectIdWhere,
      lifecycle: { notIn: ["COMPLETED", "CANCELLED"] },
      deadlineAt: { lt: todayRange.start },
    },
    orderBy: { deadlineAt: "asc" },
    include: {
      project: { select: { id: true, name: true } },
      primaryAssignee: { select: { name: true } },
    },
  });

  const taskItems: ExecutiveActionItem[] = overdueTasks.map((t) => {
    const overdueDays = t.deadlineAt
      ? Math.max(1, Math.ceil((todayRange.start.getTime() - t.deadlineAt.getTime()) / 86_400_000))
      : null;
    return {
    id: `task-${t.id}`,
    projectId: t.projectId,
    projectName: t.project.name,
    title: `Quá hạn nhiệm vụ: ${t.title}`,
    type: "TASK" as const,
    typeLabel: "Nhiệm vụ",
    reason: t.description || "Nhiệm vụ thi công đã quá hạn",
    priority: t.priority === "URGENT" || t.priority === "HIGH" ? "HIGH" : "MEDIUM",
    status: "Quá hạn",
    assignee: t.primaryAssignee?.name ?? "Người phụ trách",
    dueDate: t.deadlineAt ? new Date(t.deadlineAt).toLocaleDateString("vi-VN") : null,
    overdueDuration: overdueDays === null ? null : `${overdueDays} ngày`,
    createdAt: t.createdAt.toLocaleDateString("vi-VN"),
    occurredAt: t.createdAt,
    targetType: "WORK_TASK",
    targetId: t.id,
    };
  });

  // Combine and sort all items (Highest priority & newest first)
  const allItems = [...riskItems, ...reportItems, ...materialItems, ...taskItems].sort((a, b) => {
    const pScore = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const pDiff = pScore[b.priority] - pScore[a.priority];
    if (pDiff !== 0) return pDiff;
    return b.occurredAt.getTime() - a.occurredAt.getTime();
  });

  const total = allItems.length;
  const breakdown = {
    reports: reportItems.length,
    materials: materialItems.length,
    tasks: taskItems.length,
    risks: riskItems.length,
  };

  const highPriority = allItems.filter((i) => i.priority === "HIGH").length;
  const criticalCount = allItems.filter((i) => i.status === "Khẩn cấp" || i.priority === "HIGH").length;
  const overdue = riskItems.length + taskItems.length;

  const topItems = allItems.slice(0, topLimit);

  return {
    scope: {
      mode: scope.mode,
      projectId: scope.projectId,
    },
    total,
    breakdown,
    highPriority,
    criticalCount,
    overdue,
    topItems,
    allItems,
  };
}

/**
 * Standard alias method required by invariant checks
 */
export async function getOperationalActionItems(
  scope: ExecutiveDashboardScope,
  topLimit: number = 5
): Promise<ExecutiveActionItemsResult> {
  return getExecutiveActionItems(scope, topLimit);
}
