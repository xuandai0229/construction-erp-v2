"use client";

import { useState } from "react";
import { Search, X, Calendar, Filter } from "lucide-react";
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
  { value: 'REVISION_REQUESTED', label: getStatusLabel('REVISION_REQUESTED') },
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
  const [isOpen, setIsOpen] = useState(false);
  
  const isTypeDisabled = tab === 'daily' || tab === 'weekly';
  const isStatusDisabled = tab === 'pending' || tab === 'rejected' || tab === 'revision';

  const filterCount = [
    projectFilter,
    isStatusDisabled ? '' : statusFilter,
    isTypeDisabled ? '' : typeFilter,
    dateRange
  ].filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3">
      <div className="flex items-center gap-3">
        {/* Search input */}
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

        <Button 
          variant={filterCount > 0 ? "default" : "outline"} 
          className="h-10 px-3 relative" 
          onClick={() => setIsOpen(!isOpen)}
        >
          <Filter className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Bộ lọc</span>
          {filterCount > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full">
              {filterCount}
            </span>
          )}
        </Button>
        
        {hasActiveFilters && (
          <Button variant="ghost" className="h-10 px-3 text-slate-500 hover:text-slate-900" onClick={onResetFilters}>
            <X className="w-4 h-4 sm:mr-1.5" /> <span className="hidden sm:inline">Đặt lại</span>
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
            disabled={isTypeDisabled}
            className={`h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              isTypeDisabled 
                ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed' 
                : typeFilter ? 'bg-blue-50/50 text-blue-900 border border-blue-200' : 'bg-slate-50 text-slate-900 border border-slate-200'
            }`}
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={projectFilter}
            onChange={(e) => onProjectFilterChange(e.target.value)}
            className={`h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              projectFilter ? 'bg-blue-50/50 text-blue-900 border border-blue-200' : 'bg-slate-50 text-slate-900 border border-slate-200'
            }`}
          >
            <option value="">Tất cả công trình</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <div className="relative">
            <Calendar className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none ${dateRange ? 'text-blue-500' : 'text-slate-400'}`} />
            <select
              value={dateRange}
              onChange={(e) => onDateRangeChange(e.target.value)}
              className={`w-full h-10 pl-9 pr-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors appearance-none cursor-pointer ${
                dateRange ? 'bg-blue-50/50 text-blue-900 border border-blue-200' : 'bg-slate-50 text-slate-900 border border-slate-200'
              }`}
            >
              <option value="">Mọi thời điểm</option>
              <option value="today">Hôm nay</option>
              <option value="thisWeek">Tuần này</option>
              <option value="thisMonth">Tháng này</option>
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            disabled={isStatusDisabled}
            className={`h-10 px-3 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
              isStatusDisabled 
                ? 'bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed' 
                : statusFilter ? 'bg-blue-50/50 text-blue-900 border border-blue-200' : 'bg-slate-50 text-slate-900 border border-slate-200'
            }`}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
