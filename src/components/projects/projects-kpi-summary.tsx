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
        <div className="flex items-center gap-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 shadow-[var(--shadow-card)] h-[82px] transition-shadow hover:shadow-[var(--shadow-elevated)]">
          <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-blue-50/50 text-blue-600">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <p className="text-[22px] font-black text-[var(--foreground)] leading-none tracking-tight truncate">{totalCount}</p>
            <p className="text-[13px] font-medium text-[var(--muted-foreground)] leading-tight mt-1 truncate">Tổng công trình</p>
          </div>
        </div>
        <div className="flex items-center gap-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 shadow-[var(--shadow-card)] h-[82px] transition-shadow hover:shadow-[var(--shadow-elevated)]">
          <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-emerald-50/50 text-emerald-600">
            <Activity className="h-5 w-5" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <p className="text-[22px] font-black text-[var(--foreground)] leading-none tracking-tight truncate">{activeCount}</p>
            <p className="text-[13px] font-medium text-[var(--muted-foreground)] leading-tight mt-1 truncate">Đang thi công</p>
          </div>
        </div>
        <div className="flex items-center gap-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 shadow-[var(--shadow-card)] h-[82px] transition-shadow hover:shadow-[var(--shadow-elevated)]">
          <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-amber-50/50 text-amber-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <p className="text-[22px] font-black text-[var(--foreground)] leading-none tracking-tight truncate">{attentionCount}</p>
            <p className="text-[13px] font-medium text-[var(--muted-foreground)] leading-tight mt-1 truncate">Cần chú ý</p>
          </div>
        </div>
        <div className="flex items-center gap-3.5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-4 shadow-[var(--shadow-card)] h-[82px] transition-shadow hover:shadow-[var(--shadow-elevated)]">
          <div className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-indigo-50/50 text-indigo-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <p className="text-[22px] font-black text-[var(--foreground)] leading-none tracking-tight truncate">{completedCount}</p>
            <p className="text-[13px] font-medium text-[var(--muted-foreground)] leading-tight mt-1 truncate">Hoàn thành</p>
          </div>
        </div>
      </div>

      {/* Mobile Layout (Summary Strip) */}
      <div className="lg:hidden flex items-center justify-center gap-2 py-2 px-3 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-1.5 px-2">
          <span className="text-[14px] font-black text-blue-600">{totalCount}</span>
          <span className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Công trình</span>
        </div>
        <div className="h-3 w-px bg-[var(--border)]" />
        <div className="flex items-center gap-1.5 px-2">
          <span className="text-[14px] font-black text-emerald-600">{activeCount}</span>
          <span className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Thi công</span>
        </div>
        <div className="h-3 w-px bg-[var(--border)]" />
        <div className="flex items-center gap-1.5 px-2">
          <span className="text-[14px] font-black text-amber-500">{attentionCount}</span>
          <span className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Rủi ro</span>
        </div>
      </div>
    </>
  );
}
