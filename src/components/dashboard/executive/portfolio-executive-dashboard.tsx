import type { DashboardData } from "@/lib/dashboard/dashboard-queries";
import {
  selectDataQualityPriorityProjects,
  selectOperationalInterventionProjects,
} from "@/lib/dashboard/dashboard-information-architecture";
import { ExecutiveKpiGrid } from "./executive-kpi-grid";
import { ExecutiveProjectProgress } from "./executive-project-progress";
import { ExecutiveStatusChart } from "./executive-status-chart";
import { PortfolioPriorityListCard } from "./portfolio-priority-lists";
import { ExecutiveActionList } from "./executive-action-list";
import { ExecutiveSiteReportHighlights } from "./executive-site-report-highlights";
import type { DrawerType } from "./executive-detail-drawer";

export function PortfolioExecutiveDashboard({
  data,
  onOpenDrawer,
}: {
  data: DashboardData;
  onOpenDrawer: (type: DrawerType, targetId?: string | null) => void;
}) {
  const operational = selectOperationalInterventionProjects(data);
  const operationalIds = new Set(operational.items.map((item) => item.projectId));
  const dataQuality = selectDataQualityPriorityProjects(data.projectOverview, { preferDifferentFrom: operationalIds });

  return (
    <div data-dashboard-mode="PORTFOLIO" className="contents">
      <ExecutiveKpiGrid data={data} onOpenDrawer={onOpenDrawer} />

      <div className="dashboard-row-grid dashboard-summary-row" data-dashboard-row="portfolio-summary">
        <ExecutiveProjectProgress projects={data.projectOverview} />
        <ExecutiveStatusChart projects={data.projectOverview} />
      </div>

      <div className="dashboard-row-grid dashboard-list-row" data-dashboard-row="portfolio-lists">
        <PortfolioPriorityListCard kind="OPERATIONAL" selection={operational} />
        <PortfolioPriorityListCard kind="DATA_QUALITY" selection={dataQuality} />
      </div>

      <ExecutiveActionList
        title="Phê duyệt chờ xử lý"
        items={data.pendingApprovals.slice(0, 5)}
        count={data.pendingApprovals.length}
        viewAllHref="/approvals"
        onOpenDrawer={onOpenDrawer}
      />

      <ExecutiveSiteReportHighlights
        reports={data.recentSiteReports}
        onOpenReportDrawer={(reportId) => onOpenDrawer("SITE_REPORT", reportId)}
      />
    </div>
  );
}
