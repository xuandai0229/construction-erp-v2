import { Building2, Activity, AlertCircle, CheckCircle2 } from "lucide-react";

interface ProjectsKPISummaryProps {
  totalCount: number;
  activeCount: number;
  attentionCount: number;
  completedCount: number;
}

export function ProjectsKPISummary({
  totalCount,
  activeCount,
  attentionCount,
  completedCount,
}: ProjectsKPISummaryProps) {
  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden lg:grid grid-cols-4 gap-4">
        <div className="flex items-center gap-3.5 rounded-[18px] border border-slate-200/60 bg-white px-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)] h-[82px] transition-shadow hover:shadow-md">
          <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-blue-50 to-blue-100/60 text-blue-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <p className="text-[22px] font-bold text-slate-900 leading-none tracking-tight truncate">{totalCount}</p>
            <p className="text-[13px] font-medium text-slate-500 leading-tight mt-1 truncate">Tổng công trình</p>
          </div>
        </div>
        <div className="flex items-center gap-3.5 rounded-[18px] border border-slate-200/60 bg-white px-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)] h-[82px] transition-shadow hover:shadow-md">
          <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-emerald-50 to-emerald-100/60 text-emerald-600">
            <Activity className="h-5 w-5" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <p className="text-[22px] font-bold text-slate-900 leading-none tracking-tight truncate">{activeCount}</p>
            <p className="text-[13px] font-medium text-slate-500 leading-tight mt-1 truncate">Đang thi công</p>
          </div>
        </div>
        <div className="flex items-center gap-3.5 rounded-[18px] border border-slate-200/60 bg-white px-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)] h-[82px] transition-shadow hover:shadow-md">
          <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-amber-50 to-amber-100/60 text-amber-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <p className="text-[22px] font-bold text-slate-900 leading-none tracking-tight truncate">{attentionCount}</p>
            <p className="text-[13px] font-medium text-slate-500 leading-tight mt-1 truncate">Cần chú ý</p>
          </div>
        </div>
        <div className="flex items-center gap-3.5 rounded-[18px] border border-slate-200/60 bg-white px-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)] h-[82px] transition-shadow hover:shadow-md">
          <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-indigo-50 to-indigo-100/60 text-indigo-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <p className="text-[22px] font-bold text-slate-900 leading-none tracking-tight truncate">{completedCount}</p>
            <p className="text-[13px] font-medium text-slate-500 leading-tight mt-1 truncate">Hoàn thành</p>
          </div>
        </div>
      </div>

      {/* Mobile Layout (Summary Strip) */}
      <div className="lg:hidden flex items-center justify-center gap-2 py-2 px-3 rounded-[12px] bg-white border border-slate-200/60 shadow-[0_2px_10px_rgba(15,23,42,0.015)]">
        <div className="flex items-center gap-1.5 px-2">
          <span className="text-[14px] font-black text-blue-700">{totalCount}</span>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Công trình</span>
        </div>
        <div className="h-3 w-px bg-slate-200" />
        <div className="flex items-center gap-1.5 px-2">
          <span className="text-[14px] font-black text-emerald-600">{activeCount}</span>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Thi công</span>
        </div>
        <div className="h-3 w-px bg-slate-200" />
        <div className="flex items-center gap-1.5 px-2">
          <span className="text-[14px] font-black text-amber-500">{attentionCount}</span>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Rủi ro</span>
        </div>
      </div>
    </>
  );
}
