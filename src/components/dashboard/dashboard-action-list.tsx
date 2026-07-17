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
        <h2 className="text-[17px] sm:text-[18px] font-black text-[var(--foreground)] tracking-tight">{title}</h2>
        {description && <p className="text-[12px] sm:text-[13.5px] text-[var(--muted-foreground)] mt-0.5">{description}</p>}
      </div>
      
      {items.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)]/50 p-4">
           <DashboardEmptyState title={emptyTitle} className="min-h-[120px]" />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 sm:gap-3">
          {items.map((item) => (
            <Link key={item.id} href={item.href} className="group flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-4 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]">
              <div className="mt-0.5 flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] sm:rounded-[var(--radius-md)] bg-slate-50 border border-[var(--border)] group-hover:bg-blue-50/50 group-hover:border-blue-100 transition-colors">
                <TypeIcon priority={item.priority} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                  <span className="text-[11px] sm:text-[12px] font-bold text-[var(--muted-foreground)] tracking-wide uppercase">{item.type}</span>
                  {priorityBadge(item.priority)}
                  <StatusBadge variant={item.status.includes("duyệt") ? "warning" : "neutral"} size="sm">{item.status}</StatusBadge>
                </div>
                <p className="line-clamp-2 text-[14px] sm:text-[15px] font-bold leading-snug text-[var(--foreground)] group-hover:text-blue-700 transition-colors">{item.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] sm:text-[12.5px] font-medium text-[var(--muted-foreground)]">
                  <span className="truncate max-w-[140px] sm:max-w-none">{item.projectName}</span>
                  <span className="hidden sm:inline-block opacity-50">•</span>
                  <span>{formatDateVNShort(item.createdAt)}</span>
                </div>
              </div>
              <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-[var(--muted-foreground)] transition-colors group-hover:text-blue-600 group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
