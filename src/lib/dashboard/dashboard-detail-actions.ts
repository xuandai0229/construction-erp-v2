"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getProjectAccessScope, projectScopeAllows, projectScopeWhere } from "@/lib/rbac";
import { resolveExecutiveDashboardScope } from "./dashboard-scope";
import { getExecutiveActionItems } from "./executive-action-service";
import { assertCanAccessExecutiveDashboard } from "@/lib/roles/role-workspace-policy";
import { getWorkDateRange, todayWorkDate, formatWorkDate, addWorkDays, parseWorkDate } from "@/lib/date/work-date";

export type RiskDetailItem = {
  id: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  health: "AT_RISK" | "DELAYED" | "NO_DATA";
  severity: "HIGH" | "MEDIUM" | "LOW";
  warningTitle: string;
  rootCause: string;
  affectedMilestone: string;
  detectionSource: string;
  detectedAt: string;
  updatedAt: string;
  assignee: string;
  dueDate: string | null;
  impact: string;
  progressPercent: number | null;
  daysRemaining: number | null;
  evidenceTargetType?: string;
  evidenceTargetId?: string;
};

export type VolumeGroupedProject = {
  projectId: string;
  projectCode: string;
  projectName: string;
  isUpdatedToday: boolean;
  lastReporterName: string;
  lastUpdatedAt: string;
  totalEntriesCount: number;
  entries: VolumeEntryDetailItem[];
};

export type VolumeEntryDetailItem = {
  id: string;
  projectId: string;
  projectName: string;
  itemName: string;
  workContent: string;
  categoryName: string;
  unit: string;
  todayQty: number;
  cumulativeQty: number;
  reporterName: string;
  updatedAt: string;
  sourceReportId?: string;
};

export type Report7dDetailItem = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  type: string;
  targetType: "SITE_REPORT" | "SUPERVISION_DOSSIER";
  reporterName: string;
  reportDate: string;
  status: string;
  hasIssue: boolean;
  issuesNote: string | null;
  previewRoute: string;
};

export type ExecutiveActionDetailItem = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  type: "APPROVAL" | "REPORT" | "MATERIAL" | "TASK" | "RISK";
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
};

export type PendingApprovalDetailItem = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  type: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: string;
  requesterName: string;
  createdAt: string;
  targetType: "APPROVAL";
  targetId: string;
  description: string | null;
};

export type ProjectStatusDetailItem = {
  id: string;
  code: string;
  name: string;
  status: string;
  health: "ON_TRACK" | "AT_RISK" | "DELAYED" | "COMPLETED" | "NO_DATA";
  progressPercent: number | null;
  startDate: string | null;
  endDate: string | null;
  daysRemaining: number | null;
  warning: string;
};

export type SingleApprovalDetail = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  requesterName: string;
  priority: string;
  status: string;
  description: string | null;
  createdAt: string;
  canApprove: boolean;
};

export type SingleReportDetail = {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  reporterName: string;
  reportDate: string;
  type: string;
  status: string;
  weather: string | null;
  manpowerCount: number | null;
  issues: string | null;
  lines: { id: string; workContent: string; volume: string; unit: string; issueNote: string | null }[];
};

export type SingleMaterialRequestDetail = {
  id: string;
  projectId: string;
  projectName: string;
  requestNo: string;
  requesterName: string;
  status: string;
  createdAt: string;
  items: { materialName: string; quantity: number; unit: string; note: string | null }[];
};

