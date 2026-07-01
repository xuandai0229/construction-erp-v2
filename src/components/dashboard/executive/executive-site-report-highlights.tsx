import Link from 'next/link';
import { ChevronRight, Calendar } from 'lucide-react';
import type { DashboardSiteReportItem } from '@/lib/dashboard/dashboard-queries';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { formatStatusLabel } from '@/lib/dashboard/dashboard-formatters';
import { ExecutiveSmallIcon, type IconColorTone } from './executive-icon';

function getStatusBadge(statusRaw: string, hasIssue: boolean) {
  const status = formatStatusLabel(statusRaw) || statusRaw;
  if (hasIssue) {
    return <span className="rounded-md bg-rose-50 px-2 py-1 text-[10px] font-bold uppercase text-rose-600 border border-rose-100">Có vấn đề</span>;
  }
  if (status === 'Đã duyệt' || status.toUpperCase().includes('APPROVED')) {
    return <span className="rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase text-emerald-600 border border-emerald-100">Đã duyệt</span>;
  }
  if (status === 'Chờ duyệt' || status.toUpperCase().includes('SUBMITTED') || status.toUpperCase().includes('PENDING')) {
    return <span className="rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase text-amber-600 border border-amber-100">Chờ duyệt</span>;
  }
  return <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-bold uppercase text-slate-600 border border-slate-200">{status}</span>;
}

function getCardColor(statusRaw: string, hasIssue: boolean) {
  const status = formatStatusLabel(statusRaw) || statusRaw;
  if (hasIssue) return 'border-rose-200/60 bg-rose-50/30 hover:border-rose-300';
  if (status === 'Chờ duyệt' || status.toUpperCase().includes('SUBMITTED')) return 'border-amber-200/60 bg-amber-50/30 hover:border-amber-300';
  return 'border-slate-100 bg-white hover:border-slate-300';
}

function getIconTone(statusRaw: string, hasIssue: boolean): IconColorTone {
  const status = formatStatusLabel(statusRaw) || statusRaw;
  if (hasIssue) return 'rose';
  if (status === 'Chờ duyệt' || status.toUpperCase().includes('SUBMITTED')) return 'amber';
  if (status === 'Đã duyệt' || status.toUpperCase().includes('APPROVED')) return 'emerald';
  return 'violet';
}

export function ExecutiveSiteReportHighlights({ 
  reports 
}: { 
  reports: DashboardSiteReportItem[] 
}) {
  const displayReports = reports.slice(0, 3);

  return (
    <div className="flex flex-col h-full rounded-[20px] border border-slate-200/70 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 shrink-0">
        <h3 className="font-bold text-slate-900">Báo cáo hiện trường nổi bật</h3>
        <Link href="/reports" className="flex items-center gap-1 text-[13px] font-medium text-blue-600 hover:text-blue-700">
          Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="p-4 sm:p-5">
        {displayReports.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Không có báo cáo nổi bật
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {displayReports.map((report) => (
              <Link 
                key={report.id} 
                href={report.href}
                className={cn(
                  "group flex flex-col justify-between rounded-xl border p-3.5 transition-all duration-200 ease-out hover:shadow-sm hover:-translate-y-0.5",
                  getCardColor(report.status, report.hasIssue)
                )}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <ExecutiveSmallIcon icon={Calendar} tone={getIconTone(report.status, report.hasIssue)} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1" title={report.title}>
                        {report.title}
                      </span>
                      <span className="text-[12px] font-medium text-slate-500 line-clamp-1">
                        {report.projectName}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    {getStatusBadge(report.status, report.hasIssue)}
                    <span className="text-[11px] font-medium text-slate-400">
                      {format(new Date(report.reportDate), 'dd/MM/yyyy')}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
