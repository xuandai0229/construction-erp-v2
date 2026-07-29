import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Database,
  FileWarning,
  ListChecks,
  TriangleAlert,
} from "lucide-react";
import { ContentCard } from "@/components/ui/enterprise";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge, type StatusBadgeVariant } from "@/components/ui/status-badge";
import type { DashboardActionItem, DashboardProjectOverview } from "@/lib/dashboard/dashboard-queries";
import { getActualProgressDataLabel } from "@/lib/dashboard/dashboard-project-presentation";
import { selectProjectNextActions } from "@/lib/dashboard/dashboard-information-architecture";

function formatPercent(value: number | null) {
  return value === null ? null : `${Math.round(value)}%`;
}

function formatDate(value: Date | null) {
  if (!value) return "Chưa có lần cập nhật hợp lệ";
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(value);
}

function projectProgressStatus(project: DashboardProjectOverview): { label: string; variant: StatusBadgeVariant } {
  if (project.actualProgressPercent === null || project.plannedProgressPercent === null || project.variancePercent === null) {
    return { label: "Chưa thể đánh giá", variant: "neutral" };
  }
  if (project.health === "DELAYED") return { label: "Chậm tiến độ", variant: "danger" };
  if (project.health === "AT_RISK") return { label: "Cần chú ý", variant: "warning" };
  return { label: "Đúng tiến độ", variant: "success" };
}

