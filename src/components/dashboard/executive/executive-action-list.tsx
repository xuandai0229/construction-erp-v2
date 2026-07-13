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
      "rounded-md px-2 py-1 text-[11px] font-semibold shrink-0 whitespace-nowrap",
      isPending ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-600"
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
    <section id="action-items" className="flex flex-col h-full rounded-[20px] border border-slate-200/70 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden scroll-mt-24">
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-slate-900">{title}</h3>
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
          <div className="flex-1 flex items-center justify-center min-h-[200px] px-5 py-8 text-center text-sm text-slate-500">
            Không có dữ liệu
          </div>
        ) : (
          items.map((item) => (
            <Link 
              key={item.id} 
              href={item.href}
              className="group flex items-center gap-4 px-5 py-3 transition-colors duration-150 ease-out hover:bg-slate-50"
            >
              {getIcon(item.type, item.priority)}
              
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors line-clamp-2">
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
                <span className="text-[12px] font-medium text-slate-500">
                  {item.createdAt ? format(new Date(item.createdAt), 'dd/MM/yyyy') : ''}
                </span>
              </div>

              <div className="shrink-0 text-slate-300 transition-colors duration-150 group-hover:text-blue-500">
                <ChevronRight className="h-4 w-4 transition-transform duration-150 ease-out group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))
        )}
      </div>
    </section>
  );
}
