"use client";

import {
  ClipboardList,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
} from "lucide-react";
import type { ReportStats } from "./types";

interface StatsCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  icon: React.ReactNode;
  color: string; // tailwind color classes
  bgColor: string;
  borderColor: string;
}

function StatsCard({ label, value, suffix, icon, color, bgColor, borderColor }: StatsCardProps) {
  return (
    <div className={`bg-white rounded-xl border ${borderColor} shadow-sm p-4 sm:p-5 flex items-center gap-3 sm:gap-4 transition-shadow hover:shadow-md`}>
      <div className={`flex-shrink-0 flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${bgColor}`}>
        <div className={color}>{icon}</div>
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-0.5">
          <span className="text-2xl sm:text-[28px] font-bold text-slate-900 leading-tight tracking-tight">
            {value}
          </span>
          {suffix && (
            <span className="text-lg sm:text-xl font-semibold text-slate-400 ml-0.5">{suffix}</span>
          )}
        </div>
        <p className="text-xs sm:text-[13px] text-slate-500 mt-0.5 font-medium">{label}</p>
      </div>
    </div>
  );
}

interface ReportsStatsProps {
  stats: ReportStats;
}

export function ReportsStats({ stats }: ReportsStatsProps) {
  const cards: StatsCardProps[] = [
    {
      label: "Tổng báo cáo",
      value: stats.total,
      icon: <ClipboardList className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.8} />,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-100",
    },
    {
      label: "Đã duyệt",
      value: stats.approved,
      icon: <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.8} />,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "border-emerald-100",
    },
    {
      label: "Chờ duyệt",
      value: stats.pending,
      icon: <Clock className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.8} />,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-100",
    },
    {
      label: "Từ chối",
      value: stats.rejected,
      icon: <XCircle className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.8} />,
      color: "text-red-500",
      bgColor: "bg-red-50",
      borderColor: "border-red-100",
    },
    {
      label: "Tỷ lệ duyệt",
      value: stats.approvalRate,
      suffix: "%",
      icon: <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.8} />,
      color: "text-violet-600",
      bgColor: "bg-violet-50",
      borderColor: "border-violet-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
      {cards.map((card) => (
        <StatsCard key={card.label} {...card} />
      ))}
    </div>
  );
}