export function ProjectProgressCard({ project }: { project: DashboardProjectOverview }) {
  const status = projectProgressStatus(project);

  return (
    <ContentCard data-dashboard-card="project-progress" className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 px-4 py-3 sm:px-5 sm:py-3.5">
        <div className="min-w-0">
          <h3 className="text-sm font-bold tracking-tight text-slate-950 sm:text-base">Tiến độ công trình</h3>
          <p className="mt-0.5 text-xs leading-5 text-slate-500">Kế hoạch đến hôm nay và khối lượng thực tế đã được phê duyệt.</p>
        </div>
        <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
      </div>

      <div className="grid min-w-0 content-start gap-4 p-4 sm:p-5">
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
          <Metric label="Tiến độ kế hoạch" value={formatPercent(project.plannedProgressPercent) ?? "Chưa có kế hoạch"} tone="blue" />
          <Metric label="Tiến độ thực tế đã duyệt" value={formatPercent(project.actualProgressPercent) ?? "Chưa đủ dữ liệu thực tế"} tone="emerald" />
          <Metric
            label="Chênh lệch thực tế - kế hoạch"
            value={project.variancePercent === null ? "Chưa thể tính" : `${project.variancePercent > 0 ? "+" : ""}${Math.round(project.variancePercent)} điểm %`}
            tone={project.variancePercent !== null && project.variancePercent < 0 ? "rose" : "slate"}
          />
        </div>

        <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
          {project.plannedProgressPercent !== null ? (
            <div>
              <div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="font-semibold text-slate-600">Kế hoạch</span><span className="font-bold tabular-nums text-slate-950">{Math.round(project.plannedProgressPercent)}%</span></div>
              <ProgressBar value={project.plannedProgressPercent} tone="blue" label="Tiến độ kế hoạch" />
            </div>
          ) : null}
          {project.actualProgressPercent !== null ? (
            <div>
              <div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="font-semibold text-slate-600">Thực tế đã phê duyệt</span><span className="font-bold tabular-nums text-slate-950">{Math.round(project.actualProgressPercent)}%</span></div>
              <ProgressBar value={project.actualProgressPercent} tone={project.health === "DELAYED" ? "rose" : project.health === "AT_RISK" ? "amber" : "emerald"} label="Tiến độ thực tế đã phê duyệt" />
            </div>
          ) : (
            <div className="flex min-w-0 items-start gap-2.5 rounded-lg bg-white p-3 text-sm text-slate-700">
              <FileWarning className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-bold">Chưa thể đánh giá tiến độ thực tế</p>
                <p className="mt-0.5 text-xs leading-5 text-slate-500">{getActualProgressDataLabel(project)}</p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs leading-5 text-slate-500">Lần cập nhật tiến độ thực tế gần nhất: <span className="font-semibold text-slate-700">{formatDate(project.lastActualProgressAt)}</span></p>
      </div>
    </ContentCard>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "blue" | "emerald" | "rose" | "slate" }) {
  const classes = {
    blue: "border-blue-200 bg-blue-50/70",
    emerald: "border-emerald-200 bg-emerald-50/70",
    rose: "border-rose-200 bg-rose-50/70",
    slate: "border-slate-200 bg-slate-50",
  }[tone];
  return (
    <div className={`min-w-0 rounded-xl border p-3 ${classes}`}>
      <p className="text-[11px] font-bold uppercase leading-4 tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-words text-base font-black leading-5 text-slate-950">{value}</p>
    </div>
  );
}

type DataHealthRow = { label: string; value: string; healthy: boolean; warning?: boolean };

export function ProjectDataHealthCard({ project }: { project: DashboardProjectOverview }) {
  const rows: DataHealthRow[] = [
    { label: "Kế hoạch tiến độ", value: project.plannedProgressPercent === null ? "Chưa có kế hoạch" : "Đã có kế hoạch", healthy: project.plannedProgressPercent !== null },
    { label: "WBS / hạng mục khối lượng", value: project.workItemCount > 0 ? `${project.workItemCount} hạng mục hợp lệ` : "Chưa có hạng mục", healthy: project.workItemCount > 0 },
    { label: "Khối lượng thiết kế", value: project.totalDesignQuantity === null ? "Chưa đủ dữ liệu thiết kế" : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(project.totalDesignQuantity), healthy: project.totalDesignQuantity !== null },
    { label: "Khối lượng thực tế được phê duyệt", value: project.approvedActualQuantity === null ? getActualProgressDataLabel(project) : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(project.approvedActualQuantity), healthy: project.actualProgressDataStatus === "AVAILABLE" },
    { label: "Biểu mẫu đang hoạt động", value: project.actualProgressDataStatus === "MULTIPLE_ACTIVE_TEMPLATES" ? "Có nhiều biểu mẫu đang hoạt động" : "Không ghi nhận xung đột", healthy: project.actualProgressDataStatus !== "MULTIPLE_ACTIVE_TEMPLATES" },
    { label: "Lần cập nhật gần nhất", value: formatDate(project.lastActualProgressAt), healthy: project.lastActualProgressAt !== null },
    { label: "Cảnh báo dữ liệu", value: project.actualProgressWarnings.length > 0 ? `${project.actualProgressWarnings.length} cảnh báo cần kiểm tra` : "Không có cảnh báo", healthy: project.actualProgressWarnings.length === 0, warning: project.actualProgressWarnings.length > 0 },
  ];

  return (
    <ContentCard data-dashboard-card="project-data-health" className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)]">
      <div className="border-b border-slate-200/80 px-4 py-3 sm:px-5 sm:py-3.5">
        <h3 className="text-sm font-bold tracking-tight text-slate-950 sm:text-base">Sức khỏe dữ liệu công trình</h3>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">Checklist dữ liệu đầu vào; không dùng donut cho một công trình.</p>
      </div>
      <div className="divide-y divide-slate-100 px-4 sm:px-5">
        {rows.map((row) => (
          <div key={row.label} className="flex min-w-0 flex-wrap items-start justify-between gap-x-4 gap-y-1 py-3">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              {row.healthy ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" /> : <CircleDashed className={`mt-0.5 size-4 shrink-0 ${row.warning ? "text-rose-600" : "text-amber-600"}`} aria-hidden="true" />}
              <span className="min-w-0 text-xs font-semibold leading-5 text-slate-700">{row.label}</span>
            </div>
            <span className={`max-w-full text-right text-xs font-bold leading-5 ${row.healthy ? "text-slate-700" : row.warning ? "text-rose-700" : "text-amber-700"}`}>{row.value}</span>
          </div>
        ))}
      </div>
    </ContentCard>
  );
}

export function ProjectIssuesCard({ project, actionItems }: { project: DashboardProjectOverview; actionItems: DashboardActionItem[] }) {
  const scopedActions = actionItems.filter((item) => item.projectId === project.id);
  const progressIssue = project.variancePercent !== null && project.variancePercent < 0
    ? { id: "progress-variance", title: "Sai lệch tiến độ", reason: `Tiến độ thực tế thấp hơn kế hoạch ${Math.abs(Math.round(project.variancePercent))} điểm %.`, href: `/projects/${project.id}/field-progress/summary`, status: project.health === "DELAYED" ? "Chậm tiến độ" : "Cần chú ý" }
    : null;
  const issues = [
    ...(progressIssue ? [progressIssue] : []),
    ...scopedActions.map((item) => ({ id: item.id, title: item.title, reason: item.reason || item.title, href: item.href, status: item.status })),
  ].filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index).slice(0, 5);

  return (
    <ContentCard data-dashboard-card="project-issues" className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)]">
      <div className="border-b border-slate-200/80 px-4 py-3 sm:px-5 sm:py-3.5">
        <h3 className="text-sm font-bold tracking-tight text-slate-950 sm:text-base">Vấn đề và rủi ro cần xử lý</h3>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">Chỉ gồm tín hiệu vận hành thật trong phạm vi công trình đang chọn.</p>
      </div>
      {issues.length === 0 ? (
        <div className="grid min-h-48 place-items-center p-6 text-center">
          <div><CheckCircle2 className="mx-auto size-7 text-emerald-600" aria-hidden="true" /><p className="mt-2 text-sm font-bold text-slate-900">Chưa ghi nhận vấn đề vận hành ưu tiên</p><p className="mt-1 text-xs leading-5 text-slate-500">Trạng thái thiếu dữ liệu được xử lý riêng trong card sức khỏe dữ liệu.</p></div>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {issues.map((issue) => (
            <Link key={issue.id} href={issue.href} className="group flex min-w-0 items-start gap-3 px-4 py-3.5 hover:bg-slate-50 sm:px-5">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-600" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-2"><span className="text-sm font-bold text-slate-900 group-hover:text-blue-700">{issue.title}</span><StatusBadge size="sm" variant="danger">{issue.status}</StatusBadge></div>
                <p className="mt-1 text-xs leading-5 text-slate-600">{issue.reason}</p>
              </div>
              <ArrowRight className="mt-1 size-4 shrink-0 text-slate-400 group-hover:text-blue-700" aria-hidden="true" />
            </Link>
          ))}
        </div>
      )}
    </ContentCard>
  );
}

