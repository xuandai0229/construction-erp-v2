import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import type { DashboardSiteReportItem } from "@/lib/dashboard/dashboard-queries";
import { formatDateVNShort } from "@/lib/dashboard/dashboard-formatters";
import { StatusBadge } from "@/components/ui/status-badge";
import { DashboardEmptyState } from "./dashboard-empty-state";
import { ContentCard } from "@/components/ui/enterprise";

function reportVariant(status: string, hasIssue: boolean) {
  if (hasIssue) return "danger" as const;
  if (status.includes("duyệt")) return "warning" as const;
  if (status.includes("Đã duyệt")) return "success" as const;
  return "neutral" as const;
}

export function DashboardRecentSiteReports({ reports }: { reports: DashboardSiteReportItem[] }) {
  return (
    <ContentCard className="flex flex-col">
      <div className="flex flex-col gap-2 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="text-base font-bold text-[var(--foreground)] tracking-tight">Báo cáo hiện trường gần đây</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">Theo phạm vi công trình được phân quyền.</p>
        </div>
        <Link href="/reports" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800">
          Xem báo cáo <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="p-3 sm:p-4">
        {reports.length === 0 ? (
          <DashboardEmptyState title="Chưa có báo cáo hiện trường" description="Khi công trường gửi báo cáo, danh sách sẽ xuất hiện tại đây." />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-1">
            {reports.map((report) => (
              <Link key={report.id} href={report.href} className="block rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 sm:p-4 transition-colors hover:border-blue-300 hover:bg-blue-50/20 shadow-sm hover:shadow-[var(--shadow-elevated)]">
                <div className="flex items-start gap-2.5 sm:gap-3">
                  <span className="flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-lg sm:rounded-[var(--radius-md)] bg-violet-50 text-violet-700">
                    <ClipboardCheck className="h-4 w-4 sm:h-5 sm:w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <StatusBadge variant={reportVariant(report.status, report.hasIssue)} size="sm">{report.hasIssue ? "Có vấn đề" : report.status}</StatusBadge>
                      <span className="text-[11px] sm:text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">{report.type === "WEEKLY" ? "Tuần" : "Ngày"}</span>
                    </div>
                    <p className="mt-1.5 line-clamp-1 text-[13px] sm:text-sm font-bold text-[var(--foreground)]">{report.title}</p>
                    <p className="mt-1 line-clamp-1 text-[11px] sm:text-xs font-medium text-[var(--muted-foreground)]">{report.projectName} · {report.reporterName}</p>
                    <p className="mt-0.5 text-[11px] sm:text-xs text-[var(--muted-foreground)] opacity-70">{formatDateVNShort(report.reportDate)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </ContentCard>
  );
}
