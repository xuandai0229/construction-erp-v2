"use client";

import React from "react";
import { Search, Filter, X, Plus, RotateCcw } from "lucide-react";
import { AssignmentFormOptionProject } from "@/app/hr/project-assignments/actions/project-assignment-actions";

interface ProjectAssignmentToolbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedProjectId: string;
  onProjectChange: (id: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  projects: AssignmentFormOptionProject[];
  onResetFilters: () => void;
  onCreateClick?: () => void;
  canCreate: boolean;
  totalRecords: number;
}

export function ProjectAssignmentToolbar({
  searchQuery,
  onSearchChange,
  selectedProjectId,
  onProjectChange,
  selectedStatus,
  onStatusChange,
  projects,
  onResetFilters,
  onCreateClick,
  canCreate,
  totalRecords,
}: ProjectAssignmentToolbarProps) {
  const activeFiltersCount =
    (searchQuery ? 1 : 0) + (selectedProjectId ? 1 : 0) + (selectedStatus !== "ALL" ? 1 : 0);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm theo mã NV, tên nhân sự hoặc số quyết định..."
            className="w-full text-xs pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Action Button & Filter Badges */}
        <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end">
          {activeFiltersCount > 0 && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc ({activeFiltersCount})</span>
            </button>
          )}

          {canCreate && onCreateClick && (
            <button
              onClick={onCreateClick}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-2 rounded-xl shadow-xs transition shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo điều động mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Selects Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1 border-t border-slate-100">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Công trình / Dự án</label>
          <select
            value={selectedProjectId}
            onChange={(e) => onProjectChange(e.target.value)}
            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
          >
            <option value="">Tất cả công trình</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                [{p.code}] {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Trạng thái phân công</label>
          <select
            value={selectedStatus}
            onChange={(e) => onStatusChange(e.target.value)}
            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hiệu lực</option>
            <option value="PLANNED">Kế hoạch (Tương lai)</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="RELEASED">Đã rút nhân sự</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>

        <div className="flex items-end justify-between sm:justify-start lg:justify-end text-xs text-slate-500 pb-1">
          <span>Tổng số bản ghi: <strong className="text-slate-900 font-bold">{totalRecords}</strong></span>
        </div>
      </div>
    </div>
  );
}
