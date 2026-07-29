import Link from "next/link";
import { ArrowRight, CheckCircle2, DatabaseZap, Siren } from "lucide-react";
import { ProjectName } from "@/components/project/project-name";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { ContentCard } from "@/components/ui/enterprise";
import type { DashboardPrioritySelection } from "@/lib/dashboard/dashboard-information-architecture";

function formatDate(value: Date | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(value);
}

function visibleSummary(selection: DashboardPrioritySelection) {
  if (selection.totalCount === 0) return "Không có công trình trong nhóm này";
  return selection.visibleCount < selection.totalCount
    ? `Hiển thị ${selection.visibleCount}/${selection.totalCount} công trình`
    : `${selection.totalCount} công trình cần xem xét`;
}

export function PortfolioPriorityListCard({
  kind,
  selection,
}: {
  kind: "OPERATIONAL" | "DATA_QUALITY";
  selection: DashboardPrioritySelection;
}) {
  const isOperational = kind === "OPERATIONAL";
  const title = isOperational
    ? "Công trình cần can thiệp về tiến độ và rủi ro"
    : "Công trình cần hoàn thiện dữ liệu";
  const description = isOperational
    ? "Xếp hạng từ sai lệch tiến độ, vấn đề hiện trường, vật tư và nhiệm vụ quá hạn."
    : "Xếp hạng từ completeness, trạng thái aggregate và cảnh báo chất lượng dữ liệu.";
  const viewAllHref = isOperational ? "/dashboard/actions" : "/dashboard/projects-status";

  return (
    <ContentCard
      id={isOperational ? "portfolio-operational-list" : "portfolio-data-quality-list"}
      data-dashboard-card={isOperational ? "portfolio-operational-list" : "portfolio-data-quality-list"}
      data-priority-list={isOperational ? "operational" : "data-quality"}
      className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] scroll-mt-24"
    >
      <div className="border-b border-slate-200/80 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-bold tracking-tight text-slate-950 sm:text-base">{title}</h3>
            <p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p>
          </div>
          <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
            {visibleSummary(selection)}
          </span>
        </div>
      </div>

      {selection.items.length === 0 ? (
        <div className="grid min-h-52 place-items-center px-5 py-8 text-center">
          <div>
            <span className="mx-auto grid size-11 place-items-center rounded-full bg-slate-100 text-slate-500">
              <CheckCircle2 className="size-5" aria-hidden="true" />
            </span>
            <h4 className="mt-3 text-sm font-bold text-slate-900">
              {isOperational ? "Chưa có đủ dữ liệu để xếp hạng tiến độ" : "Chưa có công trình cần hoàn thiện dữ liệu"}
            </h4>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-slate-500">
              {isOperational
                ? "Danh sách này không dùng dữ liệu completeness để lấp chỗ. Hãy hoàn thiện dữ liệu trước khi đánh giá tiến độ."
                : "Các công trình trong phạm vi hiện không có cảnh báo dữ liệu ưu tiên."}
            </p>
            {isOperational ? (
              <Link href="#portfolio-data-quality-list" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800">
                Xem công trình cần hoàn thiện dữ liệu <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100" role="list">
          {selection.items.map((item) => (
            <Link
              key={item.projectId}
              href={item.href}
              role="listitem"
              data-priority-project-id={item.projectId}
              data-priority-reason={item.reason}
              data-priority-cta={item.ctaLabel}
              className="portfolio-action-project group"
            >
              <div className="flex min-w-0 items-start gap-3">
                <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg ${isOperational ? "bg-rose-50 text-rose-600" : "bg-blue-50 text-blue-600"}`}>
                  {isOperational ? <Siren className="size-4" aria-hidden="true" /> : <DatabaseZap className="size-4" aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                  <ProjectName name={item.projectName} className="group-hover:text-blue-700" />
                  <div className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] leading-4">
                    <span className="font-mono font-semibold text-slate-500">{item.projectCode}</span>
                    <StatusBadge size="sm" variant={isOperational ? (item.priority === "HIGH" ? "danger" : "warning") : "info"}>
                      {item.badgeLabel}
                    </StatusBadge>
                    {formatDate(item.lastActualProgressAt) ? <span className="text-slate-500">Cập nhật {formatDate(item.lastActualProgressAt)}</span> : null}
                  </div>
                  <p className="mt-2 text-xs font-medium leading-5 text-slate-600">{item.reason}</p>
                  {isOperational && item.actualProgressPercent !== null ? (
                    <div className="mt-2.5">
                      <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 text-[11px]">
                        <span className="font-semibold text-slate-600">Tiến độ thực tế</span>
                        <span className="font-bold tabular-nums text-slate-950">
                          {Math.round(item.actualProgressPercent)}%
                          {item.variancePercent !== null ? <span className="ml-1 text-rose-600">({Math.round(item.variancePercent)} điểm %)</span> : null}
                        </span>
                      </div>
                      <ProgressBar value={item.actualProgressPercent} tone={item.priority === "HIGH" ? "rose" : "amber"} label={`Tiến độ thực tế ${item.projectName}`} />
                    </div>
                  ) : null}
                </div>
                <span className="hidden shrink-0 items-center gap-1 self-center text-xs font-bold text-blue-700 sm:inline-flex">
                  {item.ctaLabel} <ArrowRight className="size-3.5" aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
        <Link href={viewAllHref} className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:text-blue-800">
          {isOperational ? "Mở trung tâm việc cần xử lý" : "Xem danh sách công trình"}
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
    </ContentCard>
  );
}
