import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, FileQuestion, ShieldAlert } from "lucide-react";
import type { DashboardProjectOverview } from "@/lib/dashboard/dashboard-queries";
import { ContentCard } from "@/components/ui/enterprise";

export type PortfolioProgressRiskSummary = {
  onTrack: number;
  atRisk: number;
  delayed: number;
  unavailable: number;
  evaluable: number;
  total: number;
};

export function buildPortfolioProgressRiskSummary(projects: DashboardProjectOverview[]): PortfolioProgressRiskSummary {
  return projects.reduce<PortfolioProgressRiskSummary>((result, project) => {
    if (
      project.plannedProgressPercent === null
      || project.actualProgressPercent === null
      || project.variancePercent === null
    ) {
      result.unavailable += 1;
    } else {
      result.evaluable += 1;
      if (project.health === "DELAYED") result.delayed += 1;
      else if (project.health === "AT_RISK") result.atRisk += 1;
      else result.onTrack += 1;
    }
    return result;
  }, { onTrack: 0, atRisk: 0, delayed: 0, unavailable: 0, evaluable: 0, total: projects.length });
}

export function ExecutiveProjectProgress({ projects }: { projects: DashboardProjectOverview[] }) {
  const counts = buildPortfolioProgressRiskSummary(projects);
  const evaluableRatio = counts.total === 0 ? 0 : Math.round((counts.evaluable / counts.total) * 100);
  const insight = counts.unavailable > 0
    ? `${counts.unavailable}/${counts.total} công trình chưa thể xếp hạng vì thiếu dữ liệu có ý nghĩa.`
    : counts.delayed > 0
      ? `${counts.delayed} công trình chậm tiến độ cần được ưu tiên kiểm tra.`
      : "Các công trình có dữ liệu hợp lệ chưa ghi nhận trường hợp chậm tiến độ.";

  return (
    <ContentCard
      id="portfolio-progress-summary"
      data-dashboard-card="portfolio-progress-summary"
      className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)] scroll-mt-24"
    >
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="min-w-0">
          <h3 className="text-sm font-bold tracking-tight text-slate-950 sm:text-base">Tình trạng tiến độ và rủi ro</h3>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">Phân bố chỉ tính các công trình có cả kế hoạch và tiến độ thực tế hợp lệ.</p>
        </div>
        <Link href="/dashboard/projects-status" className="dashboard-card-action">
          Xem trạng thái <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid min-w-0 content-start gap-4 p-4 sm:p-5">
        <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi label="Đúng tiến độ" value={counts.onTrack} tone="emerald" icon={<CheckCircle2 className="size-4" />} />
          <Kpi label="Cần chú ý" value={counts.atRisk} tone="amber" icon={<AlertTriangle className="size-4" />} />
          <Kpi label="Chậm tiến độ" value={counts.delayed} tone="rose" icon={<ShieldAlert className="size-4" />} />
          <Kpi label="Chưa thể đánh giá" value={counts.unavailable} tone="slate" icon={<FileQuestion className="size-4" />} />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-600">Khả năng đánh giá danh mục</span>
            <span className="text-sm font-black tabular-nums text-slate-950">{counts.evaluable}/{counts.total} công trình · {evaluableRatio}%</span>
          </div>
          <div className="mt-2 h-2 overflow-clip rounded-full bg-slate-200" aria-hidden="true">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${evaluableRatio}%` }} />
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-600">{insight}</p>
        </div>
      </div>
    </ContentCard>
  );
}

function Kpi({ label, value, tone, icon }: {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "rose" | "slate";
  icon: React.ReactNode;
}) {
  const classes = {
    emerald: "border-emerald-200 bg-emerald-50/80 text-emerald-800",
    amber: "border-amber-200 bg-amber-50/80 text-amber-800",
    rose: "border-rose-200 bg-rose-50/80 text-rose-800",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  }[tone];

  return (
    <div className={`min-w-0 rounded-xl border p-2.5 ${classes}`}>
      <div className="flex min-w-0 items-start gap-1.5 text-[11px] font-bold leading-4">
        <span className="mt-0.5 shrink-0" aria-hidden="true">{icon}</span>
        <span className="min-w-0">{label}</span>
      </div>
      <div className="mt-2 text-xl font-black leading-none tabular-nums text-slate-950">{value}</div>
    </div>
  );
}
