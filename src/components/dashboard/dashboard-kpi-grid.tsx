import type { DashboardKpi } from "@/lib/dashboard/dashboard-queries";
import { DashboardKpiCard } from "./dashboard-kpi-card";

export function DashboardKpiGrid({ kpis }: { kpis: DashboardKpi[] }) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <DashboardKpiCard key={kpi.id} kpi={kpi} />
      ))}
    </section>
  );
}
