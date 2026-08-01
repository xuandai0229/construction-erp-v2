"use client";

import { useState, useEffect, useTransition, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CalendarPlus,
  CheckCircle2,
  FileSpreadsheet,
  FolderKanban,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/ui/enterprise";
import {
  createSafetyWeeklyFileAction,
  deleteSafetyWeeklyFileAction,
} from "@/app/(dashboard)/reports/safety/actions";
import { SafetyRowActionPortalMenu } from "./safety-row-action-portal-menu";

function formatDateVN(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

function formatPeriodDisplay(startStr: string, endStr: string) {
  const dStart = new Date(startStr);
  const dEnd = new Date(endStr);
  if (Number.isNaN(dStart.getTime()) || Number.isNaN(dEnd.getTime())) {
    return `${formatDateVN(startStr)} – ${formatDateVN(endStr)}`;
  }
  return `${formatDateVN(startStr)} – ${formatDateVN(endStr)}`;
}

function formatTimeAgo(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "vừa xong";
  if (diffMinutes < 60) return `${diffMinutes} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return formatDateVN(dateStr);
}

export function SafetyListClient({
  weeklyFilesData,
}: {
  weeklyFilesData: any;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL State
  const initialSearch = searchParams.get("search") || "";
  const initialYear = searchParams.get("year") || "";
  const initialSort = searchParams.get("sort") || "updated_desc";
  const initialCompletion = searchParams.get("completionStatus") || "ALL";

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedSort, setSelectedSort] = useState(initialSort);
  const [selectedCompletion, setSelectedCompletion] = useState(initialCompletion);

  // Optimistic list state
  const [items, setItems] = useState<any[]>(weeklyFilesData.items || []);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [anchorDate, setAnchorDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [pending, startTransition] = useTransition();

  // Keep items in sync with prop updates from router/searchParams
  useEffect(() => {
    setItems(weeklyFilesData.items || []);
  }, [weeklyFilesData]);

  // Unified Filter Change Handler
  const updateFilters = useCallback(
    (newParams: { search?: string; year?: string; sort?: string; completionStatus?: string }) => {
      const params = new URLSearchParams();
      const s = newParams.search !== undefined ? newParams.search : searchQuery;
      const y = newParams.year !== undefined ? newParams.year : selectedYear;
      const sortVal = newParams.sort !== undefined ? newParams.sort : selectedSort;
      const compVal = newParams.completionStatus !== undefined ? newParams.completionStatus : selectedCompletion;

      if (s) params.set("search", s);
      if (y) params.set("year", y);
      if (sortVal && sortVal !== "updated_desc") params.set("sort", sortVal);
      if (compVal && compVal !== "ALL") params.set("completionStatus", compVal);
      params.set("page", "1");

      router.push(`/reports/safety?${params.toString()}`);
    },
    [searchQuery, selectedYear, selectedSort, selectedCompletion, router]
  );

  // Debounced search handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== initialSearch) {
        updateFilters({ search: searchQuery });
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, initialSearch, updateFilters]);

  // Handle Escape key on search input
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setSearchQuery("");
      updateFilters({ search: "" });
    }
  };

  // Instant Reset Filters
  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedYear("");
    setSelectedSort("updated_desc");
    setSelectedCompletion("ALL");
    router.push("/reports/safety");
  };

  const deletingIdsRef = useRef<Set<string>>(new Set());

  // Server-confirmed Delete Pipeline (No Confirm Modal, No Toast, Immediate Row Removal on OK)
  const handleDeleteRow = async (weeklyFileId: string) => {
    if (!weeklyFileId || typeof weeklyFileId !== "string") {
      console.error("[DELETE-WEEKLY-FILE] Invalid weeklyFileId:", weeklyFileId);
      return;
    }

    console.log("[DELETE-WEEKLY-FILE]", {
      stage: "CLIENT_DELETE_START",
      weeklyFileId,
    });

    if (deletingIdsRef.current.has(weeklyFileId)) {
      return;
    }

    deletingIdsRef.current.add(weeklyFileId);

    try {
      const result = await deleteSafetyWeeklyFileAction(weeklyFileId);

      if (!result.ok) {
        setRowErrors((current) => ({
          ...current,
          [weeklyFileId]: result.message || "Không thể xóa hồ sơ.",
        }));
        return;
      }

      setItems((current) => current.filter((item) => item.id !== weeklyFileId));
    } catch (err: any) {
      console.error("[DELETE-WEEKLY-FILE] Client error:", err);
      setRowErrors((current) => ({
        ...current,
        [weeklyFileId]: "Đã xảy ra lỗi khi xóa hồ sơ.",
      }));
    } finally {
      deletingIdsRef.current.delete(weeklyFileId);
    }
  };

  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreateWeeklyFile = () => {
    setCreateError(null);
    startTransition(async () => {
      try {
        const res = await createSafetyWeeklyFileAction(anchorDate);
        if (res.ok) {
          setCreateModalOpen(false);
          router.push(`/reports/safety/weekly-files/${res.weeklyFileId}`);
        } else {
          setCreateError(res.message || "Không thể tạo hồ sơ tuần. Vui lòng thử lại.");
        }
      } catch (err: any) {
        setCreateError("Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.");
      }
    });
  };

  const getWeekPreview = (dStr: string) => {
    const d = new Date(dStr);
    if (Number.isNaN(d.getTime())) return null;
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    return {
      startStr: formatDateVN(monday.toISOString()),
      endStr: formatDateVN(sunday.toISOString()),
    };
  };

  const createWeekPreview = getWeekPreview(anchorDate);
  const isFiltered = Boolean(searchQuery || selectedYear || (selectedSort && selectedSort !== "updated_desc") || (selectedCompletion && selectedCompletion !== "ALL"));

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12 font-sans">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Báo cáo công trình</span>
        </Link>
      </div>

      {/* Top Header Card */}
      <ContentCard className="p-4 sm:p-5 bg-white border border-slate-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600/10 text-blue-600 border border-blue-600/20 shadow-xs shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                Hồ sơ ATLĐ • PCCC • VSMT theo tuần
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý kế hoạch kiểm tra và báo cáo tự đánh giá trong cùng một hồ sơ theo tuần.
              </p>
            </div>
          </div>

          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-blue-600 text-white hover:bg-blue-700 gap-2 shadow-xs self-start sm:self-auto h-10 px-4 text-xs font-bold rounded-xl"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo hồ sơ tuần</span>
          </Button>
        </div>
      </ContentCard>

      {/* Unified Filter Bar (No Project Dropdown, No Duplicate Buttons) */}
      <ContentCard className="p-3.5 space-y-2.5">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 flex flex-col sm:flex-row gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo mã hồ sơ, tuần hoặc người cập nhật…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="w-full h-9.5 pl-10 pr-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
              />
            </div>

            {/* Year Select */}
            <div className="w-full sm:w-36">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  updateFilters({ year: e.target.value });
                }}
                aria-label="Lọc theo năm"
                className="w-full h-9.5 px-3 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 bg-white text-slate-700"
              >
                <option value="">Tất cả các năm</option>
                <option value="2026">Năm 2026</option>
                <option value="2025">Năm 2025</option>
              </select>
            </div>

            {/* Completion Status Select */}
            <div className="w-full sm:w-48">
              <select
                value={selectedCompletion}
                onChange={(e) => {
                  setSelectedCompletion(e.target.value);
                  updateFilters({ completionStatus: e.target.value });
                }}
                aria-label="Lọc theo trạng thái hồ sơ"
                className="w-full h-9.5 px-3 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 bg-white text-slate-700"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="COMPLETE">Đã đủ Kế hoạch & Báo cáo</option>
                <option value="NO_PLAN">Chưa có Kế hoạch</option>
                <option value="NO_REPORT">Chưa có Báo cáo</option>
              </select>
            </div>

            {/* Sort Select */}
            <div className="w-full sm:w-44">
              <select
                value={selectedSort}
                onChange={(e) => {
                  setSelectedSort(e.target.value);
                  updateFilters({ sort: e.target.value });
                }}
                aria-label="Sắp xếp danh sách"
                className="w-full h-9.5 px-3 text-xs font-semibold rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 bg-white text-slate-700"
              >
                <option value="updated_desc">Mới cập nhật</option>
                <option value="updated_asc">Cũ cập nhật</option>
                <option value="week_desc">Tuần mới nhất</option>
                <option value="week_asc">Tuần cũ nhất</option>
              </select>
            </div>
          </div>

          {isFiltered && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleResetFilters}
              className="h-9.5 text-xs text-slate-600 border-slate-200 rounded-xl gap-1.5 shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
              <span>Xóa lọc</span>
            </Button>
          )}
        </div>

        {/* Dynamic Record Count Footer */}
        <div className="text-[11px] font-medium text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
          <span>
            Hiển thị <strong>{items.length}</strong> / <strong>{weeklyFilesData.totalCount}</strong> hồ sơ tuần
          </span>
        </div>
      </ContentCard>

      {/* Data Table Container (No fixed max-height, No internal y-scroll) */}
      <ContentCard className="p-0 border border-slate-200/80 shadow-xs">
        {items.length === 0 ? (
          <div className="py-14 text-center">
            <FolderKanban className="h-10 w-10 text-slate-300 mx-auto mb-2.5" />
            <h3 className="text-sm font-semibold text-slate-800">
              Không tìm thấy Hồ sơ ATLĐ tuần nào
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Thử thay đổi từ khóa tìm kiếm, bộ lọc hoặc nhấn nút "Tạo hồ sơ tuần" để bắt đầu.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 w-44">Mã hồ sơ</th>
                    <th className="py-3.5 px-4 w-44">Tuần kiểm tra</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Phạm vi</th>
                    <th className="py-3.5 px-4 w-40">Kế hoạch</th>
                    <th className="py-3.5 px-4 w-44">Báo cáo tự đánh giá</th>
                    <th className="py-3.5 px-4 w-40">Người cập nhật</th>
                    <th className="py-3.5 px-4 w-36 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {items.map((row: any) => {
                    const workspaceUrl = `/reports/safety/weekly-files/${row.id}`;
                    const projectList = row.projects || [];
                    const projectCount = projectList.length;
                    const displayCode = row.fileCode || row.documentNumber || `HS-ATLĐ-2026-W${row.weekNumber}`;
                    const rowError = rowErrors[row.id];

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Code */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] inline-block border border-slate-200">
                            {displayCode}
                          </span>
                          {rowError && (
                            <div className="text-[10px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span>{rowError}</span>
                            </div>
                          )}
                        </td>

                        {/* Week */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">
                            Tuần {row.weekNumber} / {row.year}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {formatPeriodDisplay(row.periodStart, row.periodEnd)}
                          </div>
                        </td>

                        {/* Scope */}
                        <td className="py-3.5 px-4 relative">
                          {projectCount === 0 || projectCount > 3 ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200/80 font-bold text-[11px]">
                              <Building2 className="h-3 w-3 text-blue-600" />
                              <span>Toàn hệ thống</span>
                            </span>
                          ) : projectCount === 1 ? (
                            <div className="font-medium text-slate-800 truncate max-w-[200px]" title={projectList[0].name}>
                              {projectList[0].name}
                            </div>
                          ) : (
                            <div className="relative inline-block">
                              <button
                                type="button"
                                onClick={() => setActivePopoverId(activePopoverId === row.id ? null : row.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200/80 hover:bg-blue-100 font-semibold transition-colors text-[11px]"
                              >
                                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                                <span>{projectCount} công trình</span>
                              </button>

                              {/* Popover */}
                              {activePopoverId === row.id && (
                                <div className="absolute left-0 top-8 z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl text-xs space-y-2 animate-in fade-in zoom-in-95">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                    <span className="font-bold text-slate-900">
                                      Danh sách công trình ({projectCount})
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => setActivePopoverId(null)}
                                      className="text-slate-400 hover:text-slate-600"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                  <ul className="space-y-1 max-h-40 overflow-y-auto pr-1">
                                    {projectList.map((p: any, idx: number) => (
                                      <li key={idx} className="flex items-start gap-1.5 text-slate-700">
                                        <span className="text-blue-500 font-bold">•</span>
                                        <span className="leading-snug">{p.name}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Plan Status */}
                        <td className="py-3.5 px-4">
                          {row.planEntriesCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold bg-emerald-50 text-emerald-800 border-emerald-200">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              <span>{row.planEntriesCount} lịch kiểm tra</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                              Chưa có lịch
                            </span>
                          )}
                        </td>

                        {/* Assessment Status */}
                        <td className="py-3.5 px-4">
                          {row.assessmentEntriesCount > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold bg-amber-50 text-amber-800 border-amber-200">
                              <FileSpreadsheet className="h-3 w-3 text-amber-600" />
                              <span>{row.assessmentEntriesCount} kết quả</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                              Chưa có kết quả
                            </span>
                          )}
                        </td>

                        {/* Author & Updated */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">
                            {row.createdBy?.name || "—"}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium" title={formatDateVN(row.updatedAt)}>
                            {formatTimeAgo(row.updatedAt)}
                          </div>
                        </td>

                        {/* Actions (Primary button + Non-clipped Portal Menu) */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => router.push(workspaceUrl)}
                              className="h-9 text-xs font-bold px-3.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                            >
                              Mở hồ sơ
                            </Button>

                            <SafetyRowActionPortalMenu
                              rowId={row.id}
                              canDelete={row.canDelete}
                              onDelete={() => handleDeleteRow(row.id)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards View (< 640px) */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {items.map((row: any) => {
                const workspaceUrl = `/reports/safety/weekly-files/${row.id}`;
                const displayCode = row.fileCode || row.documentNumber || `HS-ATLĐ-2026-W${row.weekNumber}`;
                const rowError = rowErrors[row.id];

                return (
                  <div key={row.id} className="p-4 space-y-3 bg-white">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg text-xs border border-slate-200">
                        {displayCode}
                      </span>
                      <div className="text-right">
                        <div className="font-bold text-slate-900 text-xs">
                          Tuần {row.weekNumber} / {row.year}
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium">
                          {formatPeriodDisplay(row.periodStart, row.periodEnd)}
                        </div>
                      </div>
                    </div>

                    {rowError && (
                      <div className="text-xs font-bold text-rose-600 flex items-center gap-1.5 bg-rose-50 p-2 rounded-lg border border-rose-200">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>{rowError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100">
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Kế hoạch</span>
                        {row.planEntriesCount > 0 ? (
                          <span className="font-bold text-emerald-700">{row.planEntriesCount} lịch kiểm tra</span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có lịch</span>
                        )}
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 block font-medium">Báo cáo tự đánh giá</span>
                        {row.assessmentEntriesCount > 0 ? (
                          <span className="font-bold text-amber-700">{row.assessmentEntriesCount} kết quả</span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa có kết quả</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                      <div>
                        <div className="font-semibold text-slate-800">{row.createdBy?.name || "—"}</div>
                        <div className="text-[11px] text-slate-400">{formatTimeAgo(row.updatedAt)}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => router.push(workspaceUrl)}
                          className="h-10 text-xs font-bold px-4 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-xs min-h-[44px]"
                        >
                          Mở hồ sơ
                        </Button>

                        <SafetyRowActionPortalMenu
                          rowId={row.id}
                          canDelete={row.canDelete}
                          onDelete={() => handleDeleteRow(row.id)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </ContentCard>

      {/* Modal Chọn tuần tạo mới Hồ sơ */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <CalendarPlus className="h-5 w-5 text-blue-600" />
                <span>Tạo Hồ sơ ATLĐ theo tuần</span>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Chọn ngày trong tuần báo cáo:
                </label>
                <input
                  type="date"
                  value={anchorDate}
                  onChange={(e) => setAnchorDate(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-300 font-semibold text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>

              {createError && (
                <div className="bg-red-50 border border-red-200/80 rounded-xl p-3 text-xs font-semibold text-red-700 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              {createWeekPreview && (
                <div className="bg-blue-50 border border-blue-200/80 rounded-xl p-3 space-y-1 text-slate-800">
                  <div className="font-bold text-blue-900">Phạm vi tuần được tự động xác định:</div>
                  <div className="font-semibold text-blue-700">
                    Từ {createWeekPreview.startStr} đến {createWeekPreview.endStr}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateModalOpen(false)}
                className="h-9 text-xs font-semibold"
              >
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleCreateWeeklyFile}
                disabled={pending}
                className="h-9 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Khởi tạo hồ sơ</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
