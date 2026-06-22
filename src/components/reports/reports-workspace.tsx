"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Plus } from "lucide-react";
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
  type ReportStatus,
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
  initialProjects: { id: string; name: string }[];
  currentUser: { id: string; name: string };
}

export function ReportsWorkspace({
  initialReports,
  initialProjects,
  currentUser,
}: ReportsWorkspaceProps) {
  const toast = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real DB state
  // Using initialProjects directly
  
  // Filter state
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateRange, setDateRange] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Dialog/drawer state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [detailReport, setDetailReport] = useState<FieldReport | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [galleryPhotos, setGalleryPhotos] = useState<ReportPhoto[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Local state is removed for Phase 2. Directly use props.
  const reports = initialReports;
  const activeProjects = initialProjects;

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      // Search filter
      if (search) {
        const q = search.toLowerCase();
        const matchSearch =
          r.code.toLowerCase().includes(q) ||
          r.projectName.toLowerCase().includes(q) ||
          r.creatorName.toLowerCase().includes(q) ||
          r.workContent?.toLowerCase().includes(q) ||
          r.workLines.some(l => l.workContent.toLowerCase().includes(q));
        if (!matchSearch) return false;
      }
      // Project filter
      if (projectFilter && r.projectId !== projectFilter) return false;
      // Status filter
      if (statusFilter && r.status !== statusFilter) return false;
      // Type filter
      if (typeFilter && r.type !== typeFilter) return false;
      return true;
    });
  }, [reports, search, projectFilter, statusFilter, typeFilter]);

  // Paginated reports
  const paginatedReports = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, page]);

  // Dynamic stats based on ALL local reports (not just filtered)
  const stats = useMemo(() => computeStats(reports), [reports]);

  // Handlers
  const handleViewDetail = useCallback((report: FieldReport) => {
    setDetailReport(report);
    setIsDetailOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setIsDetailOpen(false);
    setTimeout(() => setDetailReport(null), 300);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearch("");
    setProjectFilter("");
    setStatusFilter("");
    setTypeFilter("");
    setDateRange("");
    setPage(1);
  }, []);

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
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi duyệt báo cáo");
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
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi từ chối báo cáo");
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
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi gửi báo cáo");
    }
  }, [router, toast]);

  return (
    <div className="max-w-[1400px] mx-auto space-y-5 sm:space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Báo cáo hiện trường</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Quản lý, theo dõi và tổng hợp báo cáo công việc hằng ngày tại công trường
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white h-10 px-5 text-sm shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Tạo báo cáo mới
        </Button>
      </div>

      {/* KPI Stats - dynamic based on local state */}
      <ReportsStats stats={stats} />

      {/* Toolbar */}
      <ReportsToolbar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        projectFilter={projectFilter}
        onProjectFilterChange={(v) => { setProjectFilter(v); setPage(1); }}
        statusFilter={statusFilter}
        onStatusFilterChange={(v) => { setStatusFilter(v); setPage(1); }}
        typeFilter={typeFilter}
        onTypeFilterChange={(v) => { setTypeFilter(v); setPage(1); }}
        dateRange={dateRange}
        onDateRangeChange={(v) => { setDateRange(v); setPage(1); }}
        projects={activeProjects}
        onResetFilters={handleResetFilters}
        hasActiveFilters={!!(search || projectFilter || statusFilter || typeFilter || dateRange)}
      />

      {/* Desktop table (hidden on small screens) */}
      <div className="hidden md:block">
        <ReportsTable
          reports={paginatedReports}
          onViewDetail={handleViewDetail}
          onViewGallery={(r) => { setGalleryPhotos(r.photos); setIsGalleryOpen(true); }}
          totalReports={filteredReports.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </div>

      {/* Mobile cards (hidden on md+) */}
      <div className="block md:hidden">
        {paginatedReports.length > 0 ? (
          <ReportsMobileCards
            reports={paginatedReports}
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
