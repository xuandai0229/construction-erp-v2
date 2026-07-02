import Link from 'next/link';
import type { DashboardData } from '@/lib/dashboard/dashboard-queries';
import { cn } from '@/lib/utils';
import { ExecutiveLiveClock } from './executive-live-clock';

export function ExecutiveHeader({ data }: { data: DashboardData }) {
  const pendingActions = data.actionItems.length;
  const atRiskProjects = data.projectOverview.filter(p => p.health === 'AT_RISK' || p.health === 'DELAYED').length;
  const pendingApprovals = data.pendingApprovals.length;

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-slate-200/70 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.07)] min-h-[160px] md:min-h-[210px] xl:min-h-[240px] flex flex-col justify-center">
      {/* Background Image Layer */}
      <div
        className="absolute inset-0 z-0 bg-no-repeat bg-cover bg-[center_right]"
        style={{ backgroundImage: "url('/images/dashboard/dashboard-hero-2400x420-v4.png')" }}
      />

      {/* Gradient Readability Layer */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.92) 30%, rgba(255,255,255,0.58) 52%, rgba(255,255,255,0.18) 72%, rgba(255,255,255,0.02) 100%)' }}
      />

      {/* Premium Depth Layers */}
      <div
        className="absolute inset-0 z-[11] pointer-events-none"
        style={{ background: 'radial-gradient(circle at 75% 45%, rgba(59,130,246,0.16), transparent 42%)' }}
      />
      <div
        className="absolute inset-0 z-[12] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />

      <div className="relative z-20 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between px-6 py-6 lg:px-9 lg:py-8 max-w-full sm:max-w-[58%]">
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <h1 className="text-[28px] font-extrabold tracking-tight bg-gradient-to-br from-slate-950 via-slate-800 to-slate-600 bg-clip-text text-transparent drop-shadow-sm">
              Tổng quan điều hành hôm nay
            </h1>
            <p className="text-[13.5px] font-medium text-slate-500 flex items-center">
              <ExecutiveLiveClock />
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3.5 mt-1">
            <Link
              href="#action-items"
              className={cn(
                "group relative flex items-center gap-2.5 rounded-full border px-4 py-2 text-[13px] font-bold transition-all duration-300 ease-out overflow-hidden",
                pendingActions > 0
                  ? "border-amber-200/60 bg-gradient-to-b from-amber-50/90 to-amber-100/50 text-amber-800 shadow-[0_4px_16px_rgba(251,191,36,0.15)] hover:shadow-[0_6px_20px_rgba(251,191,36,0.25)] hover:-translate-y-0.5"
                  : "border-slate-200/60 bg-white/60 backdrop-blur-md text-slate-600 shadow-[0_2px_10px_rgba(15,23,42,0.03)] hover:bg-white/90 hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] hover:-translate-y-0.5"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={cn("relative h-2 w-2 rounded-full shrink-0", pendingActions > 0 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]" : "bg-slate-400")} />
              <span className="relative z-10"><span className="text-[14px] font-black mr-0.5">{pendingActions}</span> việc cần xử lý</span>
            </Link>

            <Link
              href="#project-progress"
              className={cn(
                "group relative flex items-center gap-2.5 rounded-full border px-4 py-2 text-[13px] font-bold transition-all duration-300 ease-out overflow-hidden",
                atRiskProjects > 0
                  ? "border-rose-200/60 bg-gradient-to-b from-rose-50/90 to-rose-100/50 text-rose-800 shadow-[0_4px_16px_rgba(244,63,94,0.15)] hover:shadow-[0_6px_20px_rgba(244,63,94,0.25)] hover:-translate-y-0.5"
                  : "border-slate-200/60 bg-white/60 backdrop-blur-md text-slate-600 shadow-[0_2px_10px_rgba(15,23,42,0.03)] hover:bg-white/90 hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] hover:-translate-y-0.5"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={cn("relative h-2 w-2 rounded-full shrink-0", atRiskProjects > 0 ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" : "bg-slate-400")} />
              <span className="relative z-10"><span className="text-[14px] font-black mr-0.5">{atRiskProjects}</span> công trình rủi ro</span>
            </Link>

            <Link
              href={data.selectedProjectId ? `/approvals?projectId=${data.selectedProjectId}&status=PENDING` : `/approvals?status=PENDING`}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-full border px-4 py-2 text-[13px] font-bold transition-all duration-300 ease-out overflow-hidden",
                pendingApprovals > 0
                  ? "border-blue-200/60 bg-gradient-to-b from-blue-50/90 to-blue-100/50 text-blue-800 shadow-[0_4px_16px_rgba(59,130,246,0.15)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.25)] hover:-translate-y-0.5"
                  : "border-slate-200/60 bg-white/60 backdrop-blur-md text-slate-600 shadow-[0_2px_10px_rgba(15,23,42,0.03)] hover:bg-white/90 hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)] hover:-translate-y-0.5"
              )}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={cn("relative h-2 w-2 rounded-full shrink-0", pendingApprovals > 0 ? "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]" : "bg-slate-400")} />
              <span className="relative z-10"><span className="text-[14px] font-black mr-0.5">{pendingApprovals}</span> hồ sơ chờ duyệt</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Absolute LIVE badge relative to the entire section */}
      <div className="absolute right-7 top-7 flex shrink-0 items-center gap-2 rounded-full border border-emerald-100 bg-white/80 px-3 py-1.5 shadow-[0_8px_24px_rgba(16,185,129,0.12)] backdrop-blur-md z-30">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Live</span>
      </div>
    </section>
  );
}
