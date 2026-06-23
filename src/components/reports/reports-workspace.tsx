"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus, AlertCircle, Clock, XCircle, FileEdit, CheckSquare, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-context";

import { ReportsStats } from "./reports-stats";
import { ReportsToolbar } from "./reports-toolbar";
import { ReportsTable } from "./reports-table";
import { ReportsMobileCards } from "./reports-mobile-cards";
import { CreateReportDialog } from "./create-report-dialog";
import { ReportDetailDrawer } from "./report-detail-drawer";
import { SiteReportGalleryDialog } from "./site-report-gallery-dialog";
import {
  computeStats,
  type FieldReport,
  type CreateReportFormData,
  type ReportPhoto,
} from "./types";
import { 
  createSiteReport, 
  approveSiteReport, 
  rejectSiteReport, 
  submitSiteReport,
  createWeeklyReportFromApprovedDailyReports 
} from "@/app/(dashboard)/reports/actions";
import { useRouter } from "next/navigation";

interface ReportsWorkspaceProps {
  initialReports: FieldReport[];
  totalReports: number;
  currentPage: number;
  allReportsForStats: Record<string, unknown>[];
  initialProjects: { id: string; name: string }[];
  currentUser: { id: string; name: string; role?: string };
}

export function ReportsWorkspace({
  initialReports,
  totalReports,
  currentPage,
  allReportsForStats,
  initialProjects,
  currentUser,
}: ReportsWorkspaceProps) {
  const toast = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use searchParams from URL or use local state synced with URL
  // But wait, Next.js useSearchParams requires being inside Suspense if used directly, or client component.
  // We can just use local state and a debounce effect to push to router, OR better, since page.tsx is a Server Component
  // we can use standard Next.js hooks.
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

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
  const [detailReport, setDetailReport] = useState<FieldReport | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [galleryPhotos, setGalleryPhotos] = useState<ReportPhoto[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  const reports = initialReports;
  const activeProjects = initialProjects;

  const updateUrl = useCallback((newParams: Record<string, string | undefined>) => {
    const current = new URLSearchParams(window.location.search);
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
      router.push(`?${current.toString()}`, { scroll: false });
    }
  }, [router]);

  // Local Search syncs to URL on blur/enter or via effect (handled by toolbar usually, but we do it simple here)
  const handleSearchChange = (v: string) => {
    setSearch(v);
    updateUrl({ q: v, page: "1" });
  };
  const handleProjectFilterChange = (v: string) => {
    setProjectFilter(v);
    updateUrl({ projectId: v, page: "1" });
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
    // When changing tab, reset other filters for clarity, or just keep them? Let's just keep them except status/type.
    updateUrl({ tab: t === 'all' ? undefined : t, status: undefined, type: undefined, page: "1" });
    if (t !== 'all') {
      setStatusFilter("");
      setTypeFilter("");
    }
  };
  const handlePageChange = (p: number) => {
    updateUrl({ page: p.toString() });
  };

  // Dynamic stats based on ALL local reports (not just filtered)
  const stats = useMemo(() => computeStats(allReportsForStats as unknown as FieldReport[]), [allReportsForStats]);

  const isLeader = ['ADMIN', 'DIRECTOR', 'DEPUTY_DIRECTOR', 'CHIEF_COMMANDER'].includes(currentUser.role || '');
  
  const dashboardStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    
    if (isLeader) {
      return {
        pending: allReportsForStats.filter(r => r.status === 'SUBMITTED').length,
        rejected: allReportsForStats.filter(r => r.status === 'REJECTED').length,
        issues: allReportsForStats.filter(r => r.hasIssues).length,
      }
    } else {
      return {
        myToday: allReportsForStats.filter(r => r.createdById === currentUser.id && (r.reportDate as string).startsWith(today)).length,
        myDrafts: allReportsForStats.filter(r => r.createdById === currentUser.id && r.status === 'DRAFT').length,
        myRejected: allReportsForStats.filter(r => r.createdById === currentUser.id && r.status === 'REJECTED').length,
      }
    }
  }, [allReportsForStats, currentUser.id, isLeader]);

  // Handlers
  const handleViewDetail = useCallback((report: FieldReport) => {
    setDetailReport(report);
    setIsDetailOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
    setTimeout(() => setDetailReport(null), 300);
  }, []);

  const handleResetFilters = () => {
    setSearch("");
    setProjectFilter("");
    setStatusFilter("");
    setTypeFilter("");
    setDateRange("");
    setTab("all");
    router.push("?");
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
          issues: data.issues,
          recommendations: data.recommendations,
          weatherCondition: data.weatherCondition,
          isDraft
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
          workLines: data.workLines.map(wl => ({
            workContent: wl.workContent,
            quantityToday: wl.quantityToday,
            unit: wl.unit,
            note: wl.note,
          })),
        };
        result = await createSiteReport(payload, isDraft);
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
          if (!res.ok) hasUploadError = true;
        }

        // Upload attachments
        if (data.attachments && data.attachments.length > 0) {
          const formData = new FormData();
          formData.append("kind", "FILE");
          data.attachments.forEach(file => formData.append("files", file));
          const res = await fetch(`/api/reports/${reportId}/attachments`, { method: "POST", body: formData });
          if (!res.ok) hasUploadError = true;
        }

        if (hasUploadError) {
          toast.success(isDraft ? "Đã lưu báo cáo nhưng lỗi tải file" : "Đã tạo báo cáo nhưng lỗi tải file");
        } else {
          toast.success(isDraft ? "Đã lưu nháp báo cáo" : "Đã tạo báo cáo thành công");
        }
        
        setIsCreateOpen(false);
        router.refresh(); // This triggers a server fetch
      }
    } catch (error) {
      console.error(error);
      toast.error("Đã xảy ra lỗi khi tạo báo cáo");
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

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 sm:space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Báo cáo hiện trường</h1>
            <p className="hidden sm:block text-sm text-slate-500 mt-0.5">
              Quản lý, theo dõi và tổng hợp báo cáo công việc
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
              onClick={() => setIsCreateOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white h-9 px-3 text-sm shrink-0"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="hidden sm:flex gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-10 px-5 text-sm shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tạo báo cáo mới
        </Button>
      </div>

      {/* Dashboard / Action Center */}
      <div className="hidden md:grid grid-cols-3 gap-4">
        {isLeader ? (
          <>
            <div 
              onClick={() => handleTabChange('pending')}
              className="bg-amber-50 rounded-xl p-4 border border-amber-200 flex items-center justify-between cursor-pointer hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-900 text-sm">Chờ duyệt</h3>
                  <p className="text-amber-700/80 text-xs mt-0.5">Cần xử lý ngay</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-amber-700">{dashboardStats.pending}</span>
            </div>
            
            <div 
              onClick={() => handleTabChange('rejected')}
              className="bg-red-50 rounded-xl p-4 border border-red-200 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-900 text-sm">Bị từ chối</h3>
                  <p className="text-red-700/80 text-xs mt-0.5">Chưa gửi lại</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-red-700">{dashboardStats.rejected}</span>
            </div>
            
            <div 
              onClick={() => handleTabChange('issues')}
              className="bg-rose-50 rounded-xl p-4 border border-rose-200 flex items-center justify-between cursor-pointer hover:bg-rose-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-rose-900 text-sm">Có phát sinh</h3>
                  <p className="text-rose-700/80 text-xs mt-0.5">Phát sinh cần xem</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-rose-700">{dashboardStats.issues}</span>
            </div>
          </>
        ) : (
          <>
            <div 
              onClick={() => { handleTabChange('all'); handleDateRangeChange('today'); }}
              className="bg-blue-50 rounded-xl p-4 border border-blue-200 flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 text-sm">Báo cáo hôm nay</h3>
                  <p className="text-blue-700/80 text-xs mt-0.5">Của tôi</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-blue-700">{dashboardStats.myToday}</span>
            </div>
            
            <div 
              onClick={() => { handleTabChange('all'); handleStatusFilterChange('DRAFT'); }}
              className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-200 text-slate-600 rounded-lg">
                  <FileEdit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-sm">Nháp</h3>
                  <p className="text-slate-500 text-xs mt-0.5">Cần hoàn thiện</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-slate-700">{dashboardStats.myDrafts}</span>
            </div>
            
            <div 
              onClick={() => { handleTabChange('rejected'); }}
              className="bg-red-50 rounded-xl p-4 border border-red-200 flex items-center justify-between cursor-pointer hover:bg-red-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-900 text-sm">Bị từ chối</h3>
                  <p className="text-red-700/80 text-xs mt-0.5">Cần sửa đổi</p>
                </div>
              </div>
              <span className="text-2xl font-bold text-red-700">{dashboardStats.myRejected}</span>
            </div>
          </>
        )}
      </div>

      {/* Mobile Action Center */}
      <div className="md:hidden bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
          {isLeader ? 'Cần xử lý ngay' : 'Báo cáo của tôi'}
        </h3>
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {isLeader ? (
            <>
              <span onClick={() => handleTabChange('pending')} className="text-amber-700 font-medium cursor-pointer flex items-center gap-1.5"><Clock className="w-4 h-4"/> {dashboardStats.pending} chờ duyệt</span>
              <span onClick={() => handleTabChange('rejected')} className="text-red-700 font-medium cursor-pointer flex items-center gap-1.5"><XCircle className="w-4 h-4"/> {dashboardStats.rejected} từ chối</span>
              <span onClick={() => handleTabChange('issues')} className="text-rose-700 font-medium cursor-pointer flex items-center gap-1.5"><AlertCircle className="w-4 h-4"/> {dashboardStats.issues} phát sinh</span>
            </>
          ) : (
            <>
              <span onClick={() => { handleTabChange('all'); handleDateRangeChange('today'); }} className="text-blue-700 font-medium cursor-pointer flex items-center gap-1.5"><CheckSquare className="w-4 h-4"/> {dashboardStats.myToday} hôm nay</span>
              <span onClick={() => { handleTabChange('all'); handleStatusFilterChange('DRAFT'); }} className="text-slate-600 font-medium cursor-pointer flex items-center gap-1.5"><FileEdit className="w-4 h-4"/> {dashboardStats.myDrafts} nháp</span>
              <span onClick={() => handleTabChange('rejected')} className="text-red-700 font-medium cursor-pointer flex items-center gap-1.5"><XCircle className="w-4 h-4"/> {dashboardStats.myRejected} từ chối</span>
            </>
          )}
        </div>
      </div>

      {/* KPI Stats - dynamic based on local state */}
      <ReportsStats stats={stats} />

      {/* Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide border-b border-slate-200">
        {[
          { id: 'all', label: 'Tất cả' },
          { id: 'daily', label: 'Báo cáo ngày' },
          { id: 'weekly', label: 'Báo cáo tuần' },
          { id: 'pending', label: 'Chờ duyệt' },
          { id: 'rejected', label: 'Từ chối' },
          { id: 'issues', label: 'Có phát sinh' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => handleTabChange(t.id)}
            className={`whitespace-nowrap px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className={`${isMobileFilterOpen ? 'block' : 'hidden'} sm:block`}>
        <ReportsToolbar
          search={search}
          onSearchChange={handleSearchChange}
          projectFilter={projectFilter}
          onProjectFilterChange={handleProjectFilterChange}
          statusFilter={tab === 'pending' ? 'SUBMITTED' : tab === 'rejected' ? 'REJECTED' : statusFilter}
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

      {/* Desktop table (hidden on small screens) */}
      <div className="hidden md:block">
        <ReportsTable
          reports={reports}
          onViewDetail={handleViewDetail}
          onViewGallery={(r) => { setGalleryPhotos(r.photos); setIsGalleryOpen(true); }}
          totalReports={totalReports}
          page={currentPage}
          pageSize={10}
          onPageChange={handlePageChange}
        />
      </div>

      {/* Mobile cards (hidden on md+) */}
      <div className="block md:hidden">
        {reports.length > 0 ? (
          <ReportsMobileCards
            reports={reports}
            onViewDetail={handleViewDetail}
            onViewGallery={(r) => { setGalleryPhotos(r.photos); setIsGalleryOpen(true); }}
          />
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
            Không tìm thấy báo cáo phù hợp
          </div>
        )}
      </div>

      {/* Create Report Dialog */}
      <CreateReportDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateSubmit}
        isSubmitting={isSubmitting}
        activeProjects={activeProjects}
        currentUser={currentUser}
      />

      {/* Report Detail Drawer */}
      <ReportDetailDrawer
        report={detailReport}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        onApprove={handleApprove}
        onReject={handleReject}
        onSubmit={handleSubmit}
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
    </div>
  );
}
