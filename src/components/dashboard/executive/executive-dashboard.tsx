"use client";

import { useState } from 'react';
import type { DashboardData } from '@/lib/dashboard/dashboard-queries';
import { ExecutiveHeader } from './executive-header';
import { ExecutiveKpiGrid } from './executive-kpi-grid';
import { ExecutiveActionList } from './executive-action-list';
import { ExecutiveProjectProgress } from './executive-project-progress';
import { ExecutiveSiteReportHighlights } from './executive-site-report-highlights';
import { ExecutiveStatusChart } from './executive-status-chart';
import { ProjectTimeProgressDrawer } from './project-time-progress-drawer';
import { ExecutiveDetailDrawer, type DrawerType } from './executive-detail-drawer';

export function ExecutiveDashboard({ data }: { data: DashboardData }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeDrawerType, setActiveDrawerType] = useState<DrawerType>(null);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);

  const selectedProjectId = data.selectedProjectId;
  const pendingApprovals = data.pendingApprovals || [];

  function handleOpenDrawer(type: DrawerType, targetId?: string | null) {
    setActiveDrawerType(type);
    setActiveTargetId(targetId ?? null);
    setDrawerOpen(true);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setActiveDrawerType(null);
    setActiveTargetId(null);
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 sm:gap-6 pb-8">
      <ExecutiveHeader 
        data={data} 
        onOpenDrawer={handleOpenDrawer}
      />

      <ExecutiveKpiGrid 
        data={data} 
        onOpenDrawer={handleOpenDrawer}
      />

      {/* Row 1: Actions & Approvals */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6 items-stretch">
        <div className="h-full">
          <ExecutiveActionList
            title="Cần xử lý ngay"
            items={data.actionItems.slice(0, 4)}
            count={data.totalActionCount}
            viewAllHref={selectedProjectId ? `/dashboard/actions?projectId=${selectedProjectId}` : "/dashboard/actions"}
            selectedProjectId={selectedProjectId}
            onOpenDrawer={handleOpenDrawer}
          />
        </div>
        <div className="h-full">
          <ExecutiveActionList
            title="Phê duyệt chờ xử lý"
            items={pendingApprovals.slice(0, 5)}
            viewAllHref={selectedProjectId ? `/approvals?projectId=${selectedProjectId}` : "/approvals"}
            selectedProjectId={selectedProjectId}
            onOpenDrawer={handleOpenDrawer}
          />
        </div>
      </div>

      {/* Row 2: Progress & construction status */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6 items-stretch">
        <div className="flex flex-col lg:col-span-7">
          <ExecutiveProjectProgress 
            projects={data.projectOverview} 
            selectedProjectId={selectedProjectId}
            onOpenRiskDrawer={() => handleOpenDrawer("RISK")}
          />
        </div>
        <div className="flex flex-col lg:col-span-5">
          <ExecutiveStatusChart 
            data={data} 
            onOpenDrawer={handleOpenDrawer}
          />
        </div>
      </div>

      {/* Row 3: Field reports */}
      <div className="grid grid-cols-1 gap-5 items-stretch">
        <div className="flex flex-col">
          <ExecutiveSiteReportHighlights 
            reports={data.recentSiteReports} 
            selectedProjectId={selectedProjectId}
            onOpenReportDrawer={(reportId) => handleOpenDrawer("SITE_REPORT", reportId)}
          />
        </div>
      </div>
      
      <ProjectTimeProgressDrawer projects={data.projectOverview} />

      {/* Centralized Executive Detail Drawer */}
      <ExecutiveDetailDrawer
        isOpen={drawerOpen}
        drawerType={activeDrawerType}
        targetId={activeTargetId}
        projectId={selectedProjectId}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
