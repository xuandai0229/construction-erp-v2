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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="flex items-center gap-3.5 rounded-[18px] border border-slate-200/60 bg-white px-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)] h-[82px] transition-shadow hover:shadow-md">
        <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-blue-50 to-blue-100/60 text-blue-600">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-[22px] font-bold text-slate-900 leading-none tracking-tight">{totalCount}</p>
          <p className="text-[13px] font-medium text-slate-500 leading-tight mt-1">Tổng công trình</p>
        </div>
      </div>
      <div className="flex items-center gap-3.5 rounded-[18px] border border-slate-200/60 bg-white px-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)] h-[82px] transition-shadow hover:shadow-md">
        <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-emerald-50 to-emerald-100/60 text-emerald-600">
          <Activity className="h-5 w-5" />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-[22px] font-bold text-slate-900 leading-none tracking-tight">{activeCount}</p>
          <p className="text-[13px] font-medium text-slate-500 leading-tight mt-1">Đang thi công</p>
        </div>
      </div>
      <div className="flex items-center gap-3.5 rounded-[18px] border border-slate-200/60 bg-white px-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)] h-[82px] transition-shadow hover:shadow-md">
        <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-amber-50 to-amber-100/60 text-amber-600">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-[22px] font-bold text-slate-900 leading-none tracking-tight">{attentionCount}</p>
          <p className="text-[13px] font-medium text-slate-500 leading-tight mt-1">Cần chú ý / Tạm dừng</p>
        </div>
      </div>
      <div className="flex items-center gap-3.5 rounded-[18px] border border-slate-200/60 bg-white px-4 shadow-[0_2px_8px_rgba(15,23,42,0.02)] h-[82px] transition-shadow hover:shadow-md">
        <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-indigo-50 to-indigo-100/60 text-indigo-600">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-[22px] font-bold text-slate-900 leading-none tracking-tight">{completedCount}</p>
          <p className="text-[13px] font-medium text-slate-500 leading-tight mt-1">Hoàn thành</p>
        </div>
      </div>
    </div>
  );
}
