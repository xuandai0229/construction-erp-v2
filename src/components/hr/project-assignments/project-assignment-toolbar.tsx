"use client";

import React, { useMemo, useState } from "react";
import { Search, Filter, X, RotateCcw } from "lucide-react";
import { AssignmentFormOptionProject, AssignmentFormOptionRole } from "@/app/hr/project-assignments/actions/project-assignment-actions";
import { EnterpriseCombobox, EnterpriseComboboxOption } from "@/components/ui/enterprise-combobox";

interface ProjectAssignmentToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedProjectId: string;
  onProjectChange: (id: string) => void;
  selectedOrgUnitId: string;
  onOrgUnitChange: (id: string) => void;
  selectedRoleId: string;
  onRoleChange: (id: string) => void;
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  projects: AssignmentFormOptionProject[];
  orgUnits: { id: string; name: string }[];
  roles: AssignmentFormOptionRole[];
  onResetFilters: () => void;
  totalRecords: number;
}

export function ProjectAssignmentToolbar({
  searchQuery,
  onSearchChange,
  selectedProjectId,
  onProjectChange,
  selectedOrgUnitId,
  onOrgUnitChange,
  selectedRoleId,
  onRoleChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  selectedStatus,
  onStatusChange,
  projects,
  orgUnits,
  roles,
  onResetFilters,
  totalRecords,
}: ProjectAssignmentToolbarProps) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const activeFiltersCount =
    [searchQuery, selectedProjectId, selectedOrgUnitId, selectedRoleId, dateFrom, dateTo].filter(Boolean).length +
    (selectedStatus !== "ALL" ? 1 : 0);

  const projectOptions: EnterpriseComboboxOption[] = useMemo(
    () => [
      { value: "", label: "Tất cả công trình" },
      ...projects.map((p) => ({
        value: p.id,
        label: `[${p.code}] ${p.name}`,
        code: p.code,
        name: p.name,
      })),
    ],
    [projects]
  );

  const statusOptions: EnterpriseComboboxOption[] = [
    { value: "ALL", label: "Tất cả trạng thái" },
    { value: "ACTIVE", label: "Đang hiệu lực" },
    { value: "PLANNED", label: "Kế hoạch" },
    { value: "COMPLETED", label: "Hoàn thành" },
    { value: "RELEASED", label: "Đã rút nhân sự" },
    { value: "CANCELLED", label: "Đã hủy" },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
      {/* Top Main Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo mã NV, tên nhân sự hoặc số quyết định..."
            className="w-full text-sm pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Xóa nội dung tìm kiếm"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Button & Filter Badges */}
        <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end">
          {/* Mobile Filter Toggle */}
          <button
            type="button"
            onClick={() => setIsMobileFiltersOpen(!isMobileFiltersOpen)}
            aria-expanded={isMobileFiltersOpen}
            aria-controls="hr-assignment-filters"
            className="sm:hidden inline-flex items-center gap-1.5 text-sm text-slate-700 bg-slate-100 px-3 py-2 rounded-xl"
          >
            <Filter className="w-4 h-4 text-slate-500" />
            <span>Bộ lọc</span>
            {activeFiltersCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>

          {activeFiltersCount > 0 && (
            <button
              onClick={onResetFilters}
              className="hidden sm:inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-2 rounded-xl transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc ({activeFiltersCount})</span>
            </button>
          )}

        </div>
      </div>

      {/* Filter Row (Desktop & Expanded Mobile) */}
      <div
        id="hr-assignment-filters"
        className={`${
          isMobileFiltersOpen ? "block" : "hidden sm:block"
        } pt-2 border-t border-slate-100 space-y-3`}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Project Combobox */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              Công trình / Dự án
            </label>
            <EnterpriseCombobox
              options={projectOptions}
              value={selectedProjectId}
              onChange={(val) => onProjectChange(val)}
              placeholder="Tất cả công trình"
              searchPlaceholder="Tìm theo mã hoặc tên công trình..."
              density="compact"
              maxPanelHeight={320}
              testId="filter-project-combobox"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">Đơn vị nguồn</label>
            <select
              value={selectedOrgUnitId}
              onChange={(event) => onOrgUnitChange(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tất cả đơn vị nguồn</option>
              {orgUnits.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">Vai trò công trường</label>
            <EnterpriseCombobox
              options={roles.map((role) => ({ value: role.id, label: role.name, code: role.code, name: role.name }))}
              value={selectedRoleId}
              onChange={(value) => onRoleChange(value)}
              placeholder="Tất cả vai trò"
              searchPlaceholder="Tìm vai trò công trường..."
              density="compact"
              maxPanelHeight={240}
              testId="filter-role-combobox"
            />
          </div>

          {/* Status Combobox */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1">
              Trạng thái điều động
            </label>
            <EnterpriseCombobox
              options={statusOptions}
              value={selectedStatus}
              onChange={(val) => onStatusChange(val || "ALL")}
              placeholder="Tất cả trạng thái"
              searchPlaceholder="Tìm trạng thái..."
              density="compact"
              maxPanelHeight={240}
              testId="filter-status-combobox"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">Từ ngày</label>
            <input type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600">Đến ngày</label>
            <input type="date" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex items-end justify-between sm:justify-start lg:justify-end text-sm text-slate-500 pb-1">
            <span>
              Tổng số bản ghi: <strong className="text-slate-900 font-bold">{totalRecords}</strong>
            </span>
          </div>
        </div>

        {/* Mobile Clear Button */}
        {activeFiltersCount > 0 && (
          <div className="sm:hidden pt-2 border-t border-slate-100 flex justify-end">
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-sm text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa tất cả bộ lọc ({activeFiltersCount})</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
