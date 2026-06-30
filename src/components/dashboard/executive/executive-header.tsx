import Link from 'next/link';
import type { DashboardData } from '@/lib/dashboard/dashboard-queries';
import { cn } from '@/lib/utils';
import { ExecutiveLiveClock } from './executive-live-clock';

export function ExecutiveHeader({ data }: { data: DashboardData }) {
  const pendingActions = data.actionItems.length;
  const atRiskProjects = data.projectOverview.filter(p => p.health === 'AT_RISK' || p.health === 'DELAYED').length;
  const pendingApprovals = data.pendingApprovals.length;

  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3">
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight sm:text-2xl">
              Tổng quan điều hành hôm nay
            </h1>
            <p className="text-[13px] font-medium text-slate-500 flex items-center">
              <ExecutiveLiveClock />
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Link 
              href="#action-items"
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors",
                pendingActions > 0 
                  ? "border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100/70"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100/70"
              )}
            >
              <span className="font-bold">{pendingActions}</span> việc cần xử lý
            </Link>
            
            <Link 
              href="#project-progress" 
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors",
                atRiskProjects > 0
                  ? "border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100/70"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100/70"
              )}
            >
              <span className="font-bold">{atRiskProjects}</span> công trình rủi ro
            </Link>
            
            <Link 
              href={data.selectedProjectId ? `/approvals?projectId=${data.selectedProjectId}&status=PENDING` : `/approvals?status=PENDING`}
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-3 py-1 text-[13px] font-medium transition-colors",
                pendingApprovals > 0
                  ? "border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-100/70"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100/70"
              )}
            >
              <span className="font-bold">{pendingApprovals}</span> hồ sơ chờ duyệt
            </Link>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start lg:self-auto rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[12px] font-bold uppercase tracking-wide text-emerald-700">Live</span>
        </div>
      </div>
    </section>
  );
}
