"use client";

import React, { useState, useTransition, useRef, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search, Filter, X, Calendar, RefreshCw, SlidersHorizontal, ChevronDown, Check } from "lucide-react";

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

  // Project Combobox State
  const [isProjectOpen, setIsProjectOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const projectComboboxRef = useRef<HTMLDivElement>(null);

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

  // Close project combobox on click outside or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (projectComboboxRef.current && !projectComboboxRef.current.contains(event.target as Node)) {
        setIsProjectOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProjectOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const selectedProject = projects.find((p) => p.id === projectId);

  const filteredProjects = projects.filter((p) => {
    if (!projectSearch.trim()) return true;
    const term = projectSearch.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const nameMatch = p.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(term);
    const codeMatch = p.code?.toLowerCase().includes(term) ?? false;
    return nameMatch || codeMatch;
  });

  return (
    <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      {/* Top Info Bar & Mobile Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-blue-600" />
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Bộ lọc tìm kiếm & Thống kê
          </h2>
          {activeFilterCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
              Bộ lọc đang áp dụng: {activeFilterCount}
            </span>
          ) : (
            <span className="text-2xs text-slate-400 font-medium">(Hiển thị tất cả bản ghi)</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Xóa bộ lọc
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="md:hidden inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Filter className="h-4 w-4 text-slate-500" />
            <span>Bộ lọc {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
          </button>
        </div>
      </div>

      {/* Main Filters Form */}
      <div className={`space-y-4 ${isMobileOpen ? "block" : "hidden md:block"}`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* 1. Search Query */}
          <div>
            <label className="block text-2xs font-semibold text-slate-600 mb-1">
              Từ khóa tìm kiếm:
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Mã NV hoặc họ tên..."
                defaultValue={searchQuery}
                onChange={(e) => updateParam("searchQuery", e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 2. Org Unit */}
          <div>
            <label className="block text-2xs font-semibold text-slate-600 mb-1">
              Đơn vị gốc:
            </label>
            <select
              value={orgUnitId}
              onChange={(e) => updateParam("orgUnitId", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Tất cả đơn vị gốc</option>
              {orgUnits.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.code})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Searchable Project Combobox (No horizontal overflow) */}
          <div className="relative" ref={projectComboboxRef}>
            <label className="block text-2xs font-semibold text-slate-600 mb-1">
              Công trình / Dự án:
            </label>
            <button
              type="button"
              aria-expanded={isProjectOpen}
              aria-label="Chọn công trình hoặc dự án"
              onClick={() => setIsProjectOpen(!isProjectOpen)}
              className="w-full flex items-center justify-between gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 text-left hover:bg-slate-50 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
              title={selectedProject ? `${selectedProject.name} (${selectedProject.code})` : "Tất cả công trình"}
            >
              <span className="truncate">
                {selectedProject
                  ? `${selectedProject.name} (${selectedProject.code})`
                  : "Tất cả công trình"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            </button>

            {isProjectOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[280px] sm:min-w-[360px] max-w-[min(540px,90vw)] rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in-50 zoom-in-95">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm theo tên hoặc mã công trình..."
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    autoFocus
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 pl-8 pr-7 py-1.5 text-xs text-slate-900 focus:bg-white focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                  />
                  {projectSearch && (
                    <button
                      type="button"
                      onClick={() => setProjectSearch("")}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
                  <button
                    type="button"
                    onClick={() => {
                      updateParam("projectId", "");
                      setIsProjectOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                      !projectId ? "bg-blue-50 font-bold text-blue-700" : "text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>Tất cả công trình</span>
                    {!projectId && <Check className="h-3.5 w-3.5 text-blue-600" />}
                  </button>

                  {filteredProjects.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500 font-medium">
                      Không tìm thấy công trình phù hợp.
                    </div>
                  ) : (
                    filteredProjects.map((p) => {
                      const isSelected = p.id === projectId;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            updateParam("projectId", p.id);
                            setIsProjectOpen(false);
                          }}
                          title={`${p.name} (${p.code})`}
                          className={`w-full flex items-start justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors ${
                            isSelected ? "bg-blue-50 font-bold text-blue-700" : "text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="line-clamp-2 leading-snug">{p.name}</div>
                            {p.code && <div className="text-2xs font-mono text-slate-400 mt-0.5">{p.code}</div>}
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600 mt-0.5" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4. Project Role */}
          <div>
            <label className="block text-2xs font-semibold text-slate-600 mb-1">
              Vai trò công trường:
            </label>
            <select
              value={projectRoleId}
              onChange={(e) => updateParam("projectRoleId", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Tất cả vai trò</option>
              {projectRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </select>
          </div>

          {/* 5. Assignment Status */}
          <div>
            <label className="block text-2xs font-semibold text-slate-600 mb-1">
              Trạng thái điều động:
            </label>
            <select
              value={assignmentStatus}
              onChange={(e) => updateParam("assignmentStatus", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="ACTIVE">Đang hiệu lực</option>
              <option value="PLANNING">Kế hoạch điều động</option>
              <option value="RELEASED">Đã rút khỏi dự án</option>
              <option value="COMPLETED">Đã hoàn thành</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>
        </div>

        {/* Date Range & Dynamic Status Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-600" />
              Thời gian báo cáo:
            </span>
            <div className="flex items-center gap-1.5">
              <label htmlFor="dateStart" className="text-xs font-medium text-slate-600">Từ ngày:</label>
              <input
                id="dateStart"
                type="date"
                value={dateStart}
                onChange={(e) => updateParam("dateStart", e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label htmlFor="dateEnd" className="text-xs font-medium text-slate-600">Đến ngày:</label>
              <input
                id="dateEnd"
                type="date"
                value={dateEnd}
                onChange={(e) => updateParam("dateEnd", e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-900 focus:border-blue-500 focus:outline-hidden"
              />
            </div>
          </div>

          {isPending && (
            <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium animate-pulse">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              Đang cập nhật danh sách...
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
