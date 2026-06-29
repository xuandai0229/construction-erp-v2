import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import type { DashboardSiteReportItem } from "@/lib/dashboard/dashboard-queries";
import { formatDateVNShort } from "@/lib/dashboard/dashboard-formatters";
import { StatusBadge } from "@/components/ui/status-badge";
import { DashboardEmptyState } from "./dashboard-empty-state";

function reportVariant(status: string, hasIssue: boolean) {
  if (hasIssue) return "danger" as const;
  if (status.includes("duyệt")) return "warning" as const;
  if (status.includes("Đã duyệt")) return "success" as const;
  return "neutral" as const;
}

export function DashboardRecentSiteReports({ reports }: { reports: DashboardSiteReportItem[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03]">
      <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="text-base font-bold text-slate-950">Báo cáo hiện trường gần đây</h2>
          <p className="mt-1 text-sm text-slate-600">Theo phạm vi công trình được phân quyền.</p>
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
              <Link key={report.id} href={report.href} className="block rounded-xl border border-slate-200 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/40">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                    <ClipboardCheck className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge variant={reportVariant(report.status, report.hasIssue)} size="sm">{report.hasIssue ? "Có vấn đề" : report.status}</StatusBadge>
                      <span className="text-xs font-semibold text-slate-600">{report.type === "WEEKLY" ? "Tuần" : "Ngày"}</span>
                    </div>
                    <p className="mt-2 line-clamp-1 text-sm font-bold text-slate-950">{report.title}</p>
                    <p className="mt-1 text-xs font-medium text-slate-600">{report.projectName} · {report.reporterName}</p>
                    <p className="mt-1 text-xs text-slate-600">{formatDateVNShort(report.reportDate)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
