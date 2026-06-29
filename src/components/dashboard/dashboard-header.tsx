import Link from "next/link";
import { CalendarDays, CheckSquare, ClipboardList, Clock, Plus, Upload } from "lucide-react";
import type { DashboardData, DashboardPeriod } from "@/lib/dashboard/dashboard-queries";
import { formatDateTimeVN } from "@/lib/dashboard/dashboard-formatters";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const periodOptions: { value: DashboardPeriod; label: string }[] = [
  { value: "7d", label: "7 ngày" },
  { value: "30d", label: "30 ngày" },
  { value: "month", label: "Tháng này" },
];

function ActionIcon({ label }: { label: string }) {
  if (label.includes("Upload")) return <Upload className="h-4 w-4" />;
  if (label.includes("khối lượng")) return <ClipboardList className="h-4 w-4" />;
  if (label.includes("phê duyệt")) return <CheckSquare className="h-4 w-4" />;
  return <Plus className="h-4 w-4" />;
}

export function DashboardHeader({ data }: { data: DashboardData }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/[0.03] sm:p-5 lg:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-blue-700">
            <span>{data.session.roleDisplayName}</span>
            <span className="text-slate-300">/</span>
            <span>{data.permissions.canViewCompanyWideDashboard ? "Toàn hệ thống" : "Theo công trình được phân quyền"}</span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Xin chào, {data.session.name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-500" />
              {formatDateTimeVN(new Date())}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              Dữ liệu: {data.period.label}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:items-end">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-100 p-1">
            {periodOptions.map((option) => (
              <Link
                key={option.value}
                href={`/dashboard?period=${option.value}`}
                className={cn(
                  "rounded-lg px-3 py-2 text-center text-xs font-semibold text-slate-700 transition-colors sm:text-sm",
                  data.period.value === option.value ? "bg-white text-blue-700 shadow-sm" : "hover:bg-white/70",
                )}
              >
                {option.label}
              </Link>
            ))}
          </div>
          {data.quickActions.length > 0 && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
              {data.quickActions.map((action) => (
                <Button key={action.href} asChild size="sm" variant={action.tone === "primary" ? "default" : "outline"}>
                  <Link href={action.href}>
                    <ActionIcon label={action.label} />
                    {action.label}
                  </Link>
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
