"use client";

import { Building2, TriangleAlert, ClipboardCheck, ArrowUp, ArrowDown, Hammer, ListChecks } from 'lucide-react';
import type { DashboardData } from '@/lib/dashboard/dashboard-queries';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ExecutiveIcon, type IconColorTone } from './executive-icon';
import { getProjectStatusMeta } from '@/lib/project-status';
import type { DrawerType } from './executive-detail-drawer';

export function ExecutiveKpiGrid({ 
  data,
  onOpenDrawer,
}: { 
  data: DashboardData;
  onOpenDrawer?: (type: DrawerType, targetId?: string) => void;
}) {
  const projectsKpi = data.kpis.find(k => k.id === 'projects');

  const activeMatch = projectsKpi?.description.match(/(\d+)\/(\d+)/);
  const activeCount = activeMatch ? parseInt(activeMatch[1]) : 0;
  const totalCount = activeMatch ? parseInt(activeMatch[2]) : 0;

  const atRiskCount = data.projectOverview.filter(p => p.health === 'AT_RISK' || p.health === 'DELAYED').length;

  const reportsKpi = data.kpis.find(k => k.id === 'documents-reports');
  const reportsCount = reportsKpi ? parseInt(reportsKpi.value) : 0;
  const entriesToday = Number(data.kpis.find(k => k.id === 'entries-today')?.value ?? 0);
  const actionCount = data.totalActionCount ?? data.actionItems.length;
  const pendingApprovalsCount = data.pendingApprovals.length;

  const isSingleProject = !!data.selectedProjectId;
  const currentProject = isSingleProject && data.projectOverview.length > 0 ? data.projectOverview[0] : null;
  const currentProjectStatusMeta = currentProject ? getProjectStatusMeta(currentProject.status) : null;

  const kpis = isSingleProject && currentProject ? [
    {
      id: 'status',
      label: 'Trạng thái',
      value: currentProjectStatusMeta?.label ?? 'Chưa xác định',
      subtext: 'Giai đoạn hiện tại',
      icon: currentProject.status === 'PLANNING' ? ClipboardCheck : currentProject.status === 'ACTIVE' ? Hammer : currentProject.status === 'ON_HOLD' ? TriangleAlert : Building2,
      tone: (currentProject.status === 'ACTIVE' || currentProject.status === 'COMPLETED' ? 'emerald' : currentProject.status === 'ON_HOLD' ? 'amber' : 'slate') as IconColorTone,
      drawerType: 'PROJECT_STATUS' as DrawerType,
    },
    {
      id: 'time-progress',
      label: 'Lịch thi công',
      value: currentProject.progressPercent !== null ? `${Math.round(currentProject.progressPercent)}%` : '--',
      subtext: 'Theo thời gian thi công',
      icon: Building2,
      tone: (currentProject.health === 'ON_TRACK' || currentProject.health === 'COMPLETED' ? 'emerald' : currentProject.health === 'AT_RISK' ? 'amber' : 'rose') as IconColorTone,
      trend: currentProject.health === 'DELAYED' ? 'down' : undefined,
      drawerType: 'PROJECT_STATUS' as DrawerType,
    },
    {
      id: 'pending-approvals',
      label: 'Hồ sơ chờ duyệt',
      value: pendingApprovalsCount,
      subtext: pendingApprovalsCount > 0 ? 'Cần xử lý' : 'Đã duyệt hết',
      icon: ClipboardCheck,
      tone: (pendingApprovalsCount > 0 ? 'amber' : 'slate') as IconColorTone,
      trend: pendingApprovalsCount > 0 ? 'neutral' : undefined,
      drawerType: 'PENDING_APPROVALS' as DrawerType, // Rule III: MUST OPEN PENDING_APPROVALS
    },
    {
      id: 'entries-today',
      label: 'Khối lượng hôm nay',
      value: entriesToday,
      subtext: 'Bản ghi hiện trường',
      icon: Hammer,
      tone: 'violet' as IconColorTone,
      drawerType: 'VOLUME' as DrawerType,
    },
    {
      id: 'actions',
      label: 'Việc cần xử lý',
      value: actionCount,
      subtext: actionCount > 0 ? 'Cần hành động' : 'Không có tồn đọng',
      icon: ListChecks,
      tone: 'orange' as IconColorTone,
      trend: actionCount > 0 ? 'neutral' : undefined,
      drawerType: 'ACTIONS' as DrawerType, // Rule IV: MUST OPEN ACTIONS
    },
    {
      id: 'reports-7d',
      label: 'Báo cáo 7 ngày',
      value: reportsCount,
      subtext: 'Báo cáo hiện trường',
      icon: ClipboardCheck,
      tone: 'sky' as IconColorTone,
      trend: reportsCount > 0 ? 'up' : undefined,
      drawerType: 'REPORTS_7D' as DrawerType,
    }
  ] : [
    {
      id: 'total-projects',
      label: 'Tổng công trình',
      value: totalCount,
      subtext: 'Danh mục công trình',
      icon: Building2,
      tone: 'blue' as IconColorTone,
      drawerType: 'PROJECT_STATUS' as DrawerType,
    },
    {
      id: 'active-projects',
      label: 'Đang thi công',
      value: activeCount,
      subtext: totalCount > 0 ? `${((activeCount / totalCount) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% đang triển khai` : '0%',
      icon: Hammer,
      tone: 'emerald' as IconColorTone,
      trend: 'up',
      drawerType: 'PROJECT_STATUS' as DrawerType,
    },
    {
      id: 'risk',
      label: 'Rủi ro',
      value: atRiskCount,
      subtext: 'Cần theo dõi',
      icon: TriangleAlert,
      tone: 'rose' as IconColorTone,
      trend: atRiskCount > 0 ? 'up-bad' : undefined,
      drawerType: 'RISK' as DrawerType,
    },
    {
      id: 'entries-today',
      label: 'Khối lượng hôm nay',
      value: entriesToday,
      subtext: 'Bản ghi hiện trường',
      icon: Hammer,
      tone: 'violet' as IconColorTone,
      drawerType: 'VOLUME' as DrawerType,
    },
    {
      id: 'actions',
      label: 'Việc cần xử lý',
      value: actionCount,
      subtext: actionCount > 0 ? 'Cần hành động' : 'Không có tồn đọng',
      icon: ListChecks,
      tone: 'orange' as IconColorTone,
      trend: actionCount > 0 ? 'neutral' : undefined,
      drawerType: 'ACTIONS' as DrawerType,
    },
    {
      id: 'reports-7d',
      label: 'Báo cáo 7 ngày',
      value: reportsCount,
      subtext: 'Toàn hệ thống',
      icon: ClipboardCheck,
      tone: 'sky' as IconColorTone,
      trend: reportsCount > 0 ? 'up' : undefined,
      drawerType: 'REPORTS_7D' as DrawerType,
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi, index) => {
        const cardContent = (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1 flex-1 min-w-0 pr-1">
                <p className="text-[11.5px] font-bold uppercase tracking-wider text-slate-500 leading-tight">
                  {kpi.label}
                </p>
                <h3 className={cn(
                  "text-slate-900 mt-1",
                  typeof kpi.value === 'string' && kpi.value.length > 14 
                    ? "text-[15px] sm:text-[16px] font-bold leading-snug whitespace-normal break-words line-clamp-2" 
                    : "text-[19px] sm:text-[21px] font-extrabold whitespace-nowrap leading-tight tracking-tight"
                )}>
                  {kpi.value}
                </h3>
              </div>
              <div className="shrink-0 flex items-center justify-center">
                <ExecutiveIcon icon={kpi.icon} tone={kpi.tone} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 pt-1">
              {kpi.trend === 'up' && <ArrowUp className="h-3 w-3 shrink-0 text-emerald-500" />}
              {kpi.trend === 'down' && <ArrowDown className="h-3 w-3 shrink-0 text-rose-500" />}
              {kpi.trend === 'up-bad' && <ArrowUp className="h-3 w-3 shrink-0 text-rose-500" />}
              {kpi.trend === 'neutral' && <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />}
              <span className="truncate whitespace-nowrap text-[11.5px] font-medium text-slate-500">
                {kpi.subtext}
              </span>
            </div>
          </>
        );

        if (kpi.drawerType && onOpenDrawer) {
          return (
            <button
              key={index}
              type="button"
              onClick={() => onOpenDrawer(kpi.drawerType!)}
              className="group flex min-h-[115px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md text-left cursor-pointer"
            >
              {cardContent}
            </button>
          );
        }

        return (
          <Link
            key={index}
            href={(kpi as any).href || '#'}
            className="group flex min-h-[115px] flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4.5 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
          >
            {cardContent}
          </Link>
        );
      })}
    </div>
  );
}
