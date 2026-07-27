"use client";

import { useState, useMemo, useTransition, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
  Clock,
  Printer,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  Filter,
  Plus,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, PageHeading, ContentCard, FilterBar } from "@/components/ui/enterprise";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";
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

// Standardized status vocabulary across Supervision module
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  DRAFT: { label: "Bản nháp", bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", icon: Edit3 },
  SUBMITTED: { label: "Chờ duyệt", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", icon: Clock },
  REVISION_REQUIRED: { label: "Yêu cầu chỉnh sửa", bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200", icon: AlertTriangle },
  APPROVED: { label: "Đã duyệt", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", icon: CheckCircle2 },
  LOCKED: { label: "Đã khóa", bg: "bg-indigo-50", text: "text-indigo-800", border: "border-indigo-200", icon: Layers },
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

export function WeeklyListClient({
  rows = [],
  projects = [],
  currentUserId,
  currentUserRole,
  readiness,
  initialSearch = "",
  initialStatus = "ALL",
  initialProjectId = "ALL",
  initialSort = "updated_desc",
  hidePageHeader = false,
}: {
  rows: DossierRow[];
  projects?: ProjectOption[];
  currentUserId?: string;
  currentUserRole?: string;
  readiness?: SupervisionDatabaseReadiness;
  initialSearch?: string;
  initialStatus?: string;
  initialProjectId?: string;
  initialSort?: "updated_desc" | "week_desc" | "week_asc" | "project_asc";
  hidePageHeader?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  // State
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [projectFilter, setProjectFilter] = useState(initialProjectId);
  const [sortBy, setSortBy] = useState<"updated_desc" | "week_desc" | "week_asc" | "project_asc">(initialSort);
  const [showQaData, setShowQaData] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Active Row Menu Dropdown
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

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

  const [revisionModalDossier, setRevisionModalDossier] = useState<DossierRow | null>(null);
  const [deletingDossier, setDeletingDossier] = useState<DossierRow | null>(null);
  const [activeProjectPopover, setActiveProjectPopover] = useState<string | null>(null);

  // Sync state to URL Query Params
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (projectFilter !== "ALL") params.set("projectId", projectFilter);
    if (sortBy !== "updated_desc") params.set("sort", sortBy);

    const queryStr = params.toString();
    const basePath = typeof window !== "undefined" ? window.location.pathname : "/reports/weekly-inspection";
    const newUrl = queryStr ? `${basePath}?${queryStr}` : basePath;
    window.history.replaceState(null, "", newUrl);
  }, [search, statusFilter, projectFilter, sortBy]);

  // Duplicate Check effect in Modal
  useEffect(() => {
    if (!createModalOpen || !anchorDate) {
      setDuplicateCheck(null);
      setDuplicateCheckError(false);
      setCheckingDuplicate(false);
      return;
    }
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

  // Summary Counters
  const counts = useMemo(() => {
    const total = rows.length;
    const draft = rows.filter((r) => r.status === "DRAFT").length;
    const submitted = rows.filter((r) => r.status === "SUBMITTED").length;
    const revision = rows.filter((r) => r.status === "REVISION_REQUIRED").length;
    const approved = rows.filter((r) => r.status === "APPROVED" || r.status === "LOCKED").length;
    return { total, draft, submitted, revision, approved };
  }, [rows]);

  // Filtered & Sorted rows
  const filteredRows = useMemo(() => {
    return rows
      .filter((row) => {
        // QA data filter
        const isYear2099 = new Date(row.weekStart).getFullYear() >= 2090;
        if (!showQaData && isYear2099) return false;

        // Status filter
        if (statusFilter !== "ALL") {
          if (statusFilter === "APPROVED") {
            if (row.status !== "APPROVED" && row.status !== "LOCKED") return false;
          } else if (row.status !== statusFilter) {
            return false;
          }
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
  }, [rows, statusFilter, projectFilter, search, sortBy, showQaData]);

  // Paginated slice
  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  // Dynamic Week Preview in Modal
  const createWeekPreview = useMemo(() => {
    try {
      const d = new Date(anchorDate);
      if (Number.isNaN(d.getTime())) return null;
      const day = d.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(d);
      monday.setDate(d.getDate() + diffToMonday);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const weekInfo = getWeekNumber(monday.toISOString());
      const formatFullDateVN = (date: Date) =>
        new Intl.DateTimeFormat("vi-VN", {
          weekday: "long",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }).format(date);

      return {
        startStr: formatFullDateVN(monday),
        endStr: formatFullDateVN(sunday),
        weekNum: weekInfo.week,
        year: monday.getFullYear(),
      };
    } catch {
      return null;
    }
  }, [anchorDate]);

  // Keep every hook above this conditional return so readiness failures do not
  // change hook ordering between renders.
  if (readiness && !readiness.ready) {
    const title = {
      MIGRATION_NOT_APPLIED: "Chưa áp migration Giám sát",
      DATABASE_UNREACHABLE: "Không kết nối được cơ sở dữ liệu",
      DATABASE_PERMISSION_DENIED: "Không đủ quyền cơ sở dữ liệu",
      UNKNOWN: "Không thể kiểm tra cơ sở dữ liệu",
    }[readiness.reason];
    return (
      <div className="space-y-5">
        <PageHeader>
          <PageHeading title="Báo cáo tuần Giám sát" description="Phân hệ chưa sẵn sàng để truy xuất dữ liệu." />
        </PageHeader>
        <ContentCard className="p-8">
          <div className="flex items-center gap-3 text-rose-600 mb-2">
            <AlertTriangle className="h-6 w-6" />
            <h2 className="text-base font-bold">{title}</h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">{readiness.message}</p>
          <p className="mt-3 text-xs text-slate-500">Thông tin kỹ thuật chi tiết được ghi ở server để quản trị viên chẩn đoán.</p>
        </ContentCard>
      </div>
    );
  }

  const handleCreateDossier = () => {
    if (!anchorDate) {
      toast.error("Vui lòng chọn ngày trong tuần báo cáo.");
      return;
    }
    const year = new Date(anchorDate).getFullYear();
    if (year < 2000 || (year > 2045 && year !== 2099)) {
      toast.error(`Năm ${year} không hợp lệ. Vui lòng chọn năm trong khoảng 2000 - 2045.`);
      return;
    }

    startTransition(async () => {
      try {
        const result = await createSupervisionWeeklyDossier(anchorDate);
        if (result.isExisting) {
          toast.info("Chuyển đến hồ sơ hiện có cho tuần đã chọn.");
          if (["DRAFT", "REVISION_REQUIRED"].includes(result.status)) {
            router.push(`/reports/weekly-inspection/${result.id}/edit`);
          } else {
            router.push(`/reports/weekly-inspection/${result.id}/preview`);
          }
        } else {
          toast.success("Tạo hồ sơ kiểm tra tuần thành công!");
          router.push(`/reports/weekly-inspection/${result.id}/edit`);
        }
        setCreateModalOpen(false);
      } catch (err: any) {
        toast.error(err?.message || "Không thể tạo hồ sơ tuần.");
      }
    });
  };

  const handleDeleteDossier = async () => {
    if (!deletingDossier) return;
    startTransition(async () => {
      try {
        await deleteSupervisionWeeklyDossier(deletingDossier.id);
        toast.success("Đã xóa bản nháp hồ sơ tuần thành công.");
        setDeletingDossier(null);
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message || "Không thể xóa hồ sơ.");
      }
    });
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("ALL");
    setProjectFilter("ALL");
    setSortBy("updated_desc");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* 1. Action CTA Header when in Shared Shell or Standalone PageHeader */}
      {!hidePageHeader ? (
        <div className="space-y-3">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Báo cáo công trình</span>
          </Link>
          <PageHeader>
            <PageHeading
              title={
                <div className="flex items-center gap-2.5">
                  <FileText className="h-6 w-6 text-blue-600" />
                  <span>Kiểm tra & kế hoạch tuần</span>
                </div>
              }
              description="Lập báo cáo kiểm tra toàn bộ công trình và kế hoạch công tác theo tuần."
              action={
                <Button
                  onClick={() => setCreateModalOpen(true)}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all hover:shadow-md h-10 px-4"
                >
                  <CalendarPlus className="h-4 w-4" />
                  <span>Tạo hồ sơ tuần mới</span>
                </Button>
              }
            />
          </PageHeader>
        </div>
      ) : (
        <div className="flex items-center justify-between pb-2">
          <div className="text-xs font-medium text-slate-500">
            Hồ sơ kiểm tra kết quả tuần và đề xuất kế hoạch công tác tuần tiếp theo
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all hover:shadow-md h-10 px-4 shrink-0"
          >
            <CalendarPlus className="h-4 w-4" />
            <span>Tạo hồ sơ tuần mới</span>
          </Button>
        </div>
      )}

      {/* 2. Compact Status Counter KPI Cards (Height reduced 20-30%) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: "ALL", label: "Tất cả hồ sơ", count: counts.total, color: "border-slate-200 bg-white text-slate-900" },
          { key: "DRAFT", label: "Bản nháp", count: counts.draft, color: "border-slate-200 bg-slate-50 text-slate-700" },
          { key: "SUBMITTED", label: "Chờ duyệt", count: counts.submitted, color: "border-amber-200 bg-amber-50/70 text-amber-800" },
          { key: "REVISION_REQUIRED", label: "Yêu cầu chỉnh sửa", count: counts.revision, color: counts.revision > 0 ? "border-rose-300 bg-rose-50 text-rose-800 ring-2 ring-rose-200" : "border-rose-100 bg-rose-50/40 text-rose-700" },
          { key: "APPROVED", label: "Đã duyệt", count: counts.approved, color: "border-emerald-200 bg-emerald-50/70 text-emerald-800" },
        ].map((item) => {
          const isActive = statusFilter === item.key;
          return (
            <button
              key={item.key}
              tabIndex={0}
              role="button"
              aria-pressed={isActive}
              onClick={() => {
                setStatusFilter(item.key);
                setPage(1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setStatusFilter(item.key);
                  setPage(1);
                }
              }}
              className={`flex flex-col justify-between rounded-xl border py-2.5 px-3.5 text-left transition-all cursor-pointer outline-none focus:ring-2 focus:ring-blue-500 ${item.color} ${
                isActive ? "ring-2 ring-blue-600 shadow-sm scale-[1.01]" : "hover:border-blue-300 hover:shadow-xs"
              }`}
            >
              <div className="text-xs font-semibold text-slate-500 truncate">{item.label}</div>
              <div className="mt-1 text-xl font-extrabold tracking-tight">{item.count}</div>
            </button>
          );
        })}
      </div>

      {/* 3. Search & Filter Bar */}
      <FilterBar className="bg-white">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo số báo cáo, tên công trình, người lập..."
              className="w-full h-10 pl-9 pr-8 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
            />
            {search && (
              <button
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

          <div className="flex flex-wrap items-center gap-2">
            {/* Project Filter */}
            {projects.length > 0 && (
              <select
                value={projectFilter}
                onChange={(e) => {
                  setProjectFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 min-w-[150px]"
              >
                <option value="ALL">Tất cả công trình</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-500 min-w-[140px]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DRAFT">Bản nháp</option>
              <option value="SUBMITTED">Chờ duyệt</option>
              <option value="REVISION_REQUIRED">Yêu cầu chỉnh sửa</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="LOCKED">Đã khóa</option>
            </select>

            {/* Sort Filter */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="updated_desc">Mới cập nhật</option>
              <option value="week_desc">Tuần mới nhất</option>
              <option value="week_asc">Tuần cũ nhất</option>
              <option value="project_asc">Tên công trình (A-Z)</option>
            </select>

            {/* Reset Filter Button */}
            {(search || statusFilter !== "ALL" || projectFilter !== "ALL" || sortBy !== "updated_desc") && (
              <Button onClick={resetFilters} variant="outline" size="sm" className="h-10 text-xs gap-1 border-slate-200 hover:bg-slate-100">
                <RotateCcw className="h-3.5 w-3.5" />
                Xóa bộ lọc
              </Button>
            )}
          </div>
        </div>

        {/* Results summary counter & QA Data Toggle */}
        <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <span>
            Hiển thị <strong className="text-slate-900">{filteredRows.length}</strong> / {rows.length} hồ sơ báo cáo
          </span>

          <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 font-medium select-none">
            <input
              type="checkbox"
              checked={showQaData}
              onChange={(e) => setShowQaData(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            <span>Hiển thị dữ liệu thử nghiệm (QA 2099)</span>
          </label>
        </div>
      </FilterBar>

      {/* 4. Desktop Table View & Mobile Cards */}
      <ContentCard className="overflow-hidden">
        {filteredRows.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <h3 className="text-base font-semibold text-slate-900 mb-1">Không tìm thấy hồ sơ báo cáo tuần</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
              {search || statusFilter !== "ALL" || projectFilter !== "ALL"
                ? "Không có báo cáo tuần nào phù hợp với bộ lọc hiện tại. Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
                : "Chưa có báo cáo tuần nào được khởi tạo trong phạm vi làm việc của bạn."}
            </p>
            {(search || statusFilter !== "ALL" || projectFilter !== "ALL") && (
              <Button onClick={resetFilters} variant="outline" size="sm" className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Đặt lại bộ lọc
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3.5">Hồ sơ & Tuần báo cáo</th>
                    <th className="px-4 py-3.5">Công trình</th>
                    <th className="px-4 py-3.5">Trạng thái</th>
                    <th className="px-4 py-3.5">Người lập & Cập nhật</th>
                    <th className="px-4 py-3.5 text-center">Nội dung</th>
                    <th className="px-4 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.map((row) => {
                    const st = STATUS_CONFIG[row.status] || STATUS_CONFIG.DRAFT;
                    const StatusIcon = st.icon;
                    const weekInfo = getWeekNumber(row.weekStart);
                    const isYear2099 = new Date(row.weekStart).getFullYear() >= 2090;
                    const isOwner = row.createdById === currentUserId;
                    const isReviewer = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"].includes(currentUserRole || "");

                    const primaryProjects = row.projects.slice(0, 2);
                    const extraProjects = row.projects.slice(2);

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
                        {/* Hồ sơ & Tuần */}
                        <td className="px-4 py-4 min-w-[220px]">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">
                              T{weekInfo.week}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {row.reportNumber || `Tuần ${weekInfo.week}/${weekInfo.year}`}
                                </span>
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                  v{row.version}
                                </span>
                                {isYear2099 && (
                                  <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px] font-bold">
                                    QA/Test (2099)
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 font-medium">
                                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>{formatDateVN(row.weekStart)} – {formatDateVN(row.weekEnd)}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Công trình (Max 2 projects + popover for extra) */}
                        <td className="px-4 py-4 min-w-[200px] relative">
                          {row.projects.length > 0 ? (
                            <div className="space-y-1">
                              {primaryProjects.map((p, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                                  <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                                  <span className="truncate max-w-[220px]" title={p.name}>{p.name}</span>
                                </div>
                              ))}

                              {extraProjects.length > 0 && (
                                <div className="relative inline-block">
                                  <button
                                    onClick={() => setActiveProjectPopover(activeProjectPopover === row.id ? null : row.id)}
                                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 underline flex items-center gap-1"
                                  >
                                    +{extraProjects.length} công trình khác
                                  </button>

                                  {activeProjectPopover === row.id && (
                                    <div className="absolute left-0 top-6 z-30 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-lg text-xs space-y-1.5 animate-in fade-in zoom-in-95">
                                      <div className="font-bold text-slate-900 pb-1 border-b border-slate-100 flex justify-between items-center">
                                        <span>Tất cả công trình ({row.projects.length})</span>
                                        <button onClick={() => setActiveProjectPopover(null)} className="text-slate-400 hover:text-slate-600">
                                          <X className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                      <div className="max-h-40 overflow-y-auto space-y-1">
                                        {row.projects.map((p, idx) => (
                                          <div key={idx} className="text-slate-700 py-0.5 border-b border-slate-50 last:border-0 truncate">
                                            {p.name}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs italic text-slate-400">Chưa chọn công trình</span>
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${st.bg} ${st.text} ${st.border}`}>
                              <StatusIcon className="h-3.5 w-3.5" />
                              <span>{st.label}</span>
                            </span>
                            {row.status === "REVISION_REQUIRED" && row.latestRevision?.reason && (
                              <button
                                onClick={() => setRevisionModalDossier(row)}
                                className="block text-[11px] text-rose-600 hover:text-rose-700 underline font-medium"
                              >
                                Xem lý do chỉnh sửa
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Người lập & Thời gian */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                              {row.createdBy.name.charAt(0)}
                            </div>
                            <div className="text-xs">
                              <div className="font-semibold text-slate-900">{row.createdBy.name}</div>
                              <div className="text-slate-400 font-normal">{formatTimeAgo(row.updatedAt)}</div>
                            </div>
                          </div>
                        </td>

                        {/* Khối lượng dữ liệu */}
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                            {row.stats.totalItems > 0 ? `${row.stats.totalItems} mục` : "Chưa nhập nội dung"}
                          </span>
                        </td>

                        {/* Thao tác (Primary Button + 3-Dot Contextual Dropdown) */}
                        <td className="px-4 py-4 text-right whitespace-nowrap relative">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Primary Action Button based on status */}
                            {isOwner && ["DRAFT", "REVISION_REQUIRED"].includes(row.status) ? (
                              <Button
                                size="sm"
                                onClick={() => router.push(`/reports/weekly-inspection/${row.id}/edit`)}
                                className="h-8 text-xs gap-1 bg-blue-600 text-white hover:bg-blue-700"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>{row.status === "REVISION_REQUIRED" ? "Chỉnh sửa" : "Tiếp tục soạn"}</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/reports/weekly-inspection/${row.id}/preview`)}
                                className="h-8 text-xs gap-1 border-slate-200 text-slate-700 hover:bg-slate-100"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Xem hồ sơ</span>
                              </Button>
                            )}

                            {/* 3-Dot Context Menu */}
                            <div className="relative">
                              <button
                                onClick={() => setActiveMenuId(activeMenuId === row.id ? null : row.id)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                                aria-label="Menu thao tác phụ"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {activeMenuId === row.id && (
                                <div className="absolute right-0 top-9 z-40 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg text-xs space-y-0.5 animate-in fade-in zoom-in-95">
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      router.push(`/reports/weekly-inspection/${row.id}/preview`);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-slate-500" />
                                    <span>Xem trước</span>
                                  </button>

                                  {(isOwner || isReviewer) && ["SUBMITTED", "APPROVED"].includes(row.status) && (
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        router.push(`/reports/weekly-inspection/${row.id}/preview?print=1`);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
                                    >
                                      <Printer className="h-3.5 w-3.5 text-slate-500" />
                                      <span>In / Xuất PDF</span>
                                    </button>
                                  )}

                                  {row.status === "REVISION_REQUIRED" && (
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setRevisionModalDossier(row);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg text-rose-700 hover:bg-rose-50 font-medium"
                                    >
                                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                      <span>Xem lý do sửa</span>
                                    </button>
                                  )}

                                  {(isReviewer || (isOwner && currentUserRole !== "CONSTRUCTION_SUPERVISOR")) && ["DRAFT", "REVISION_REQUIRED"].includes(row.status) && (
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setDeletingDossier(row);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg text-rose-600 hover:bg-rose-50 font-medium"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span>Xóa bản nháp</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {paginatedRows.map((row) => {
                const st = STATUS_CONFIG[row.status] || STATUS_CONFIG.DRAFT;
                const StatusIcon = st.icon;
                const weekInfo = getWeekNumber(row.weekStart);
                const isYear2099 = new Date(row.weekStart).getFullYear() >= 2090;
                const isOwner = row.createdById === currentUserId;

                return (
                  <div key={row.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                          T{weekInfo.week}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900">
                            {row.reportNumber || `Tuần ${weekInfo.week}/${weekInfo.year}`}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            {formatDateVN(row.weekStart)} – {formatDateVN(row.weekEnd)}
                          </div>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.bg} ${st.text} ${st.border}`}>
                        <StatusIcon className="h-3 w-3" />
                        <span>{st.label}</span>
                      </span>
                    </div>

                    {/* Công trình & Tình trạng */}
                    {row.projects.length > 0 && (
                      <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 bg-slate-50 p-2 rounded-lg">
                        <Building2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{row.projects.map((p) => p.name).join(", ")}</span>
                      </div>
                    )}

                    {row.status === "REVISION_REQUIRED" && row.latestRevision?.reason && (
                      <div className="rounded-lg bg-rose-50 p-2.5 border border-rose-200 text-xs text-rose-800">
                        <div className="font-bold flex items-center gap-1 mb-0.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Yêu cầu chỉnh sửa:</span>
                        </div>
                        <p className="line-clamp-2">{row.latestRevision.reason}</p>
                      </div>
                    )}

                    {/* Footer info & Action buttons */}
                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="text-slate-500">
                        <span>{row.createdBy.name}</span> · <span>{formatTimeAgo(row.updatedAt)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isOwner && ["DRAFT", "REVISION_REQUIRED"].includes(row.status) && (
                          <Button
                            size="sm"
                            onClick={() => router.push(`/reports/weekly-inspection/${row.id}/edit`)}
                            className="h-8 text-xs gap-1 bg-blue-600 text-white hover:bg-blue-700"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            Soạn
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/reports/weekly-inspection/${row.id}/preview`)}
                          className="h-8 text-xs gap-1 border-slate-200"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Xem
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-t border-slate-200 text-xs text-slate-600">
                <div>
                  Trang <strong>{page}</strong> / <strong>{totalPages}</strong>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-2"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </ContentCard>

      {/* 5. Create Report Modal with Real-time Duplicate Check */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Tạo hồ sơ kiểm tra tuần</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Chọn một ngày thuộc tuần cần lập hồ sơ. Công trình và hạng mục kiểm tra sẽ được bổ sung khi soạn báo cáo.
                </p>
              </div>
              <button onClick={() => setCreateModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ngày thuộc tuần báo cáo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={anchorDate}
                  onChange={(e) => setAnchorDate(e.target.value)}
                  className="w-full h-10 rounded-xl border border-slate-300 px-3 text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Week Range Preview */}
              {createWeekPreview && (
                <div className="rounded-xl bg-blue-50/70 p-3.5 border border-blue-100 text-xs text-blue-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-blue-800">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>Phạm vi tuần báo cáo</span>
                  </div>
                  <div className="font-semibold text-sm text-blue-950">
                    Tuần {createWeekPreview.weekNum}/{createWeekPreview.year}
                  </div>
                  <div className="text-slate-600 capitalize">
                    Từ {createWeekPreview.startStr} đến {createWeekPreview.endStr}
                  </div>
                </div>
              )}

              {/* Duplicate check states */}
              {checkingDuplicate && (
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs text-slate-500 italic flex items-center gap-2">
                  <Clock className="h-4 w-4 animate-spin text-blue-500 shrink-0" />
                  <span>Đang kiểm tra hồ sơ tuần...</span>
                </div>
              )}

              {duplicateCheckError && (
                <div className="rounded-xl bg-rose-50 p-3.5 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    <span>Không thể kiểm tra hồ sơ của tuần này.</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setCheckingDuplicate(true);
                      setDuplicateCheckError(false);
                      checkSupervisionWeeklyDuplicate(anchorDate)
                        .then((res) => {
                          setDuplicateCheck(res);
                          setCheckingDuplicate(false);
                        })
                        .catch(() => {
                          setCheckingDuplicate(false);
                          setDuplicateCheckError(true);
                        });
                    }}
                    className="h-7 text-xs border-rose-200 text-rose-700 hover:bg-rose-100"
                  >
                    Thử lại
                  </Button>
                </div>
              )}

              {duplicateCheck && !checkingDuplicate && (
                <div className="space-y-3">
                  {duplicateCheck.status === "DRAFT" && (
                    <div className="rounded-xl bg-amber-50 p-4 border border-amber-200 text-xs text-amber-900 space-y-3">
                      <div className="font-bold flex items-center gap-1.5 text-amber-800 text-sm">
                        <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                        <span>Tuần này đã có một hồ sơ đang soạn</span>
                      </div>
                      <p className="text-amber-800 leading-relaxed">
                        Tuần này đã có một hồ sơ đang soạn. Bạn không cần tạo thêm hồ sơ mới.
                      </p>
                      <div className="p-2.5 bg-white/80 rounded-lg border border-amber-200 text-slate-700 space-y-1">
                        <div>Mã/Số: <strong>{duplicateCheck.reportNumber || `Hồ sơ v${duplicateCheck.version}`}</strong></div>
                        <div>Cập nhật gần nhất: <strong>{formatTimeAgo(duplicateCheck.updatedAt)}</strong> bởi <strong>{duplicateCheck.createdByName}</strong></div>
                      </div>
                      <div className="pt-1">
                        <Button
                          size="sm"
                          onClick={() => {
                            setCreateModalOpen(false);
                            router.push(`/reports/weekly-inspection/${duplicateCheck.id}/edit`);
                          }}
                          className="w-full h-9 text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 gap-1.5"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Tiếp tục soạn
                        </Button>
                      </div>
                    </div>
                  )}

                  {duplicateCheck.status === "REVISION_REQUIRED" && (
                    <div className="rounded-xl bg-rose-50 p-4 border border-rose-200 text-xs text-rose-900 space-y-3">
                      <div className="font-bold flex items-center gap-1.5 text-rose-800 text-sm">
                        <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                        <span>Hồ sơ tuần này đang được yêu cầu chỉnh sửa</span>
                      </div>
                      <p className="text-rose-800 leading-relaxed">
                        Hồ sơ tuần này đang được yêu cầu chỉnh sửa. Hãy mở hồ sơ hiện có để cập nhật và gửi lại.
                      </p>
                      <div className="p-2.5 bg-white/80 rounded-lg border border-rose-200 text-slate-700 space-y-1">
                        <div>Mã/Số: <strong>{duplicateCheck.reportNumber || `Hồ sơ v${duplicateCheck.version}`}</strong></div>
                        <div>Cập nhật gần nhất: <strong>{formatTimeAgo(duplicateCheck.updatedAt)}</strong> bởi <strong>{duplicateCheck.createdByName}</strong></div>
                      </div>
                      <div className="pt-1">
                        <Button
                          size="sm"
                          onClick={() => {
                            setCreateModalOpen(false);
                            router.push(`/reports/weekly-inspection/${duplicateCheck.id}/edit`);
                          }}
                          className="w-full h-9 text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 gap-1.5"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          Mở hồ sơ để chỉnh sửa
                        </Button>
                      </div>
                    </div>
                  )}

                  {duplicateCheck.status === "SUBMITTED" && (
                    <div className="rounded-xl bg-blue-50 p-4 border border-blue-200 text-xs text-blue-900 space-y-3">
                      <div className="font-bold flex items-center gap-1.5 text-blue-800 text-sm">
                        <Clock className="h-4.5 w-4.5 text-blue-600 shrink-0" />
                        <span>Đang chờ duyệt</span>
                      </div>
                      <p className="text-blue-800 leading-relaxed">
                        Hồ sơ tuần này đã được gửi và đang chờ duyệt.
                      </p>
                      <div className="p-2.5 bg-white/80 rounded-lg border border-blue-200 text-slate-700 space-y-1">
                        <div>Mã/Số: <strong>{duplicateCheck.reportNumber || `Hồ sơ v${duplicateCheck.version}`}</strong></div>
                        <div>Cập nhật gần nhất: <strong>{formatTimeAgo(duplicateCheck.updatedAt)}</strong> bởi <strong>{duplicateCheck.createdByName}</strong></div>
                      </div>
                      <div className="pt-1">
                        <Button
                          size="sm"
                          onClick={() => {
                            setCreateModalOpen(false);
                            router.push(`/reports/weekly-inspection/${duplicateCheck.id}/preview`);
                          }}
                          className="w-full h-9 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Xem hồ sơ
                        </Button>
                      </div>
                    </div>
                  )}

                  {(duplicateCheck.status === "APPROVED" || duplicateCheck.status === "LOCKED") && (
                    <div className="rounded-xl bg-emerald-50 p-4 border border-emerald-200 text-xs text-emerald-900 space-y-3">
                      <div className="font-bold flex items-center gap-1.5 text-emerald-800 text-sm">
                        <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                        <span>Đã phê duyệt</span>
                      </div>
                      <p className="text-emerald-800 leading-relaxed">
                        Hồ sơ tuần này đã được phê duyệt.
                      </p>
                      <div className="p-2.5 bg-white/80 rounded-lg border border-emerald-200 text-slate-700 space-y-1">
                        <div>Mã/Số: <strong>{duplicateCheck.reportNumber || `Hồ sơ v${duplicateCheck.version}`}</strong></div>
                        <div>Cập nhật gần nhất: <strong>{formatTimeAgo(duplicateCheck.updatedAt)}</strong> bởi <strong>{duplicateCheck.createdByName}</strong></div>
                      </div>
                      <div className="pt-1">
                        <Button
                          size="sm"
                          onClick={() => {
                            setCreateModalOpen(false);
                            router.push(`/reports/weekly-inspection/${duplicateCheck.id}/preview`);
                          }}
                          className="w-full h-9 text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Xem hồ sơ
                        </Button>
                      </div>
                    </div>
                  )}

                  {duplicateCheck.status === "REJECTED" && (
                    <div className="rounded-xl bg-rose-50 p-4 border border-rose-200 text-xs text-rose-900 space-y-3">
                      <div className="font-bold flex items-center gap-1.5 text-rose-800 text-sm">
                        <XCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                        <span>Đã bị từ chối</span>
                      </div>
                      <p className="text-rose-800 leading-relaxed">
                        Hồ sơ tuần này đã bị từ chối. Hãy mở hồ sơ để xem lý do và xử lý theo quy trình.
                      </p>
                      <div className="p-2.5 bg-white/80 rounded-lg border border-rose-200 text-slate-700 space-y-1">
                        <div>Mã/Số: <strong>{duplicateCheck.reportNumber || `Hồ sơ v${duplicateCheck.version}`}</strong></div>
                        <div>Cập nhật gần nhất: <strong>{formatTimeAgo(duplicateCheck.updatedAt)}</strong> bởi <strong>{duplicateCheck.createdByName}</strong></div>
                      </div>
                      <div className="pt-1">
                        <Button
                          size="sm"
                          onClick={() => {
                            setCreateModalOpen(false);
                            router.push(`/reports/weekly-inspection/${duplicateCheck.id}/preview`);
                          }}
                          className="w-full h-9 text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Xem lý do và chỉnh sửa
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => setCreateModalOpen(false)} disabled={pending}>
                Hủy
              </Button>
              {!duplicateCheck && (
                <Button
                  onClick={handleCreateDossier}
                  disabled={pending || checkingDuplicate || duplicateCheckError}
                  className="bg-blue-600 text-white hover:bg-blue-700 gap-1.5"
                >
                  <CalendarPlus className="h-4 w-4" />
                  {pending ? "Đang khởi tạo..." : "Tạo hồ sơ"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Revision Reason Dialog */}
      {revisionModalDossier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <h3 className="text-base font-bold text-slate-900">Yêu cầu chỉnh sửa báo cáo</h3>
              </div>
              <button onClick={() => setRevisionModalDossier(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-500 font-medium">
                <span>Người duyệt yêu cầu: <strong>{revisionModalDossier.latestRevision?.actorName || "Cấp quản lý"}</strong></span>
                <span>{formatDateVN(revisionModalDossier.latestRevision?.createdAt || "")}</span>
              </div>
              <div className="p-3 bg-white rounded-lg border border-rose-200 text-slate-800 text-sm font-normal whitespace-pre-wrap">
                {revisionModalDossier.latestRevision?.reason || "Chưa có nội dung lý do chi tiết."}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRevisionModalDossier(null)}>
                Đóng
              </Button>
              <Button
                onClick={() => {
                  const id = revisionModalDossier.id;
                  setRevisionModalDossier(null);
                  router.push(`/reports/weekly-inspection/${id}/edit`);
                }}
                className="bg-blue-600 text-white hover:bg-blue-700 gap-1.5"
              >
                <Edit3 className="h-4 w-4" />
                Mở màn hình sửa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Confirm Delete Dialog */}
      {deletingDossier && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeletingDossier(null)}
          title="Xác nhận xóa bản nháp báo cáo tuần"
          description={`Bạn có chắc chắn muốn xóa bản nháp báo cáo ${deletingDossier.reportNumber || "tuần này"} không? Hành động này sẽ loại bỏ hồ sơ khỏi hệ thống.`}
          confirmText="Xóa bản nháp"
          variant="danger"
          onConfirm={handleDeleteDossier}
          isLoading={pending}
        />
      )}
    </div>
  );
}
