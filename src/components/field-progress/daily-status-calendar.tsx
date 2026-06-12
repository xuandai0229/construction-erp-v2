"use client";

import { useMemo } from "react";
import { Calendar, CheckCircle2, Clock, FileText, AlertCircle, Circle } from "lucide-react";
import { format, subDays, addDays } from "date-fns";

type DayStatus = "APPROVED" | "SUBMITTED" | "DRAFT" | "EMPTY";

interface DailyStatusCalendarProps {
  currentDate: string; // YYYY-MM-DD
  entriesStatus: Record<string, DayStatus>; // dateStr => status
  projectId: string;
}

export function DailyStatusCalendar({ 
  currentDate, 
  entriesStatus, 
  projectId 
}: DailyStatusCalendarProps) {
  
  const dates = useMemo(() => {
    const current = new Date(currentDate);
    const result = [];
    
    // Show 7 days before and 7 days after
    for (let i = -7; i <= 7; i++) {
      const date = i < 0 ? subDays(current, Math.abs(i)) : addDays(current, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const status = entriesStatus[dateStr] || "EMPTY";
      
      result.push({
        date,
        dateStr,
        status,
        isCurrent: dateStr === currentDate
      });
    }
    
    return result;
  }, [currentDate, entriesStatus]);

  const getStatusConfig = (status: DayStatus, isCurrent: boolean) => {
    switch (status) {
      case "APPROVED":
      case "SUBMITTED":
      case "DRAFT":
        return {
          icon: CheckCircle2,
          bg: isCurrent ? "bg-blue-50" : "bg-emerald-50/50",
          border: isCurrent ? "border-blue-500" : "border-emerald-200",
          text: isCurrent ? "text-blue-700" : "text-emerald-700",
          dayText: isCurrent ? "text-blue-900" : "text-slate-800",
          ring: isCurrent ? "ring-2 ring-blue-100" : "",
          label: "Đã nhập"
        };
      default:
        return {
          icon: Circle,
          bg: isCurrent ? "bg-blue-50" : "bg-slate-50",
          border: isCurrent ? "border-blue-500" : "border-slate-200",
          text: isCurrent ? "text-blue-700" : "text-slate-400",
          dayText: isCurrent ? "text-blue-900" : "text-slate-600",
          ring: isCurrent ? "ring-2 ring-blue-100" : "",
          label: "Chưa nhập"
        };
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 sm:p-4 shadow-sm w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 rounded-lg border border-blue-100">
            <Calendar className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-[15px]">Lịch nhập</h3>
            <p className="text-[11px] text-slate-500 font-medium">Chọn ngày để nhập khối lượng</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            <span className="text-[11px] font-semibold text-slate-600">Đã nhập</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-slate-300"></span>
            <span className="text-[11px] font-semibold text-slate-600">Chưa nhập</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-100"></span>
            <span className="text-[11px] font-semibold text-slate-600">Đang chọn</span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="overflow-x-auto pb-1 -mx-1 px-1">
        <div className="flex gap-2 min-w-max">
          {dates.map(({ date, dateStr, status, isCurrent }) => {
            const config = getStatusConfig(status, isCurrent);
            const Icon = config.icon;
            
            return (
              <a
                key={dateStr}
                href={`/projects/${projectId}/field-progress/daily?date=${dateStr}`}
                className={`group flex flex-col items-center gap-1 p-2 rounded-xl border transition-all active:scale-[0.97] duration-150 ease-out min-w-[56px] ${config.bg} ${config.border} ${config.ring} hover:shadow-sm`}
                title={`${format(date, 'dd/MM/yyyy')} - ${config.label}`}
              >
                <div className={`text-[12px] font-bold ${config.dayText} group-hover:text-blue-700 transition-colors`}>
                  {format(date, 'dd/MM')}
                </div>
                <Icon className={`h-3.5 w-3.5 ${config.text} transition-colors`} strokeWidth={isCurrent ? 3 : 2} />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
