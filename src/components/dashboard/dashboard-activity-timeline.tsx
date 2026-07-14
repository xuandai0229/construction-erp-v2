import Link from "next/link";
import { Activity, ArrowRight, CheckCircle2, Clock, FileText, ShieldAlert } from "lucide-react";
import type { DashboardActivityItem } from "@/lib/dashboard/dashboard-queries";
import { formatDateTimeVN } from "@/lib/dashboard/dashboard-formatters";
import { DashboardEmptyState } from "./dashboard-empty-state";
import { cn } from "@/lib/utils";
import { ContentCard } from "@/components/ui/enterprise";

const toneClasses: Record<DashboardActivityItem["tone"], string> = {
  blue: "bg-blue-50 text-blue-700",
  emerald: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-700",
  slate: "bg-slate-100 text-slate-700",
  violet: "bg-violet-50 text-violet-700",
};

function TimelineIcon({ tone }: { tone: DashboardActivityItem["tone"] }) {
  if (tone === "emerald") return <CheckCircle2 className="h-4 w-4" />;
  if (tone === "rose") return <ShieldAlert className="h-4 w-4" />;
  if (tone === "blue") return <FileText className="h-4 w-4" />;
  return <Activity className="h-4 w-4" />;
}

export function DashboardActivityTimeline({ activities }: { activities: DashboardActivityItem[] }) {
  return (
    <ContentCard className="flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-100 p-4 sm:p-5">
        <h2 className="text-base font-bold text-slate-950">Hoạt động gần đây</h2>
        <Clock className="h-4 w-4 text-slate-500" />
      </div>
      <div className="p-3 sm:p-4">
        {activities.length === 0 ? (
          <DashboardEmptyState title="Chưa có hoạt động gần đây" className="min-h-[120px] sm:min-h-[160px]" />
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {activities.map((activity) => (
              <Link key={activity.id} href={activity.href} className="group flex gap-2.5 sm:gap-3 rounded-xl p-2 hover:bg-slate-50 transition-colors">
                <span className={cn("mt-0.5 flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full", toneClasses[activity.tone])}>
                  <TimelineIcon tone={activity.tone} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-1 text-[13px] sm:text-sm font-bold text-slate-950">{activity.title}</span>
                  <span className="mt-0.5 sm:mt-1 line-clamp-1 text-[11px] sm:text-xs font-medium text-slate-600">{activity.actorName} · {activity.projectName}</span>
                  <span className="mt-0.5 sm:mt-1 block text-[11px] sm:text-xs text-slate-500">{formatDateTimeVN(activity.createdAt)}</span>
                </span>
                <ArrowRight className="mt-1 sm:mt-2 h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-slate-300 sm:text-slate-400 group-hover:text-blue-700" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </ContentCard>
  );
}
