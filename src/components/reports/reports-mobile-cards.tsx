"use client";

import { Eye, Calendar, Edit2, Trash2 } from "lucide-react";
import type { FieldReport } from "./types";
import { getStatusLabel, getStatusVariant } from "./types";
import { StatusBadge } from "@/components/ui/status-badge";
import { PhotoPreviewStack } from "./photo-preview-stack";

interface ReportsMobileCardsProps {
  reports: FieldReport[];
  onViewDetail: (report: FieldReport) => void;
  onViewGallery?: (report: FieldReport) => void;
  onEdit?: (report: FieldReport) => void;
  onDelete?: (report: FieldReport) => void;
  currentUser?: { id: string; role?: string };
}

export function ReportsMobileCards({ reports, onViewDetail, onViewGallery, onEdit, onDelete, currentUser }: ReportsMobileCardsProps) {
  if (!reports.length) return null;

  return (
    <div className="flex flex-col gap-3">
      {reports.map((report) => (
        <div
          key={report.id}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 active:bg-slate-50 transition-colors"
          onClick={() => onViewDetail(report)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter') onViewDetail(report); }}
        >
          {/* Top row: code + status */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className={`font-mono text-[13px] font-semibold truncate ${report.type === 'WEEKLY' ? 'text-purple-700' : 'text-blue-700'}`}>
                  {report.code.replace('BC-D-', 'D-').replace('BC-W-', 'W-')}
                </p>
                <StatusBadge variant="neutral" size="sm">
                  {report.type === 'WEEKLY' ? 'Tuần' : 'Ngày'}
                </StatusBadge>
              </div>
            </div>
            <StatusBadge variant={getStatusVariant(report.status)} size="sm">
              {getStatusLabel(report.status)}
            </StatusBadge>
          </div>

          {/* Info row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
            <span className="font-medium text-slate-700 truncate max-w-[120px]">{report.creatorName}</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" />
              {report.type === 'WEEKLY' ? `${report.weekStartDate} - ${report.weekEndDate}` : report.date}
            </span>
          </div>

          {/* Bottom row: photos + action */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => { e.stopPropagation(); onViewGallery?.(report); }}>
              {report.photos.length > 0 && (
                <span className="text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
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
                <span className="text-slate-300">-</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {currentUser && (
                <>
                  {(report.status === "DRAFT" || report.status === "REJECTED" || report.status === "REVISION_REQUESTED" || report.status === "SUBMITTED") && 
                   ['ADMIN', 'DIRECTOR', 'DEPUTY_DIRECTOR'].includes(currentUser.role || '') && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete?.(report); }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-red-600 px-2 py-1.5 rounded-md transition-colors"
                      aria-label="Xóa"
                      title="Xóa báo cáo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {(report.status === "DRAFT" || report.status === "REJECTED" || report.status === "REVISION_REQUESTED") && 
                   (report.createdById === currentUser.id || ['ADMIN', 'DIRECTOR', 'DEPUTY_DIRECTOR'].includes(currentUser.role || '')) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit?.(report); }}
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 px-2 py-1.5 rounded-md transition-colors"
                      aria-label="Sửa"
                      title="Sửa báo cáo"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onViewDetail(report); }}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 px-2.5 py-1.5 rounded-md transition-colors"
                aria-label="Xem"
                title="Xem chi tiết"
              >
                <Eye className="w-3.5 h-3.5" />
                Xem
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
