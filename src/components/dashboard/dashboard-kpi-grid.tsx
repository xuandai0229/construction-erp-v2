import type { DashboardKpi } from "@/lib/dashboard/dashboard-queries";
import { DashboardKpiCard } from "./dashboard-kpi-card";

export function DashboardKpiGrid({ kpis }: { kpis: DashboardKpi[] }) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:flex xl:flex-wrap">
      {kpis.map((kpi) => (
        <div key={kpi.id} className="xl:flex-1 xl:min-w-[200px]">
          <DashboardKpiCard kpi={kpi} />
        </div>
      ))}
    </section>
  );
}
