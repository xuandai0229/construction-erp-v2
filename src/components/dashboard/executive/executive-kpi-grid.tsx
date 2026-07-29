"use client";

import { ArrowUp, Building2, ClipboardCheck, Hammer, ListChecks, TriangleAlert } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard/dashboard-queries";
import { ExecutiveIcon, type IconColorTone } from "./executive-icon";
import type { DrawerType } from "./executive-detail-drawer";

export function ExecutiveKpiGrid({ data, onOpenDrawer }: {
  data: DashboardData;
  onOpenDrawer?: (type: DrawerType, targetId?: string) => void;
}) {
  const projectsKpi = data.kpis.find((kpi) => kpi.id === "projects");
  const activeMatch = projectsKpi?.description.match(/(\d+)\/(\d+)/);
  const activeCount = activeMatch ? Number.parseInt(activeMatch[1], 10) : 0;
  const totalCount = activeMatch ? Number.parseInt(activeMatch[2], 10) : data.projectOverview.length;
  const evaluatedProjects = data.projectOverview.filter((project) => (
    project.plannedProgressPercent !== null
    && project.actualProgressPercent !== null
    && project.variancePercent !== null
  ));
  const atRiskCount = evaluatedProjects.filter((project) => project.health === "AT_RISK" || project.health === "DELAYED").length;
  const unavailableRiskCount = Math.max(0, data.projectOverview.length - evaluatedProjects.length);
  const entriesToday = Number(data.kpis.find((kpi) => kpi.id === "entries-today")?.value ?? 0);
  const actionCount = data.totalActionCount;
  const documentsAndReports = Number(data.kpis.find((kpi) => kpi.id === "documents-reports")?.value ?? 0);

  const kpis = [
    { id: "total-projects", label: "Tổng công trình", value: totalCount, period: "Hiện tại", subtext: "Trong phạm vi được phép xem", context: null, icon: Building2, tone: "blue" as IconColorTone, drawerType: "PROJECT_STATUS" as DrawerType },
    { id: "active-projects", label: "Đang thi công", value: activeCount, period: "Hiện tại", subtext: totalCount > 0 ? `${Math.round((activeCount / totalCount) * 100)}% danh mục` : "Chưa có công trình", context: null, icon: Hammer, tone: "emerald" as IconColorTone, drawerType: "PROJECT_STATUS" as DrawerType },
    { id: "risk", label: "Rủi ro tiến độ", value: atRiskCount, period: "Hiện tại", subtext: `${atRiskCount}/${evaluatedProjects.length} công trình đã đánh giá`, context: unavailableRiskCount > 0 ? `${unavailableRiskCount} công trình chưa đủ dữ liệu` : "Toàn bộ công trình đã được đánh giá", icon: TriangleAlert, tone: "rose" as IconColorTone, drawerType: "RISK" as DrawerType },
    { id: "entries-today", label: "Khối lượng hôm nay", value: entriesToday, period: "Hôm nay", subtext: "Bản ghi hiện trường", context: null, icon: Hammer, tone: "violet" as IconColorTone, drawerType: "VOLUME" as DrawerType },
    { id: "actions", label: "Tín hiệu vận hành", value: actionCount, period: "Hiện tại", subtext: "Vấn đề, nhiệm vụ và vật tư cần rà soát", context: null, icon: ListChecks, tone: "orange" as IconColorTone, drawerType: "ACTIONS" as DrawerType },
    { id: "documents-reports", label: "Báo cáo / Tài liệu", value: documentsAndReports, period: data.period.label, subtext: "Phát sinh trong kỳ đã chọn", context: null, icon: ClipboardCheck, tone: "sky" as IconColorTone, drawerType: undefined },
  ];

  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6" data-dashboard-kpis>
      {kpis.map((kpi) => {
        const content = <>
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0 flex-1 space-y-1 pr-1">
              <p className="text-[11.5px] font-bold uppercase leading-tight tracking-wider text-slate-500">{kpi.label}</p>
              <h3 className="mt-1 break-words text-[21px] font-extrabold leading-tight tracking-tight text-slate-900">{kpi.value}</h3>
            </div>
            <div className="flex shrink-0 items-center justify-center"><ExecutiveIcon icon={kpi.icon} tone={kpi.tone} /></div>
          </div>
          <div className="mt-3 min-w-0 space-y-1 pt-1">
            <span data-kpi-period className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">{kpi.period}</span>
            <div className="flex min-w-0 items-start gap-1.5">
            {kpi.id === "active-projects" && activeCount > 0 ? <ArrowUp className="size-3 shrink-0 text-emerald-500" aria-hidden="true" /> : null}
            {kpi.id === "risk" && atRiskCount > 0 ? <span className="size-1.5 shrink-0 rounded-full bg-rose-500" aria-hidden="true" /> : null}
            <span className="min-w-0 text-[11.5px] font-medium leading-4 text-slate-500">{kpi.subtext}</span>
            </div>
            {kpi.context ? <p className="text-[11px] font-semibold leading-4 text-amber-700">{kpi.context}</p> : null}
          </div>
        </>;
        const className = "group flex min-h-[126px] min-w-0 flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4.5 text-left shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md";

        return kpi.drawerType ? (
          <button key={kpi.id} type="button" onClick={() => onOpenDrawer?.(kpi.drawerType)} className={className}>{content}</button>
        ) : (
          <div key={kpi.id} className={className}>{content}</div>
        );
      })}
    </div>
  );
}
