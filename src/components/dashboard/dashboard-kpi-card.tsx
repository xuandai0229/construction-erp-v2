import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  FolderOpen,
} from "lucide-react";
import type { DashboardKpi } from "@/lib/dashboard/dashboard-queries";
import { cn } from "@/lib/utils";

const toneClasses: Record<DashboardKpi["tone"], { icon: string; bg: string; value: string }> = {
  blue: { icon: "text-blue-700", bg: "bg-blue-50", value: "text-blue-700" },
  emerald: { icon: "text-emerald-700", bg: "bg-emerald-50", value: "text-emerald-700" },
  amber: { icon: "text-amber-700", bg: "bg-amber-50", value: "text-amber-700" },
  rose: { icon: "text-rose-700", bg: "bg-rose-50", value: "text-rose-700" },
  slate: { icon: "text-slate-700", bg: "bg-slate-100", value: "text-slate-900" },
  violet: { icon: "text-violet-700", bg: "bg-violet-50", value: "text-violet-700" },
};

function KpiIcon({ id, className }: { id: string; className?: string }) {
  if (id.includes("approval")) return <ClipboardCheck className={className} />;
  if (id.includes("document")) return <FolderOpen className={className} />;
  if (id.includes("report")) return <FileText className={className} />;
  if (id.includes("entries")) return <CalendarCheck className={className} />;
  if (id.includes("attention")) return <AlertTriangle className={className} />;
  return <Building2 className={className} />;
}

export function DashboardKpiCard({ kpi }: { kpi: DashboardKpi }) {
  const tone = toneClasses[kpi.tone];
  const content = (
    <div className={cn("flex flex-col justify-between rounded-[16px] sm:rounded-2xl border border-slate-200/60 p-3.5 sm:p-5 shadow-[0_2px_10px_rgba(15,23,42,0.02)] transition-colors relative overflow-hidden bg-white hover:border-slate-300 hover:shadow-md")}>
      <div className={cn("absolute -right-4 -top-4 opacity-[0.03] pointer-events-none transition-transform group-hover:scale-110", tone.icon)}>
         <KpiIcon id={kpi.id} className="h-24 w-24" />
      </div>
      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="flex flex-col min-w-0">
          <p className="text-[12px] sm:text-[13px] font-bold text-slate-500 mb-1 sm:mb-1.5 uppercase tracking-wide truncate pr-2">{kpi.label}</p>
          <div className="flex items-baseline gap-2">
             <span className={cn("text-[24px] sm:text-[32px] font-black leading-none tracking-tight", tone.value)}>{kpi.value}</span>
          </div>
        </div>
        <div className={cn("flex h-9 w-9 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-[10px] sm:rounded-xl shadow-sm", tone.bg, tone.icon)}>
          <KpiIcon id={kpi.id} className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
      </div>
      {kpi.description && (
        <div className="mt-3 sm:mt-4 flex items-center gap-2 relative z-10">
           <span className={cn("px-1.5 py-0.5 rounded-[4px] text-[10px] sm:text-[11px] font-bold", tone.bg, tone.icon)}>
             Chi tiết
           </span>
           <span className="text-[11px] sm:text-[12px] text-slate-500 truncate">{kpi.description}</span>
        </div>
      )}
    </div>
  );

  if (!kpi.href) return content;
  return (
    <Link href={kpi.href} className="block focus-visible:rounded-2xl group">
      {content}
    </Link>
  );
}
