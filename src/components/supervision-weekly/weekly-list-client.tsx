"use client";

import { useState, useMemo, useTransition, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  FileText,
  Search,
  X,
  MoreVertical,
  Edit3,
  Eye,
  Trash2,
  AlertTriangle,
  Building2,
  Calendar,
  Printer,
  Download,
  RotateCcw,
  ArrowLeft,
  FolderKanban,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentCard, FilterBar } from "@/components/ui/enterprise";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";
import { UnifiedActionMenu } from "@/components/ui/unified-action-menu";
import {
  createSupervisionWeeklyDossier,
  deleteSupervisionWeeklyDossier,
  checkSupervisionWeeklyDuplicate,
} from "@/app/(dashboard)/supervision/weekly/actions";
import type { SupervisionDatabaseReadiness } from "@/lib/supervision-weekly/database-readiness";

type ProjectOption = { id: string; code: string; name: string; location?: string | null; status?: string };

type RevisionInfo = {
  reason: string | null;
  action: string;
  createdAt: string;
  actorName: string;
};

type DossierRow = {
  id: string;
  reportNumber: string | null;
  weekStart: string;
  weekEnd: string;
  status: string;
  version: number;
  updatedAt: string;
  createdAt: string;
  createdById: string;
  createdBy: { id: string; name: string; role: string };
  projects: { id: string; name: string }[];
  latestRevision: RevisionInfo | null;
  stats: {
    entryCount: number;
    transitionCount: number;
    quantityCount: number;
    progressCount: number;
    totalItems: number;
  };
};

function formatDateVN(dateStr: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "—";
    return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  } catch {
    return "—";
  }
}

function formatTimeAgo(dateStr: string) {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return formatDateVN(dateStr);
  } catch {
    return formatDateVN(dateStr);
  }
}

function getWeekNumber(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    const week = 1 + Math.round((firstThursday - target.valueOf()) / 604800000);
    return { week, year: d.getFullYear() };
  } catch {
    return { week: 1, year: new Date().getFullYear() };
  }
}

function sanitizeUserError(msg?: string): string {
  if (!msg) return "Đã có lỗi xảy ra. Vui lòng thử lại.";
  if (
    msg.includes("Prisma") ||
    msg.includes("invocation") ||
    msg.includes("D:\\") ||
    msg.includes(".next") ||
    msg.includes("node_modules")
  ) {
    return "Đã có lỗi hệ thống xảy ra. Vui lòng thử lại sau.";
  }
  return msg;
}

function ProjectPopoverPortal({
  popoverId,
  triggerEl,
  displayCode,
  weekNum,
  year,
  projectList,
  onClose,
}: {
  popoverId: string;
  triggerEl: HTMLElement | null;
  displayCode: string;
  weekNum: number;
  year: number;
  projectList: { id?: string; name: string }[];
  onClose: () => void;
}) {
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!triggerEl) return;
    const rect = triggerEl.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

    let left = rect.left + scrollLeft;
    let top = rect.bottom + scrollTop + 6;
    const width = 270; // w-68

    if (left + width > window.innerWidth - 16) {
      left = Math.max(16, window.innerWidth - width - 16);
    }
    if (rect.bottom + 200 > window.innerHeight && rect.top > 200) {
      top = rect.top + scrollTop - 180;
    }

    setCoords({ top, left });
  }, [triggerEl]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerEl &&
        !triggerEl.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [triggerEl, onClose]);

  if (!triggerEl || typeof document === "undefined") return null;

  return createPortal(
    <div
      id={popoverId}
      ref={popoverRef}
      role="tooltip"
      style={{ position: "absolute", top: `${coords.top}px`, left: `${coords.left}px` }}
      className="z-[999] w-68 rounded-xl border border-blue-200 bg-white p-3 shadow-xl text-xs space-y-2 animate-in fade-in zoom-in-95"
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <div>
          <span className="font-bold text-slate-900 block">
            Công trình thuộc hồ sơ
          </span>
          <span className="text-[10px] text-blue-600 font-mono font-semibold block">
            {displayCode} (Tuần {weekNum}/{year})
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100"
          aria-label="Đóng popover"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
        {projectList.map((p, idx) => (
          <div
            key={idx}
            className="text-slate-700 py-1.5 px-2 rounded-lg bg-slate-50 border border-slate-100 truncate font-medium text-[11px]"
            title={p.name}
          >
            {p.name}
          </div>
        ))}
      </div>
    </div>,
    document.body
  );
}

