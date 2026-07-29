import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import type { DashboardProjectOverview } from "@/lib/dashboard/dashboard-queries";
import { formatDateVNShort, formatPercentVN } from "@/lib/dashboard/dashboard-formatters";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/status-badge";
import { DashboardEmptyState } from "./dashboard-empty-state";
import { getProjectStatusMeta } from "@/lib/project-status";
import { ProjectName } from "@/components/project/project-name";
import { ProgressBar } from "@/components/ui/progress-bar";
import { getActualProgressDataLabel } from "@/lib/dashboard/dashboard-project-presentation";

const healthMeta: Record<DashboardProjectOverview["health"], { label: string; variant: StatusBadgeVariant }> = {
  ON_TRACK: { label: "Đúng tiến độ", variant: "success" },
  AT_RISK: { label: "Có nguy cơ", variant: "warning" },
  DELAYED: { label: "Trễ tiến độ", variant: "danger" },
  COMPLETED: { label: "Hoàn thành", variant: "success" },
  NO_DATA: { label: "Chưa có dữ liệu", variant: "neutral" },
};

export function DashboardProjectOverviewList({ projects }: { projects: DashboardProjectOverview[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5 px-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col">
          <h2 className="text-[17px] sm:text-[18px] font-black text-[var(--foreground)] tracking-tight">Tổng quan tiến độ công trình</h2>
          <p className="text-[12px] sm:text-[13.5px] text-[var(--muted-foreground)] mt-0.5">Tiến độ thực tế chỉ tính từ khối lượng hiện trường đã được phê duyệt.</p>
        </div>
        <Link href="/projects" className="hidden sm:inline-flex items-center gap-1 text-[13px] font-semibold text-blue-600 hover:text-blue-700">
          Xem tất cả <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border)] bg-[var(--surface)]/50 p-4">
           <DashboardEmptyState title="Chưa có công trình phù hợp" description="Khi có công trình trong phạm vi quyền, dashboard sẽ hiển thị tiến độ tại đây." className="min-h-[120px]" />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 sm:gap-3">
          {projects.map((project) => {
            const meta = healthMeta[project.health];
            const statusMeta = getProjectStatusMeta(project.status);
            return (
              <Link key={project.id} href={`/projects/${project.id}`} className="group block rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-3.5 sm:p-4 shadow-[var(--shadow-card)] transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-[var(--shadow-elevated)] active:scale-[0.98]">
                <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                      <span className="rounded-[var(--radius-sm)] bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700 tracking-wide border border-slate-200">{project.code}</span>
                      <StatusBadge variant={meta.variant} size="sm">{meta.label}</StatusBadge>
                      <StatusBadge variant={statusMeta.variant} size="sm">{statusMeta.label}</StatusBadge>
                    </div>
                    <ProjectName name={project.name} className="text-[14px] leading-snug text-[var(--foreground)] transition-colors sm:text-[15px]" />
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] sm:text-[12.5px] font-medium text-[var(--muted-foreground)]">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />Cập nhật {formatDateVNShort(project.updatedAt)}</span>
                    </div>
                  </div>
                  <div className="w-full lg:w-56 mt-2 lg:mt-0">
                    <div className="mb-1.5 flex items-center justify-between text-[12px] sm:text-[13px]">
                      <span className="font-semibold text-[var(--muted-foreground)]">{project.warning}</span>
                      <span className="font-black text-[var(--foreground)] font-mono tracking-tight">{project.actualProgressPercent === null ? getActualProgressDataLabel(project) : formatPercentVN(project.actualProgressPercent)}</span>
                    </div>
                    {project.actualProgressPercent !== null ? (
                      <ProgressBar
                        value={project.actualProgressPercent}
                        tone={project.health === "DELAYED" ? "rose" : project.health === "AT_RISK" ? "amber" : "emerald"}
                        label={`Tiến độ thực tế ${project.name}`}
                      />
                    ) : null}
                    <p className="mt-1.5 text-[11px] sm:text-[12px] font-medium text-[var(--muted-foreground)]">
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
  );
}
