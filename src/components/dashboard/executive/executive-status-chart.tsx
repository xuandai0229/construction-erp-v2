import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { DashboardProjectOverview } from "@/lib/dashboard/dashboard-queries";
import { ChartLegend, type ChartLegendItem } from "@/components/dashboard/chart-legend";
import { DashboardEmptyState } from "@/components/dashboard/dashboard-empty-state";
import { ResponsiveChartCard } from "@/components/dashboard/responsive-chart-card";
import { completenessPresentation } from "@/lib/dashboard/dashboard-project-presentation";

type CompletenessCategory = DashboardProjectOverview["completenessCategory"];

export type ExecutiveStatusChartViewModel = {
  totalProjects: number;
  completeProgressCount: number;
  insufficientDataCount: number;
  missingPlanCount: number;
  missingActualCount: number;
  missingBothCount: number;
  legendItems: ChartLegendItem[];
};

const COMPLETENESS_ORDER: CompletenessCategory[] = ["COMPLETE", "MISSING_PLAN", "MISSING_ACTUAL", "MISSING_BOTH"];

export function buildExecutiveStatusChartViewModel(projects: DashboardProjectOverview[]): ExecutiveStatusChartViewModel {
  const totalProjects = projects.length;
  const counts = projects.reduce<Record<CompletenessCategory, number>>((result, project) => {
    result[project.completenessCategory] += 1;
    return result;
  }, { COMPLETE: 0, MISSING_PLAN: 0, MISSING_ACTUAL: 0, MISSING_BOTH: 0 });

  return {
    totalProjects,
    completeProgressCount: counts.COMPLETE,
    insufficientDataCount: totalProjects - counts.COMPLETE,
    missingPlanCount: counts.MISSING_PLAN,
    missingActualCount: counts.MISSING_ACTUAL,
    missingBothCount: counts.MISSING_BOTH,
    legendItems: COMPLETENESS_ORDER.map((category) => ({
      id: category,
      label: completenessPresentation[category].label,
      count: counts[category],
      percentage: totalProjects === 0 ? 0 : Math.round((counts[category] / totalProjects) * 100),
      color: completenessPresentation[category].color,
    })),
  };
}

export function ExecutiveStatusChart({ projects }: { projects: DashboardProjectOverview[] }) {
  const viewModel = buildExecutiveStatusChartViewModel(projects);
  const radius = 47;
  const circumference = 2 * Math.PI * radius;
  const donutSegments = viewModel.legendItems.reduce<Array<ChartLegendItem & { strokeLength: number; strokeOffset: number }>>(
    (segments, item) => {
      const previous = segments.at(-1);
      const strokeLength = (item.count / Math.max(viewModel.totalProjects, 1)) * circumference;
      return [...segments, { ...item, strokeLength, strokeOffset: previous ? previous.strokeOffset + previous.strokeLength : 0 }];
    },
    [],
  );
  const completeRatio = viewModel.totalProjects === 0
    ? 0
    : Math.round((viewModel.completeProgressCount / viewModel.totalProjects) * 100);

  return (
    <ResponsiveChartCard
      id="portfolio-data-health-summary"
      data-dashboard-card="portfolio-data-health-summary"
      data-card-layout="BALANCED"
      className="portfolio-health-card"
      title="Sức khỏe dữ liệu danh mục công trình"
      description="Một partition duy nhất theo mức đầy đủ của kế hoạch và dữ liệu thực tế."
      action={(
        <Link href="/dashboard/projects-status" className="dashboard-card-action">
          Xem danh sách công trình <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      )}
    >
      {viewModel.totalProjects === 0 ? (
        <DashboardEmptyState
          title="Chưa có công trình trong phạm vi đang xem"
          description="Hãy kiểm tra bộ lọc hoặc quyền truy cập để xem sức khỏe dữ liệu danh mục."
          className="m-4"
        />
      ) : (
        <div className="portfolio-health-summary-layout p-4 sm:p-5">
          <div className="portfolio-health-donut" data-portfolio-donut role="img" aria-label={`Tổng ${viewModel.totalProjects} công trình trong phạm vi`}>
            <svg viewBox="0 0 120 120" className="col-start-1 row-start-1 -rotate-90" aria-hidden="true">
              <circle cx="60" cy="60" r={radius} fill="transparent" stroke="#e2e8f0" strokeWidth="14" />
              {donutSegments.map((item) => item.strokeLength > 0 ? (
                <circle
                  key={item.id}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  stroke={item.color}
                  strokeWidth="14"
                  strokeDasharray={`${item.strokeLength} ${circumference - item.strokeLength}`}
                  strokeDashoffset={`-${item.strokeOffset}`}
                />
              ) : null)}
            </svg>
            <div className="col-start-1 row-start-1 text-center">
              <div className="text-2xl font-black tabular-nums text-slate-950">{viewModel.totalProjects}</div>
              <div className="mt-0.5 text-[11px] font-semibold text-slate-500">Tổng công trình</div>
            </div>
          </div>

          <div className="grid min-w-0 content-start gap-3">
            <ChartLegend items={viewModel.legendItems} className="portfolio-health-legend" />
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
              {completeRatio}% danh mục có đủ dữ liệu để đối chiếu kế hoạch và thực tế. Tổng bốn nhóm luôn bằng {viewModel.totalProjects} công trình.
            </p>
          </div>
        </div>
      )}
    </ResponsiveChartCard>
  );
}
