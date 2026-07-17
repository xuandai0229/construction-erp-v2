"use client";

import { useState } from "react";
import type { ReportStats } from "./types";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ReportsStatsProps {
  stats: ReportStats;
}

export function ReportsStats({ stats }: ReportsStatsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-[var(--surface-subtle)] border border-[var(--border)] rounded-[var(--radius-lg)] px-4 py-2.5 text-sm text-[var(--muted-foreground)]">
      <div className="hidden md:flex items-center justify-center gap-4">
        <span><strong className="text-[var(--foreground)]">{stats.total}</strong> báo cáo</span>
        <span className="text-slate-300">|</span>
        <span className="text-emerald-700 font-medium">{stats.approved} đã duyệt</span>
        <span className="text-slate-300">|</span>
        <span className="text-amber-700 font-medium">{stats.pending} chờ duyệt</span>
        <span className="text-slate-300">|</span>
        <span className="text-red-700 font-medium">{stats.rejected} từ chối</span>
        <span className="text-slate-300">|</span>
        <span className="text-violet-700 font-medium">Tỷ lệ duyệt {stats.approvalRate}%</span>
      </div>

      <div className="md:hidden flex flex-col">
        <div 
          className="flex items-center justify-between font-medium cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>Tổng {stats.total} báo cáo (Tỷ lệ duyệt {stats.approvalRate}%)</span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-[var(--muted-foreground)] opacity-70" /> : <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)] opacity-70" />}
        </div>
        {isExpanded && (
          <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2 pt-2 border-t border-[var(--border)] text-xs">
            <span className="text-emerald-700 font-medium">{stats.approved} đã duyệt</span>
            <span className="text-amber-700 font-medium">{stats.pending} chờ duyệt</span>
            <span className="text-red-700 font-medium">{stats.rejected} từ chối</span>
          </div>
        )}
      </div>
    </div>
  );
}
