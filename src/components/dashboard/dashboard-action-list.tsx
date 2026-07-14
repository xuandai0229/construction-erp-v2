import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDot } from "lucide-react";
import type { DashboardActionItem } from "@/lib/dashboard/dashboard-queries";
import { formatDateVNShort } from "@/lib/dashboard/dashboard-formatters";
import { StatusBadge } from "@/components/ui/status-badge";
import { DashboardEmptyState } from "./dashboard-empty-state";
import { ContentCard } from "@/components/ui/enterprise";

function priorityBadge(priority: DashboardActionItem["priority"]) {
  if (priority === "HIGH") return <StatusBadge variant="danger" size="sm">Cao</StatusBadge>;
  if (priority === "MEDIUM") return <StatusBadge variant="warning" size="sm">Trung bình</StatusBadge>;
  return <StatusBadge variant="neutral" size="sm">Thấp</StatusBadge>;
}

function TypeIcon({ priority }: { priority: DashboardActionItem["priority"] }) {
  if (priority === "HIGH") return <AlertTriangle className="h-4 w-4 text-rose-600" />;
  if (priority === "MEDIUM") return <CircleDot className="h-4 w-4 text-amber-600" />;
  return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
}

export function DashboardActionList({
  title,
  description,
  items,
  emptyTitle,
}: {
  title: string;
  description?: string;
  items: DashboardActionItem[];
  emptyTitle: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="px-1 flex flex-col">
        <h2 className="text-[17px] sm:text-[18px] font-black text-slate-900 tracking-tight">{title}</h2>
        {description && <p className="text-[12px] sm:text-[13.5px] text-slate-500 mt-0.5">{description}</p>}
      </div>
      
      {items.length === 0 ? (
        <div className="rounded-[16px] border border-slate-200/60 bg-white/50 border-dashed p-4">
           <DashboardEmptyState title={emptyTitle} className="min-h-[120px]" />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 sm:gap-3">
          {items.map((item) => (
            <Link key={item.id} href={item.href} className="group flex items-start gap-3 rounded-[16px] border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-[0_2px_10px_rgba(15,23,42,0.02)] transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md active:scale-[0.98]">
              <div className="mt-0.5 flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-[10px] sm:rounded-xl bg-slate-50 border border-slate-100 group-hover:bg-blue-50/50 group-hover:border-blue-100 transition-colors">
                <TypeIcon priority={item.priority} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                  <span className="text-[11px] sm:text-[12px] font-bold text-slate-600 tracking-wide uppercase">{item.type}</span>
                  {priorityBadge(item.priority)}
                  <StatusBadge variant={item.status.includes("duyệt") ? "warning" : "neutral"} size="sm">{item.status}</StatusBadge>
                </div>
                <p className="line-clamp-2 text-[14px] sm:text-[15px] font-bold leading-snug text-slate-900 group-hover:text-blue-700 transition-colors">{item.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-[12.5px] font-medium text-slate-500">
                  <span className="truncate max-w-[140px] sm:max-w-none text-slate-700">{item.projectName}</span>
                  <span className="hidden sm:inline-block text-slate-300">•</span>
                  <span>{formatDateVNShort(item.createdAt)}</span>
                </div>
              </div>
              <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-blue-600 group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