export function ProjectNextActionsCard({ project, pendingApprovalCount }: { project: DashboardProjectOverview; pendingApprovalCount: number }) {
  const actions = selectProjectNextActions(project);
  const rows = pendingApprovalCount > 0
    ? [{ id: "approvals", label: "Phê duyệt hồ sơ đang chờ", description: `${pendingApprovalCount} hồ sơ cần quyết định.`, href: `/approvals?projectId=${project.id}` }, ...actions].slice(0, 5)
    : actions;

  return (
    <ContentCard data-dashboard-card="project-next-actions" className="grid min-w-0 grid-rows-[auto_minmax(0,1fr)]">
      <div className="border-b border-slate-200/80 px-4 py-3 sm:px-5 sm:py-3.5">
        <h3 className="text-sm font-bold tracking-tight text-slate-950 sm:text-base">Hành động tiếp theo</h3>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">CTA theo trạng thái dữ liệu thật và quyền điều hành của vai trò hiện tại.</p>
      </div>
      <div className="divide-y divide-slate-100">
        {rows.map((action) => (
          <Link key={action.id} href={action.href} data-project-action={action.id} className="group flex min-w-0 items-start gap-3 px-4 py-3.5 hover:bg-slate-50 sm:px-5">
            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
              {action.id === "approvals" ? <ClipboardCheck className="size-4" aria-hidden="true" /> : action.id === "summary" ? <ListChecks className="size-4" aria-hidden="true" /> : <Database className="size-4" aria-hidden="true" />}
            </span>
            <span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-900 group-hover:text-blue-700">{action.label}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{action.description}</span></span>
            <ArrowRight className="mt-2 size-4 shrink-0 text-slate-400 group-hover:text-blue-700" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </ContentCard>
  );
}
