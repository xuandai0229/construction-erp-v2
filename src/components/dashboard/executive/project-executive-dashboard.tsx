import type { DashboardData } from "@/lib/dashboard/dashboard-queries";
import type { DashboardContext } from "@/lib/dashboard/dashboard-context";
import { ContentCard } from "@/components/ui/enterprise";
import { ExecutiveSiteReportHighlights } from "./executive-site-report-highlights";
import {
  ProjectDataHealthCard,
  ProjectIssuesCard,
  ProjectNextActionsCard,
  ProjectProgressCard,
} from "./project-dashboard-cards";
import type { DrawerType } from "./executive-detail-drawer";

export function ProjectExecutiveDashboard({
  data,
  context,
  onOpenDrawer,
}: {
  data: DashboardData;
  context: Extract<DashboardContext, { mode: "PROJECT" }>;
  onOpenDrawer: (type: DrawerType, targetId?: string | null) => void;
}) {
  const project = data.projectOverview.find((item) => item.id === context.projectId);

  if (!project) {
    return (
      <ContentCard data-dashboard-mode="PROJECT" className="p-6 text-center">
        <h2 className="text-base font-bold text-slate-900">Không thể tải dữ liệu công trình đã chọn</h2>
        <p className="mt-1 text-sm text-slate-500">Phạm vi đã được xác thực nhưng dữ liệu tổng quan không còn khả dụng. Hãy tải lại trang hoặc chọn lại công trình.</p>
      </ContentCard>
    );
  }

  const pendingApprovalCount = data.pendingApprovals.filter((item) => item.projectId === project.id).length;

  return (
    <div data-dashboard-mode="PROJECT" data-dashboard-project-id={context.projectId} className="contents">
      <div className="dashboard-row-grid dashboard-project-summary-row" data-dashboard-row="project-summary">
        <ProjectProgressCard project={project} />
        <ProjectDataHealthCard project={project} />
      </div>

      <div className="dashboard-row-grid dashboard-project-action-row" data-dashboard-row="project-actions">
        <ProjectIssuesCard project={project} actionItems={data.actionItems} />
        <ProjectNextActionsCard project={project} pendingApprovalCount={pendingApprovalCount} />
      </div>

      <ExecutiveSiteReportHighlights
        reports={data.recentSiteReports}
        selectedProjectId={context.projectId}
        onOpenReportDrawer={(reportId) => onOpenDrawer("SITE_REPORT", reportId)}
      />
    </div>
  );
}
