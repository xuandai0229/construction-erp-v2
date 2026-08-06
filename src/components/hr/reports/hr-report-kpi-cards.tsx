"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { HrKpiMetrics } from "@/lib/hr/reporting-service";
import {
  Users,
  Building2,
  AlertTriangle,
  UserX,
  UserCheck,
  Zap,
  Briefcase,
  Percent,
  XCircle,
  HelpCircle,
} from "lucide-react";

interface HrReportKpiCardsProps {
  kpis: HrKpiMetrics;
}

export function HrReportKpiCards({ kpis }: HrReportKpiCardsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeKpiFilter = searchParams.get("kpiFilter") || "";

  const handleCardClick = (kpiKey: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (activeKpiFilter === kpiKey) {
      params.delete("kpiFilter");
    } else {
      params.set("kpiFilter", kpiKey);
    }
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const clearKpiFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("kpiFilter");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  // Primary Row (Max 4 cards)
  const primaryCards = [
    {
      key: "on_site",
      title: "Nhân sự tại công trình",
      count: kpis.totalOnSite,
      unit: "nhân sự",
      description: "Nhân viên đang cắm thực tế tại các dự án",
      icon: Users,
      color: "border-blue-500 text-blue-600 bg-blue-50",
      activeBg: "bg-blue-50 border-blue-600 ring-2 ring-blue-500",
    },
    {
      key: "projects_staffed",
      title: "Công trình có nhân sự",
      count: kpis.activeProjectsStaffed,
      unit: "công trình",
      description: "Công trình có ít nhất 1 điều động hiệu lực",
      icon: Building2,
      color: "border-emerald-500 text-emerald-600 bg-emerald-50",
      activeBg: "bg-emerald-50 border-emerald-600 ring-2 ring-emerald-500",
    },
    {
      key: "total_assignments",
      title: "Điều động đang hiệu lực",
      count: kpis.totalActiveAssignments,
      unit: "bản ghi",
      description: "Tổng số phân công công trình đang hoạt động",
      icon: Briefcase,
      color: "border-indigo-500 text-indigo-600 bg-indigo-50",
      activeBg: "bg-indigo-50 border-indigo-600 ring-2 ring-indigo-500",
    },
    {
      key: "unassigned",
      title: "Nhân sự chưa được điều động",
      count: kpis.unassignedEmployees,
      unit: "nhân sự",
      description: "Nhân viên đang làm việc nhưng chưa cắm dự án",
      icon: UserX,
      color: "border-slate-400 text-slate-600 bg-slate-100",
      activeBg: "bg-slate-100 border-slate-600 ring-2 ring-slate-500",
    },
  ];

  // Secondary Row (Alerts & Capacity)
  const secondaryCards = [
    {
      key: "expiring_30d",
      title: "Sắp kết thúc trong 30 ngày",
      count: kpis.expiringAssignments30d,
      unit: "bản ghi",
      description: "Dự kiến hoàn thành trong 30 ngày tới",
      icon: AlertTriangle,
      color: "border-amber-500 text-amber-600 bg-amber-50",
      activeBg: "bg-amber-50 border-amber-600 ring-2 ring-amber-500",
    },
    {
      key: "available_capacity",
      title: "Còn khả năng phân bổ",
      count: kpis.availableCapacityEmployees,
      unit: "nhân sự",
      description: "Nhân sự có tổng phân bổ thời gian dưới 100%",
      icon: UserCheck,
      color: "border-teal-500 text-teal-600 bg-teal-50",
      activeBg: "bg-teal-50 border-teal-600 ring-2 ring-teal-500",
    },
    {
      key: "overallocated",
      title: "Vượt 100% phân bổ",
      count: kpis.overallocatedEmployees,
      unit: "nhân sự",
      description: "Nhân sự bị gán thời gian giao thoa vượt 100%",
      icon: Zap,
      color: "border-rose-500 text-rose-600 bg-rose-50",
      activeBg: "bg-rose-50 border-rose-600 ring-2 ring-rose-500",
    },
    {
      key: "avg_allocation",
      title: "Tỷ lệ phân bổ trung bình",
      count: `${kpis.averageAllocation}%`,
      unit: "mức phân bổ",
      description: "Tỷ lệ thời gian phân bổ trung bình trên các bản ghi",
      icon: Percent,
      color: "border-purple-500 text-purple-600 bg-purple-50",
      activeBg: "bg-purple-50 border-purple-600 ring-2 ring-purple-500",
    },
  ];

  const activeCardObj = [...primaryCards, ...secondaryCards].find((c) => c.key === activeKpiFilter);

  return (
    <div className="mb-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-slate-900 tracking-wide">
          Chỉ số điều hành nhân sự
        </h2>
        {activeKpiFilter && (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Đang lọc: {activeCardObj?.title || activeKpiFilter}
            </span>
            <button
              type="button"
              onClick={clearKpiFilter}
              className="text-xs font-medium text-rose-600 hover:text-rose-800 hover:underline flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" />
              Bỏ lọc KPI
            </button>
          </div>
        )}
      </div>

      {/* Primary KPI Grid (Max 4 per row on desktop) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {primaryCards.map((card) => {
          const isActive = activeKpiFilter === card.key;
          return (
            <button
              type="button"
              key={card.key}
              onClick={() => handleCardClick(card.key)}
              title={`${card.title} — Bấm để lọc chi tiết`}
              className={`group flex min-h-28 flex-col justify-between rounded-xl border p-4 text-left shadow-xs transition-all hover:border-blue-400 hover:shadow-sm focus:outline-hidden ${
                isActive ? card.activeBg : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-800 group-hover:text-blue-700 leading-snug">
                  {card.title}
                </h3>
                <div className={`p-2 rounded-lg border shrink-0 ${card.color}`}>
                  <card.icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold tabular-nums text-slate-900">
                    {card.count}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{card.unit}</span>
                </div>
                <p className="mt-1 text-2xs text-slate-500 leading-tight">{card.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Secondary KPI Grid (Alerts & Capacity) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {secondaryCards.map((card) => {
          const isActive = activeKpiFilter === card.key;
          return (
            <button
              type="button"
              key={card.key}
              onClick={() => handleCardClick(card.key)}
              title={`${card.title} — Bấm để lọc chi tiết`}
              className={`group flex min-h-28 flex-col justify-between rounded-xl border p-4 text-left shadow-xs transition-all hover:border-blue-400 hover:shadow-sm focus:outline-hidden ${
                isActive ? card.activeBg : "border-slate-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-xs font-bold text-slate-800 group-hover:text-blue-700 leading-snug">
                  {card.title}
                </h3>
                <div className={`p-2 rounded-lg border shrink-0 ${card.color}`}>
                  <card.icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-extrabold tabular-nums text-slate-900">
                    {card.count}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{card.unit}</span>
                </div>
                <p className="mt-1 text-2xs text-slate-500 leading-tight">{card.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
