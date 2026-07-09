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
    <ContentCard className="flex flex-col">
      <div className="border-b border-slate-100 p-4 sm:p-5">
        <h2 className="text-base font-bold text-slate-950">{title}</h2>
        {description && <p className="mt-1 text-sm text-slate-600">{description}</p>}
      </div>
      <div className="p-3 sm:p-4">
        {items.length === 0 ? (
          <DashboardEmptyState title={emptyTitle} className="min-h-[180px]" />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Link key={item.id} href={item.href} className="group block rounded-xl border border-slate-200 bg-white p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/40 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50">
                    <TypeIcon priority={item.priority} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600">{item.type}</span>
                      {priorityBadge(item.priority)}
                      <StatusBadge variant={item.status.includes("duyệt") ? "warning" : "neutral"} size="sm">{item.status}</StatusBadge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-slate-950">{item.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-600">
                      <span className="truncate">{item.projectName}</span>
                      <span>{formatDateVNShort(item.createdAt)}</span>
                    </div>
                  </div>
                  <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-blue-700" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ContentCard>
  );
}
