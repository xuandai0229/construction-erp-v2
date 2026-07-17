import { Building2, TriangleAlert, ClipboardCheck, ArrowUp, ArrowDown, Hammer, ListChecks } from 'lucide-react';
import type { DashboardData } from '@/lib/dashboard/dashboard-queries';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ExecutiveIcon, type IconColorTone } from './executive-icon';
import { getProjectStatusMeta } from '@/lib/project-status';

export function ExecutiveKpiGrid({ data }: { data: DashboardData }) {
  const projectsKpi = data.kpis.find(k => k.id === 'projects');

  const activeMatch = projectsKpi?.description.match(/(\d+)\/(\d+)/);
  const activeCount = activeMatch ? parseInt(activeMatch[1]) : 0;
  const totalCount = activeMatch ? parseInt(activeMatch[2]) : 0;

  const atRiskCount = data.projectOverview.filter(p => p.health === 'AT_RISK' || p.health === 'DELAYED').length;

  const reportsKpi = data.kpis.find(k => k.id === 'documents-reports');
  const reportsCount = reportsKpi ? parseInt(reportsKpi.value) : 0;
  const entriesToday = Number(data.kpis.find(k => k.id === 'entries-today')?.value ?? 0);
  const actionCount = data.actionItems.length;

  const isSingleProject = !!data.selectedProjectId;
  const currentProject = isSingleProject && data.projectOverview.length > 0 ? data.projectOverview[0] : null;
  const currentProjectStatusMeta = currentProject ? getProjectStatusMeta(currentProject.status) : null;

  const kpis = isSingleProject && currentProject ? [
    {
      label: 'Trạng thái',
      value: currentProjectStatusMeta?.label ?? 'Chưa xác định',
      subtext: 'Giai đoạn hiện tại',
      icon: currentProject.status === 'PLANNING' ? ClipboardCheck : currentProject.status === 'ACTIVE' ? Hammer : currentProject.status === 'ON_HOLD' ? TriangleAlert : Building2,
      tone: (currentProject.status === 'ACTIVE' || currentProject.status === 'COMPLETED' ? 'emerald' : currentProject.status === 'ON_HOLD' ? 'amber' : 'slate') as IconColorTone,
      href: `/projects/${currentProject.id}`
    },
    {
      label: 'Lịch thi công',
      value: currentProject.progressPercent !== null ? `${Math.round(currentProject.progressPercent)}%` : '--',
      subtext: 'Theo thời gian thi công',
      icon: Building2,
      tone: (currentProject.health === 'ON_TRACK' || currentProject.health === 'COMPLETED' ? 'emerald' : currentProject.health === 'AT_RISK' ? 'amber' : 'rose') as IconColorTone,
      trend: currentProject.health === 'DELAYED' ? 'down' : undefined,
      href: `?timeProgressDrawer=${currentProject.id}`
    },
    {
      label: 'Hồ sơ chờ duyệt',
      value: data.pendingApprovals.length,
      subtext: data.pendingApprovals.length > 0 ? 'Cần xử lý' : 'Đã duyệt hết',
      icon: ClipboardCheck,
      tone: (data.pendingApprovals.length > 0 ? 'amber' : 'slate') as IconColorTone,
      trend: data.pendingApprovals.length > 0 ? 'neutral' : undefined,
      href: '/approvals'
    },
    {
      label: 'Khối lượng hôm nay',
      value: entriesToday,
      subtext: 'Bản ghi hiện trường',
      icon: Hammer,
      tone: 'violet' as IconColorTone,
      href: `/projects/${currentProject.id}/field-progress/daily`
    },
    {
      label: 'Việc cần xử lý',
      value: actionCount,
      subtext: actionCount > 0 ? 'Cần hành động' : 'Không có tồn đọng',
      icon: ListChecks,
      tone: 'orange' as IconColorTone,
      trend: actionCount > 0 ? 'neutral' : undefined,
      href: '/dashboard'
    },
    {
      label: 'Báo cáo 7 ngày',
      value: reportsCount,
      subtext: 'Báo cáo hiện trường',
      icon: ClipboardCheck,
      tone: 'sky' as IconColorTone,
      trend: reportsCount > 0 ? 'up' : undefined,
      href: `/reports?projectId=${currentProject.id}`
    }
  ] : [
    {
      label: 'Tổng công trình',
      value: totalCount,
      subtext: 'Danh mục công trình',
      icon: Building2,
      tone: 'blue' as IconColorTone,
      href: '/projects'
    },
    {
      label: 'Đang thi công',
      value: activeCount,
      subtext: totalCount > 0 ? `${((activeCount / totalCount) * 100).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}% đang triển khai` : '0%',
      icon: Hammer,
      tone: 'emerald' as IconColorTone,
      trend: 'up',
      href: '/projects?status=ACTIVE'
    },
    {
      label: 'Rủi ro',
      value: atRiskCount,
      subtext: 'Cần theo dõi',
      icon: TriangleAlert,
      tone: 'rose' as IconColorTone,
      trend: atRiskCount > 0 ? 'up-bad' : undefined,
      href: '/projects'
    },
    {
      label: 'Khối lượng hôm nay',
      value: entriesToday,
      subtext: 'Bản ghi hiện trường',
      icon: Hammer,
      tone: 'violet' as IconColorTone,
      href: '/projects'
    },
    {
      label: 'Việc cần xử lý',
      value: actionCount,
      subtext: actionCount > 0 ? 'Cần hành động' : 'Không có tồn đọng',
      icon: ListChecks,
      tone: 'orange' as IconColorTone,
      trend: actionCount > 0 ? 'neutral' : undefined,
      href: '/dashboard'
    },
    {
      label: 'Báo cáo 7 ngày',
      value: reportsCount,
      subtext: 'Toàn hệ thống',
      icon: ClipboardCheck,
      tone: 'sky' as IconColorTone,
      trend: reportsCount > 0 ? 'up' : undefined,
      href: '/reports'
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi, index) => (
        <Link
          key={index}
          href={kpi.href || '#'}
          className="group flex min-h-[120px] flex-col justify-between rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition-all duration-300 hover:-translate-y-1 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-elevated)] ring-1 ring-inset ring-slate-900/5 dark:ring-white/5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 flex-1 min-w-0 pr-2">
              <p className="truncate whitespace-nowrap text-[12px] font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
                {kpi.label}
              </p>
              <h3 className={cn(
                "text-[var(--foreground)] mt-1.5",
                typeof kpi.value === 'string' && kpi.value.length > 14 
                  ? "text-[16px] sm:text-[17px] font-semibold leading-tight whitespace-normal break-words line-clamp-2" 
                  : "text-[18px] sm:text-[19px] font-semibold whitespace-nowrap leading-tight"
              )}>
                {kpi.value}
              </h3>
            </div>
            <div className="shrink-0 flex items-center justify-center">
              <ExecutiveIcon icon={kpi.icon} tone={kpi.tone} />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            {kpi.trend === 'up' && <ArrowUp className="h-3 w-3 shrink-0 text-emerald-500" />}
            {kpi.trend === 'down' && <ArrowDown className="h-3 w-3 shrink-0 text-rose-500" />}
            {kpi.trend === 'up-bad' && <ArrowUp className="h-3 w-3 shrink-0 text-rose-500" />}
            {kpi.trend === 'neutral' && <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />}
            <span className="truncate whitespace-nowrap text-[11px] font-medium text-[var(--muted-foreground)]">
              {kpi.subtext}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
