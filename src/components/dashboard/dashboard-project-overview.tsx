import Link from "next/link";
import { ArrowRight, BarChart3, CalendarDays, ListTree } from "lucide-react";
import type { DashboardProjectOverview } from "@/lib/dashboard/dashboard-queries";
import { formatDateVNShort, formatPercentVN } from "@/lib/dashboard/dashboard-formatters";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/status-badge";
import { DashboardEmptyState } from "./dashboard-empty-state";
import { cn } from "@/lib/utils";

const healthMeta: Record<DashboardProjectOverview["health"], { label: string; variant: StatusBadgeVariant; bar: string }> = {
  ON_TRACK: { label: "Đúng tiến độ", variant: "success", bar: "bg-emerald-600" },
  AT_RISK: { label: "Có nguy cơ", variant: "warning", bar: "bg-amber-500" },
  DELAYED: { label: "Trễ tiến độ", variant: "danger", bar: "bg-rose-600" },
  COMPLETED: { label: "Hoàn thành", variant: "success", bar: "bg-emerald-600" },
  NO_DATA: { label: "Chưa có dữ liệu", variant: "neutral", bar: "bg-slate-400" },
};

function projectStatusLabel(status: string) {
  const labels: Record<string, string> = {
    PLANNING: "Chuẩn bị",
    ACTIVE: "Đang thi công",
    ON_HOLD: "Tạm dừng",
    COMPLETED: "Hoàn thành",
    CANCELLED: "Hủy",
  };
  return labels[status] ?? status;
}

export function DashboardProjectOverviewList({ projects }: { projects: DashboardProjectOverview[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03]">
      <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="text-base font-bold text-slate-950">Tổng quan tiến độ công trình</h2>
          <p className="mt-1 text-sm text-slate-600">Tính theo khối lượng đã duyệt và bảng khối lượng hiện trường.</p>
        </div>
        <Link href="/projects" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800">
          Xem tất cả <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="p-3 sm:p-4">
        {projects.length === 0 ? (
          <DashboardEmptyState title="Chưa có công trình đang thi công" description="Khi có công trình active, dashboard sẽ hiển thị tiến độ tại đây." />
        ) : (
          <div className="space-y-3">
            {projects.map((project) => {
              const meta = healthMeta[project.health];
              const progress = project.progressPercent ?? 0;
              return (
                <Link key={project.id} href={`/projects/${project.id}`} className="block rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/40">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{project.code}</span>
                        <StatusBadge variant={meta.variant} size="sm">{meta.label}</StatusBadge>
                        <StatusBadge variant="neutral" size="sm">{projectStatusLabel(project.status)}</StatusBadge>
                      </div>
                      <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-5 text-slate-950 sm:text-base">{project.name}</h3>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-600">
                        <span className="inline-flex items-center gap-1"><ListTree className="h-3.5 w-3.5" />{project.itemCount} hạng mục</span>
                        <span className="inline-flex items-center gap-1"><BarChart3 className="h-3.5 w-3.5" />{project.recentEntryCount} nhập liệu gần đây</span>
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Cập nhật {formatDateVNShort(project.updatedAt)}</span>
                      </div>
                    </div>
                    <div className="w-full lg:w-56">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-700">{project.warning}</span>
                        <span className="font-bold text-slate-950">{formatPercentVN(project.progressPercent)}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={cn("h-full rounded-full", meta.bar)} style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
                      </div>
                      <p className="mt-2 text-xs font-medium text-slate-600">
                        {project.daysRemaining === null ? "Chưa có ngày kết thúc" : project.daysRemaining < 0 ? `Trễ ${Math.abs(project.daysRemaining)} ngày` : `Còn ${project.daysRemaining} ngày`}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
