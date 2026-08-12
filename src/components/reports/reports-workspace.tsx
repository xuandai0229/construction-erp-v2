"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Plus, Clock, XCircle, CheckSquare, Filter, FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";

import { ReportsToolbar } from "./reports-toolbar";
import { WeeklyCompanySummaryTrigger } from "./weekly-company-summary-trigger";
import { ReportsTable } from "./reports-table";
import { ReportsMobileCards } from "./reports-mobile-cards";
import { CreateReportDialog } from "./create-report-dialog";
import { ReportDetailDrawer } from "./report-detail-drawer";
import { SiteReportGalleryDialog } from "./site-report-gallery-dialog";
import { ReportPrintPreviewDialog } from "./report-print-preview-dialog";
import {
  type FieldReport,
  type CreateReportFormData,
  type ReportPhoto,
  type ReportStats,
} from "./types";
import { 
  createSiteReport, 
  createWeeklyReportFromApprovedDailyReports,
  updateSiteReport,
  softDeleteSiteReport,
  approveSiteReport,
  rejectSiteReport,
  submitSiteReport,
} from "@/app/(dashboard)/reports/actions";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { setProjectContextCookie } from "@/app/actions/project-context";

interface ReportsWorkspaceProps {
  initialReports: FieldReport[];
  totalReports: number;
  currentPage: number;
  stats: ReportStats;
  initialProjects: { id: string; name: string }[];
  currentUser: { id: string; name: string; role?: string };
  globalContext?: { selectedProjectId: string | null };
  hideHeader?: boolean;
  canAggregateCompanyWeekly?: boolean;
  weeklySummaryWeekStart?: string;
}

