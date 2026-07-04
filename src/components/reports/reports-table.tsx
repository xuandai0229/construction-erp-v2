"use client";

import { Eye, Printer, ChevronLeft, ChevronRight, Edit2, Trash2 } from "lucide-react";
import type { FieldReport } from "./types";
import { getStatusLabel, getStatusVariant } from "./types";
import { StatusBadge } from "@/components/ui/status-badge";
import { PhotoPreviewStack } from "./photo-preview-stack";
import { useMemo, Fragment } from "react";
import { getVietnamIsoWeekInfo } from "@/lib/reports/report-timezone";
import { formatDateVN, formatTimeVN, formatReportCode } from "@/lib/utils";

interface ReportsTableProps {
  reports: FieldReport[];
  onViewDetail: (report: FieldReport) => void;
  onViewGallery?: (report: FieldReport) => void;
  onPrintPreview?: (report: FieldReport) => void;
  onEdit?: (report: FieldReport) => void;
  onDelete?: (report: FieldReport) => void;
  totalReports: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  showProjectColumn?: boolean;
  currentUser?: { id: string; role?: string };
}

export function ReportsTable({
  reports,
  onViewDetail,
  onViewGallery,
  onPrintPreview,
  onEdit,
  onDelete,
  totalReports,
  page,
  pageSize,
  onPageChange,
  showProjectColumn = true,
  currentUser,
}: ReportsTableProps) {
  const totalPages = Math.ceil(totalReports / pageSize) || 1;
  const start = totalReports === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalReports);

  // Generate page numbers with ellipsis
  function getPageNumbers() {
    if (totalPages === 0) return [1];
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }

  const handlePrint = (e: React.MouseEvent, report: FieldReport) => {
    e.stopPropagation();
    if (onPrintPreview) {
      onPrintPreview(report);
    } else {
      window.open(`/print/reports/${report.id}`, '_blank');
    }
  };

  // Group reports by week
  const groupedReports = useMemo(() => {
    const groups: Record<string, { weekNumber: number, startDate: string, endDate: string, reports: FieldReport[] }> = {};
    
    reports.forEach(r => {
      // For weekly reports, we might already have weekStartDate. Use that if available, else use date
      const week = getVietnamIsoWeekInfo((r.type === 'WEEKLY' && r.weekStartDate) ? r.weekStartDate : r.date);
      const key = `${week.weekStartDate}_${week.weekEndDate}`;
      
      if (!groups[key]) {
        groups[key] = {
          weekNumber: week.weekNumber,
          startDate: week.weekStartDate,
          endDate: week.weekEndDate,
          reports: [],
        };
      }
      groups[key].reports.push(r);
    });
    
    // Sort groups descending by start date
    return Object.values(groups).sort((a, b) => b.startDate.localeCompare(a.startDate));
  }, [reports]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Table - Using table-auto and allowing it to fit container without hard min-widths */}
      <div className="overflow-x-auto min-h-[300px]">
        <table className="w-full text-sm table-auto">
          <thead className="sticky top-0 z-20">
            <tr className="border-b border-slate-100 bg-slate-50/95 shadow-sm backdrop-blur">
              <th className="text-left py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap w-[15%]">
                Mã BC
              </th>
              {showProjectColumn && (
                <th className="text-left py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider min-w-[150px]">
                  Công trình
                </th>
              )}
              <th className="text-left py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider min-w-[140px]">
                Người tạo
              </th>
              <th className="text-left py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap">
                Thời gian
              </th>
              <th className="text-left py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider whitespace-nowrap w-[10%]">
                Trạng thái
              </th>
              <th className="text-center py-3 px-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[10%]">
                Hình ảnh
              </th>
              <th className="text-right py-3 px-4 font-semibold text-slate-600 text-xs uppercase tracking-wider w-[80px]">
                Tác vụ
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reports.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  Không tìm thấy báo cáo phù hợp
                </td>
              </tr>
            ) : (
              groupedReports.map((group) => {
                const approvedCount = group.reports.filter(r => r.status === 'APPROVED').length;
                const pendingCount = group.reports.filter(r => r.status === 'SUBMITTED').length;
                const rejectedCount = group.reports.filter(r => r.status === 'REJECTED').length;
                const revisionCount = group.reports.filter(r => r.status === 'REVISION_REQUESTED').length;
                const draftCount = group.reports.filter(r => r.status === 'DRAFT').length;

                return (
                  <Fragment key={`week-${group.startDate}_${group.endDate}`}>
                    {/* Group Header */}
                    <tr className="bg-slate-100/80 border-t border-slate-200">
                      <td colSpan={showProjectColumn ? 7 : 6} className="py-2.5 px-4">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                          <span className="font-semibold text-slate-800">
                            Tuần {group.weekNumber} · {formatDateVN(group.startDate)} - {formatDateVN(group.endDate)}
                          </span>
                          <span className="text-slate-400 hidden sm:inline">·</span>
                          <span className="text-slate-600">{group.reports.length} báo cáo</span>
                          {(approvedCount > 0 || pendingCount > 0 || rejectedCount > 0 || revisionCount > 0 || draftCount > 0) && (
                            <>
                              <span className="text-slate-400 hidden sm:inline">·</span>
                              <div className="flex items-center gap-2 text-xs">
                                {approvedCount > 0 && <span className="text-emerald-600 font-medium">{approvedCount} duyệt</span>}
                                {pendingCount > 0 && <span className="text-amber-600 font-medium">{pendingCount} chờ</span>}
                                {rejectedCount > 0 && <span className="text-red-600 font-medium">{rejectedCount} từ chối</span>}
                                {draftCount > 0 && <span className="text-slate-500 font-medium">{draftCount} nháp</span>}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Group Rows */}
                    {group.reports.map((report) => {
                      const isWeekly = report.type === 'WEEKLY';
                      
                      return (
                        <tr
                          key={report.id}
                          className={`hover:bg-slate-50/80 transition-colors cursor-pointer group ${isWeekly ? 'bg-indigo-50/30' : ''}`}
                          onClick={() => onViewDetail(report)}
                        >
                          <td className="py-2.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className={`font-mono text-[13px] font-semibold ${isWeekly ? 'text-purple-700' : 'text-blue-700'}`}>
                                {formatReportCode(report.code, report.date, report.type)}
                              </span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-slate-400">
                                  {isWeekly ? 'Tuần' : 'Ngày'}
                                </span>
                                {report.isSevereIssue ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-red-100 text-red-700">
                                    Nghiêm trọng
                                  </span>
                                ) : report.hasIssues ? (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-700">
                                    Phát sinh
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          {showProjectColumn && (
                            <td className="py-2.5 px-3">
                              <span className="text-slate-900 font-medium text-[13px] line-clamp-1">{report.projectName}</span>
                            </td>
                          )}
                          <td className="py-2.5 px-3">
                            <div className="flex flex-col">
                              <span className="text-slate-900 font-medium text-[13px] line-clamp-1">{report.creatorName}</span>
                              <span className="text-slate-400 text-[11px] truncate">
                                {report.creatorRole === 'CHIEF_COMMANDER' ? 'Chỉ huy trưởng' : 
                                 report.creatorRole === 'PROJECT_MANAGER' ? 'Quản lý dự án' :
                                 report.creatorRole === 'ENGINEER' ? 'Kỹ sư' :
                                 report.creatorRole === 'ACCOUNTANT' ? 'Kế toán' :
                                 report.creatorRole === 'ADMIN' ? 'Giám đốc' : report.creatorRole}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-slate-700 text-[13px] font-medium">
                                {isWeekly 
                                  ? `${formatDateVN(report.weekStartDate)} - ${formatDateVN(report.weekEndDate)}`
                                  : formatDateVN(report.date)}
                              </span>
                              {report.type === 'DAILY' && <span className="text-slate-400 text-[11px]">{formatTimeVN(`1970-01-01T${report.time || "00:00"}`)}</span>}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <StatusBadge
                              variant={getStatusVariant(report.status)}
                              size="sm"
                            >
                              {getStatusLabel(report.status)}
                            </StatusBadge>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="flex flex-wrap justify-center items-center gap-1.5" onClick={(e) => { e.stopPropagation(); onViewGallery?.(report); }}>
                              {report.photos.length > 0 && (
                                <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-medium hover:bg-slate-200 transition-colors">
                                  {report.photos.length} ảnh
                                </span>
                              )}
                              {report.attachments.length > 0 && (
                                <span className="text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                                  +{report.attachments.length} file
                                </span>
                              )}
                              {(report.photos.some(p => p.isMissing) || report.attachments.some(a => a.isMissing)) && (
                                <StatusBadge variant="danger" size="sm" title="Báo cáo có file/ảnh không còn tồn tại trong storage">
                                  File lỗi
                                </StatusBadge>
                              )}
                              {report.photos.length === 0 && report.attachments.length === 0 && (
                                <span className="text-[11px] text-slate-400">Chưa có ảnh</span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-0.5">
                              {/* Edit & Delete Buttons */}
                              {currentUser && (
                                <>
                                  {(report.status === "DRAFT" || report.status === "REJECTED" || report.status === "REVISION_REQUESTED") && 
                                   (report.createdById === currentUser.id || ['ADMIN', 'DIRECTOR', 'DEPUTY_DIRECTOR'].includes(currentUser.role || '')) && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onEdit?.(report); }}
                                      className="icon-button h-9 w-9 text-slate-500 hover:text-blue-700"
                                      title="Sửa báo cáo"
                                      aria-label="Sửa báo cáo"
                                    >
                                      <Edit2 className="w-[18px] h-[18px]" strokeWidth={2} />
                                    </button>
                                  )}
                                  
                                  {(report.status === "DRAFT" || report.status === "REJECTED" || report.status === "REVISION_REQUESTED" || report.status === "SUBMITTED") && 
                                   ['ADMIN', 'DIRECTOR', 'DEPUTY_DIRECTOR'].includes(currentUser.role || '') && (
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onDelete?.(report); }}
                                      className="icon-button h-9 w-9 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                                      title="Xóa báo cáo"
                                      aria-label="Xóa báo cáo"
                                    >
                                      <Trash2 className="w-[18px] h-[18px]" strokeWidth={2} />
                                    </button>
                                  )}
                                </>
                              )}
                              
                              <button
                                onClick={(e) => { e.stopPropagation(); onViewDetail(report); }}
                                className="icon-button h-9 w-9"
                                title="Xem chi tiết"
                                aria-label="Xem chi tiết"
                              >
                                <Eye className="w-[18px] h-[18px]" strokeWidth={2} />
                              </button>
                              <button
                                onClick={(e) => handlePrint(e, report)}
                                className="icon-button h-9 w-9"
                                title="In / Xuất PDF"
                                aria-label="In / Xuất PDF"
                              >
                                <Printer className="w-[18px] h-[18px]" strokeWidth={2} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-slate-50/50 mt-auto shrink-0">
        <p className="text-xs sm:text-sm text-slate-500">
          Hiển thị {start}–{end} trong tổng số <span className="font-semibold text-slate-700">{totalReports}</span> báo cáo
        </p>

        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {getPageNumbers().map((p, idx) =>
            p === '...' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 text-sm">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={`min-w-[32px] h-8 rounded-md text-sm font-medium transition-colors ${
                  p === page
                    ? 'bg-blue-600 text-white shadow-sm border border-blue-600'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            )
          )}

          <button
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Trang sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
