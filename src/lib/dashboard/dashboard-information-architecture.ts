import type {
  DashboardActionItem,
  DashboardData,
  DashboardProjectOverview,
} from "./dashboard-queries";
import { completenessPresentation, getActualProgressDataLabel } from "./dashboard-project-presentation";

export const DASHBOARD_MAX_VISIBLE_PROJECTS = 5;

export type DashboardPriorityItem = {
  projectId: string;
  projectCode: string;
  projectName: string;
  badgeLabel: string;
  reason: string;
  ctaLabel: string;
  href: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  plannedProgressPercent: number | null;
  actualProgressPercent: number | null;
  variancePercent: number | null;
  lastActualProgressAt: Date | null;
};

export type DashboardPrioritySelection = {
  totalCount: number;
  visibleCount: number;
  maxVisible: number;
  items: DashboardPriorityItem[];
};

type OperationalCandidate = DashboardPriorityItem & { score: number };

function operationalActionPresentation(item: DashboardActionItem) {
  switch (item.targetType) {
    case "SITE_REPORT":
      return { badgeLabel: "Vấn đề hiện trường", ctaLabel: "Mở báo cáo hiện trường" };
    case "MATERIAL_REQUEST":
      return { badgeLabel: "Vật tư cần xử lý", ctaLabel: "Mở yêu cầu vật tư" };
    case "WORK_TASK":
      return { badgeLabel: "Nhiệm vụ quá hạn", ctaLabel: "Mở nhiệm vụ" };
    default:
      return { badgeLabel: "Rủi ro vận hành", ctaLabel: "Mở chi tiết công trình" };
  }
}

function priorityScore(priority: DashboardActionItem["priority"]) {
  if (priority === "HIGH") return 300;
  if (priority === "MEDIUM") return 200;
  return 100;
}

/**
 * Ranks only operational evidence. Missing plan/actual data never creates an
 * intervention candidate by itself.
 */
export function selectOperationalInterventionProjects(
  input: Pick<DashboardData, "projectOverview" | "actionItems">,
  maxVisible = DASHBOARD_MAX_VISIBLE_PROJECTS,
): DashboardPrioritySelection {
  const projectById = new Map(input.projectOverview.map((project) => [project.id, project]));
  const byProject = new Map<string, OperationalCandidate>();

  for (const action of input.actionItems) {
    if (!action.projectId) continue;
    const project = projectById.get(action.projectId);
    if (!project) continue;
    const presentation = operationalActionPresentation(action);
    const candidate: OperationalCandidate = {
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      badgeLabel: presentation.badgeLabel,
      reason: action.reason || action.title,
      ctaLabel: presentation.ctaLabel,
      href: action.href,
      priority: action.priority,
      plannedProgressPercent: project.plannedProgressPercent,
      actualProgressPercent: project.actualProgressPercent,
      variancePercent: project.variancePercent,
      lastActualProgressAt: project.lastActualProgressAt,
      score: priorityScore(action.priority) + (action.targetType === "PROJECT" ? 20 : 40),
    };
    const existing = byProject.get(project.id);
    if (!existing || candidate.score > existing.score) byProject.set(project.id, candidate);
  }

  for (const project of input.projectOverview) {
    if (
      project.plannedProgressPercent === null
      || project.actualProgressPercent === null
      || project.variancePercent === null
    ) continue;

    const isDelayed = project.health === "DELAYED" || project.variancePercent < -10;
    const needsAttention = project.health === "AT_RISK" || project.variancePercent < 0;
    if (!isDelayed && !needsAttention) continue;

    const candidate: OperationalCandidate = {
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      badgeLabel: isDelayed ? "Chậm tiến độ" : "Cần chú ý",
      reason: `Tiến độ thực tế thấp hơn kế hoạch ${Math.abs(Math.round(project.variancePercent))} điểm %.`,
      ctaLabel: "Mở tổng hợp tiến độ",
      href: `/projects/${project.id}/field-progress/summary`,
      priority: isDelayed ? "HIGH" : "MEDIUM",
      plannedProgressPercent: project.plannedProgressPercent,
      actualProgressPercent: project.actualProgressPercent,
      variancePercent: project.variancePercent,
      lastActualProgressAt: project.lastActualProgressAt,
      score: isDelayed ? 280 + Math.abs(project.variancePercent) : 180 + Math.abs(project.variancePercent),
    };
    const existing = byProject.get(project.id);
    if (!existing || candidate.score > existing.score) byProject.set(project.id, candidate);
  }

  const candidates = [...byProject.values()]
    .sort((left, right) => right.score - left.score || left.projectName.localeCompare(right.projectName, "vi"));
  const items = candidates.slice(0, maxVisible).map((candidate): DashboardPriorityItem => ({
    projectId: candidate.projectId,
    projectCode: candidate.projectCode,
    projectName: candidate.projectName,
    badgeLabel: candidate.badgeLabel,
    reason: candidate.reason,
    ctaLabel: candidate.ctaLabel,
    href: candidate.href,
    priority: candidate.priority,
    plannedProgressPercent: candidate.plannedProgressPercent,
    actualProgressPercent: candidate.actualProgressPercent,
    variancePercent: candidate.variancePercent,
    lastActualProgressAt: candidate.lastActualProgressAt,
  }));

  return { totalCount: candidates.length, visibleCount: items.length, maxVisible, items };
}