export function WeeklyListClient({
  rows,
  projects = [],
  currentUserId,
  currentUserRole,
  canCreate = true,
  readiness,
  initialSearch = "",
  initialProjectId = "ALL",
  initialSort = "updated_desc",
  hidePageHeader = false,
}: {
  rows: DossierRow[];
  projects?: ProjectOption[];
  currentUserId?: string;
  currentUserRole?: string;
  canCreate?: boolean;
  readiness?: SupervisionDatabaseReadiness;
  initialSearch?: string;
  initialProjectId?: string;
  initialSort?: "updated_desc" | "week_desc" | "week_asc" | "project_asc";
  hidePageHeader?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  // State
  const [search, setSearch] = useState(initialSearch);
  const [projectFilter, setProjectFilter] = useState(initialProjectId);
  const [yearFilter, setYearFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"updated_desc" | "week_desc" | "week_asc" | "project_asc">(initialSort);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Active Row State for Menu & Popover
  const [activeActionRowId, setActiveActionRowId] = useState<string | null>(null);
  const [activeProjectPopover, setActiveProjectPopover] = useState<string | null>(null);
  const [popoverTriggerEl, setPopoverTriggerEl] = useState<HTMLElement | null>(null);

  // Modals & Dialogs
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [anchorDate, setAnchorDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [duplicateCheck, setDuplicateCheck] = useState<{
    id: string;
    reportNumber: string | null;
    status: string;
    version: number;
    weekStart: string;
    weekEnd: string;
    updatedAt: string;
    createdByName: string;
  } | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateCheckError, setDuplicateCheckError] = useState(false);
  const [deletingDossier, setDeletingDossier] = useState<DossierRow | null>(null);

  // Check duplicate dossier on anchorDate change
  useEffect(() => {
    if (!createModalOpen || !anchorDate) return;
    let cancelled = false;
    setCheckingDuplicate(true);
    setDuplicateCheckError(false);
    setDuplicateCheck(null);

    checkSupervisionWeeklyDuplicate(anchorDate)
      .then((res) => {
        if (!cancelled) {
          setDuplicateCheck(res);
          setCheckingDuplicate(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCheckingDuplicate(false);
          setDuplicateCheckError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [createModalOpen, anchorDate]);

  // Extract unique years from rows
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    for (const r of rows) {
      const y = getWeekNumber(r.weekStart).year.toString();
      years.add(y);
    }
    return Array.from(years).sort().reverse();
  }, [rows]);

  // Summary KPI Counters
  const kpiData = useMemo(() => {
    const totalDossiers = rows.length;
    const weeksSet = new Set(rows.map((r) => r.weekStart.slice(0, 10)));
    const totalWeeks = weeksSet.size;
    const projectSet = new Set<string>();
    for (const r of rows) {
      for (const p of r.projects) {
        if (p.id || p.name) projectSet.add(p.id || p.name);
      }
    }
    const totalProjects = projectSet.size;
    return { totalDossiers, totalWeeks, totalProjects };
  }, [rows]);

  // Filtered & Sorted rows
  const filteredRows = useMemo(() => {
    return rows
      .filter((row) => {
        // Year filter
        if (yearFilter !== "ALL") {
          const y = getWeekNumber(row.weekStart).year.toString();
          if (y !== yearFilter) return false;
        }

        // Project filter
        if (projectFilter !== "ALL") {
          const match = row.projects.some(
            (p) => p.id === projectFilter || p.name.toLowerCase().includes(projectFilter.toLowerCase())
          );
          if (!match) return false;
        }

        // Search text
        if (search.trim()) {
          const q = search.trim().toLowerCase();
          const numMatch = row.reportNumber?.toLowerCase().includes(q);
          const creatorMatch = row.createdBy.name.toLowerCase().includes(q);
          const projectMatch = row.projects.some((p) => p.name.toLowerCase().includes(q));
          const weekMatch = `${formatDateVN(row.weekStart)} ${formatDateVN(row.weekEnd)}`.includes(q);
          if (!numMatch && !creatorMatch && !projectMatch && !weekMatch) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "week_desc") {
          return new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime();
        }
        if (sortBy === "week_asc") {
          return new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime();
        }
        if (sortBy === "project_asc") {
          const pA = a.projects[0]?.name || "";
          const pB = b.projects[0]?.name || "";
          return pA.localeCompare(pB, "vi");
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [rows, yearFilter, projectFilter, search, sortBy]);

  // Paginated slice
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  // Week range preview for create modal
  const createWeekPreview = useMemo(() => {
    if (!anchorDate) return null;
    try {
      const d = new Date(anchorDate);
      if (Number.isNaN(d.getTime())) return null;
      const day = d.getDay();
      const diffToMon = day === 0 ? -6 : 1 - day;
      const mon = new Date(d);
      mon.setDate(d.getDate() + diffToMon);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      const { week: weekNum, year } = getWeekNumber(mon.toISOString());
      return {
        weekNum,
        year,
        startStr: formatDateVN(mon.toISOString()),
        endStr: formatDateVN(sun.toISOString()),
      };
    } catch {
      return null;
    }
  }, [anchorDate]);

  if (readiness && !readiness.ready) {
    const title = {
      MIGRATION_NOT_APPLIED: "Chưa áp migration Giám sát",
      DATABASE_UNREACHABLE: "Không kết nối được cơ sở dữ liệu",
      DATABASE_PERMISSION_DENIED: "Không đủ quyền cơ sở dữ liệu",
      UNKNOWN: "Không thể kiểm tra cơ sở dữ liệu",
    }[readiness.reason];
    return (
      <ContentCard className="p-6 text-center border-amber-200 bg-amber-50/50">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-amber-900">{title}</h3>
        <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto">{readiness.message}</p>
      </ContentCard>
    );
  }

  const handleCreate = async () => {
    if (!anchorDate) return;
    const year = new Date(anchorDate).getFullYear();
    if (year < 2000 || year > 2045) {
      toast.error(`Năm ${year} không hợp lệ. Vui lòng chọn năm trong khoảng 2000 - 2045.`);
      return;
    }

    startTransition(async () => {
      try {
        const result = await createSupervisionWeeklyDossier(anchorDate);
        if (result.isExisting) {
          toast.info("Chuyển đến hồ sơ hiện có cho tuần đã chọn.");
          router.push(`/reports/weekly-inspection/${result.id}/edit`);
        } else {
          toast.success("Tạo hồ sơ kiểm tra tuần thành công!");
          router.push(`/reports/weekly-inspection/${result.id}/edit`);
        }
        setCreateModalOpen(false);
      } catch (err: any) {
        toast.error(sanitizeUserError(err?.message));
      }
    });
  };

  const handleDeleteDossier = async () => {
    if (!deletingDossier) return;
    startTransition(async () => {
      try {
        await deleteSupervisionWeeklyDossier(deletingDossier.id);
        toast.success("Đã xóa hồ sơ tuần thành công.");
        setDeletingDossier(null);
        router.refresh();
      } catch (err: any) {
        toast.error(sanitizeUserError(err?.message));
      }
    });
  };

  const resetFilters = () => {
    setSearch("");
    setYearFilter("ALL");
    setProjectFilter("ALL");
    setSortBy("updated_desc");
    setPage(1);
  };

  const isFiltered = Boolean(search || yearFilter !== "ALL" || projectFilter !== "ALL" || sortBy !== "updated_desc");

  return (
    <div className="space-y-5 min-w-0 max-w-full">
      {/* 1. Page Header (Yêu cầu 1: CTA bên phải trên Desktop, Header gọn sạch) */}
      {!hidePageHeader ? (
        <div className="space-y-2">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Báo cáo</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-1">
            <div className="flex-1 min-w-0" data-testid="page-header-title-block">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Báo cáo Giám sát công trình
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Kế hoạch kiểm tra, kết quả giám sát và báo cáo công tác theo tuần.
              </p>
            </div>
            {canCreate && (
              <Button
                data-testid="create-dossier-cta-btn"
                onClick={() => setCreateModalOpen(true)}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all hover:shadow-md h-10 px-4 shrink-0 font-semibold w-full sm:w-auto justify-center"
              >
                <CalendarPlus className="h-4 w-4" />
                <span>Tạo hồ sơ tuần mới</span>
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <div className="text-xs font-medium text-slate-500 flex-1 min-w-0">
            Hồ sơ kiểm tra kết quả tuần và đề xuất kế hoạch công tác tuần tiếp theo
          </div>
          {canCreate && (
            <Button
              data-testid="create-dossier-cta-btn"
              onClick={() => setCreateModalOpen(true)}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all hover:shadow-md h-10 px-4 shrink-0 font-semibold w-full sm:w-auto justify-center"
            >
              <CalendarPlus className="h-4 w-4" />
              <span>Tạo hồ sơ tuần mới</span>
            </Button>
          )}
        </div>
      )}

      {/* 2. Standardized KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <ContentCard className="p-4 flex items-center justify-between bg-white border border-slate-200/80 shadow-2xs">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Tổng số hồ sơ</span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5 block">{kpiData.totalDossiers}</span>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
        </ContentCard>

        <ContentCard className="p-4 flex items-center justify-between bg-white border border-slate-200/80 shadow-2xs">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Số tuần báo cáo</span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5 block">{kpiData.totalWeeks}</span>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Calendar className="h-5 w-5" />
          </div>
        </ContentCard>

        <ContentCard className="p-4 flex items-center justify-between bg-white border border-slate-200/80 shadow-2xs">
          <div>
            <span className="text-xs font-medium text-slate-500 block">Công trình giám sát</span>
            <span className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5 block">{kpiData.totalProjects}</span>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
            <Building2 className="h-5 w-5" />
          </div>
        </ContentCard>
      </div>

      {/* 3. Search & Filter Bar */}
      <FilterBar className="bg-white">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between min-w-0 max-w-full">
          {/* Search Input */}
          <div className="relative flex-1 min-w-0 max-w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo số báo cáo, tên công trình..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-9 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
            {/* Year Filter */}
            {availableYears.length > 0 && (
              <select
                value={yearFilter}
                onChange={(e) => {
                  setYearFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 shrink-0 max-w-[130px]"
              >
                <option value="ALL">Tất cả năm</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    Năm {y}
                  </option>
                ))}
              </select>
            )}

            {/* Project Filter */}
            {projects.length > 0 && (
              <select
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 w-full sm:w-auto max-w-full sm:max-w-[260px] truncate"
              >
                <option value="ALL">Tất cả công trình</option>
                {projects.map((p) => {
                  const label = `${p.code} - ${p.name}`;
                  const truncated = label.length > 42 ? label.slice(0, 39) + "..." : label;
                  return (
                    <option key={p.id} value={p.id} title={label}>
                      {truncated}
                    </option>
                  );
                })}
              </select>
            )}

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 shrink-0 max-w-[170px]"
            >
              <option value="updated_desc">Mới cập nhật</option>
              <option value="week_desc">Tuần mới nhất</option>
              <option value="week_asc">Tuần cũ nhất</option>
              <option value="project_asc">Tên công trình (A-Z)</option>
            </select>

            {/* Reset Filter Button */}
            {isFiltered && (
              <Button onClick={resetFilters} variant="outline" size="sm" className="h-10 text-xs gap-1.5 border-slate-200 hover:bg-slate-100 rounded-xl font-medium shrink-0">
                <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </div>

        {/* Results summary counter */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] font-medium text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Hiển thị <strong className="text-slate-900">{filteredRows.length}</strong> / <strong>{rows.length}</strong> hồ sơ báo cáo tuần
          </span>
        </div>
      </FilterBar>

      {/* 4. Main Data Table */}
      <ContentCard className="p-0 border border-slate-200/80 shadow-2xs min-w-0 max-w-full">
        {filteredRows.length === 0 ? (
          <div className="py-10 text-center px-4">
            <FolderKanban className="h-10 w-10 text-slate-300 mx-auto mb-2.5" />
            <h3 className="text-sm font-semibold text-slate-800">
              Không tìm thấy Hồ sơ Giám sát tuần nào
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {isFiltered
                ? "Thử thay đổi từ khóa tìm kiếm, bộ lọc hoặc nhấn nút \"Xóa bộ lọc\"."
                : "Nhấn nút \"Tạo hồ sơ tuần mới\" để bắt đầu lập báo cáo."}
            </p>
            {isFiltered && (
              <Button onClick={resetFilters} variant="outline" size="sm" className="mt-4 gap-1.5 text-xs rounded-xl">
                <RotateCcw className="h-3.5 w-3.5" />
                Đặt lại bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto min-w-0 max-w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3.5 px-4 w-44">Mã hồ sơ</th>
                    <th className="py-3.5 px-4 w-44">Tuần kiểm tra</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Phạm vi công trình</th>
                    <th className="py-3.5 px-4 w-44">Nội dung giám sát</th>
                    <th className="py-3.5 px-4 w-40">Người cập nhật</th>
                    <th className="py-3.5 px-4 w-36 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {paginatedRows.map((row) => {
                    const weekInfo = getWeekNumber(row.weekStart);
                    const isOwner = row.createdById === currentUserId;
                    const isReviewer = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"].includes(currentUserRole || "");
                    const displayCode = row.reportNumber || `BCGS-${weekInfo.year}-W${weekInfo.week}`;
                    const projectList = row.projects || [];
                    const projectCount = projectList.length;

                    const isActionOpen = activeActionRowId === row.id;
                    const isPopoverOpen = activeProjectPopover === row.id;
                    const isRowHighlighted = isActionOpen || isPopoverOpen;

                    return (
                      <tr
                        key={row.id}
                        data-row-id={row.id}
                        data-dossier-code={displayCode}
                        data-state={isActionOpen ? "action-open" : isPopoverOpen ? "popover-open" : "idle"}
                        data-active-row={isRowHighlighted ? "true" : "false"}
                        className={`transition-colors ${
                          isActionOpen
                            ? "bg-blue-50/90 border-l-4 border-l-blue-600"
                            : isPopoverOpen
                            ? "bg-slate-100/90 border-l-4 border-l-blue-400"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        {/* Mã hồ sơ */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md text-[11px] inline-block border border-slate-200">
                            {displayCode}
                          </span>
                        </td>

                        {/* Tuần kiểm tra */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">
                            Tuần {weekInfo.week} / {weekInfo.year}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {formatDateVN(row.weekStart)} – {formatDateVN(row.weekEnd)}
                          </div>
                        </td>

                        {/* Phạm vi công trình */}
                        <td className="py-3.5 px-4">
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
                            <div className="inline-block">
                              <button
                                type="button"
                                aria-expanded={isPopoverOpen}
                                aria-controls={`project-popover-${row.id}`}
                                onClick={(e) => {
                                  if (isPopoverOpen) {
                                    setActiveProjectPopover(null);
                                    setPopoverTriggerEl(null);
                                  } else {
                                    setActiveProjectPopover(row.id);
                                    setPopoverTriggerEl(e.currentTarget);
                                  }
                                }}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors text-[11px] font-semibold ${
                                  isPopoverOpen
                                    ? "bg-blue-100 text-blue-900 border-blue-400 ring-2 ring-blue-500/20 font-bold"
                                    : "bg-blue-50 text-blue-800 border-blue-200/80 hover:bg-blue-100"
                                }`}
                              >
                                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                                <span>{projectCount} công trình</span>
                              </button>

                              {isPopoverOpen && (
                                <ProjectPopoverPortal
                                  popoverId={`project-popover-${row.id}`}
                                  triggerEl={popoverTriggerEl}
                                  displayCode={displayCode}
                                  weekNum={weekInfo.week}
                                  year={weekInfo.year}
                                  projectList={projectList}
                                  onClose={() => {
                                    setActiveProjectPopover(null);
                                    setPopoverTriggerEl(null);
                                  }}
                                />
                              )}
                            </div>
                          )}
                        </td>

                        {/* Nội dung giám sát */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {row.stats.totalItems > 0 ? `${row.stats.totalItems} mục nội dung` : "Chưa nhập nội dung"}
                          </span>
                        </td>

                        {/* Người cập nhật */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                              {row.createdBy.name.charAt(0)}
                            </div>
                            <div className="text-xs">
                              <div className="font-semibold text-slate-900">{row.createdBy.name}</div>
                              <div className="text-slate-400 font-normal">{formatTimeAgo(row.updatedAt)}</div>
                            </div>
                          </div>
                        </td>

                        {/* Thao tác */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Nút thao tác chính: Soạn/Sửa */}
                            <Button
                              size="sm"
                              onClick={() => router.push(`/reports/weekly-inspection/${row.id}/edit`)}
                              className="h-8 text-xs gap-1 bg-blue-600 text-white hover:bg-blue-700 font-medium"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Soạn/Sửa</span>
                            </Button>

                            {/* Unified Action Menu (3-dots) với Context Header rõ ràng */}
                            <UnifiedActionMenu
                              align="right"
                              menuWidth="w-56"
                              ariaLabel={`Mở thao tác hồ sơ ${displayCode}`}
                              onOpenChange={(isOpen) => {
                                if (isOpen) {
                                  setActiveActionRowId(row.id);
                                } else {
                                  setActiveActionRowId((prev) => (prev === row.id ? null : prev));
                                }
                              }}
                              trigger={({ isOpen, toggle }) => (
                                <button
                                  type="button"
                                  onClick={toggle}
                                  aria-expanded={isOpen}
                                  aria-haspopup="menu"
                                  aria-label={`Mở thao tác hồ sơ ${displayCode}`}
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                                    isOpen || isActionOpen
                                      ? "bg-blue-100 text-blue-700 border-blue-400 ring-2 ring-blue-500/20 font-bold"
                                      : "border-slate-200 text-slate-600 hover:bg-slate-100"
                                  }`}
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              )}
                            >
                              {/* Yêu cầu 3: Context Header trực quan ở đầu menu */}
                              <div className="px-3 py-2 bg-slate-50/90 rounded-t-lg border-b border-slate-100 mb-1 pointer-events-none">
                                <div className="font-bold text-slate-900 text-xs font-mono">
                                  Hồ sơ {displayCode}
                                </div>
                                <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                                  Tuần {weekInfo.week} / {weekInfo.year} • {formatDateVN(row.weekStart)} – {formatDateVN(row.weekEnd)}
                                </div>
                              </div>

                              {/* Action items không bị lặp nút Soạn/Sửa */}
                              <div className="space-y-0.5 p-1">
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => router.push(`/reports/weekly-inspection/${row.id}/preview`)}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-left"
                                >
                                  <Eye className="h-4 w-4 text-slate-500 shrink-0" />
                                  <span>Xem trước HTML</span>
                                </button>

                                <a
                                  href={`/api/supervision/weekly/${row.id}/export?format=pdf&disposition=inline&document=RESULT`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-left"
                                >
                                  <Printer className="h-4 w-4 text-slate-500 shrink-0" />
                                  <span>Xem PDF (In sạch)</span>
                                </a>

                                <a
                                  href={`/api/supervision/weekly/${row.id}/export?format=pdf&disposition=attachment&document=RESULT`}
                                  download
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-left"
                                >
                                  <Download className="h-4 w-4 text-blue-600 shrink-0" />
                                  <span>Tải PDF</span>
                                </a>

                                <a
                                  href={`/api/supervision/weekly/${row.id}/export?format=docx&document=RESULT`}
                                  download
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 hover:bg-slate-100 transition-colors text-left"
                                >
                                  <FileText className="h-4 w-4 text-slate-500 shrink-0" />
                                  <span>Tải DOCX</span>
                                </a>

                                {(isReviewer || isOwner) && (
                                  <>
                                    <div className="my-1 border-t border-slate-100" />
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => setDeletingDossier(row)}
                                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors text-left"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-500 shrink-0" />
                                      <span>Xóa hồ sơ</span>
                                    </button>
                                  </>
                                )}
                              </div>
                            </UnifiedActionMenu>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View Cards */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {paginatedRows.map((row) => {
                const weekInfo = getWeekNumber(row.weekStart);
                const isOwner = row.createdById === currentUserId;
                const isReviewer = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"].includes(currentUserRole || "");
                const displayCode = row.reportNumber || `BCGS-${weekInfo.year}-W${weekInfo.week}`;
                const projectList = row.projects || [];
                const projectCount = projectList.length;
                const isActionOpen = activeActionRowId === row.id;

                return (
                  <div
                    key={row.id}
                    data-row-id={row.id}
                    data-dossier-code={displayCode}
                    className={`p-4 space-y-3 transition-colors ${
                      isActionOpen ? "bg-blue-50/90 border-l-4 border-l-blue-600" : "bg-white hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs border border-slate-200">
                        {displayCode}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        Tuần {weekInfo.week} / {weekInfo.year}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Phạm vi:</span>
                      <span className="font-semibold text-slate-900">
                        {projectCount === 0 || projectCount > 3
                          ? "Toàn hệ thống"
                          : projectCount === 1
                          ? projectList[0].name
                          : `${projectCount} công trình`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[11px]">
                          {row.createdBy.name.charAt(0)}
                        </div>
                        <span className="text-xs font-medium text-slate-700">{row.createdBy.name}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => router.push(`/reports/weekly-inspection/${row.id}/edit`)}
                          className="h-8 text-xs gap-1 bg-blue-600 text-white hover:bg-blue-700 font-medium"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Sửa</span>
                        </Button>
                        <UnifiedActionMenu
                          align="right"
                          menuWidth="w-52"
                          ariaLabel={`Mở thao tác hồ sơ ${displayCode}`}
                          onOpenChange={(isOpen) => {
                            if (isOpen) {
                              setActiveActionRowId(row.id);
                            } else {
                              setActiveActionRowId((prev) => (prev === row.id ? null : prev));
                            }
                          }}
                          trigger={({ isOpen, toggle }) => (
                            <button
                              type="button"
                              onClick={toggle}
                              aria-expanded={isOpen}
                              aria-haspopup="menu"
                              aria-label={`Mở thao tác hồ sơ ${displayCode}`}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-all ${
                                isOpen || isActionOpen
                                  ? "bg-blue-100 text-blue-700 border-blue-400 font-bold"
                                  : "border-slate-200 text-slate-600 hover:bg-slate-100"
                              }`}
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>
                          )}
                        >
                          <div className="px-3 py-2 bg-slate-50/90 rounded-t-lg border-b border-slate-100 mb-1 pointer-events-none">
                            <div className="font-bold text-slate-900 text-xs font-mono">
                              Hồ sơ {displayCode}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium mt-0.5">
                              Tuần {weekInfo.week}/{weekInfo.year}
                            </div>
                          </div>
                          <div className="space-y-0.5 p-1">
                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => router.push(`/reports/weekly-inspection/${row.id}/preview`)}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 hover:bg-slate-100 text-left"
                            >
                              <Eye className="h-4 w-4 text-slate-500 shrink-0" />
                              <span>Xem chi tiết</span>
                            </button>

                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => router.push(`/reports/weekly-inspection/${row.id}/preview?autoPrint=1`)}
                              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-slate-700 hover:bg-slate-100 text-left"
                            >
                              <Printer className="h-4 w-4 text-slate-500 shrink-0" />
                              <span>In / PDF</span>
                            </button>

                            {(isReviewer || isOwner) && (
                              <>
                                <div className="my-1 border-t border-slate-100" />
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => setDeletingDossier(row)}
                                  className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg text-red-600 hover:bg-red-50 text-left"
                                >
                                  <Trash2 className="h-4 w-4 text-red-500 shrink-0" />
                                  <span>Xóa hồ sơ</span>
                                </button>
                              </>
                            )}
                          </div>
                        </UnifiedActionMenu>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </ContentCard>

      {/* Modal 1: Create Weekly Dossier */}
      {createModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Tạo hồ sơ kiểm tra tuần</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chọn một ngày thuộc tuần cần lập hồ sơ.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ngày thuộc tuần báo cáo <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={anchorDate}
                  onChange={(e) => setAnchorDate(e.target.value)}
                  className="w-full h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-medium"
                />
              </div>

              {createWeekPreview && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>
                      Phạm vi tuần báo cáo: Tuần {createWeekPreview.weekNum}/{createWeekPreview.year}
                    </span>
                  </div>
                  <div className="text-slate-600 pl-5">
                    Từ {createWeekPreview.startStr} Đến {createWeekPreview.endStr}
                  </div>
                </div>
              )}

              {/* Duplicate warning / action status */}
              {checkingDuplicate ? (
                <div className="text-xs text-slate-500 flex items-center gap-2 italic">
                  <div className="h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Đang kiểm tra hồ sơ hiện có...</span>
                </div>
              ) : duplicateCheck ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs space-y-2 text-amber-900">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Tuần này đã có hồ sơ báo cáo</span>
                  </div>
                  <p className="text-[11px] text-amber-800/90 leading-relaxed">
                    Hồ sơ <strong>{duplicateCheck.reportNumber || `BCGS-W${duplicateCheck.version}`}</strong> đã được tạo bởi <strong>{duplicateCheck.createdByName}</strong>. Nút bấm bên dưới sẽ chuyển trực tiếp đến hồ sơ hiện có.
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-xl text-xs font-semibold"
              >
                Hủy
              </Button>

              <Button
                type="button"
                disabled={pending || checkingDuplicate}
                onClick={handleCreate}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold px-5"
              >
                {pending ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : duplicateCheck ? (
                  <>
                    <Eye className="h-4 w-4" />
                    <span>Mở hồ sơ hiện có</span>
                  </>
                ) : (
                  <>
                    <CalendarPlus className="h-4 w-4" />
                    <span>Tạo hồ sơ</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Delete Confirm Dialog */}
      {deletingDossier && (
        <ConfirmDialog
          isOpen={Boolean(deletingDossier)}
          onClose={() => setDeletingDossier(null)}
          onConfirm={handleDeleteDossier}
          title="Xác nhận xóa hồ sơ giám sát"
          description={`Bạn có chắc chắn muốn xóa hồ sơ báo cáo tuần ${getWeekNumber(deletingDossier.weekStart).week}/${getWeekNumber(deletingDossier.weekStart).year} (${deletingDossier.reportNumber || 'BCGS'})? Hành động này sẽ xóa dữ liệu và không thể hoàn tác.`}
          confirmText="Xóa hồ sơ"
          cancelText="Hủy"
          variant="danger"
        />
      )}
    </div>
  );
}
