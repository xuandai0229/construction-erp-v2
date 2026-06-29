import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CalendarCheck,
  ClipboardCheck,
  CreditCard,
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

function KpiIcon({ id }: { id: string }) {
  if (id.includes("payment")) return <CreditCard className="h-5 w-5" />;
  if (id.includes("approval")) return <ClipboardCheck className="h-5 w-5" />;
  if (id.includes("document")) return <FolderOpen className="h-5 w-5" />;
  if (id.includes("report")) return <FileText className="h-5 w-5" />;
  if (id.includes("entries")) return <CalendarCheck className="h-5 w-5" />;
  if (id.includes("attention")) return <AlertTriangle className="h-5 w-5" />;
  return <Building2 className="h-5 w-5" />;
}

export function DashboardKpiCard({ kpi }: { kpi: DashboardKpi }) {
  const tone = toneClasses[kpi.tone];
  const content = (
    <div className="flex min-h-[150px] flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/[0.03] transition-colors hover:border-slate-300 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold leading-5 text-slate-900">{kpi.label}</p>
        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tone.bg, tone.icon)}>
          <KpiIcon id={kpi.id} />
        </span>
      </div>
      <div>
        <p className={cn("text-3xl font-extrabold leading-none tracking-tight sm:text-4xl", tone.value)}>{kpi.value}</p>
        <p className="mt-2 text-sm leading-5 text-slate-600">{kpi.description}</p>
      </div>
    </div>
  );

  if (!kpi.href) return content;
  return (
    <Link href={kpi.href} className="block focus-visible:rounded-xl">
      {content}
    </Link>
  );
}
