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

  const getStatusConfig = (status: DayStatus) => {
    switch (status) {
      case "APPROVED":
        return {
          icon: CheckCircle2,
          bg: "bg-emerald-100",
          border: "border-emerald-300",
          text: "text-emerald-700",
          label: "Đã xác nhận"
        };
      case "SUBMITTED":
        return {
          icon: Clock,
          bg: "bg-blue-100",
          border: "border-blue-300",
          text: "text-blue-700",
          label: "Chờ giám sát"
        };
      case "DRAFT":
        return {
          icon: FileText,
          bg: "bg-amber-100",
          border: "border-amber-300",
          text: "text-amber-700",
          label: "Lưu tạm"
        };
      default:
        return {
          icon: Circle,
          bg: "bg-slate-100",
          border: "border-slate-200",
          text: "text-slate-400",
          label: "Chưa nhập"
        };
    }
  };

  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Calendar className="h-5 w-5 text-blue-600" />
        </div>
        <h3 className="font-bold text-slate-900 text-base">Lịch trạng thái báo cáo</h3>
      </div>

      {/* Timeline */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-2 min-w-max">
          {dates.map(({ date, dateStr, status, isCurrent }) => {
            const config = getStatusConfig(status);
            const Icon = config.icon;
            
            return (
              <a
                key={dateStr}
                href={`/projects/${projectId}/field-progress/daily?date=${dateStr}`}
                className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all min-w-[80px] ${
                  isCurrent 
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
                    : `${config.border} ${config.bg} hover:scale-105`
                }`}
                title={`${format(date, 'dd/MM/yyyy')} - ${config.label}`}
              >
                <Icon className={`h-4 w-4 ${isCurrent ? 'text-blue-600' : config.text}`} />
                <div className="text-center">
                  <div className={`text-xs font-bold ${isCurrent ? 'text-blue-900' : 'text-slate-700'}`}>
                    {format(date, 'dd/MM')}
                  </div>
                  <div className={`text-[10px] font-medium ${isCurrent ? 'text-blue-700' : config.text}`}>
                    T{format(date, 'i')}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t-2 border-slate-100">
        {[
          { status: "APPROVED" as DayStatus, label: "Đã xác nhận" },
          { status: "SUBMITTED" as DayStatus, label: "Chờ giám sát" },
          { status: "DRAFT" as DayStatus, label: "Lưu tạm" },
          { status: "EMPTY" as DayStatus, label: "Chưa nhập" }
        ].map(({ status, label }) => {
          const config = getStatusConfig(status);
          const Icon = config.icon;
          return (
            <div key={status} className="flex items-center gap-1.5">
              <Icon className={`h-3.5 w-3.5 ${config.text}`} />
              <span className="text-xs font-medium text-slate-600">{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
