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
    <section className="mb-2 sm:mb-0 sm:rounded-[var(--radius-lg)] sm:border sm:border-[var(--border)] sm:bg-[var(--surface)] sm:p-5 lg:p-6 sm:shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-3 sm:gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[12px] sm:text-sm font-semibold text-blue-700">
            <span>{data.session.roleDisplayName}</span>
            <span className="text-slate-300 hidden sm:inline-block">/</span>
            <span className="hidden sm:inline-block">{data.permissions.canViewCompanyWideDashboard ? "Toàn hệ thống" : "Theo công trình được phân quyền"}</span>
          </div>
          <h1 className="mt-1 sm:mt-2 text-[22px] sm:text-2xl font-black tracking-tight text-[var(--foreground)] lg:text-3xl">
            Xin chào, {data.session.name.split(' ').pop()}
          </h1>
          <div className="mt-1.5 sm:mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 sm:gap-x-4 sm:gap-y-2 text-[12px] sm:text-sm text-[var(--muted-foreground)]">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-[var(--muted-foreground)]" />
              {formatDateTimeVN(new Date())}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-[var(--muted-foreground)]" />
              Dữ liệu: {data.period.label}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:items-end w-full lg:w-auto">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 rounded-xl bg-slate-200/50 sm:bg-slate-100 p-1 w-full sm:w-auto">
            {periodOptions.map((option) => (
              <Link
                key={option.value}
                href={`/dashboard?period=${option.value}`}
                className={cn(
                  "rounded-lg px-3 py-2 text-center text-xs font-semibold text-[var(--muted-foreground)] transition-colors sm:text-sm",
                  data.period.value === option.value ? "bg-[var(--surface)] text-blue-700 shadow-sm" : "hover:bg-[var(--surface)]/70",
                )}
              >
                {option.label}
              </Link>
            ))}
          </div>
          {data.quickActions.length > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end w-full">
              {data.quickActions.map((action) => (
                <Button key={action.href} asChild size="sm" variant={action.tone === "primary" ? "default" : "outline"} className={cn("w-full sm:w-auto", action.tone !== "primary" && "bg-[var(--surface)]")}>
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
