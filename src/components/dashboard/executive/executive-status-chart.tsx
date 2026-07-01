import type { DashboardProjectOverview } from '@/lib/dashboard/dashboard-queries';
import { cn } from '@/lib/utils';
import { ArrowUp } from 'lucide-react';

export function ExecutiveStatusChart({ 
  projects 
}: { 
  projects: DashboardProjectOverview[] 
}) {
  const total = projects.length;
  if (total === 0) return null;

  const onTrackCount = projects.filter(p => p.health === 'ON_TRACK' || p.health === 'COMPLETED').length;
  const atRiskCount = projects.filter(p => p.health === 'AT_RISK').length;
  const delayedCount = projects.filter(p => p.health === 'DELAYED' || p.health === 'NO_DATA').length;

  const onTrackPct = total > 0 ? (onTrackCount / total) * 100 : 0;
  const atRiskPct = total > 0 ? (atRiskCount / total) * 100 : 0;
  const delayedPct = total > 0 ? (delayedCount / total) * 100 : 0;

  const validProgressProjects = projects.filter(p => p.progressPercent !== null);
  const avgProgress = validProgressProjects.length > 0 
    ? validProgressProjects.reduce((sum, p) => sum + (p.progressPercent || 0), 0) / validProgressProjects.length 
    : 0;

  // SVG Donut calculation
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  
  const onTrackStroke = (onTrackPct / 100) * circumference;
  const atRiskStroke = (atRiskPct / 100) * circumference;
  const delayedStroke = (delayedPct / 100) * circumference;

  const atRiskOffset = -onTrackStroke;
  const delayedOffset = atRiskOffset - atRiskStroke;

  return (
    <div className="flex flex-col xl:flex-row gap-4 h-full rounded-[20px] border border-slate-200/70 bg-white p-5 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      
      <div className="flex-1 flex flex-col justify-center border-b xl:border-b-0 xl:border-r border-slate-100 pb-3 xl:pb-0 xl:pr-3">
        <h4 className="text-[12px] font-bold text-slate-900 mb-3">Phân bổ trạng thái công trình</h4>
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16 shrink-0 flex items-center justify-center">
            <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} className="fill-none stroke-slate-100" strokeWidth="14" />
              {onTrackPct > 0 && (
                <circle cx="50" cy="50" r={radius} className="fill-none stroke-emerald-500" strokeWidth="14" strokeDasharray={`${onTrackStroke} ${circumference}`} strokeLinecap="round" />
              )}
              {atRiskPct > 0 && (
                <circle cx="50" cy="50" r={radius} className="fill-none stroke-amber-500" strokeWidth="14" strokeDasharray={`${atRiskStroke} ${circumference}`} strokeDashoffset={atRiskOffset} strokeLinecap="round" />
              )}
              {delayedPct > 0 && (
                <circle cx="50" cy="50" r={radius} className="fill-none stroke-rose-500" strokeWidth="14" strokeDasharray={`${delayedStroke} ${circumference}`} strokeDashoffset={delayedOffset} strokeLinecap="round" />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[16px] font-bold text-slate-900 leading-none">{total}</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-slate-600">
                Đúng tiến độ: <span className="font-bold text-slate-900">{onTrackCount}</span> <span className="text-slate-400">({Math.round(onTrackPct)}%)</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-[11px] font-medium text-slate-600">
                Cần chú ý: <span className="font-bold text-slate-900">{atRiskCount}</span> <span className="text-slate-400">({Math.round(atRiskPct)}%)</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-[11px] font-medium text-slate-600">
                Rủi ro: <span className="font-bold text-slate-900">{delayedCount}</span> <span className="text-slate-400">({Math.round(delayedPct)}%)</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center sm:pl-2">
        <h4 className="text-[12px] font-bold text-slate-900 mb-1">Tiến độ trung bình theo thời gian</h4>
        <div className="flex items-end gap-2.5 mt-0.5">
          <span className="text-[28px] font-bold text-slate-900 leading-none">{Math.round(avgProgress)}%</span>
          <div className="flex items-center gap-1 text-emerald-600 mb-0.5">
            <ArrowUp className="h-3 w-3" />
            <span className="text-[11px] font-bold">8% vs tháng trước</span>
          </div>
        </div>
        
        <div className="mt-3 relative h-[30px] w-full max-w-[180px] overflow-hidden">
          {/* Mini line chart mock using SVG */}
          <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 100 30">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0,20 L10,15 L20,18 L30,10 L40,12 L50,5 L60,8 L70,2 L80,4 L90,1 L100,0 V30 H0 Z" fill="url(#chartGradient)" />
            <path d="M0,20 L10,15 L20,18 L30,10 L40,12 L50,5 L60,8 L70,2 L80,4 L90,1 L100,0" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="100" cy="0" r="2.5" fill="#3b82f6" stroke="white" strokeWidth="1.5" />
          </svg>
        </div>
      </div>
      
    </div>
  );
}