export async function fetchExecutivePendingApprovalsDetails(projectId?: string | null): Promise<PendingApprovalDetailItem[]> {
  const session = await getSession();
  if (!session) return [];
  assertCanAccessExecutiveDashboard(session.role);

  let scope = await getProjectAccessScope(session);
  if (projectId && projectId !== "all") {
    if (!projectScopeAllows(scope, projectId)) return [];
    scope = { kind: "PROJECT_IDS", projectIds: [projectId] };
  }

  const where: any = {
    deletedAt: null,
    status: "PENDING",
    ...projectScopeWhere(scope),
  };

  const approvals = await prisma.approvalRequest.findMany({
    where,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
    include: {
      project: { select: { id: true, name: true } },
      requester: { select: { name: true } },
    },
  });

  return approvals.map((app) => ({
    id: app.id,
    projectId: app.projectId,
    projectName: app.project.name,
    title: app.title,
    type: "Hồ sơ trình duyệt",
    priority: app.priority === "URGENT" || app.priority === "HIGH" ? "HIGH" : "MEDIUM",
    status: "Chờ duyệt",
    requesterName: app.requester.name,
    createdAt: new Date(app.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
    targetType: "APPROVAL",
    targetId: app.id,
    description: app.description,
  }));
}

export async function fetchProjectStatusDetails(projectId?: string | null): Promise<ProjectStatusDetailItem[]> {
  const session = await getSession();
  if (!session) return [];
  assertCanAccessExecutiveDashboard(session.role);

  let scope = await getProjectAccessScope(session);
  if (projectId && projectId !== "all") {
    if (!projectScopeAllows(scope, projectId)) return [];
    scope = { kind: "PROJECT_IDS", projectIds: [projectId] };
  }

  const projects = await prisma.project.findMany({
    where: { deletedAt: null, ...projectScopeWhere(scope) },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const today = todayWorkDate();
  const todayRange = getWorkDateRange(today);
  const todayStart = todayRange.start;
  const { calculatePlannedProgress } = await import("./progress-utils");

  return projects.map((p) => {
    let daysRemaining: number | null = null;
    if (p.endDate) {
      const end = new Date(p.endDate);
      end.setUTCHours(0, 0, 0, 0);
      daysRemaining = Math.ceil((end.getTime() - todayStart.getTime()) / 86_400_000);
    }
    const progressPercent = calculatePlannedProgress(p.startDate, p.endDate, todayStart);
    const healthInfo = p.status === 'COMPLETED' 
      ? { health: 'COMPLETED' as const, warning: 'Hoàn thành' }
      : daysRemaining !== null && daysRemaining < 0 
      ? { health: 'DELAYED' as const, warning: 'Trễ tiến độ' }
      : { health: 'ON_TRACK' as const, warning: 'Đang triển khai' };

    return {
      id: p.id,
      code: p.code,
      name: p.name,
      status: p.status,
      health: healthInfo.health,
      progressPercent,
      startDate: p.startDate ? new Date(p.startDate).toLocaleDateString('vi-VN') : null,
      endDate: p.endDate ? new Date(p.endDate).toLocaleDateString('vi-VN') : null,
      daysRemaining,
      warning: healthInfo.warning,
    };
  });
}

function isMeaningfulIssue(text: string | null | undefined): boolean {
  if (!text) return false;
  const issue = text.trim().toLowerCase();
  if (issue.length === 0) return false;
  if (issue === "không" || issue === "khong" || issue === "không có" || issue === "bình thường" || issue === "không có vấn đề gì" || issue === "không có vấn đề") {
    return false;
  }
  return true;
}

export async function fetchExecutiveRiskDetails(projectId?: string | null): Promise<RiskDetailItem[]> {
  const session = await getSession();
  if (!session) return [];
  assertCanAccessExecutiveDashboard(session.role);

  let scope = await getProjectAccessScope(session);
  if (projectId && projectId !== "all") {
    if (!projectScopeAllows(scope, projectId)) return [];
    scope = { kind: "PROJECT_IDS", projectIds: [projectId] };
  }

  const where = { deletedAt: null, ...projectScopeWhere(scope) };
  const projects = await prisma.project.findMany({
    where,
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      updatedAt: true,
      members: {
        select: { user: { select: { name: true } } },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const today = todayWorkDate();
  const todayRange = getWorkDateRange(today);
  const todayStart = todayRange.start;

  const result: RiskDetailItem[] = [];

  for (const project of projects) {
    let daysRemaining: number | null = null;
    if (project.endDate) {
      const end = new Date(project.endDate);
      end.setUTCHours(0, 0, 0, 0);
      daysRemaining = Math.ceil((end.getTime() - todayStart.getTime()) / 86_400_000);
    }

    const isDelayed = daysRemaining !== null && daysRemaining < 0;

    const recentEntry = await prisma.fieldProgressEntry.findFirst({
      where: {
        projectId: project.id,
        deletedAt: null,
      },
      orderBy: { entryDate: "desc" },
      select: { entryDate: true },
    });

    const recentEntryCount = await prisma.fieldProgressEntry.count({
      where: {
        projectId: project.id,
        deletedAt: null,
        entryDate: { gte: getWorkDateRange(formatWorkDate(addWorkDays(parseWorkDate(today), -7))).start },
      },
    });

    const overdueApproval = await prisma.approvalRequest.findFirst({
      where: {
        projectId: project.id,
        deletedAt: null,
        status: "PENDING",
        dueDate: { lt: todayStart },
      },
      orderBy: { dueDate: "asc" },
      select: { id: true, title: true, dueDate: true },
    });

    let health: "AT_RISK" | "DELAYED" | "NO_DATA" | null = null;
    let warningTitle = "";
    let rootCause = "";
    let impact = "";
    let severity: "HIGH" | "MEDIUM" | "LOW" = "MEDIUM";
    let detectionSource = "";
    let riskDueDate: string | null = null;
    let evidenceTargetType: string | undefined = undefined;
    let evidenceTargetId: string | undefined = undefined;

    if (isDelayed) {
      health = "DELAYED";
      severity = "HIGH";
      warningTitle = "Trễ tiến độ kế hoạch dự án";
      rootCause = `Hạn kết thúc kế hoạch thi công là ngày ${new Date(project.endDate!).toLocaleDateString('vi-VN')}, hiện đã quá hạn ${Math.abs(daysRemaining!)} ngày.`;
      impact = "Ảnh hưởng trực tiếp đến mốc bàn giao và phạt tiến độ hợp đồng.";
      detectionSource = "Phân tích mốc kết thúc kế hoạch thi công";
      riskDueDate = new Date(project.endDate!).toLocaleDateString('vi-VN');
      evidenceTargetType = "PROJECT";
      evidenceTargetId = project.id;
    } else if (overdueApproval) {
      health = "AT_RISK";
      severity = "HIGH";
      warningTitle = "Hồ sơ trình duyệt bị quá hạn";
      rootCause = `Hồ sơ "${overdueApproval.title}" đã quá hạn xử lý ngày ${new Date(overdueApproval.dueDate!).toLocaleDateString('vi-VN')}.`;
      impact = "Gây gián đoạn kế hoạch thi công và mua sắm hiện trường.";
      detectionSource = `Hồ sơ trình duyệt #${overdueApproval.id.slice(-6)}`;
      riskDueDate = new Date(overdueApproval.dueDate!).toLocaleDateString('vi-VN');
      evidenceTargetType = "APPROVAL";
      evidenceTargetId = overdueApproval.id;
    } else if (recentEntryCount === 0 && project.status === "ACTIVE") {
      health = "AT_RISK";
      severity = "MEDIUM";
      warningTitle = "Gián đoạn cập nhật tiến độ hiện trường";
      rootCause = recentEntry 
        ? `Lần cập nhật khối lượng gần nhất là ngày ${new Date(recentEntry.entryDate).toLocaleDateString('vi-VN')}, hơn 7 ngày chưa có ghi nhận mới.`
        : "Công trình đang hoạt động nhưng chưa có bản ghi khối lượng thi công nào.";
      impact = "Thiếu dữ liệu giám sát điều hành và nghiệm thu tiến độ.";
      detectionSource = "Nhật ký nhập liệu thi công";
      riskDueDate = null;
      evidenceTargetType = "VOLUME_TODAY";
      evidenceTargetId = project.id;
    } else if (daysRemaining !== null && daysRemaining <= 14 && daysRemaining >= 0) {
      health = "AT_RISK";
      severity = "MEDIUM";
      warningTitle = "Cảnh báo mốc kết thúc dự án (Còn dưới 14 ngày)";
      rootCause = `Chỉ còn ${daysRemaining} ngày là tới hạn kết thúc kế hoạch tổng thể.`;
      impact = "Cần gia tăng nhân lực và nghiệm thu khối lượng dở dang.";
      detectionSource = "Cảnh báo đếm ngược hạn dự án";
      riskDueDate = new Date(project.endDate!).toLocaleDateString('vi-VN');
      evidenceTargetType = "PROJECT";
      evidenceTargetId = project.id;
    }

    if (health) {
      result.push({
        id: `risk-${project.id}-${health}`,
        projectId: project.id,
        projectName: project.name,
        projectCode: project.code,
        health,
        severity,
        warningTitle,
        rootCause,
        affectedMilestone: "Mốc bàn giao công trình",
        detectionSource,
        detectedAt: new Date(project.updatedAt).toLocaleDateString('vi-VN'),
        updatedAt: new Date(project.updatedAt).toLocaleDateString('vi-VN'),
        assignee: project.members[0]?.user.name ?? "Chỉ huy trưởng công trình",
        dueDate: riskDueDate,
        impact,
        progressPercent: null,
        daysRemaining,
        evidenceTargetType,
        evidenceTargetId,
      });
    }
  }

  return result;
}

export async function fetchExecutiveVolumeDetails(projectId?: string | null): Promise<VolumeGroupedProject[]> {
  const session = await getSession();
  if (!session) return [];
  assertCanAccessExecutiveDashboard(session.role);

  let scope = await getProjectAccessScope(session);
  if (projectId && projectId !== "all") {
    if (!projectScopeAllows(scope, projectId)) return [];
    scope = { kind: "PROJECT_IDS", projectIds: [projectId] };
  }

  const where = { deletedAt: null, ...projectScopeWhere(scope) };
  const projects = await prisma.project.findMany({
    where,
    select: {
      id: true,
      code: true,
      name: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const today = todayWorkDate();
  const todayRange = getWorkDateRange(today);

  const result: VolumeGroupedProject[] = [];

  for (const project of projects) {
    const entries = await prisma.fieldProgressEntry.findMany({
      where: {
        projectId: project.id,
        deletedAt: null,
        entryDate: { gte: todayRange.start, lt: todayRange.end },
      },
      take: 20,
      orderBy: { updatedAt: "desc" },
      include: {
        createdBy: { select: { name: true } },
        item: { select: { workContent: true, categoryName: true, unit: true } },
      },
    });

    const isUpdatedToday = entries.length > 0;
    const lastEntry = entries[0];

    const mappedEntries: VolumeEntryDetailItem[] = entries.map((e) => ({
      id: e.id,
      projectId: project.id,
      projectName: project.name,
      itemName: e.item?.workContent || e.itemId,
      workContent: e.item?.workContent || e.note || "Thi công hiện trường",
      categoryName: e.item?.categoryName || "Hạng mục chính",
      unit: e.item?.unit || "m3",
      todayQty: Number(e.quantity ?? 0),
      cumulativeQty: Number(e.quantity ?? 0),
      reporterName: e.createdBy?.name ?? "Kỹ sư hiện trường",
      updatedAt: new Date(e.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    }));

    result.push({
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      isUpdatedToday,
      lastReporterName: lastEntry?.createdBy?.name ?? "Chưa cập nhật",
      lastUpdatedAt: lastEntry ? new Date(lastEntry.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : "--",
      totalEntriesCount: entries.length,
      entries: mappedEntries,
    });
  }

  return result;
}

export async function fetchExecutiveReports7dDetails(projectId?: string | null): Promise<Report7dDetailItem[]> {
  const session = await getSession();
  if (!session) return [];
  assertCanAccessExecutiveDashboard(session.role);

  let scope = await getProjectAccessScope(session);
  if (projectId && projectId !== "all") {
    if (!projectScopeAllows(scope, projectId)) return [];
    scope = { kind: "PROJECT_IDS", projectIds: [projectId] };
  }

  const today = todayWorkDate();
  const todayRange = getWorkDateRange(today);
  const start7d = getWorkDateRange(formatWorkDate(addWorkDays(parseWorkDate(today), -6))).start;

  const reports = await prisma.siteReport.findMany({
    where: {
      deletedAt: null,
      reportDate: { gte: start7d, lt: todayRange.end },
      ...projectScopeWhere(scope),
    },
    orderBy: { reportDate: "desc" },
    include: {
      project: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      lines: { select: { issueNote: true } },
    },
  });

  return reports.map((rep) => {
    const hasIssues = isMeaningfulIssue(rep.issues) || rep.lines.some((l) => isMeaningfulIssue(l.issueNote));
    return {
      id: rep.id,
      projectId: rep.projectId,
      projectName: rep.project.name,
      title: rep.title || `Báo cáo ngày ${new Date(rep.reportDate).toLocaleDateString('vi-VN')}`,
      type: rep.type,
      targetType: "SITE_REPORT",
      reporterName: rep.createdBy.name,
      reportDate: new Date(rep.reportDate).toLocaleDateString('vi-VN'),
      status: rep.status === "APPROVED" ? "Đã duyệt" : rep.status === "SUBMITTED" ? "Chờ duyệt" : "Bản nháp",
      hasIssue: hasIssues,
      issuesNote: rep.issues || (rep.lines.find((l) => isMeaningfulIssue(l.issueNote))?.issueNote ?? null),
      previewRoute: `/reports/field?reportId=${rep.id}`,
    };
  });
}

export async function fetchExecutiveActionItemsDetails(projectId?: string | null): Promise<ExecutiveActionDetailItem[]> {
  const session = await getSession();
  if (!session) return [];
  assertCanAccessExecutiveDashboard(session.role);

  const scope = await resolveExecutiveDashboardScope(session, projectId);
  const actionResult = await getExecutiveActionItems(scope, 100);

  return actionResult.allItems.map((item) => ({
    id: item.id,
    projectId: item.projectId,
    projectName: item.projectName,
    title: item.title,
    type: item.type === "APPROVAL" ? "APPROVAL" : item.type === "REPORT" ? "REPORT" : item.type === "MATERIAL" ? "MATERIAL" : "RISK",
    typeLabel: item.typeLabel,
    reason: item.reason,
    priority: item.priority,
    status: item.status,
    assignee: item.assignee,
    dueDate: item.dueDate,
    overdueDuration: item.overdueDuration,
    createdAt: item.createdAt,
    targetType: item.targetType,
    targetId: item.targetId,
  }));
}

export async function fetchSingleApprovalDetail(approvalId: string): Promise<SingleApprovalDetail | null> {
  const session = await getSession();
  if (!session) return null;
  assertCanAccessExecutiveDashboard(session.role);

  const cleanId = approvalId.replace(/^approval-/, '');
  const approval = await prisma.approvalRequest.findFirst({
    where: { id: cleanId, deletedAt: null },
    include: { project: { select: { id: true, name: true } }, requester: { select: { name: true } } },
  });

  if (!approval) return null;

  const scope = await getProjectAccessScope(session);
  if (!projectScopeAllows(scope, approval.projectId)) return null;

  return {
    id: approval.id,
    projectId: approval.projectId,
    projectName: approval.project.name,
    title: approval.title,
    requesterName: approval.requester.name,
    priority: approval.priority,
    status: approval.status,
    description: approval.description,
    createdAt: new Date(approval.createdAt).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }),
    canApprove: ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"].includes(session.role),
  };
}

export async function fetchSingleReportDetail(reportId: string): Promise<SingleReportDetail | null> {
  const session = await getSession();
  if (!session) return null;
  assertCanAccessExecutiveDashboard(session.role);

  const cleanId = reportId.replace(/^report-/, '');
  const report = await prisma.siteReport.findFirst({
    where: { id: cleanId, deletedAt: null },
    include: {
      project: { select: { id: true, name: true } },
      createdBy: { select: { name: true } },
      lines: true,
    },
  });

  if (!report) return null;

  const scope = await getProjectAccessScope(session);
  if (!projectScopeAllows(scope, report.projectId)) return null;

  return {
    id: report.id,
    projectId: report.projectId,
    projectName: report.project.name,
    title: report.title || `Báo cáo ngày ${new Date(report.reportDate).toLocaleDateString('vi-VN')}`,
    reporterName: report.createdBy.name,
    reportDate: new Date(report.reportDate).toLocaleDateString('vi-VN'),
    type: report.type,
    status: report.status,
    weather: report.weather,
    manpowerCount: report.manpowerCount,
    issues: report.issues,
    lines: report.lines.map((l) => ({
      id: l.id,
      workContent: l.workContent || "Hạng mục thi công",
      volume: String(l.quantityToday ?? 0),
      unit: l.unit || "m3",
      issueNote: l.issueNote,
    })),
  };
}

export async function fetchSingleMaterialRequestDetail(requestId: string): Promise<SingleMaterialRequestDetail | null> {
  const session = await getSession();
  if (!session) return null;
  assertCanAccessExecutiveDashboard(session.role);

  const cleanId = requestId.replace(/^(material|field-material)-/, '');
  const request = await prisma.materialRequest.findFirst({
    where: { id: cleanId, deletedAt: null },
    include: {
      project: { select: { id: true, name: true } },
      requestedBy: { select: { name: true } },
      items: true,
    },
  });

  if (!request) return null;

  const scope = await getProjectAccessScope(session);
  if (!projectScopeAllows(scope, request.projectId)) return null;

  return {
    id: request.id,
    projectId: request.projectId,
    projectName: request.project.name,
    requestNo: request.requestNo,
    requesterName: request.requestedBy.name,
    status: request.status,
    createdAt: new Date(request.createdAt).toLocaleDateString('vi-VN'),
    items: request.items.map((i) => ({
      materialName: i.materialName,
      quantity: Number(i.requestedQuantity ?? 0),
      unit: i.unit,
      note: i.note,
    })),
  };
}
