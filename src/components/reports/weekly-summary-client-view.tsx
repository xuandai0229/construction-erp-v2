"use client";

import React, { useState, useMemo } from "react";
import {
  FileText,
  Printer,
  ChevronDown,
  ChevronUp,
  Search,
  ArrowLeft,
  Building2,
  AlertTriangle,
  CheckCircle2,
  ArrowUp,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WeeklyCompanySummary } from "@/lib/reports/weekly-company-summary";
import { WeeklySummaryInlineModal } from "./weekly-summary-inline-modal";

function formatDateShortVN(ymd: string): string {
  if (!ymd) return "";
  const parts = ymd.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return ymd;
}

interface WeeklySummaryClientViewProps {
  summary: WeeklyCompanySummary;
}

export function WeeklySummaryClientView({ summary }: WeeklySummaryClientViewProps) {
  const { week, summaryCounts, projects } = summary;

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    projects.forEach((p) => {
      if (p.hasReport && (p.issues || p.supportNeeded)) {
        initial[p.id] = true;
      }
    });
    return initial;
  });

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase().trim();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.reporter && p.reporter.toLowerCase().includes(q)),
    );
  }, [projects, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExpandAll = () => {
    const all: Record<string, boolean> = {};
    projects.forEach((p) => (all[p.id] = true));
    setExpandedIds(all);
  };

  const handleCollapseAll = () => {
    setExpandedIds({});
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 text-slate-900">
      {/* Top Fixed Header & Action Toolbar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <a
              href="/reports/field?tab=weekly"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Quay lại Báo cáo Chỉ huy trưởng
            </a>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
            <Building2 className="h-7 w-7 text-blue-600" />
            Tổng hợp báo cáo tuần
          </h1>
          <p className="text-sm font-medium text-slate-700 mt-1 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            Tuần {week.weekNumber} (Từ ngày {formatDateShortVN(week.weekStartDate)} đến ngày {formatDateShortVN(week.weekEndDate)})
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/reports/weekly-summary/export?weekStart=${week.weekStartDate}`, "_blank")}
            className="gap-1.5 border-emerald-600 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 font-bold shadow-xs"
          >
            <FileText className="h-4 w-4 text-emerald-700" />
            Xuất Word (.docx)
          </Button>

          <Button
            size="sm"
            onClick={() => setIsPreviewModalOpen(true)}
            className="gap-1.5 bg-blue-700 text-white hover:bg-blue-800 font-bold shadow-sm"
          >
            <Printer className="h-4 w-4" />
            Xem bản in / PDF
          </Button>
        </div>
      </div>

      {/* Concise Summary Overview Line (No Big KPI Status Cards) */}
      <div className="flex items-center justify-between bg-slate-100 border border-slate-300 rounded-lg px-4 py-3 text-sm font-semibold text-slate-800 shadow-2xs">
        <div className="flex items-center gap-3">
          <span>{summaryCounts.totalProjects} công trình</span>
          <span className="text-slate-400">•</span>
          <span className="text-emerald-800">{summaryCounts.reportedProjects} công trình có báo cáo</span>
          <span className="text-slate-400">•</span>
          <span className="text-slate-600">{summaryCounts.missingProjects} chưa có báo cáo</span>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 p-3 rounded-lg shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên công trình, mã hoặc người phụ trách..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm font-medium border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExpandAll}
            className="text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Mở tất cả
          </Button>
          <span className="text-slate-300">|</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCollapseAll}
            className="text-xs font-bold text-slate-700 hover:bg-slate-100"
          >
            Thu gọn tất cả
          </Button>
        </div>
      </div>

      {/* Projects Comparison List */}
      <div className="space-y-4">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12 bg-white border border-slate-200 rounded-lg">
            <p className="text-slate-500 font-medium text-sm">Không tìm thấy công trình nào phù hợp.</p>
          </div>
        ) : (
          filteredProjects.map((project, idx) => {
            const isExpanded = !!expandedIds[project.id];
            const hasIssues = !!project.issues;
            const hasSupport = !!project.supportNeeded;

            return (
              <div
                key={project.id}
                className={`bg-white border rounded-xl shadow-xs transition-all ${
                  hasSupport
                    ? "border-amber-400 ring-1 ring-amber-200"
                    : hasIssues
                    ? "border-red-300"
                    : "border-slate-300"
                }`}
              >
                {/* Card Header */}
                <div
                  onClick={() => toggleExpand(project.id)}
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/80 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-extrabold text-slate-500 w-6 text-center">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-950">
                          {project.name}
                        </h3>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          {project.code}
                        </span>
                      </div>
                      {project.reporter && (
                        <p className="text-xs font-medium text-slate-600 mt-0.5">
                          Người báo cáo: {project.reporter}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {!project.hasReport ? (
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                        Chưa có báo cáo tuần
                      </span>
                    ) : (
                      <div className="flex items-center gap-2">
                        {hasSupport && (
                          <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md border border-amber-300 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-700" /> Cần xử lý
                          </span>
                        )}
                        <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Đã báo cáo
                        </span>
                      </div>
                    )}

                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/50 p-4 sm:p-6 rounded-b-xl space-y-4 text-sm">
                    {!project.hasReport ? (
                      <p className="italic text-slate-600 font-medium">Chưa có báo cáo tuần cho công trình này trong kỳ được chọn.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
                          <div>
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                              Kết quả thực hiện trong tuần
                            </h4>
                            <p className="text-slate-900 font-medium whitespace-pre-line leading-relaxed">
                              {project.result || "Chưa cập nhật kết quả."}
                            </p>
                          </div>

                          {project.nextWeekPlan && (
                            <div className="pt-2 border-t border-slate-100">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Kế hoạch tuần tiếp theo
                              </h4>
                              <p className="text-slate-900 font-medium whitespace-pre-line">
                                {project.nextWeekPlan}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3 bg-white p-4 rounded-lg border border-slate-200 shadow-2xs">
                          {project.issues && (
                            <div>
                              <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                <AlertTriangle className="h-3.5 w-3.5 text-red-600" /> Vướng mắc / Khó khăn
                              </h4>
                              <p className="text-slate-900 font-semibold bg-red-50/60 p-2.5 rounded-md border border-red-100 whitespace-pre-line">
                                {project.issues}
                              </p>
                            </div>
                          )}

                          {project.supportNeeded && (
                            <div className="pt-2 border-t border-slate-100">
                              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">
                                Nội dung cần Ban Giám đốc & Phòng ban xử lý
                              </h4>
                              <p className="text-amber-950 font-bold bg-amber-50 p-2.5 rounded-md border border-amber-200 whitespace-pre-line">
                                {project.supportNeeded}
                              </p>
                            </div>
                          )}

                          {project.quality && (
                            <div className="pt-2 border-t border-slate-100">
                              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                                Chất lượng & An toàn
                              </h4>
                              <p className="text-slate-900 font-medium">{project.quality}</p>
                            </div>
                          )}

                          {(project.materials || project.labor) && (
                            <div className="pt-2 border-t border-slate-100 text-xs text-slate-700 font-medium">
                              {project.materials && <div>Vật tư: {project.materials}</div>}
                              {project.labor && <div>Nhân lực: {project.labor}</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Floating Back to Top Button */}
      <div className="flex justify-end pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={scrollToTop}
          className="gap-1.5 text-xs font-bold text-slate-700 border-slate-300 hover:bg-slate-100 shadow-2xs"
        >
          <ArrowUp className="h-3.5 w-3.5" /> Lên đầu trang
        </Button>
      </div>

      {/* Fullscreen Inline Preview Modal */}
      <WeeklySummaryInlineModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        data={summary}
      />
    </div>
  );
}
