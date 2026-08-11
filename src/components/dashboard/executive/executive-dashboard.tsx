"use client";

import { useState } from 'react';
import type { DashboardData } from '@/lib/dashboard/dashboard-queries';
import { resolveDashboardContext } from '@/lib/dashboard/dashboard-context';
import { ExecutiveHeader } from './executive-header';
import { ProjectTimeProgressDrawer } from './project-time-progress-drawer';
import { ExecutiveDetailDrawer, type DrawerType } from './executive-detail-drawer';
import { PortfolioExecutiveDashboard } from './portfolio-executive-dashboard';
import { ProjectExecutiveDashboard } from './project-executive-dashboard';

export function ExecutiveDashboard({ data }: { data: DashboardData }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeDrawerType, setActiveDrawerType] = useState<DrawerType>(null);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);

  const context = resolveDashboardContext(data.selectedProjectId);

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
    <div className="executive-dashboard-shell mx-auto flex w-full max-w-full flex-col gap-5 pb-8 sm:gap-6">
      <ExecutiveHeader 
        data={data} 
        context={context}
      />

      {context.mode === "PORTFOLIO" ? (
        <PortfolioExecutiveDashboard data={data} onOpenDrawer={handleOpenDrawer} />
      ) : (
        <ProjectExecutiveDashboard data={data} context={context} onOpenDrawer={handleOpenDrawer} />
      )}
      
      <ProjectTimeProgressDrawer projects={data.projectOverview} />

      {/* Centralized Executive Detail Drawer */}
      <ExecutiveDetailDrawer
        isOpen={drawerOpen}
        drawerType={activeDrawerType}
        targetId={activeTargetId}
        projectId={context.projectId}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
