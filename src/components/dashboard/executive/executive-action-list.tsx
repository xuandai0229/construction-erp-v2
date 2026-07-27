import Link from 'next/link';
import { 
  ChevronRight, 
  Building2, 
  TriangleAlert, 
  ClipboardCheck, 
  FileCheck, 
  Package, 
  TrendingUp, 
  AlertCircle 
} from 'lucide-react';
import type { DashboardActionItem } from '@/lib/dashboard/dashboard-queries';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { formatStatusLabel } from '@/lib/dashboard/dashboard-formatters';

function getPriorityBadge(priority: DashboardActionItem['priority']) {
  switch (priority) {
    case 'HIGH':
      return <span className="rounded-md bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600">Cao</span>;
    case 'MEDIUM':
      return <span className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-600">Trung bình</span>;
    case 'LOW':
      return <span className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-600">Thấp</span>;
    default:
      return null;
  }
}

function getStatusBadge(status: string) {
  const label = formatStatusLabel(status) || status;
  const isPending = label.includes('Chờ') || label.includes('Cần') || status.includes('PENDING');
  return (
    <span className={cn(
      "rounded-[var(--radius-sm)] px-2 py-1 text-[11px] font-semibold shrink-0 whitespace-nowrap border",
      isPending ? "bg-amber-50 text-amber-700 border-amber-200/50" : "bg-[var(--surface)] text-[var(--muted-foreground)] border-[var(--border)]"
    )}>
      {label}
    </span>
  );
}

import { ExecutiveSmallIcon, type IconColorTone } from './executive-icon';

function getIcon(type: string, priority: string) {
  let icon = AlertCircle;
  let tone: IconColorTone = 'slate';

  if (type === 'Tiến độ' && priority === 'HIGH') { icon = TriangleAlert; tone = 'rose'; }
  else if (type === 'Tiến độ') { icon = TrendingUp; tone = 'emerald'; }
  else if (type === 'Phê duyệt') { icon = FileCheck; tone = 'emerald'; }
  else if (type === 'Báo cáo') { icon = ClipboardCheck; tone = 'blue'; }
  else if (type === 'Vật tư') { icon = Package; tone = 'orange'; }
  else if (type === 'Công trình') { icon = Building2; tone = 'blue'; }

  return <ExecutiveSmallIcon icon={icon as any} tone={tone} />;
}

export function ExecutiveActionList({ 
  title, 
  items, 
  viewAllHref = "#", 
  count 
}: { 
  title: string, 
  items: DashboardActionItem[], 
  viewAllHref?: string,
  count?: number
}) {
  return (
    <section id="action-items" className="flex flex-col h-full rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-elevated)] transition-shadow overflow-hidden scroll-mt-24">
      <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-5 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-[var(--foreground)] tracking-tight">{title}</h3>
          {count !== undefined && (
            <span className="flex items-center justify-center rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-600">
              {count} việc
            </span>
          )}
        </div>
        <Link href={viewAllHref} className="flex items-center gap-1 text-[13px] font-medium text-blue-600 hover:text-blue-700">
          Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex flex-col divide-y divide-slate-100 flex-1">
        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center min-h-[220px] px-6 py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100/80 mb-3 text-slate-400">
              <FileCheck className="h-6 w-6 stroke-[1.5]" />
            </div>
            <p className="text-sm font-semibold text-slate-700">
              {title.includes('Phê duyệt') ? 'Hiện không có hồ sơ chờ xử lý' : 'Hiện không có công việc cần xử lý ngay'}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-[280px]">
              {title.includes('Phê duyệt') ? 'Các hồ sơ cần phê duyệt sẽ xuất hiện tại đây.' : 'Các công việc phát sinh cần xử lý sẽ hiển thị tại đây.'}
            </p>
          </div>
        ) : (
          items.map((item) => (
            <Link 
              key={item.id} 
              href={item.href}
              className="group flex items-center gap-3.5 px-5 py-3.5 transition-colors duration-150 ease-out hover:bg-slate-50/80"
            >
              {getIcon(item.type, item.priority)}
              
              <div className="flex min-w-0 flex-1 flex-col pr-2">
                <span className="text-[13.5px] font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                  {item.title}
                </span>
                <span className="text-[12px] font-medium text-slate-500 mt-0.5 line-clamp-1">
                  {item.projectName}
                </span>
              </div>

              <div className="hidden shrink-0 items-center gap-2 sm:flex">
                {getPriorityBadge(item.priority)}
                {getStatusBadge(item.status)}
              </div>

              <div className="shrink-0 text-right w-[75px] hidden sm:block">
                <span className="text-[11.5px] font-medium font-mono text-slate-400">
                  {item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy') : ''}
                </span>
              </div>

              <div className="shrink-0 text-slate-400 opacity-60 transition-colors duration-150 group-hover:text-blue-600 group-hover:opacity-100">
                <ChevronRight className="h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