function dataQualityPriority(project: DashboardProjectOverview) {
  if (project.completenessCategory === "MISSING_BOTH") return 500;
  if (project.actualProgressDataStatus === "INVALID_QUANTITY" || project.actualProgressDataStatus === "DATA_SCOPE_MISMATCH") return 470;
  if (project.actualProgressDataStatus === "MULTIPLE_ACTIVE_TEMPLATES") return 460;
  if (project.completenessCategory === "MISSING_ACTUAL") return 400;
  if (project.completenessCategory === "MISSING_PLAN") return 300;
  if (project.actualProgressWarnings.length > 0) return 200;
  return 0;
}

function dataQualityCta(project: DashboardProjectOverview) {
  if (project.completenessCategory === "MISSING_PLAN" || project.completenessCategory === "MISSING_BOTH") {
    return { label: "Bổ sung kế hoạch", href: `/projects/${project.id}/edit` };
  }
  if (project.actualProgressDataStatus === "NO_PROGRESS_ITEMS") {
    return { label: "Thiết lập WBS", href: `/projects/${project.id}/field-progress` };
  }
  if (project.actualProgressDataStatus === "NO_APPROVED_ENTRIES") {
    return { label: "Mở dữ liệu khối lượng", href: `/projects/${project.id}/field-progress/daily` };
  }
  return { label: "Kiểm tra dữ liệu tiến độ", href: `/projects/${project.id}/field-progress/summary` };
}

function dataQualityReason(project: DashboardProjectOverview) {
  if (project.completenessCategory === "MISSING_BOTH") {
    return "Chưa có kế hoạch và chưa đủ dữ liệu khối lượng thực tế.";
  }
  if (project.completenessCategory === "MISSING_PLAN") {
    return "Chưa có mốc tiến độ kế hoạch để đối chiếu.";
  }
  return `${getActualProgressDataLabel(project)}.`;
}

/**
 * Ranks only completeness and progress-data quality. Operational severity is
 * deliberately absent, so this selector cannot become an alias of the
 * intervention selector.
 */
export function selectDataQualityPriorityProjects(
  projects: DashboardProjectOverview[],
  options: { maxVisible?: number; preferDifferentFrom?: ReadonlySet<string> } = {},
): DashboardPrioritySelection {
  const maxVisible = options.maxVisible ?? DASHBOARD_MAX_VISIBLE_PROJECTS;
  const candidates = projects
    .map((project) => ({ project, score: dataQualityPriority(project) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => {
      const leftRepeated = options.preferDifferentFrom?.has(left.project.id) ? 1 : 0;
      const rightRepeated = options.preferDifferentFrom?.has(right.project.id) ? 1 : 0;
      return leftRepeated - rightRepeated
        || right.score - left.score
        || left.project.name.localeCompare(right.project.name, "vi");
    });

  const items = candidates.slice(0, maxVisible).map(({ project }) => {
    const cta = dataQualityCta(project);
    return {
      projectId: project.id,
      projectCode: project.code,
      projectName: project.name,
      badgeLabel: project.completenessCategory === "COMPLETE"
        ? getActualProgressDataLabel(project)
        : completenessPresentation[project.completenessCategory].label,
      reason: dataQualityReason(project),
      ctaLabel: cta.label,
      href: cta.href,
      priority: dataQualityPriority(project) >= 460 ? "HIGH" as const : "MEDIUM" as const,
      plannedProgressPercent: project.plannedProgressPercent,
      actualProgressPercent: project.actualProgressPercent,
      variancePercent: project.variancePercent,
      lastActualProgressAt: project.lastActualProgressAt,
    };
  });

  return { totalCount: candidates.length, visibleCount: items.length, maxVisible, items };
}

export type ProjectNextAction = {
  id: string;
  label: string;
  description: string;
  href: string;
};

export function selectProjectNextActions(project: DashboardProjectOverview): ProjectNextAction[] {
  const actions: ProjectNextAction[] = [];

  if (project.plannedProgressPercent === null) {
    actions.push({ id: "plan", label: "Bổ sung kế hoạch", description: "Thiết lập mốc tiến độ để có cơ sở đối chiếu.", href: `/projects/${project.id}/edit` });
  }
  if (project.actualProgressDataStatus === "NO_PROGRESS_ITEMS") {
    actions.push({ id: "wbs", label: "Thiết lập WBS", description: "Tạo hạng mục khối lượng cho công trình.", href: `/projects/${project.id}/field-progress` });
  } else if (project.actualProgressDataStatus === "NO_APPROVED_ENTRIES") {
    actions.push({ id: "entries", label: "Nhập hoặc phê duyệt khối lượng", description: "Bổ sung bản ghi thực tế đủ điều kiện tổng hợp.", href: `/projects/${project.id}/field-progress/daily` });
  } else if (project.actualProgressDataStatus === "MULTIPLE_ACTIVE_TEMPLATES") {
    actions.push({ id: "templates", label: "Xử lý biểu mẫu đang trùng", description: "Chỉ duy trì một biểu mẫu tiến độ hoạt động.", href: `/projects/${project.id}/field-progress` });
  } else if (project.actualProgressDataStatus !== "AVAILABLE") {
    actions.push({ id: "quality", label: "Kiểm tra dữ liệu khối lượng", description: getActualProgressDataLabel(project), href: `/projects/${project.id}/field-progress/summary` });
  }

  actions.push({ id: "summary", label: "Mở tổng hợp tiến độ", description: "Đối chiếu kế hoạch và khối lượng thực tế được phê duyệt.", href: `/projects/${project.id}/field-progress/summary` });
  actions.push({ id: "detail", label: "Mở chi tiết công trình", description: "Xem hồ sơ, thành viên và các phân hệ liên quan.", href: `/projects/${project.id}` });

  return actions.slice(0, 5);
}
