"use client";

import { Eye, Calendar, Edit2, Trash2 } from "lucide-react";
import type { FieldReport } from "./types";
import { getStatusLabel, getStatusVariant } from "./types";
import { StatusBadge } from "@/components/ui/status-badge";
import { PhotoPreviewStack } from "./photo-preview-stack";
import { formatDateVN, formatReportCode } from "@/lib/utils";
import { ContentCard } from "@/components/ui/enterprise";
import { isCompanyWideRole } from "@/lib/rbac-rules";

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
  const currentUserHasCompanyScope = isCompanyWideRole(currentUser?.role);

  return (
    <div className="flex flex-col gap-3">
      {reports.map((report) => (
        <ContentCard
          key={report.id}
          className="p-3 space-y-3 active:bg-[var(--surface-subtle)] transition-colors"
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
                  {formatReportCode(report.code, report.date, report.type)}
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--muted-foreground)]">
            <span className="font-medium text-[var(--foreground)] truncate max-w-[120px]">{report.creatorName}</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3 h-3 text-[var(--muted-foreground)] opacity-70" />
              {report.type === 'WEEKLY' ? `${formatDateVN(report.weekStartDate)} - ${formatDateVN(report.weekEndDate)}` : formatDateVN(report.date)}
            </span>
          </div>

          {/* Bottom row: photos + action */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--border)]">
            <div className="flex flex-wrap items-center gap-1.5" onClick={(e) => { e.stopPropagation(); onViewGallery?.(report); }}>
              {report.photos.length > 0 && (
                <span className="text-[11px] text-[var(--muted-foreground)] bg-[var(--border)] px-1.5 py-0.5 rounded font-medium">
                  {report.photos.length} ảnh
                </span>
              )}
              {report.attachments.length > 0 && (
                <span className="text-[11px] text-[var(--muted-foreground)] bg-[var(--border)] px-1.5 py-0.5 rounded font-medium">
                  +{report.attachments.length} file
                </span>
              )}
              {(report.photos.some(p => p.isMissing) || report.attachments.some(a => a.isMissing)) && (
                <StatusBadge variant="danger" size="sm" title="Báo cáo có tệp hoặc ảnh không còn tồn tại trong hệ thống lưu trữ">
                  Tệp lỗi
                </StatusBadge>
              )}
              {report.photos.length === 0 && report.attachments.length === 0 && (
                <span className="text-slate-300">-</span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {currentUser && (
                <>
                  {(report.status === "DRAFT" || report.status === "REJECTED" || report.status === "REVISION_REQUESTED" || report.status === "SUBMITTED") && 
                   currentUserHasCompanyScope && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete?.(report); }}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] text-red-600 transition-colors hover:bg-red-50"
                      aria-label="Xóa"
                      title="Xóa báo cáo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {(report.status === "DRAFT" || report.status === "REJECTED" || report.status === "REVISION_REQUESTED") && 
                   (report.createdById === currentUser.id || currentUserHasCompanyScope) && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit?.(report); }}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-lg)] text-blue-600 transition-colors hover:bg-blue-50"
                      aria-label="Sửa"
                      title="Sửa báo cáo"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onViewDetail(report); }}
                className="inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-lg)] bg-blue-50 px-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                aria-label="Xem"
                title="Xem chi tiết"
              >
                <Eye className="w-4 h-4" />
                Xem
              </button>
            </div>
          </div>
        </ContentCard>
      ))}
    </div>
  );
}
