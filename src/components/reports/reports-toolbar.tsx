"use client";

import { Search, X, Calendar } from "lucide-react";
import { getStatusLabel } from "./types";
import { Button } from "@/components/ui/button";

interface ReportsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  projectFilter: string;
  onProjectFilterChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  dateRange: string;
  onDateRangeChange: (value: string) => void;
  projects: { id: string; name: string }[];
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  tab?: string;
}

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'APPROVED', label: getStatusLabel('APPROVED') },
  { value: 'SUBMITTED', label: getStatusLabel('SUBMITTED') },
  { value: 'REJECTED', label: getStatusLabel('REJECTED') },
  { value: 'DRAFT', label: getStatusLabel('DRAFT') },
];

const TYPE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tất cả loại báo cáo' },
  { value: 'DAILY', label: 'Báo cáo ngày' },
  { value: 'WEEKLY', label: 'Báo cáo tuần' },
];

export function ReportsToolbar({
  search,
  onSearchChange,
  projectFilter,
  onProjectFilterChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  dateRange,
  onDateRangeChange,
  projects,
  onResetFilters,
  hasActiveFilters,
  tab,
}: ReportsToolbarProps) {
  const isTypeDisabled = tab === 'daily' || tab === 'weekly';
  const isStatusDisabled = tab === 'pending' || tab === 'rejected';

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4">
      <div className="flex flex-col xl:flex-row xl:items-center gap-3">
        {/* Search input - takes remaining space or full width on small screens */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Tìm mã báo cáo, công trình, người tạo..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-10 pl-9 pr-3 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-slate-500"
          />
        </div>

        {/* Filter row - wraps gracefully on laptop/tablet, stack on mobile */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 sm:gap-2.5 shrink-0">
          
          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            disabled={isTypeDisabled}
            className={`h-10 px-3 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none cursor-pointer min-w-0 sm:min-w-[160px] flex-1 sm:flex-none ${isTypeDisabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Project filter */}
          <select
            value={projectFilter}
            onChange={(e) => onProjectFilterChange(e.target.value)}
            className="h-10 px-3 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none cursor-pointer min-w-0 sm:min-w-[180px] flex-1 sm:flex-none"
          >
            <option value="">Tất cả công trình</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Date range filter */}
          <div className="relative flex-1 sm:flex-none">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={dateRange}
              onChange={(e) => onDateRangeChange(e.target.value)}
              className="w-full sm:w-[160px] h-10 pl-9 pr-3 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none cursor-pointer"
            >
              <option value="">Toàn thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="thisWeek">Tuần này</option>
              <option value="thisMonth">Tháng này</option>
            </select>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            disabled={isStatusDisabled}
            className={`h-10 px-3 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors appearance-none cursor-pointer min-w-0 sm:min-w-[150px] flex-1 sm:flex-none ${isStatusDisabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={onResetFilters}
              className="h-10 px-3 gap-1.5 text-sm shrink-0 border-slate-200 text-slate-600 hover:bg-slate-100 flex-1 sm:flex-none"
            >
              <X className="w-4 h-4" />
              <span className="inline">Đặt lại</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