export function ReportsWorkspace({
  initialReports,
  totalReports,
  currentPage,
  stats,
  initialProjects,
  currentUser,
  globalContext,
  hideHeader = false,
  canAggregateCompanyWeekly = false,
  weeklySummaryWeekStart,
}: ReportsWorkspaceProps) {
  const sourceReadOnly = currentUser.role === "CONSTRUCTION_SUPERVISOR" || !["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR", "CHIEF_COMMANDER", "MANAGER", "ENGINEER"].includes(currentUser.role || "");
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteReport, setDeleteReport] = useState<FieldReport | null>(null);
  const [uploadRetry, setUploadRetry] = useState<{
    reportId: string;
    photos: File[];
    attachments: File[];
  } | null>(null);

  // Filter state synced with URL
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [projectFilter, setProjectFilter] = useState(searchParams.get("projectId") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("type") || "");
  const [dateRange, setDateRange] = useState(searchParams.get("dateRange") || "");
  const [tab, setTab] = useState(searchParams.get("tab") || "all");
  
  // Mobile filter toggle
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  
  // Dialog/drawer state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [editReportData, setEditReportData] = useState<FieldReport | null>(null);
  
  const [detailReport, setDetailReport] = useState<FieldReport | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [galleryPhotos, setGalleryPhotos] = useState<ReportPhoto[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [printPreviewReport, setPrintPreviewReport] = useState<FieldReport | null>(null);

  const reports = initialReports;
  const activeProjects = initialProjects;

  const updateUrl = useCallback((newParams: Record<string, string | undefined>) => {
    const current = new URLSearchParams(searchParams.toString());
    let changed = false;
    for (const [key, value] of Object.entries(newParams)) {
      if (value) {
        if (current.get(key) !== value) {
          current.set(key, value);
          changed = true;
        }
      } else {
        if (current.has(key)) {
          current.delete(key);
          changed = true;
        }
      }
    }
    if (changed) {
      const query = current.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [pathname, router, searchParams]);

  useEffect(() => {
    setSearch(searchParams.get("q") || "");
    setProjectFilter(searchParams.get("projectId") || "");
    setStatusFilter(searchParams.get("status") || "");
    setTypeFilter(searchParams.get("type") || "");
    setDateRange(searchParams.get("dateRange") || "");
    setTab(searchParams.get("tab") || "all");
  }, [searchParamsKey]);

  // Auto-open report detail if reportId is in URL
  useEffect(() => {
    const reportIdParam = searchParams.get("reportId");
    if (!reportIdParam) {
      setIsDetailOpen(false);
      setTimeout(() => setDetailReport(null), 300);
      return;
    }

    if (initialReports.length > 0) {
      const found = initialReports.find(r => r.id === reportIdParam);
      if (found) {
        setDetailReport(found);
        setIsDetailOpen(true);
      }
    }
  }, [searchParams, searchParamsKey, initialReports]);

  // Local Search syncs to URL on blur/enter or via effect (handled by toolbar usually, but we do it simple here)
  const handleSearchChange = (v: string) => {
    setSearch(v);
    updateUrl({ q: v, page: "1" });
  };
  const handleProjectFilterChange = async (v: string) => {
    setProjectFilter(v);
    updateUrl({ projectId: v, page: "1" });
    await setProjectContextCookie(v);
    router.refresh();
  };
  const handleStatusFilterChange = (v: string) => {
    setStatusFilter(v);
    updateUrl({ status: v, page: "1" });
  };
  const handleTypeFilterChange = (v: string) => {
    setTypeFilter(v);
    updateUrl({ type: v, page: "1" });
  };
  const handleDateRangeChange = (v: string) => {
    setDateRange(v);
    updateUrl({ dateRange: v, page: "1" });
  };
  const handleTabChange = (t: string) => {
    setTab(t);
    updateUrl({ tab: t === 'all' ? undefined : t, status: undefined, type: undefined, page: "1" });
    setStatusFilter("");
    setTypeFilter("");
  };

  
  const handleQuickFilter = (status: string) => {
    setTab("all");
    setStatusFilter(status);
    updateUrl({ tab: undefined, status: status || undefined, type: undefined, page: "1" });
  };

  const handlePageChange = (p: number) => {
    updateUrl({ page: p.toString() });
  };
  
  const activeTab = ['daily', 'weekly'].includes(tab) ? tab : 'all';

    
  

  // Handlers
  const handleViewDetail = useCallback((report: FieldReport) => {
    setDetailReport(report);
    setIsDetailOpen(true);
    updateUrl({ reportId: report.id });
  }, [updateUrl]);

  const handlePrintPreview = useCallback((report: FieldReport) => {
    setPrintPreviewReport(report);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
    
    if (searchParams.has("reportId")) {
      const current = new URLSearchParams(searchParams.toString());
      current.delete("reportId");
      const search = current.toString();
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    }

    setTimeout(() => setDetailReport(null), 300);
  }, [pathname, router, searchParams]);

  const handleResetFilters = () => {
    setSearch("");
    setProjectFilter("");
    setStatusFilter("");
    setTypeFilter("");
    setDateRange("");
    setTab("all");
    router.push(pathname);
  };

  const uploadFiles = useCallback(async (reportId: string, kind: "PHOTO" | "FILE", files: File[]) => {
    const failed: File[] = [];
    const reasons: string[] = [];
    for (const file of files) {
      const formData = new FormData();
      formData.append("kind", kind);
      formData.append("files", file);
      try {
        const response = await fetch(`/api/reports/${reportId}/attachments`, { method: "POST", body: formData });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || body.rejectedFiles?.length) {
          failed.push(file);
          reasons.push(`${file.name}: ${body.rejectedFiles?.join(", ") || body.error || "không tải được"}`);
        }
      } catch {
        failed.push(file);
        reasons.push(`${file.name}: lỗi kết nối`);
      }
    }
    return { failed, reasons };
  }, []);

  const deleteAttachments = useCallback(async (reportId: string, ids: string[]) => {
    const failed: string[] = [];
    for (const attachmentId of ids) {
      const response = await fetch(`/api/reports/${reportId}/attachments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attachmentId }),
      });
      if (!response.ok) failed.push(attachmentId);
    }
    return failed;
  }, []);

  const handleCreateSubmit = useCallback(async (data: CreateReportFormData) => {
    setIsSubmitting(true);
    try {
      if (uploadRetry) {
        const photoResult = await uploadFiles(uploadRetry.reportId, "PHOTO", uploadRetry.photos);
        const fileResult = await uploadFiles(uploadRetry.reportId, "FILE", uploadRetry.attachments);
        const failed = [...photoResult.failed, ...fileResult.failed];
        const reasons = [...photoResult.reasons, ...fileResult.reasons];
        if (failed.length > 0) {
          setUploadRetry({ reportId: uploadRetry.reportId, photos: photoResult.failed, attachments: fileResult.failed });
          toast.error("Báo cáo đã lưu nhưng vẫn còn tệp chưa tải lên được.");
          if (reasons.length) console.warn("Field report attachment retry:", reasons);
          return;
        }
        setUploadRetry(null);
        toast.success("Đã tải lại tệp thành công");
        setIsCreateOpen(false);
        router.refresh();
        return;
      }

      let result: any;
      const createAsDraft = true;
      if (dialogMode === "edit" && editReportData) {
        result = await updateSiteReport(editReportData.id, {
          date: data.date,
          time: data.time,
          weatherCondition: data.weatherCondition,
          weatherTemperature: data.weatherTemperature,
          summary: data.summary,
          materials: data.materials,
          labor: data.labor,
          quality: data.quality,
          issues: data.issues,
          recommendations: data.recommendations,
          gpsLat: data.gpsLocation ? parseFloat(data.gpsLocation.split(",")[0]) : undefined,
          gpsLng: data.gpsLocation && data.gpsLocation.split(",").length > 1 ? parseFloat(data.gpsLocation.split(",")[1]) : undefined,
          workLines: data.workLines.map(wl => ({
            fieldProgressItemId: wl.fieldProgressItemId || wl.wbsItemId,
            wbsItemId: wl.wbsItemId,
            workContent: wl.workContent,
            quantityToday: wl.quantityToday,
            unit: wl.unit,
            designQuantity: wl.designQuantity,
            quantityBefore: wl.quantityBefore ?? wl.approvedCumulative,
            quantityCumulative: wl.quantityCumulative,
            progressPercent: wl.progressPercent,
            note: wl.note,
            issueNote: wl.issueNote,
            proposalNote: wl.proposalNote,
          })),
          weeklyNote: data.weeklyNote,
        });
      } else if (data.type === "WEEKLY") {
        result = await createWeeklyReportFromApprovedDailyReports({
          projectId: data.projectId,
          weekStartDate: data.weekStartDate!,
          weekEndDate: data.weekEndDate!,
          summary: data.summary,
          materials: data.materials,
          labor: data.labor,
          quality: data.quality,
          issues: data.issues,
          recommendations: data.recommendations,
          weatherCondition: data.weatherCondition,
          weeklyNote: data.weeklyNote,
          isDraft: createAsDraft,
        });
      } else {
        result = await createSiteReport({
          projectId: data.projectId,
          type: data.type,
          date: data.date,
          time: data.time,
          weatherCondition: data.weatherCondition,
          weatherTemperature: data.weatherTemperature,
          summary: data.summary,
          materials: data.materials,
          labor: data.labor,
          quality: data.quality,
          issues: data.issues,
          recommendations: data.recommendations,
          gpsLat: data.gpsLocation ? parseFloat(data.gpsLocation.split(",")[0]) : undefined,
          gpsLng: data.gpsLocation && data.gpsLocation.split(",").length > 1 ? parseFloat(data.gpsLocation.split(",")[1]) : undefined,
          workLines: data.workLines.map(wl => ({
            fieldProgressItemId: wl.fieldProgressItemId || wl.wbsItemId,
            wbsItemId: wl.wbsItemId,
            workContent: wl.workContent,
            quantityToday: wl.quantityToday,
            unit: wl.unit,
            designQuantity: wl.designQuantity,
            quantityBefore: wl.quantityBefore ?? wl.approvedCumulative,
            quantityCumulative: wl.quantityCumulative,
            progressPercent: wl.progressPercent,
            note: wl.note,
            issueNote: wl.issueNote,
            proposalNote: wl.proposalNote,
          })),
        }, createAsDraft);
      }

      if (result?.code === "WEEKLY_REPORT_ALREADY_EXISTS") {
        toast.error("Báo cáo tuần này đã tồn tại. Bạn có thể mở báo cáo đã có.");
        setIsCreateOpen(false);
        router.push(`${pathname}?reportId=${encodeURIComponent(result.existingReportId)}`, { scroll: false });
        return;
      }
      if (!result?.success || !result.id) {
        toast.error("Không thể lưu báo cáo: kết quả không hợp lệ.");
        return;
      }

      const reportId = result.id;
      const photoResult = await uploadFiles(reportId, "PHOTO", data.photos || []);
      const fileResult = await uploadFiles(reportId, "FILE", data.attachments || []);
      const failed = [...photoResult.failed, ...fileResult.failed];
      const reasons = [...photoResult.reasons, ...fileResult.reasons];
      const deleteFailures = await deleteAttachments(reportId, data.attachmentIdsToDelete || []);

      if (failed.length > 0) {
        setUploadRetry({ reportId, photos: photoResult.failed, attachments: fileResult.failed });
        toast.error("Báo cáo đã được lưu nhưng có ảnh/tệp chưa tải lên được. Bấm Lưu để thử lại.");
        if (reasons.length) console.warn("Field report attachment upload:", reasons);
        router.refresh();
        return;
      }
      if (deleteFailures.length > 0) {
        toast.error("Báo cáo đã lưu nhưng một số tệp cũ chưa xóa được. Vui lòng thử lại.");
      } else {
        toast.success(dialogMode === "edit" ? "Đã lưu thay đổi" : "Đã lưu báo cáo");
      }
      setIsCreateOpen(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(`Không thể lưu báo cáo: ${(error as Error).message || "lỗi không xác định"}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [dialogMode, editReportData, pathname, router, toast, uploadFiles, deleteAttachments, uploadRetry]);

  const handleApprove = useCallback(async (reportId: string, note?: string) => {
    try {
      const res = await approveSiteReport(reportId, note);
      if (res.success) {
        toast.success("Đã duyệt báo cáo");
        setIsDetailOpen(false);
        router.refresh();
      }
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || "Lỗi khi duyệt báo cáo");
    }
  }, [router, toast]);

  const handleReject = useCallback(async (reportId: string, reason: string) => {
    try {
      const res = await rejectSiteReport(reportId, reason);
      if (res.success) {
        toast.success("Đã từ chối báo cáo");
        setIsDetailOpen(false);
        router.refresh();
      }
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || "Lỗi khi từ chối báo cáo");
    }
  }, [router, toast]);

  const handleSubmit = useCallback(async (reportId: string) => {
    try {
      const res = await submitSiteReport(reportId);
      if (res.success) {
        toast.success("Đã gửi báo cáo thành công");
        setIsDetailOpen(false);
        router.refresh();
      }
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || "Lỗi khi gửi báo cáo");
    }
  }, [router, toast]);

  const handleEdit = useCallback((report: FieldReport) => {
    setUploadRetry(null);
    router.push(`/reports/field/${report.id}/edit`);
  }, [router]);

  const handleDelete = useCallback((report: FieldReport) => {
    setDeleteReport(report);
  }, []);

  const confirmDeleteReport = useCallback(async () => {
    if (!deleteReport) return;
    setIsSubmitting(true);
    try {
      const res = await softDeleteSiteReport(deleteReport.id);
      if (res.success) {
        toast.success("Đã xóa báo cáo");
        setDeleteReport(null);
        setIsDetailOpen(false);
        router.refresh();
      }
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || "Lỗi khi xóa báo cáo");
    } finally {
      setIsSubmitting(false);
    }
  }, [deleteReport, router, toast]);

  return (
    <div className="space-y-5 sm:space-y-6">
      {sourceReadOnly && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900" role="status">
          Chế độ giám sát — Chỉ xem
        </div>
      )}
      {/* Page header */}
      {!hideHeader ? (
        <div className="space-y-3">
          <Link
            href="/reports"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Báo cáo</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Báo cáo Chỉ huy trưởng</h1>
                <p className="hidden sm:block text-sm text-[var(--muted-foreground)] mt-0.5">
                  Quản lý nhật ký ngày, tổng hợp hiện trường tuần, phát sinh và sự cố tại công trường
                  {globalContext?.selectedProjectId && (
                    <span className="ml-2 inline-flex items-center rounded-[var(--radius-md)] bg-[var(--border)] px-2 py-0.5 text-xs font-medium text-[var(--muted-foreground)] ring-1 ring-inset ring-slate-200">
                      {activeProjects.find(p => p.id === globalContext.selectedProjectId)?.name || 'Công trình đang chọn'}
                    </span>
                  )}
                  {searchParams.get("reportId") && (
                    <span className="ml-2 inline-flex items-center rounded-[var(--radius-md)] bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      Đang lọc 1 báo cáo
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:hidden">
                <Button
                  variant="outline"
                  onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
                  className="h-9 px-3 gap-1.5 text-xs"
                >
                  <Filter className="w-4 h-4" />
                  Bộ lọc
                </Button>
                {!sourceReadOnly && <Button
                  onClick={() => router.push("/reports/field/new")}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-3 text-sm shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </Button>}
              </div>
            </div>
            {!sourceReadOnly && <Button
              onClick={() => router.push("/reports/field/new")}
              className="hidden sm:flex gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-10 px-5 text-sm shrink-0 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              Tạo báo cáo mới
            </Button>}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between pb-2">
          <div className="text-xs font-medium text-slate-500">
            Nhật ký ngày, tổng hợp hiện trường tuần, phát sinh và sự cố công trình
          </div>
          {!sourceReadOnly && <Button
            onClick={() => router.push("/reports/field/new")}
            className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-10 px-4 text-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo báo cáo mới</span>
          </Button>}
        </div>
      )}

      {/* Dashboard / Action Center */}
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-2">
        <div 
          onClick={() => handleQuickFilter('')}
          className={`rounded-[var(--radius-xl)] p-3 border flex items-center justify-between cursor-pointer transition-colors shadow-[var(--shadow-card)] ${
            !statusFilter && tab === 'all'
              ? 'bg-blue-50/50 border-blue-400 ring-1 ring-blue-400' 
              : 'bg-[var(--surface)] border-[var(--border)] hover:bg-[var(--surface-subtle)]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-[var(--radius-lg)] bg-blue-50 text-blue-600">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-[13px] sm:text-sm text-[var(--foreground)]">Tổng báo cáo</h3>
            </div>
          </div>
          <span className="text-lg sm:text-xl font-bold text-[var(--foreground)]">{stats.total}</span>
        </div>

        <div 
          onClick={() => handleQuickFilter('ISSUE')}
          className={`rounded-[var(--radius-xl)] p-3 border flex items-center justify-between cursor-pointer transition-colors shadow-[var(--shadow-card)] ${
            statusFilter === 'ISSUE'
              ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400' 
              : stats.issues === 0
                ? 'bg-[var(--surface-subtle)] border-[var(--border)] opacity-80 hover:opacity-100' 
                : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-[var(--radius-lg)] ${stats.issues === 0 ? 'bg-slate-200 text-[var(--muted-foreground)]' : 'bg-amber-100 text-amber-600'}`}>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className={`font-semibold text-[13px] sm:text-sm ${stats.issues === 0 ? 'text-[var(--muted-foreground)]' : 'text-amber-900'}`}>Có phát sinh</h3>
            </div>
          </div>
          <span className={`text-lg sm:text-xl font-bold ${stats.issues === 0 ? 'text-[var(--muted-foreground)]' : 'text-amber-700'}`}>{stats.issues}</span>
        </div>
        
        <div 
          onClick={() => handleQuickFilter('ISSUE')}
          className={`rounded-[var(--radius-xl)] p-3 border flex items-center justify-between cursor-pointer transition-colors shadow-[var(--shadow-card)] ${
            statusFilter === 'ISSUE'
              ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400' 
              : stats.needsAction === 0
                ? 'bg-[var(--surface-subtle)] border-[var(--border)] opacity-80 hover:opacity-100' 
                : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-[var(--radius-lg)] ${stats.needsAction === 0 ? 'bg-slate-200 text-[var(--muted-foreground)]' : 'bg-emerald-100 text-emerald-600'}`}>
              <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className={`font-semibold text-[13px] sm:text-sm ${stats.needsAction === 0 ? 'text-[var(--muted-foreground)]' : 'text-emerald-900'}`}>Cần xử lý</h3>
            </div>
          </div>
          <span className={`text-lg sm:text-xl font-bold ${stats.needsAction === 0 ? 'text-[var(--muted-foreground)]' : 'text-emerald-700'}`}>{stats.needsAction}</span>
        </div>
        
        <div 
          onClick={() => handleQuickFilter('ISSUE')}
          className={`rounded-[var(--radius-xl)] p-3 border flex items-center justify-between cursor-pointer transition-colors shadow-[var(--shadow-card)] ${
            statusFilter === 'ISSUE'
              ? 'bg-red-50 border-red-400 ring-1 ring-red-400' 
              : stats.urgent === 0
                ? 'bg-[var(--surface-subtle)] border-[var(--border)] opacity-80 hover:opacity-100' 
                : 'bg-red-50 border-red-200 hover:bg-red-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-[var(--radius-lg)] ${stats.urgent === 0 ? 'bg-slate-200 text-[var(--muted-foreground)]' : 'bg-red-100 text-red-600'}`}>
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className={`font-semibold text-[13px] sm:text-sm ${stats.urgent === 0 ? 'text-[var(--muted-foreground)]' : 'text-red-900'}`}>Khẩn cấp</h3>
            </div>
          </div>
          <span className={`text-lg sm:text-xl font-bold ${stats.urgent === 0 ? 'text-[var(--muted-foreground)]' : 'text-red-700'}`}>{stats.urgent}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between overflow-x-auto pb-1 scrollbar-hide border-b border-[var(--border)] gap-4">
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'daily', label: 'Nhật ký ngày' },
            { id: 'weekly', label: 'Tổng hợp hiện trường tuần' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-blue-600 text-blue-600 font-semibold'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="hidden sm:flex text-[11px] text-[var(--muted-foreground)] gap-3 whitespace-nowrap">
          <span className="font-semibold text-[var(--foreground)]">Tổng: {stats.total}</span>
          <span>Phát sinh: <span className="text-amber-600 font-medium">{stats.issues}</span></span>
          <span>Khẩn cấp: <span className="text-red-600 font-medium">{stats.urgent}</span></span>
        </div>
      </div>

      {activeTab === "weekly" && canAggregateCompanyWeekly && weeklySummaryWeekStart ? (
        <div className="flex justify-end pt-1">
          <WeeklyCompanySummaryTrigger weekStartDate={weeklySummaryWeekStart} />
        </div>
      ) : null}

      {/* Toolbar */}
      <div className={`${isMobileFilterOpen ? 'block' : 'hidden'} sm:block sticky top-16 z-30 -mx-1 px-1 py-2 bg-[var(--surface-subtle)] backdrop-blur supports-[backdrop-filter]:bg-[var(--surface-subtle)]`}>
        <ReportsToolbar
          search={search}
          onSearchChange={handleSearchChange}
          projectFilter={projectFilter}
          onProjectFilterChange={handleProjectFilterChange}
          statusFilter={tab === 'pending' ? 'SUBMITTED' : tab === 'rejected' ? 'REJECTED' : tab === 'revision' ? 'REVISION_REQUESTED' : statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          typeFilter={tab === 'daily' ? 'DAILY' : tab === 'weekly' ? 'WEEKLY' : typeFilter}
          onTypeFilterChange={handleTypeFilterChange}
          dateRange={dateRange}
          onDateRangeChange={handleDateRangeChange}
          projects={activeProjects}
          onResetFilters={handleResetFilters}
          hasActiveFilters={!!(search || projectFilter || statusFilter || typeFilter || dateRange || tab !== 'all')}
          tab={tab}
        />
      </div>

      <div className="hidden md:block">
        <ReportsTable
          reports={reports}
          onViewDetail={handleViewDetail}
          onViewGallery={(r) => { setGalleryPhotos(r.photos); setIsGalleryOpen(true); }}
          onPrintPreview={handlePrintPreview}
          onEdit={handleEdit}
          onDelete={handleDelete}
          totalReports={totalReports}
          page={currentPage}
          pageSize={10}
          onPageChange={handlePageChange}
          showProjectColumn={!projectFilter && activeProjects.length > 1}
          currentUser={currentUser}
        />
      </div>

      {/* Mobile cards (hidden on md+) */}
      <div className="block md:hidden">
        {reports.length > 0 ? (
          <ReportsMobileCards
            reports={reports}
            onViewDetail={handleViewDetail}
            onViewGallery={(r) => { setGalleryPhotos(r.photos); setIsGalleryOpen(true); }}
            onEdit={handleEdit}
            onDelete={handleDelete}
            currentUser={currentUser}
          />
        ) : (
          <EmptyState
            title="Không tìm thấy báo cáo"
            description="Thử đặt lại bộ lọc hoặc tạo báo cáo mới."
            className="min-h-[240px]"
          />
        )}
      </div>

      {!sourceReadOnly && <CreateReportDialog
        key={isCreateOpen ? "open" : "closed"} // Ensure remount to pick up initialReport if any
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        isSubmitting={isSubmitting}
        activeProjects={activeProjects}
        currentUser={currentUser}
        mode={dialogMode}
        initialReport={editReportData}
        currentProjectId={projectFilter || globalContext?.selectedProjectId || undefined}
        uploadRetryMessage={uploadRetry ? "Báo cáo đã lưu; còn tệp chưa tải lên. Bấm Lưu để thử lại." : null}
      />}

      {/* Report Detail Drawer */}
      <ReportDetailDrawer
        report={detailReport}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        onApprove={handleApprove}
        onReject={handleReject}
        onSubmit={handleSubmit}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onPrintPreview={handlePrintPreview}
        onViewGallery={(r, index) => { setGalleryPhotos(r.photos); setGalleryIndex(index || 0); setIsGalleryOpen(true); }}
        currentUser={currentUser}
      />

      {/* Gallery Dialog */}
      <SiteReportGalleryDialog
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        photos={galleryPhotos}
        initialIndex={galleryIndex}
      />

      <ConfirmDialog
        isOpen={Boolean(deleteReport)}
        onClose={() => setDeleteReport(null)}
        title="Xóa báo cáo?"
        description={
          <>
            Báo cáo <strong className="text-[var(--foreground)]">{deleteReport?.reportNo}</strong> sẽ
            được ẩn khỏi danh sách. Dữ liệu vẫn được lưu trong hệ thống để truy vết.
          </>
        }
        variant="danger"
        confirmText="Xóa báo cáo"
        onConfirm={confirmDeleteReport}
        isLoading={isSubmitting}
      />

      <ReportPrintPreviewDialog
        isOpen={Boolean(printPreviewReport)}
        onClose={() => setPrintPreviewReport(null)}
        report={printPreviewReport}
      />
    </div>
  );
}
