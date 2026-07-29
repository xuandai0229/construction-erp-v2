"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, AlertCircle, AlertTriangle, CheckCircle2, FileText, ArrowRight, ShieldAlert, Clock, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { OverflowTooltipText } from "@/components/ui/overflow-tooltip-text";
import type { ExecutiveActionItem } from "@/lib/dashboard/executive-action-service";

interface ActionsCenterClientViewProps {
  allItems: ExecutiveActionItem[];
  totalCount: number;
  highPriorityCount: number;
  criticalCount: number;
  overdueCount: number;
  selectedProjectId: string | null;
  accessibleProjects: { id: string; code: string; name: string }[];
}

export function ActionsCenterClientView({
  allItems,
  totalCount,
  highPriorityCount,
  criticalCount,
  overdueCount,
  selectedProjectId,
  accessibleProjects,
}: ActionsCenterClientViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "CRITICAL" | "HIGH_PRIORITY" | "OVERDUE">("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [projectFilter, setProjectFilter] = useState<string>(selectedProjectId || "ALL");

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // 1. Tab Filter
      if (activeFilter === "CRITICAL" && item.status !== "Khẩn cấp" && item.priority !== "HIGH") return false;
      if (activeFilter === "HIGH_PRIORITY" && item.priority !== "HIGH") return false;
      if (activeFilter === "OVERDUE" && item.type !== "RISK" && item.status !== "Quá hạn") return false;

      // 2. Type Filter
      if (typeFilter !== "ALL" && item.type !== typeFilter) return false;

      // 3. Project Filter
      if (projectFilter !== "ALL" && item.projectId !== projectFilter) return false;

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.projectName.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q) ||
          item.assignee.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allItems, activeFilter, typeFilter, projectFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Quay lại Dashboard
            </Link>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2.5">
            <ShieldAlert className="h-7 w-7 text-rose-600" />
            Trung tâm việc cần xử lý
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Tổng hợp các phát sinh, vướng mắc và công việc chưa được xử lý.
          </p>
        </div>
      </div>

      {/* Primary Status Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveFilter("ALL")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeFilter === "ALL"
              ? "bg-blue-50 border-blue-400 ring-1 ring-blue-400"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="text-xs font-bold text-slate-500">Tất cả việc cần xử lý</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{totalCount}</div>
        </button>

        <button
          onClick={() => setActiveFilter("CRITICAL")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeFilter === "CRITICAL"
              ? "bg-red-50 border-red-400 ring-1 ring-red-400"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="text-xs font-bold text-red-700">Khẩn cấp / Sự cố</div>
          <div className="text-2xl font-extrabold text-red-700 mt-1">{criticalCount}</div>
        </button>

        <button
          onClick={() => setActiveFilter("HIGH_PRIORITY")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeFilter === "HIGH_PRIORITY"
              ? "bg-amber-50 border-amber-400 ring-1 ring-amber-400"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="text-xs font-bold text-amber-800">Ưu tiên cao</div>
          <div className="text-2xl font-extrabold text-amber-800 mt-1">{highPriorityCount}</div>
        </button>

        <button
          onClick={() => setActiveFilter("OVERDUE")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            activeFilter === "OVERDUE"
              ? "bg-purple-50 border-purple-400 ring-1 ring-purple-400"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="text-xs font-bold text-purple-800">Quá hạn tiến độ</div>
          <div className="text-2xl font-extrabold text-purple-800 mt-1">{overdueCount}</div>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tiêu đề, lý do, công trình..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Project Filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
            <Building2 className="h-4 w-4 text-slate-500" />
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả công trình</option>
              {accessibleProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả loại vấn đề</option>
            <option value="RISK">Tiến độ & Rủi ro</option>
            <option value="REPORT">Sự cố / Báo cáo</option>
            <option value="MATERIAL">Thiếu vật tư thi công</option>
            <option value="TASK">Nhiệm vụ thi công</option>
          </select>
        </div>
      </div>

      {/* Item Counter Info */}
      <div className="text-xs font-bold text-slate-500 px-1">
        Hiển thị {filteredItems.length} trong tổng số {totalCount} việc cần xử lý
      </div>

      {/* Items List */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500 mb-3 opacity-80" />
            <h3 className="text-base font-bold text-slate-900">Chưa có phát sinh cần xử lý</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Không tìm thấy vấn đề phát sinh nào phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <Link
              key={item.id}
              href={item.targetType === "PROJECT" ? `/projects/${item.projectId}` : "/dashboard"}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3.5 min-w-0 flex-1">
                <div
                  className={`mt-0.5 p-2.5 rounded-lg shrink-0 ${
                    item.priority === "HIGH"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-slate-100 text-slate-700 group-hover:bg-blue-50 group-hover:text-blue-700"
                  }`}
                >
                  {item.priority === "HIGH" ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <AlertCircle className="h-5 w-5" />
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {item.typeLabel}
                    </span>
                    {item.priority === "HIGH" && (
                      <StatusBadge variant="danger" size="sm">
                        Ưu tiên cao
                      </StatusBadge>
                    )}
                    <StatusBadge variant={item.status === "Khẩn cấp" ? "danger" : "warning"} size="sm">
                      {item.status}
                    </StatusBadge>
                  </div>

                  <h3 className="text-base font-bold text-slate-950 group-hover:text-blue-600 transition-colors leading-snug">
                    <OverflowTooltipText text={item.title} maxLines={1} />
                  </h3>

                  <p className="text-xs text-slate-600 font-medium line-clamp-2">
                    {item.reason}
                  </p>

                  <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 pt-1 flex-wrap">
                    <span>
                      Công trình:{" "}
                      <OverflowTooltipText
                        text={item.projectName}
                        maxLines={1}
                        className="text-slate-800 inline-block font-bold"
                      />
                    </span>
                    {item.assignee && (
                      <span>
                        Phụ trách: <strong className="text-slate-700">{item.assignee}</strong>
                      </span>
                    )}
                    {item.createdAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {item.createdAt}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end sm:justify-center shrink-0">
                <Button size="sm" variant="ghost" className="gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700">
                  Xem chi tiết <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
