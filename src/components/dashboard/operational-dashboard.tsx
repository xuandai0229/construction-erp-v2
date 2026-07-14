import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { DashboardKpiGrid } from '@/components/dashboard/dashboard-kpi-grid';
import { DashboardActionList } from '@/components/dashboard/dashboard-action-list';
import { DashboardProjectOverviewList } from '@/components/dashboard/dashboard-project-overview';
import { DashboardRecentDocuments } from '@/components/dashboard/dashboard-recent-documents';
import { DashboardRecentSiteReports } from '@/components/dashboard/dashboard-recent-site-reports';
import { DashboardActivityTimeline } from '@/components/dashboard/dashboard-activity-timeline';
import type { DashboardData } from '@/lib/dashboard/dashboard-queries';

export function OperationalDashboard({ data }: { data: DashboardData }) {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 overflow-x-hidden px-0 py-0 sm:gap-6">
      <DashboardHeader data={data} />

      {/* MOBILE LAYOUT */}
      <div className="flex flex-col gap-4 lg:hidden">
        <DashboardActionList
          title="Cần xử lý ngay"
          description="Tổng hợp công việc, báo cáo, và yêu cầu chờ xử lý."
          items={data.actionItems}
          emptyTitle="Không có việc cần xử lý ngay"
        />
        
        {data.permissions.canViewApprovalDashboard && data.pendingApprovals.length > 0 && (
          <DashboardActionList
            title="Phê duyệt chờ xử lý"
            items={data.pendingApprovals}
            emptyTitle="Chưa có đề xuất cần duyệt"
          />
        )}
        
        <DashboardKpiGrid kpis={data.kpis} />
        
        <DashboardProjectOverviewList projects={data.projectOverview} />
        
        <DashboardRecentSiteReports reports={data.recentSiteReports} />
        
        <DashboardRecentDocuments documents={data.recentDocuments} />
        
        <DashboardActivityTimeline activities={data.activityTimeline} />
      </div>

      {/* DESKTOP LAYOUT */}
      <div className="hidden lg:flex lg:flex-col lg:gap-6">
        <DashboardKpiGrid kpis={data.kpis} />

        <div className="grid grid-cols-12 gap-6">
          <div className="space-y-6 col-span-8">
            <DashboardActionList
              title="Cần xử lý ngay"
              description="Tổng hợp phê duyệt, tiến độ, báo cáo và vật tư theo dữ liệu thật."
              items={data.actionItems}
              emptyTitle="Không có việc cần xử lý ngay"
            />
            <DashboardProjectOverviewList projects={data.projectOverview} />
            <DashboardRecentSiteReports reports={data.recentSiteReports} />
          </div>

          <div className="space-y-6 col-span-4">
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
      </div>
    </div>
  );
}
