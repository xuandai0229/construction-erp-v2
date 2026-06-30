import Link from 'next/link';
import { ChevronRight, FileText, CheckCircle2, Clock, Upload, Send, TrendingUp, UploadCloud, ClipboardCheck, FileCheck } from 'lucide-react';
import type { DashboardActivityItem } from '@/lib/dashboard/dashboard-queries';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ExecutiveSmallIcon, type IconColorTone } from './executive-icon';

function getIcon(tone: string, title: string) {
  const t = title.toLowerCase();
  let icon = Clock;
  let derivedTone = tone as IconColorTone;

  if (t.includes('tiến độ')) { icon = TrendingUp; derivedTone = 'emerald'; }
  else if (t.includes('tài liệu') || t.includes('upload')) { icon = UploadCloud; derivedTone = 'blue'; }
  else if (t.includes('báo cáo')) { icon = ClipboardCheck; derivedTone = 'blue'; }
  else if (t.includes('duyệt') || t.includes('phê duyệt')) { icon = FileCheck; derivedTone = 'emerald'; }
  else if (t.includes('gửi') || t.includes('yêu cầu')) { icon = Send; }
  else {
    if (tone === 'emerald') icon = CheckCircle2;
    else if (tone === 'blue') icon = FileText;
    else if (tone === 'amber') icon = FileText;
  }

  return <ExecutiveSmallIcon icon={icon as any} tone={derivedTone} />;
}

export function ExecutiveActivityFeed({ 
  activities 
}: { 
  activities: DashboardActivityItem[] 
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
        <h3 className="font-bold text-slate-900">Hoạt động điều hành gần đây</h3>
        <Link href="#" className="flex items-center gap-1 text-[13px] font-medium text-blue-600 hover:text-blue-700 pointer-events-none opacity-50">
          Xem tất cả <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="p-3.5">
        {activities.length === 0 ? (
          <div className="py-4 text-center text-sm text-slate-500">Không có hoạt động gần đây</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {activities.slice(0, 4).map((activity) => (
              <div key={activity.id} className="flex items-start gap-2.5 rounded-[10px] border border-slate-100 bg-slate-50/50 p-2.5 hover:bg-slate-50 transition-colors">
                {getIcon(activity.tone, activity.title)}
                
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-[12px] font-bold text-slate-900 truncate">
                    {activity.title}
                  </span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[11px] font-medium text-slate-500 truncate mr-2">
                      {activity.projectName}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 shrink-0">
                      {format(new Date(activity.createdAt), 'HH:mm dd/MM')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
