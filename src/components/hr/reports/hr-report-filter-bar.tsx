"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Filter, X, Calendar, RefreshCw } from "lucide-react";

interface Option {
  id: string;
  name: string;
  code?: string;
}

interface HrReportFilterBarProps {
  orgUnits: Option[];
  projects: Option[];
  projectRoles: Option[];
}

export function HrReportFilterBar({ orgUnits, projects, projectRoles }: HrReportFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const dateStart = searchParams.get("dateStart") || "";
  const dateEnd = searchParams.get("dateEnd") || "";
  const orgUnitId = searchParams.get("orgUnitId") || "";
  const projectId = searchParams.get("projectId") || "";
  const projectRoleId = searchParams.get("projectRoleId") || "";
  const assignmentStatus = searchParams.get("assignmentStatus") || "";
  const searchQuery = searchParams.get("searchQuery") || "";
  const kpiFilter = searchParams.get("kpiFilter") || "";

  const activeFilterCount = [
    dateStart,
    dateEnd,
    orgUnitId,
    projectId,
    projectRoleId,
    assignmentStatus,
    searchQuery,
    kpiFilter,
  ].filter(Boolean).length;

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set("page", "1");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const clearAllFilters = () => {
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3 md:hidden mb-3">
        <button
          type="button"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
        >
          <Filter className="h-4 w-4 text-slate-500" />
          <span>Bộ lọc nâng cao {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
        </button>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={clearAllFilters}
            className="text-xs font-semibold text-rose-600 hover:underline"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      <div className={`space-y-4 ${isMobileOpen ? "block" : "hidden md:block"}`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo họ tên hoặc mã NV..."
              defaultValue={searchQuery}
              onChange={(e) => updateParam("searchQuery", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Org Unit Select */}
          <div>
            <select
              value={orgUnitId}
              onChange={(e) => updateParam("orgUnitId", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Tất cả đơn vị gốc</option>
              {orgUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.code})
                </option>
              ))}
            </select>
          </div>

          {/* Project Select */}
          <div>
            <select
              value={projectId}
              onChange={(e) => updateParam("projectId", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Tất cả công trình</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          {/* Project Role Select */}
          <div>
            <select
              value={projectRoleId}
              onChange={(e) => updateParam("projectRoleId", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Tất cả vai trò công trường</option>
              {projectRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          {/* Assignment Status Select */}
          <div>
            <select
              value={assignmentStatus}
              onChange={(e) => updateParam("assignmentStatus", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Trạng thái điều động: Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hiệu lực</option>
              <option value="PLANNING">Kế hoạch điều động</option>
              <option value="RELEASED">Đã rút khỏi dự án</option>
              <option value="COMPLETED">Đã hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>
        </div>

        {/* Date Filters & Clear Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              Khoảng thời gian:
            </span>
            <div className="flex items-center gap-1.5">
              <label htmlFor="dateStart" className="text-xs text-slate-500">Từ ngày:</label>
              <input
                id="dateStart"
                type="date"
                value={dateStart}
                onChange={(e) => updateParam("dateStart", e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor="dateEnd" className="text-xs text-slate-500">Đến ngày:</label>
              <input
                id="dateEnd"
                type="date"
                value={dateEnd}
                onChange={(e) => updateParam("dateEnd", e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isPending && (
              <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Đang cập nhật dữ liệu...
              </span>
            )}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Xóa tất cả bộ lọc ({activeFilterCount})
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
