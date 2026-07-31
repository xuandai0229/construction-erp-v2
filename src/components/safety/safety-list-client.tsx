"use client";

import { useEffect, useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  MoreVertical,
  Plus,
  Printer,
  Search,
  ShieldCheck,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentCard } from "@/components/ui/enterprise";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  checkSafetyPlanDuplicateAction,
  checkSafetyAssessmentDuplicateAction,
  createSafetyPlanAction,
  createSafetyAssessmentAction,
  deleteSafetyPlanDraftAction,
  deleteSafetyAssessmentDraftAction,
} from "@/app/(dashboard)/reports/safety/actions";

export type SafetyTabType = "PLAN" | "ASSESSMENT";

export type StatusConfigItem = {
  label: string;
  bg: string;
  text: string;
  border: string;
  icon: any;
};

export const STATUS_CONFIG: Record<string, StatusConfigItem> = {
  DRAFT: {
    label: "Bản nháp",
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-300",
    icon: Clock,
  },
  PENDING_APPROVAL: {
    label: "Chờ duyệt",
    bg: "bg-amber-50/80",
    text: "text-amber-800",
    border: "border-amber-200",
    icon: Clock,
  },
  APPROVED: {
    label: "Đã duyệt",
    bg: "bg-emerald-50/80",
    text: "text-emerald-800",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  REVISION_REQUIRED: {
    label: "Yêu cầu chỉnh sửa",
    bg: "bg-rose-50/80",
    text: "text-rose-800",
    border: "border-rose-200",
    icon: AlertTriangle,
  },
  CANCELLED: {
    label: "Đã hủy",
    bg: "bg-gray-100",
    text: "text-gray-600",
    border: "border-gray-300",
    icon: XCircle,
  },
};

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

function formatShortDate(dateStr: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function formatPeriodDisplay(startStr: string, endStr: string) {
  const dStart = new Date(startStr);
  const dEnd = new Date(endStr);
  if (Number.isNaN(dStart.getTime()) || Number.isNaN(dEnd.getTime())) {
    return `${formatDateVN(startStr)} – ${formatDateVN(endStr)}`;
  }

  const yStart = dStart.getFullYear();
  const yEnd = dEnd.getFullYear();

  if (yStart === yEnd) {
    return `${formatShortDate(startStr)} – ${formatShortDate(endStr)}/${yEnd}`;
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

function getWeekNumber(dateStr: string) {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return { week: 1, year: new Date().getFullYear() };
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
}

export function SafetyListClient({
  tab,
  plansData,
  assessmentsData,
  projects,
}: {
  tab: SafetyTabType;
  plansData: any;
  assessmentsData: any;
  projects: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<SafetyTabType>(tab);
  const currentData = activeTab === "PLAN" ? plansData : assessmentsData;

  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "ALL");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [sortOption, setSortOption] = useState(searchParams.get("sort") || "updated_desc");

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [anchorDate, setAnchorDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState<any>(null);
  const [duplicateCheckError, setDuplicateCheckError] = useState(false);

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
  const [revisionModalItem, setRevisionModalItem] = useState<any>(null);
  const [deletingItem, setDeletingItem] = useState<any>(null);
  const [pending, startTransition] = useTransition();

  const handleTabChange = (newTab: SafetyTabType) => {
    setActiveTab(newTab);
    setStatusFilter("ALL");
    setSearchQuery("");
    setSortOption("updated_desc");

    const params = new URLSearchParams();
    params.set("tab", newTab);
    router.push(`/reports/safety?${params.toString()}`);
  };

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set("tab", activeTab);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (searchQuery) params.set("search", searchQuery);
    if (sortOption !== "updated_desc") params.set("sort", sortOption);
    params.set("page", "1");
    router.push(`/reports/safety?${params.toString()}`);
  };

  // Real-time duplicate check when anchorDate changes in modal
  useEffect(() => {
    if (!createModalOpen || !anchorDate) return;
    let isCancelled = false;
    setCheckingDuplicate(true);
    setDuplicateCheck(null);
    setDuplicateCheckError(false);

    const checkFn =
      activeTab === "PLAN"
        ? checkSafetyPlanDuplicateAction
        : checkSafetyAssessmentDuplicateAction;

    const timer = setTimeout(() => {
      checkFn(anchorDate)
        .then((res) => {
          if (!isCancelled) {
            setDuplicateCheck(res);
            setCheckingDuplicate(false);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setCheckingDuplicate(false);
            setDuplicateCheckError(true);
          }
        });
    }, 300);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [createModalOpen, anchorDate, activeTab]);

  const handleCreateDossier = () => {
    startTransition(async () => {
      try {
        if (activeTab === "PLAN") {
          const res = await createSafetyPlanAction(anchorDate);
          setCreateModalOpen(false);
          router.push(`/reports/safety/plans/${res.id}`);
        } else {
          const res = await createSafetyAssessmentAction(anchorDate);
          setCreateModalOpen(false);
          router.push(`/reports/safety/self-assessments/${res.id}`);
        }
      } catch (err: any) {
        alert(err.message || "Không thể tạo mới hồ sơ.");
      }
    });
  };

  const handleDeleteDossier = () => {
    if (!deletingItem) return;
    startTransition(async () => {
      try {
        if (activeTab === "PLAN") {
          await deleteSafetyPlanDraftAction(deletingItem.id);
        } else {
          await deleteSafetyAssessmentDraftAction(deletingItem.id);
        }
        setDeletingItem(null);
        router.refresh();
      } catch (err: any) {
        alert(err.message || "Không thể xóa hồ sơ.");
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
    const weekInfo = getWeekNumber(dStr);

    return {
      weekNum: weekInfo.week,
      year: weekInfo.year,
      startStr: formatDateVN(monday.toISOString()),
      endStr: formatDateVN(sunday.toISOString()),
    };
  };

  const createWeekPreview = getWeekPreview(anchorDate);

  // Status Cards styled to match Giám sát module
  const statusCards = [
    {
      key: "ALL",
      label: "Tất cả hồ sơ",
      count: currentData.counts.ALL,
      bg: "bg-white",
      text: "text-slate-900",
      numColor: "text-slate-900",
    },
    {
      key: "DRAFT",
      label: "Bản nháp",
      count: currentData.counts.DRAFT,
      bg: "bg-slate-50/90",
      text: "text-slate-600",
      numColor: "text-slate-800",
    },
    {
      key: "PENDING_APPROVAL",
      label: "Chờ duyệt",
      count: currentData.counts.PENDING_APPROVAL,
      bg: "bg-amber-50/70",
      text: "text-amber-800",
      numColor: "text-amber-900",
    },
    {
      key: "REVISION_REQUIRED",
      label: "Yêu cầu chỉnh sửa",
      count: currentData.counts.REVISION_REQUIRED,
      bg: "bg-rose-50/70",
      text: "text-rose-800",
      numColor: "text-rose-900",
    },
    {
      key: "APPROVED",
      label: "Đã duyệt",
      count: currentData.counts.APPROVED,
      bg: "bg-emerald-50/70",
      text: "text-emerald-800",
      numColor: "text-emerald-900",
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
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
                Hồ sơ ATLĐ • PCCC • VSMT
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý kế hoạch kiểm tra và báo cáo tự đánh giá theo tuần.
              </p>
            </div>
          </div>

          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-blue-600 text-white hover:bg-blue-700 gap-2 shadow-xs self-start sm:self-auto h-10 px-4 text-xs font-bold rounded-xl"
          >
            <Plus className="h-4 w-4" />
            <span>{activeTab === "PLAN" ? "Tạo kế hoạch" : "Tạo báo cáo"}</span>
          </Button>
        </div>
      </ContentCard>

      {/* Main Selector Dual Tabs */}
      <div className="bg-slate-200/70 p-1.5 rounded-2xl flex items-center gap-1.5 overflow-x-auto">
        <button
          onClick={() => handleTabChange("PLAN")}
          className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
            activeTab === "PLAN"
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-200/80"
          }`}
        >
          <CalendarCheck className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Kế hoạch kiểm tra</span>
        </button>
        <button
          onClick={() => handleTabChange("ASSESSMENT")}
          className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold rounded-xl transition-all ${
            activeTab === "ASSESSMENT"
              ? "bg-amber-600 text-white shadow-xs"
              : "text-slate-600 hover:bg-slate-200/80"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4 shrink-0" />
          <span className="whitespace-nowrap">Báo cáo tự đánh giá</span>
        </button>
      </div>

      {/* Status Counters styled like Giám sát */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {statusCards.map((card) => {
          const isActive = statusFilter === card.key;
          return (
            <button
              key={card.key}
              onClick={() => {
                setStatusFilter(card.key);
                const params = new URLSearchParams();
                params.set("tab", activeTab);
                if (card.key !== "ALL") params.set("status", card.key);
                if (searchQuery) params.set("search", searchQuery);
                if (sortOption !== "updated_desc") params.set("sort", sortOption);
                params.set("page", "1");
                router.push(`/reports/safety?${params.toString()}`);
              }}
              className={`p-3.5 rounded-2xl border text-left transition-all ${card.bg} ${
                isActive
                  ? activeTab === "PLAN"
                    ? "border-blue-500 ring-2 ring-blue-500/25 shadow-xs"
                    : "border-amber-500 ring-2 ring-amber-500/25 shadow-xs"
                  : "border-slate-200/80 hover:border-slate-300"
              }`}
            >
              <div className={`text-xs font-semibold ${card.text}`}>{card.label}</div>
              <div className={`text-xl font-extrabold mt-1.5 ${card.numColor}`}>{card.count}</div>
            </button>
          );
        })}
      </div>

      {/* Unified Filter Bar matching Giám sát */}
      <ContentCard className="p-3.5 space-y-2.5">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo số hiệu, tuần hoặc người lập…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                className="w-full h-9.5 pl-10 pr-3 text-xs rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 bg-white"
              />
            </div>

            {/* Status Dropdown */}
            <div className="w-full sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9.5 px-3 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 bg-white text-slate-700"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="DRAFT">Bản nháp</option>
                <option value="PENDING_APPROVAL">Chờ duyệt</option>
                <option value="REVISION_REQUIRED">Yêu cầu chỉnh sửa</option>
                <option value="APPROVED">Đã duyệt</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="w-full sm:w-44">
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="w-full h-9.5 px-3 text-xs font-medium rounded-xl border border-slate-300 focus:outline-none focus:border-blue-500 bg-white text-slate-700"
              >
                <option value="updated_desc">Mới cập nhật</option>
                <option value="created_desc">Mới tạo</option>
                <option value="created_asc">Cũ nhất</option>
                <option value="week_desc">Tuần mới nhất</option>
                <option value="week_asc">Tuần cũ nhất</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={applyFilters}
              className="h-9.5 px-4 bg-blue-600 text-white hover:bg-blue-700 text-xs font-bold rounded-xl gap-1.5 shadow-xs"
            >
              <Filter className="h-3.5 w-3.5 text-white" />
              <span>Lọc</span>
            </Button>
            {(statusFilter !== "ALL" || searchQuery || sortOption !== "updated_desc") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setStatusFilter("ALL");
                  setSearchQuery("");
                  setSortOption("updated_desc");
                  router.push(`/reports/safety?tab=${activeTab}`);
                }}
                className="h-9.5 text-xs text-slate-600 border-slate-200 rounded-xl"
              >
                Xóa lọc
              </Button>
            )}
          </div>
        </div>

        {/* Dynamic Record Count Footer Line */}
        <div className="text-[11px] font-medium text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
          <span>
            Hiển thị <strong>{currentData.items.length}</strong> / <strong>{currentData.totalCount}</strong> hồ sơ
          </span>
        </div>
      </ContentCard>

      {/* Data Table */}
      <ContentCard className="overflow-hidden p-0 border border-slate-200/80 shadow-xs">
        {currentData.items.length === 0 ? (
          <div className="py-14 text-center">
            {activeTab === "PLAN" ? (
              <CalendarCheck className="h-10 w-10 text-slate-300 mx-auto mb-2.5" />
            ) : (
              <FileSpreadsheet className="h-10 w-10 text-slate-300 mx-auto mb-2.5" />
            )}
            <h3 className="text-sm font-semibold text-slate-800">
              Chưa có {activeTab === "PLAN" ? "kế hoạch" : "báo cáo"} nào
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Nhấn nút "{activeTab === "PLAN" ? "Tạo kế hoạch" : "Tạo báo cáo"}" để khởi tạo hồ sơ đầu tiên.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4 w-44">Mã / Số hiệu</th>
                    <th className="py-3.5 px-4 w-40">Tuần báo cáo</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Phạm vi kiểm tra</th>
                    <th className="py-3.5 px-4 w-36">Trạng thái</th>
                    <th className="py-3.5 px-4 w-44">Người lập & Cập nhật</th>
                    <th className="py-3.5 px-4 w-36">Nội dung</th>
                    <th className="py-3.5 px-4 w-36 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {currentData.items.map((row: any) => {
                    const st = STATUS_CONFIG[row.status] || STATUS_CONFIG.DRAFT;
                    const StatusIcon = st.icon;
                    const weekInfo = getWeekNumber(row.periodStart);
                    const isOwner = row.createdById === currentData.currentUserId;

                    const detailUrl =
                      activeTab === "PLAN"
                        ? `/reports/safety/plans/${row.id}`
                        : `/reports/safety/self-assessments/${row.id}`;
                    const previewUrl =
                      activeTab === "PLAN"
                        ? `/reports/safety/plans/${row.id}/preview`
                        : `/reports/safety/self-assessments/${row.id}/preview`;

                    const exportDocxUrl =
                      activeTab === "PLAN"
                        ? `/api/reports/safety/plans/${row.id}/export?format=docx`
                        : `/api/reports/safety/self-assessments/${row.id}/export?format=docx`;

                    const exportPdfUrl =
                      activeTab === "PLAN"
                        ? `/api/reports/safety/plans/${row.id}/export?format=pdf`
                        : `/api/reports/safety/self-assessments/${row.id}/export?format=pdf`;

                    const projectList = row.projects || [];
                    const projectCount = projectList.length;

                    // Action button label based on status
                    let primaryActionLabel = activeTab === "PLAN" ? "Chỉnh sửa" : "Xem hồ sơ";
                    let primaryActionClass = "bg-blue-600 text-white hover:bg-blue-700";
                    if (activeTab === "ASSESSMENT") {
                      if (row.status === "DRAFT" && isOwner) {
                        primaryActionLabel = "Tiếp tục soạn";
                        primaryActionClass = "bg-blue-600 text-white hover:bg-blue-700";
                      } else if (row.status === "REVISION_REQUIRED" && isOwner) {
                        primaryActionLabel = "Chỉnh sửa";
                        primaryActionClass = "bg-amber-600 text-white hover:bg-amber-700";
                      }
                    }

                    return (
                      <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Code / Number */}
                        <td className="py-3.5 px-4 font-bold text-slate-900">
                          {row.documentNumber || `(Nháp v${row.version})`}
                        </td>

                        {/* Week */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">
                            Tuần {weekInfo.week}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {formatPeriodDisplay(row.periodStart, row.periodEnd)}
                          </div>
                        </td>

                        {/* Scope / Projects */}
                        <td className="py-3.5 px-4 relative">
                          {projectCount === 0 ? (
                            <span className="text-slate-400 italic">Chưa chọn công trình</span>
                          ) : projectCount === 1 ? (
                            <div className="font-medium text-slate-800 truncate max-w-[240px]" title={projectList[0].name}>
                              {projectList[0].name}
                            </div>
                          ) : (
                            <div className="relative inline-block">
                              <button
                                onClick={() => setActivePopoverId(activePopoverId === row.id ? null : row.id)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200/80 hover:bg-blue-100 font-semibold transition-colors text-[11px]"
                              >
                                <Building2 className="h-3.5 w-3.5 text-blue-600" />
                                <span>{projectCount} công trình</span>
                              </button>

                              {/* Interactive Popover Listing All Projects */}
                              {activePopoverId === row.id && (
                                <div className="absolute left-0 top-8 z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl text-xs space-y-2 animate-in fade-in zoom-in-95">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                    <span className="font-bold text-slate-900">
                                      Danh sách công trình ({projectCount})
                                    </span>
                                    <button
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

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${st.bg} ${st.text} ${st.border}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            <span>{st.label}</span>
                          </span>
                        </td>

                        {/* Author & Updated (Merged Column) */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">
                            {row.createdBy?.name || "—"}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium">
                            {formatTimeAgo(row.updatedAt)}
                          </div>
                        </td>

                        {/* Content Summary */}
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            {activeTab === "PLAN"
                              ? `${row.entriesCount || 0} lịch kiểm tra`
                              : `${row.entriesCount || 0} dòng kết quả`}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              onClick={() => router.push(detailUrl)}
                              className={`h-7.5 text-xs font-bold px-3 rounded-lg ${primaryActionClass}`}
                            >
                              {primaryActionLabel}
                            </Button>

                            <div className="relative">
                              <button
                                onClick={() =>
                                  setActiveMenuId(activeMenuId === row.id ? null : row.id)
                                }
                                className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                                aria-label="Menu"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {activeMenuId === row.id && (
                                <div className="absolute right-0 top-8 z-40 w-44 rounded-xl border border-slate-200 bg-white p-1 shadow-lg text-xs space-y-0.5">
                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      router.push(detailUrl);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-slate-500" />
                                    <span>Xem hồ sơ</span>
                                  </button>

                                  {(activeTab === "PLAN" || (isOwner && ["DRAFT", "REVISION_REQUIRED"].includes(row.status))) && (
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        router.push(detailUrl);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left rounded-lg text-blue-700 hover:bg-blue-50 font-medium"
                                    >
                                      <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                                      <span>Sửa hồ sơ</span>
                                    </button>
                                  )}

                                  <button
                                    onClick={() => {
                                      setActiveMenuId(null);
                                      router.push(previewUrl);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
                                  >
                                    <Printer className="h-3.5 w-3.5 text-slate-500" />
                                    <span>Xem trước & In</span>
                                  </button>

                                  <a
                                    href={exportDocxUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => setActiveMenuId(null)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
                                  >
                                    <Download className="h-3.5 w-3.5 text-slate-500" />
                                    <span>Tải file Word</span>
                                  </a>

                                  <a
                                    href={exportPdfUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => setActiveMenuId(null)}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
                                  >
                                    <FileText className="h-3.5 w-3.5 text-slate-500" />
                                    <span>Tải file PDF</span>
                                  </a>

                                  {row.status === "REVISION_REQUIRED" && (
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setRevisionModalItem(row);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left rounded-lg text-rose-700 hover:bg-rose-50 font-medium"
                                    >
                                      <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                      <span>Xem lý do sửa</span>
                                    </button>
                                  )}

                                  {(activeTab === "PLAN" || (isOwner && ["DRAFT", "REVISION_REQUIRED"].includes(row.status))) && (
                                    <button
                                      onClick={() => {
                                        setActiveMenuId(null);
                                        setDeletingItem(row);
                                      }}
                                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left rounded-lg text-rose-600 hover:bg-rose-50 font-medium"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      <span>Xóa hồ sơ</span>
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

            {/* Mobile View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {currentData.items.map((row: any) => {
                const st = STATUS_CONFIG[row.status] || STATUS_CONFIG.DRAFT;
                const StatusIcon = st.icon;
                const weekInfo = getWeekNumber(row.periodStart);
                const isOwner = row.createdById === currentData.currentUserId;
                const projectList = row.projects || [];
                const projectCount = projectList.length;

                const detailUrl =
                  activeTab === "PLAN"
                    ? `/reports/safety/plans/${row.id}`
                    : `/reports/safety/self-assessments/${row.id}`;

                let primaryActionLabel = "Xem hồ sơ";
                if (row.status === "DRAFT" && isOwner) primaryActionLabel = "Tiếp tục soạn";
                else if (row.status === "REVISION_REQUIRED" && isOwner) primaryActionLabel = "Chỉnh sửa";

                return (
                  <div key={row.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 font-bold text-xs shrink-0">
                          T{weekInfo.week}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900">
                            {row.documentNumber || `Tuần ${weekInfo.week}`}
                          </div>
                          <div className="text-xs text-slate-500 font-medium">
                            {formatPeriodDisplay(row.periodStart, row.periodEnd)}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${st.bg} ${st.text} ${st.border}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        <span>{st.label}</span>
                      </span>
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span className="font-medium truncate">
                        {projectCount === 0
                          ? "Chưa chọn công trình"
                          : projectCount === 1
                          ? projectList[0].name
                          : `${projectCount} công trình`}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div className="text-slate-500">
                        <span>{row.createdBy?.name}</span> · <span>{formatTimeAgo(row.updatedAt)}</span>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => router.push(detailUrl)}
                        className="h-8 px-3 text-xs bg-blue-600 text-white hover:bg-blue-700 font-bold rounded-lg"
                      >
                        {primaryActionLabel}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {currentData.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-t border-slate-200 text-xs text-slate-600">
                <div>
                  Trang <strong>{currentData.page}</strong> / <strong>{currentData.totalPages}</strong>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentData.page <= 1}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set("page", String(currentData.page - 1));
                      router.push(`/reports/safety?${params.toString()}`);
                    }}
                    className="h-8 px-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={currentData.page >= currentData.totalPages}
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set("page", String(currentData.page + 1));
                      router.push(`/reports/safety?${params.toString()}`);
                    }}
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

      {/* Creation Modal with Full Official Title */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase leading-snug">
                  {activeTab === "PLAN"
                    ? "KẾ HOẠCH KIỂM TRA ATLĐ, PCCC, VSMT CÔNG TRÌNH"
                    : "BÁO CÁO TỰ ĐÁNH GIÁ KẾT QUẢ KIỂM TRA ATLĐ, PCCC, VSMT"}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Chọn ngày thuộc tuần cần tạo hồ sơ. Hệ thống sẽ tự động tổng hợp phạm vi tuần.
                </p>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
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

              {createWeekPreview && (
                <div className="rounded-xl bg-blue-50/70 p-3.5 border border-blue-100 text-xs text-blue-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-blue-800">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span>Phạm vi tuần báo cáo</span>
                  </div>
                  <div className="font-semibold text-sm text-blue-950">
                    Tuần {createWeekPreview.weekNum}/{createWeekPreview.year}
                  </div>
                  <div className="text-slate-600">
                    Từ {createWeekPreview.startStr} đến {createWeekPreview.endStr}
                  </div>
                </div>
              )}

              {checkingDuplicate && (
                <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200 text-xs text-slate-500 italic flex items-center gap-2">
                  <Clock className="h-4 w-4 animate-spin text-blue-500 shrink-0" />
                  <span>Đang kiểm tra hồ sơ tuần...</span>
                </div>
              )}

              {duplicateCheck && !checkingDuplicate && (
                <div className="space-y-3">
                  <div className="rounded-xl bg-amber-50 p-4 border border-amber-200 text-xs text-amber-900 space-y-3">
                    <div className="font-bold flex items-center gap-1.5 text-amber-800 text-sm">
                      <AlertTriangle className="h-4.5 w-4.5 text-amber-600 shrink-0" />
                      <span>Tuần này đã có một hồ sơ</span>
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      Tuần này đã tồn tại hồ sơ <strong>{duplicateCheck.reportNumber || "Đang soạn"}</strong>.
                    </p>
                    <div className="pt-1">
                      <Button
                        size="sm"
                        onClick={() => {
                          setCreateModalOpen(false);
                          const url =
                            activeTab === "PLAN"
                              ? `/reports/safety/plans/${duplicateCheck.id}`
                              : `/reports/safety/self-assessments/${duplicateCheck.id}`;
                          router.push(url);
                        }}
                        className="w-full h-9 text-xs font-semibold bg-amber-600 text-white hover:bg-amber-700 gap-1.5"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Mở hồ sơ hiện có
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                disabled={pending}
                className="h-9 text-xs"
              >
                Hủy
              </Button>
              {!duplicateCheck && (
                <Button
                  onClick={handleCreateDossier}
                  disabled={pending || checkingDuplicate || duplicateCheckError}
                  className="h-9 text-xs bg-blue-600 text-white hover:bg-blue-700 gap-1.5 font-bold"
                >
                  <CalendarPlus className="h-4 w-4" />
                  {pending ? "Đang tạo..." : activeTab === "PLAN" ? "Tạo kế hoạch" : "Tạo báo cáo"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revision Dialog */}
      {revisionModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <h3 className="text-base font-bold text-slate-900">Yêu cầu chỉnh sửa</h3>
              </div>
              <button
                onClick={() => setRevisionModalItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 text-xs space-y-2">
              <div className="p-3 bg-white rounded-lg border border-rose-200 text-slate-800 text-sm font-normal whitespace-pre-wrap">
                {revisionModalItem.revisionReason || "Chưa có nội dung chi tiết."}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRevisionModalItem(null)}>
                Đóng
              </Button>
              <Button
                onClick={() => {
                  const id = revisionModalItem.id;
                  setRevisionModalItem(null);
                  const url =
                    activeTab === "PLAN"
                      ? `/reports/safety/plans/${id}`
                      : `/reports/safety/self-assessments/${id}`;
                  router.push(url);
                }}
                className="bg-blue-600 text-white hover:bg-blue-700 gap-1.5 text-xs font-bold"
              >
                <Edit3 className="h-4 w-4" />
                Mở màn hình sửa
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      {deletingItem && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeletingItem(null)}
          title="Xác nhận xóa bản nháp"
          description={`Bạn có chắc chắn muốn xóa bản nháp ${
            deletingItem.documentNumber || "hồ sơ này"
          } không?`}
          confirmText="Xóa bản nháp"
          variant="danger"
          onConfirm={handleDeleteDossier}
          isLoading={pending}
        />
      )}
    </div>
  );
}
