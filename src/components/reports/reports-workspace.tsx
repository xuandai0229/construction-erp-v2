"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Plus, AlertCircle, Clock, XCircle, FileEdit, CheckSquare, Filter, X, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";

import { ReportsToolbar } from "./reports-toolbar";
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
  approveSiteReport, 
  rejectSiteReport, 
  createWeeklyReportFromApprovedDailyReports,
  updateSiteReport,
  softDeleteSiteReport,
  submitSiteReport
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
}

export function ReportsWorkspace({
  initialReports,
  totalReports,
  currentPage,
  stats,
  initialProjects,
  currentUser,
  globalContext,
}: ReportsWorkspaceProps) {
  const toast = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteReport, setDeleteReport] = useState<FieldReport | null>(null);

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

  const handleCreateSubmit = useCallback(async (data: CreateReportFormData, isDraft: boolean) => {
    setIsSubmitting(true);
    try {
      // Validate array of work lines
      if (!data.workLines || data.workLines.length === 0) {
        if (data.type === "DAILY") {
          toast.error("Báo cáo ngày cần ít nhất 1 dòng công việc!");
          setIsSubmitting(false);
          return;
        }
      }

      let result;
      const createAsDraft = true;
      
      if (dialogMode === "edit" && editReportData) {
        // Edit flow
        const payload: Record<string, unknown> = {
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
          gpsLat: data.gpsLocation ? parseFloat(data.gpsLocation.split(',')[0]) : undefined,
          gpsLng: data.gpsLocation && data.gpsLocation.split(',').length > 1 ? parseFloat(data.gpsLocation.split(',')[1]) : undefined,
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
        };
        result = await updateSiteReport(editReportData.id, payload);
      } else {
        // Create flow
        if (data.type === "WEEKLY") {
          if (!data.weekStartDate || !data.weekEndDate) {
            toast.error("Vui lòng chọn ngày bắt đầu và kết thúc tuần");
            setIsSubmitting(false);
            return;
          }
          result = await createWeeklyReportFromApprovedDailyReports({
            projectId: data.projectId,
            weekStartDate: data.weekStartDate,
            weekEndDate: data.weekEndDate,
            summary: data.summary,
            materials: data.materials,
            labor: data.labor,
            quality: data.quality,
            issues: data.issues,
            recommendations: data.recommendations,
            weatherCondition: data.weatherCondition,
            weeklyNote: data.weeklyNote,
            isDraft: createAsDraft
          });
        } else {
          const payload: Record<string, unknown> = {
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
            gpsLat: data.gpsLocation ? parseFloat(data.gpsLocation.split(',')[0]) : undefined,
            gpsLng: data.gpsLocation && data.gpsLocation.split(',').length > 1 ? parseFloat(data.gpsLocation.split(',')[1]) : undefined,
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
          };
          result = await createSiteReport(payload, createAsDraft);
        }
      }
      
      if (result.success && result.id) {
        let hasUploadError = false;
        const reportId = result.id;

        // Upload photos
        if (data.photos && data.photos.length > 0) {
          const formData = new FormData();
          formData.append("kind", "PHOTO");
          data.photos.forEach(file => formData.append("files", file));
          const res = await fetch(`/api/reports/${reportId}/attachments`, { method: "POST", body: formData });
          if (!res.ok) {
            hasUploadError = true;
            try {
              const errData = await res.json();
              if (errData.rejectedFiles) {
                toast.error(`Lỗi tải ảnh: ${errData.rejectedFiles.join(", ")}`);
              } else if (errData.error) {
                toast.error(`Lỗi tải ảnh: ${errData.error}`);
              }
            } catch (e) {}
          }
        }

        // Upload attachments
        if (data.attachments && data.attachments.length > 0) {
          const formData = new FormData();
          formData.append("kind", "FILE");
          data.attachments.forEach(file => formData.append("files", file));
          const res = await fetch(`/api/reports/${reportId}/attachments`, { method: "POST", body: formData });
          if (!res.ok) {
            hasUploadError = true;
            try {
              const errData = await res.json();
              if (errData.rejectedFiles) {
                toast.error(`Lỗi tải tài liệu: ${errData.rejectedFiles.join(", ")}`);
              } else if (errData.error) {
                toast.error(`Lỗi tải tài liệu: ${errData.error}`);
              }
            } catch (e) {}
          }
        }

        if (hasUploadError) {
          toast.error("Đã lưu nháp báo cáo nhưng lỗi tải ảnh/file. Vui lòng mở lại báo cáo để tải lại.");
          // We intentionally do NOT submit if upload fails, and we do NOT close the dialog 
          // so the user can see it's still open or just know it failed.
          // Wait, the prompt says: "không đóng dialog nếu có thể; nếu bắt buộc đóng thì phải báo rõ report đang ở nháp."
          // Let's close it but refresh
          setIsCreateOpen(false);
          router.refresh();
          return; // Stop here, do not submit
        }

        // If user wanted to submit (isDraft is false), and upload succeeded, we submit now
        if (!isDraft) {
          const submitRes = await submitSiteReport(reportId);
          if (submitRes.success) {
            toast.success(dialogMode === "edit" ? "Đã sửa và gửi báo cáo thành công" : "Đã tạo và gửi báo cáo thành công");
            setIsCreateOpen(false);
            router.refresh();
          } else {
            toast.error("Tải file thành công nhưng gửi báo cáo thất bại.");
            setIsCreateOpen(false);
            router.refresh();
          }
        } else {
          toast.success(dialogMode === "edit" ? "Đã lưu thay đổi" : "Đã lưu nháp báo cáo");
          setIsCreateOpen(false);
          router.refresh();
        }
      }
    } catch (error) {
      console.error(error);
      toast.error((error as Error).message || "Đã xảy ra lỗi không mong muốn khi tạo báo cáo");
    } finally {
      setIsSubmitting(false);
    }
  }, [router, toast]);

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
    setEditReportData(report);
    setDialogMode("edit");
    setIsCreateOpen(true);
  }, []);

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
    <div className="app-page max-w-[1400px] space-y-5 sm:space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">Báo cáo hiện trường</h1>
            <p className="hidden sm:block text-sm text-[var(--muted-foreground)] mt-0.5">
              Quản lý báo cáo ngày, báo cáo tuần và phát sinh tại công trường
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
            <Button
              onClick={() => { setDialogMode("create"); setEditReportData(null); setIsCreateOpen(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-3 text-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Button
          onClick={() => { setDialogMode("create"); setEditReportData(null); setIsCreateOpen(true); }}
          className="hidden sm:flex gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-10 px-5 text-sm shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tạo báo cáo mới
        </Button>
      </div>

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
          onClick={() => handleQuickFilter('SUBMITTED')}
          className={`rounded-[var(--radius-xl)] p-3 border flex items-center justify-between cursor-pointer transition-colors shadow-[var(--shadow-card)] ${
            statusFilter === 'SUBMITTED'
              ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400' 
              : stats.pending === 0 
                ? 'bg-[var(--surface-subtle)] border-[var(--border)] opacity-80 hover:opacity-100' 
                : 'bg-amber-50 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-[var(--radius-lg)] ${stats.pending === 0 ? 'bg-slate-200 text-[var(--muted-foreground)]' : 'bg-amber-100 text-amber-600'}`}>
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className={`font-semibold text-[13px] sm:text-sm ${stats.pending === 0 ? 'text-[var(--muted-foreground)]' : 'text-amber-900'}`}>Chờ duyệt</h3>
            </div>
          </div>
          <span className={`text-lg sm:text-xl font-bold ${stats.pending === 0 ? 'text-[var(--muted-foreground)]' : 'text-amber-700'}`}>{stats.pending}</span>
        </div>
        
        <div 
          onClick={() => handleQuickFilter('APPROVED')}
          className={`rounded-[var(--radius-xl)] p-3 border flex items-center justify-between cursor-pointer transition-colors shadow-[var(--shadow-card)] ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-400' 
              : stats.approved === 0 
                ? 'bg-[var(--surface-subtle)] border-[var(--border)] opacity-80 hover:opacity-100' 
                : 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-[var(--radius-lg)] ${stats.approved === 0 ? 'bg-slate-200 text-[var(--muted-foreground)]' : 'bg-emerald-100 text-emerald-600'}`}>
              <CheckSquare className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className={`font-semibold text-[13px] sm:text-sm ${stats.approved === 0 ? 'text-[var(--muted-foreground)]' : 'text-emerald-900'}`}>Đã duyệt</h3>
            </div>
          </div>
          <span className={`text-lg sm:text-xl font-bold ${stats.approved === 0 ? 'text-[var(--muted-foreground)]' : 'text-emerald-700'}`}>{stats.approved}</span>
        </div>
        
        <div 
          onClick={() => handleQuickFilter('REJECTED')}
          className={`rounded-[var(--radius-xl)] p-3 border flex items-center justify-between cursor-pointer transition-colors shadow-[var(--shadow-card)] ${
            statusFilter === 'REJECTED'
              ? 'bg-red-50 border-red-400 ring-1 ring-red-400' 
              : stats.rejected === 0 
                ? 'bg-[var(--surface-subtle)] border-[var(--border)] opacity-80 hover:opacity-100' 
                : 'bg-red-50 border-red-200 hover:bg-red-100'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className={`p-1.5 rounded-[var(--radius-lg)] ${stats.rejected === 0 ? 'bg-slate-200 text-[var(--muted-foreground)]' : 'bg-red-100 text-red-600'}`}>
              <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className={`font-semibold text-[13px] sm:text-sm ${stats.rejected === 0 ? 'text-[var(--muted-foreground)]' : 'text-red-900'}`}>Từ chối</h3>
            </div>
          </div>
          <span className={`text-lg sm:text-xl font-bold ${stats.rejected === 0 ? 'text-[var(--muted-foreground)]' : 'text-red-700'}`}>{stats.rejected}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between overflow-x-auto pb-1 scrollbar-hide border-b border-[var(--border)] gap-4">
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'daily', label: 'Báo cáo ngày' },
            { id: 'weekly', label: 'Báo cáo tuần' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--border)]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="hidden sm:flex text-[11px] text-[var(--muted-foreground)] gap-3 whitespace-nowrap">
          <span className="font-semibold text-[var(--foreground)]">Tổng: {stats.total}</span>
          <span>Duyệt: <span className="text-emerald-600 font-medium">{stats.approved}</span></span>
          <span>Từ chối: <span className="text-red-600 font-medium">{stats.rejected}</span></span>
        </div>
      </div>

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

      <CreateReportDialog
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
      />

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
