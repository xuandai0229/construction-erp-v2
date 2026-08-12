"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Building2, CheckCircle2, AlertTriangle, Clock, ArrowRight, ShieldAlert, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardProjectOverview } from "@/lib/dashboard/dashboard-queries";
import { ProjectName } from "@/components/project/project-name";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { completenessPresentation, getActualProgressDataLabel } from "@/lib/dashboard/dashboard-project-presentation";

interface ProjectsStatusClientViewProps {
  projects: DashboardProjectOverview[];
  selectedProjectId: string | null;
}

export function ProjectsStatusClientView({ projects }: ProjectsStatusClientViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"code" | "variance" | "progress">("variance");

  const counts = useMemo(() => {
    return projects.reduce(
      (acc, p) => {
        if (p.completenessCategory !== "COMPLETE") acc.noData++;
        else if (p.health === "ON_TRACK" || p.health === "COMPLETED") acc.onTrack++;
        else if (p.health === "AT_RISK") acc.atRisk++;
        else if (p.health === "DELAYED") acc.delayed++;
        return acc;
      },
      { onTrack: 0, atRisk: 0, delayed: 0, noData: 0, total: projects.length }
    );
  }, [projects]);

  const filteredProjects = useMemo(() => {
    return projects
      .filter((p) => {
        // Health filter
        if (healthFilter === "ON_TRACK" && (p.health !== "ON_TRACK" && p.health !== "COMPLETED" || p.completenessCategory !== "COMPLETE")) return false;
        if (healthFilter === "AT_RISK" && (p.health !== "AT_RISK" || p.completenessCategory !== "COMPLETE")) return false;
        if (healthFilter === "DELAYED" && (p.health !== "DELAYED" || p.completenessCategory !== "COMPLETE")) return false;
        if (healthFilter === "NO_DATA" && p.completenessCategory === "COMPLETE") return false;

        // Search
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "variance") {
          const vA = a.variancePercent ?? -999;
          const vB = b.variancePercent ?? -999;
          return vA - vB; // worst variance first
        }
        if (sortBy === "progress") {
          return (b.actualProgressPercent ?? -1) - (a.actualProgressPercent ?? -1);
        }
        return a.code.localeCompare(b.code);
      });
  }, [projects, healthFilter, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex min-w-0 flex-col gap-4 border-b border-slate-200 pb-5 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Quay lại Dashboard
            </Link>
          </div>
          <h1 className="flex min-w-0 items-center gap-2.5 text-2xl font-extrabold tracking-tight text-slate-950">
            <Building2 className="h-7 w-7 text-blue-600" />
            Tình trạng tiến độ toàn bộ công trình
          </h1>
          <p className="text-sm font-medium text-slate-600 mt-1">
            Tổng hợp tiến độ, chênh lệch kế hoạch và các công trình cần chú ý ({counts.total} công trình).
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setHealthFilter("ON_TRACK")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            healthFilter === "ON_TRACK"
              ? "bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-800">Đúng tiến độ</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-900 mt-1">{counts.onTrack}</div>
        </button>

        <button
          onClick={() => setHealthFilter("AT_RISK")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            healthFilter === "AT_RISK"
              ? "bg-amber-50 border-amber-400 ring-1 ring-amber-400"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-800">Cần chú ý</span>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-900 mt-1">{counts.atRisk}</div>
        </button>

        <button
          onClick={() => setHealthFilter("DELAYED")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            healthFilter === "DELAYED"
              ? "bg-rose-50 border-rose-400 ring-1 ring-rose-400"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-800">Chậm tiến độ</span>
            <ShieldAlert className="h-4 w-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-rose-900 mt-1">{counts.delayed}</div>
        </button>

        <button
          onClick={() => setHealthFilter("NO_DATA")}
          className={`p-3.5 rounded-xl border text-left transition-all ${
            healthFilter === "NO_DATA"
              ? "bg-slate-100 border-slate-400 ring-1 ring-slate-400"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Chưa đủ dữ liệu</span>
            <FileQuestion className="h-4 w-4 text-slate-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">{counts.noData}</div>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex min-w-0 flex-col items-stretch justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo mã hoặc tên công trình..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm font-medium border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
          />
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {healthFilter !== "ALL" && (
            <Button size="sm" variant="ghost" onClick={() => setHealthFilter("ALL")} className="text-xs font-bold text-slate-600">
              Xóa bộ lọc
            </Button>
          )}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "code" | "variance" | "progress")}
            className="max-w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
          >
            <option value="variance">Sắp xếp: Chênh lệch tiến độ</option>
            <option value="progress">Sắp xếp: % Tiến độ giảm dần</option>
            <option value="code">Sắp xếp: Mã công trình</option>
          </select>
        </div>
      </div>

      {/* Table List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600 table-fixed">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 w-12 font-bold text-center">#</th>
                <th className="px-4 py-3.5 w-36 font-bold">Mã công trình</th>
                <th className="px-4 py-3.5 font-bold">Tên công trình</th>
                <th className="px-4 py-3.5 w-36 font-bold">Tình trạng</th>
                <th className="px-4 py-3.5 w-48 font-bold">Tiến độ thực tế / Kế hoạch</th>
                <th className="px-4 py-3.5 w-32 font-bold text-right">Thời gian còn lại</th>
                <th className="px-4 py-3.5 w-28 font-bold text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500 font-medium">
                    Không tìm thấy công trình nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p, index) => {
                  const hasActualProgress = p.actualProgressPercent !== null;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3.5 text-xs font-bold text-slate-400 text-center">{index + 1}</td>
                      <td className="px-4 py-3.5 text-xs font-bold text-slate-900 font-mono">{p.code}</td>
                      <td className="px-4 py-3.5 text-xs font-bold text-slate-950">
                        <Link href={`/projects/${p.id}`} className="block min-w-0 hover:text-blue-600 transition-colors">
                          <ProjectName name={p.name} maxLines={2} className="text-xs leading-5" />
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        {!hasActualProgress ? (
                          <StatusBadge size="sm" variant={completenessPresentation[p.completenessCategory].variant}>
                            {completenessPresentation[p.completenessCategory].label}
                          </StatusBadge>
                        ) : p.health === "DELAYED" ? (
                          <span className="inline-flex rounded-md bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 border border-rose-200">
                            Chậm tiến độ
                          </span>
                        ) : p.health === "AT_RISK" ? (
                          <span className="inline-flex rounded-md bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 border border-amber-200">
                            Cần chú ý
                          </span>
                        ) : (
                          <span className="inline-flex rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                            Đúng tiến độ
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                            <span>{p.actualProgressPercent !== null ? `Thực tế: ${Math.round(p.actualProgressPercent)}%` : getActualProgressDataLabel(p)}</span>
                            <span className="text-[11px] font-medium text-slate-500">
                              {p.plannedProgressPercent !== null ? `Kế hoạch: ${Math.round(p.plannedProgressPercent)}%` : "Chưa có kế hoạch"}
                            </span>
                          </div>
                          {p.actualProgressPercent !== null ? (
                            <ProgressBar
                              value={p.actualProgressPercent}
                              tone={p.health === "DELAYED" ? "rose" : p.health === "AT_RISK" ? "amber" : "emerald"}
                              label={`Tiến độ thực tế ${p.name}`}
                              className="h-1.5"
                            />
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-bold text-right text-slate-700 whitespace-nowrap">
                        {p.daysRemaining !== null ? (
                          p.daysRemaining < 0 ? (
                            <span className="text-rose-700 flex items-center justify-end gap-1 font-extrabold">
                              <Clock className="h-3 w-3" /> Quá {Math.abs(p.daysRemaining)} ngày
                            </span>
                          ) : (
                            <span>Còn {p.daysRemaining} ngày</span>
                          )
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <Link href={`/projects/${p.id}`}>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600">
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
