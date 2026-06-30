import type { DashboardData } from '@/lib/dashboard/dashboard-queries';
import { ExecutiveHeader } from './executive-header';
import { ExecutiveKpiGrid } from './executive-kpi-grid';
import { ExecutiveActionList } from './executive-action-list';
import { ExecutiveProjectProgress } from './executive-project-progress';
import { ExecutiveFinancePanel } from './executive-finance-panel';
import { ExecutiveSiteReportHighlights } from './executive-site-report-highlights';
import { ExecutiveActivityFeed } from './executive-activity-feed';
import { ExecutiveStatusChart } from './executive-status-chart';

export function ExecutiveDashboard({ data }: { data: DashboardData }) {
  const pendingApprovals = data.pendingApprovals || [];
  
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 sm:gap-6 pb-8">
      <ExecutiveHeader data={data} />
      
      <ExecutiveKpiGrid data={data} />

      <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        {/* Left Column - 7 cols */}
        <div className="flex w-full flex-col gap-5 lg:col-span-7 lg:gap-6">
          <ExecutiveActionList 
            title="Cần xử lý ngay" 
            items={data.actionItems.slice(0, 5)} 
            count={data.actionItems.length}
            viewAllHref="/dashboard/actions" 
          />
          
          <ExecutiveProjectProgress projects={data.projectOverview} />
          
          <ExecutiveSiteReportHighlights reports={data.recentSiteReports} />
          
          <ExecutiveActivityFeed activities={data.activityTimeline} />
        </div>

        {/* Right Column - 5 cols */}
        <div className="flex w-full flex-col gap-5 lg:col-span-5 lg:gap-6">
          <ExecutiveActionList 
            title="Phê duyệt chờ xử lý" 
            items={pendingApprovals.slice(0, 5)} 
            viewAllHref="/approvals" 
          />
          
          {data.permissions.canViewFinanceDashboard && data.financeSummary && (
            <ExecutiveFinancePanel summary={data.financeSummary} />
          )}
          
          <ExecutiveStatusChart projects={data.projectOverview} />
        </div>
      </div>
    </div>
  );
}
