import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardKpiGrid } from '@/components/dashboard/dashboard-kpi-grid';
import { DashboardActionList } from '@/components/dashboard/dashboard-action-list';
import { DashboardProjectOverviewList } from '@/components/dashboard/dashboard-project-overview';
import { DashboardFinanceSummaryPanel } from '@/components/dashboard/dashboard-finance-summary';
import { DashboardRecentDocuments } from '@/components/dashboard/dashboard-recent-documents';
import { DashboardRecentSiteReports } from '@/components/dashboard/dashboard-recent-site-reports';
import { DashboardActivityTimeline } from '@/components/dashboard/dashboard-activity-timeline';
import type { DashboardData } from '@/lib/dashboard/dashboard-queries';

export function OperationalDashboard({ data }: { data: DashboardData }) {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 overflow-x-hidden px-0 py-0 sm:gap-6">
      <DashboardHeader data={data} />
      <DashboardKpiGrid kpis={data.kpis} />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-5 lg:col-span-8 lg:space-y-6">
          <DashboardActionList
            title="Cần xử lý ngay"
            description="Tổng hợp phê duyệt, tiến độ, báo cáo và vật tư theo dữ liệu thật."
            items={data.actionItems}
            emptyTitle="Không có việc cần xử lý ngay"
          />
          <DashboardProjectOverviewList projects={data.projectOverview} />
          <DashboardRecentSiteReports reports={data.recentSiteReports} />
        </div>

        <div className="space-y-5 lg:col-span-4 lg:space-y-6">
          {data.permissions.canViewApprovalDashboard && (
            <DashboardActionList
              title="Phê duyệt chờ xử lý"
              items={data.pendingApprovals}
              emptyTitle="Chưa có đề xuất cần duyệt"
            />
          )}
          <DashboardRecentDocuments documents={data.recentDocuments} />
          <DashboardActivityTimeline activities={data.activityTimeline} />
        </div>
      </div>

      {data.financeSummary && (
        <DashboardFinanceSummaryPanel summary={data.financeSummary} />
      )}
    </div>
  );
}
