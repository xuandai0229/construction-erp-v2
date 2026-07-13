import type { DashboardData } from '@/lib/dashboard/dashboard-queries';
import { ExecutiveHeader } from './executive-header';
import { ExecutiveKpiGrid } from './executive-kpi-grid';
import { ExecutiveActionList } from './executive-action-list';
import { ExecutiveProjectProgress } from './executive-project-progress';
import { ExecutiveSiteReportHighlights } from './executive-site-report-highlights';
import { ExecutiveStatusChart } from './executive-status-chart';
import { ProjectTimeProgressDrawer } from './project-time-progress-drawer';

export function ExecutiveDashboard({ data }: { data: DashboardData }) {
  const pendingApprovals = data.pendingApprovals || [];

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 sm:gap-6 pb-8">
      <ExecutiveHeader data={data} />

      <ExecutiveKpiGrid data={data} />

      {/* Row 1: Actions & Approvals */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6 items-stretch">
        <div className="h-full">
          <ExecutiveActionList
            title="Cần xử lý ngay"
            items={data.actionItems.slice(0, 5)}
            count={data.actionItems.length}
            viewAllHref="/dashboard/actions"
          />
        </div>
        <div className="h-full">
          <ExecutiveActionList
            title="Phê duyệt chờ xử lý"
            items={pendingApprovals.slice(0, 5)}
            viewAllHref="/approvals"
          />
        </div>
      </div>

      {/* Row 2: Progress & construction status */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6 items-stretch">
        <div className="flex flex-col lg:col-span-7">
          <ExecutiveProjectProgress projects={data.projectOverview} />
        </div>
        <div className="flex flex-col lg:col-span-5">
          <ExecutiveStatusChart projects={data.projectOverview} />
        </div>
      </div>

      {/* Row 3: Field reports */}
      <div className="grid grid-cols-1 gap-5 items-stretch">
        <div className="flex flex-col">
          <ExecutiveSiteReportHighlights reports={data.recentSiteReports} />
        </div>
      </div>
      
      <ProjectTimeProgressDrawer projects={data.projectOverview} />
    </div>
  );
}
