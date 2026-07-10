"use client";

import React, { useEffect, useState } from "react";
import { formatNumberSafe } from "@/lib/reports/report-format-utils";
import {
  formatProgressPercentDisplay,
  formatProgressQuantityDisplay,
  normalizeReportProgressLine,
} from "@/lib/reports/report-progress-display";
import {
  X,
  MapPin,
  FileText,
  TrendingUp,
  Package,
  AlertTriangle,
  Lightbulb,
  Camera,
  Paperclip,
  History,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Send,
  Download,
  Printer,
  Loader2,
  Cloud,
  Sun,
  CloudRain,
  CloudDrizzle,
  Wind,
  CloudLightning,
  AlignLeft,
  Edit2,
  Trash2
} from "lucide-react";
import type { FieldReport, ApprovalHistoryEntry, WeatherCondition } from "./types";
import { getStatusLabel, getStatusVariant, WEATHER_OPTIONS } from "./types";
import { formatDateVN, formatTimeVN } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { AppDrawer } from "@/components/ui/app-drawer";
import { CloseButton } from "@/components/ui/close-button";
import { Button } from "@/components/ui/button";
import { ActionFooter } from "@/components/ui/action-footer";
import { useToast } from "@/components/ui/toast-context";
import { getProjectStatusMeta } from "@/lib/project-status";
import { ContentCard } from "@/components/ui/enterprise";

interface ReportDetailDrawerProps {
  report: FieldReport | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (reportId: string, note?: string) => void;
  onReject?: (reportId: string, reason: string) => void;
  onSubmit?: (reportId: string) => void;
  onEdit?: (report: FieldReport) => void;
  onDelete?: (report: FieldReport) => void;
  onPrintPreview?: (report: FieldReport) => void;
  onViewGallery?: (report: FieldReport, index?: number) => void;
  currentUser?: { id: string; name: string; role?: string };
}

function WeatherIcon({ weather }: { weather: WeatherCondition }) {
  switch (weather) {
    case 'LIGHT_RAIN':
      return <CloudDrizzle className="w-4 h-4 text-blue-400" strokeWidth={1.8} />;
    case 'HEAVY_RAIN':
      return <CloudRain className="w-4 h-4 text-blue-500" strokeWidth={1.8} />;
    case 'WINDY':
      return <Wind className="w-4 h-4 text-slate-500" strokeWidth={1.8} />;
    case 'STORM':
      return <CloudLightning className="w-4 h-4 text-purple-600" strokeWidth={1.8} />;
    case 'CLOUDY':
    case 'OVERCAST':
      return <Cloud className="w-4 h-4 text-slate-400" strokeWidth={1.8} />;
    case 'SUNNY':
    default:
      return <Sun className="w-4 h-4 text-amber-400" strokeWidth={1.8} />;
  }
}

interface DetailSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  empty?: boolean;
}

type DisplayWorkLine = {
  id: string;
  workContent: string;
  code?: string;
  unit?: string;
  designQuantity: number;
  quantityBefore: number;
  quantityToday: number;
  quantityCumulative: number;
  remainingQuantity: number | null;
  progressPercent: number | null;
  hasDesignQuantity?: boolean;
  inferredCumulative?: boolean;
  count: number;
  dates: string[];
  notes: string[];
};

function getReadableWorkCode(line: FieldReport["workLines"][number]) {
  const explicitCode = line.wbsItemId?.trim();
  if (explicitCode && !explicitCode.startsWith("cm")) return explicitCode;

  const seedCode = line.note?.match(/\b([A-Z]{2,}-\d{3}|STR-\d{3}|PRE-\d{3})\b/)?.[1];
  return seedCode;
}

function isInternalReportLineNote(note?: string) {
  return /^Tổng hợp từ nhật ký thi công đã nhập/i.test(note?.trim() || "");
}

function buildDisplayWorkLines(report: FieldReport): DisplayWorkLine[] {
  const validLines = (report.workLines || []).filter((line) =>
    (line.workContent && line.workContent !== "No content") ||
    (line.quantityToday !== undefined && line.quantityToday > 0)
  );

  if (report.type !== "WEEKLY") {
    return validLines.map((line, index) => ({
      id: line.id || `${line.workContent}-${index}`,
      workContent: line.workContent || "Công việc chưa rõ",
      code: getReadableWorkCode(line),
      unit: line.unit,
      designQuantity: Number(line.designQuantity || 0),
      quantityBefore: Number(line.quantityBefore || line.cumulativeBeforeDate || 0),
      quantityToday: Number(line.quantityToday || 0),
      quantityCumulative: Number(line.quantityCumulative || line.cumulativeAfterDate || 0),
      remainingQuantity: Number(line.remainingQuantity || 0),
      progressPercent: Number(line.progressPercent || 0),
      count: 1,
      dates: line.dates || [],
      notes: line.note && !isInternalReportLineNote(line.note) ? [line.note] : [],
    }));
  }

  const grouped = new Map<string, DisplayWorkLine>();
  validLines.forEach((line, index) => {
    const code = getReadableWorkCode(line);
    const key = `${line.wbsItemId || code || line.workContent || index}|${line.workContent}|${line.unit || ""}`;
    const existing = grouped.get(key);
    const cleanNote = line.note && !isInternalReportLineNote(line.note) ? line.note : undefined;

    if (!existing) {
      grouped.set(key, {
        id: line.id || key,
        workContent: line.workContent || "Công việc chưa rõ",
        code,
        unit: line.unit,
        designQuantity: Number(line.designQuantity || 0),
        quantityBefore: Number(line.quantityBefore || 0),
        quantityToday: Number(line.quantityToday || 0),
        quantityCumulative: Number(line.quantityCumulative || 0),
        remainingQuantity: Number(line.remainingQuantity || 0),
        progressPercent: Number(line.progressPercent || 0),
        count: 1,
        dates: line.dates || [],
        notes: cleanNote ? [cleanNote] : [],
      });
      return;
    }

    existing.quantityToday += Number(line.quantityToday || 0);
    existing.quantityBefore = Math.min(existing.quantityBefore, Number(line.quantityBefore || existing.quantityBefore || 0));
    existing.quantityCumulative = Math.max(existing.quantityCumulative, Number(line.quantityCumulative || 0));
    existing.remainingQuantity = Math.max(0, existing.designQuantity - existing.quantityCumulative);
    existing.progressPercent = existing.designQuantity > 0 ? Math.min(999.99, (existing.quantityCumulative / existing.designQuantity) * 100) : 0;
    existing.count += 1;
    for (const date of line.dates || []) {
      if (!existing.dates.includes(date)) existing.dates.push(date);
    }
    if (cleanNote && !existing.notes.includes(cleanNote)) {
      existing.notes.push(cleanNote);
    }
  });

  return Array.from(grouped.values());
}

function getDisplayProgressLine(line: DisplayWorkLine, reportType: FieldReport["type"]) {
  return normalizeReportProgressLine({
    reportType,
    designQuantity: line.designQuantity,
    quantityBefore: line.quantityBefore,
    quantityToday: line.quantityToday,
    quantityCumulative: line.quantityCumulative,
    remainingQuantity: line.remainingQuantity,
    progressPercent: line.progressPercent,
  });
}

function DetailSection({ title, icon, children, empty }: DetailSectionProps) {
  if (empty) return null;
  return (
    <ContentCard className="overflow-hidden p-0 sm:p-0 mb-4">
      <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg border border-slate-200 bg-white shadow-sm flex items-center justify-center">
          {icon}
        </div>
        <h3 className="font-bold text-slate-800 text-[15px]">{title}</h3>
      </div>
      <div className="p-5 text-sm text-slate-600 leading-relaxed whitespace-pre-line">
        {children}
      </div>
    </ContentCard>
  );
}

function ApprovalTimeline({ history }: { history: ApprovalHistoryEntry[] }) {
  function getActionIcon(action: ApprovalHistoryEntry["action"]) {
    switch (action) {
      case "SUBMITTED": return <Send className="w-3.5 h-3.5 text-blue-500" />;
      case "APPROVED": return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case "REVISION_REQUESTED": return <XCircle className="w-3.5 h-3.5 text-yellow-500" />;
      case "REJECTED": return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case "RETURNED": return <RotateCcw className="w-3.5 h-3.5 text-amber-500" />;
    }
  }

  function getActionLabel(action: ApprovalHistoryEntry["action"]) {
    switch (action) {
      case "SUBMITTED": return "Đã gửi";
      case "APPROVED": return "Đã duyệt";
      case "REVISION_REQUESTED": return "Yêu cầu chỉnh sửa";
      case "REJECTED": return "Từ chối";
      case "RETURNED": return "Trả lại";
    }
  }

  function getActionColor(action: ApprovalHistoryEntry["action"]) {
    switch (action) {
      case "SUBMITTED": return "bg-blue-100 border-blue-200";
      case "APPROVED": return "bg-emerald-100 border-emerald-200";
      case "REVISION_REQUESTED": return "bg-yellow-100 border-yellow-200";
      case "REJECTED": return "bg-red-100 border-red-200";
      case "RETURNED": return "bg-amber-100 border-amber-200";
    }
  }

  return (
    <div className="space-y-3">
      {history.map((entry, idx) => (
        <div key={entry.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full border ${getActionColor(entry.action)}`}>
              {getActionIcon(entry.action)}
            </div>
            {idx < history.length - 1 && (
              <div className="flex-1 w-px bg-slate-200 mt-1" />
            )}
          </div>
          <div className="pb-3 min-w-0 flex-1">
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-sm font-semibold text-slate-800">{getActionLabel(entry.action)}</span>
              <span className="text-xs text-slate-400">{entry.timestamp}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {entry.actor} · {entry.role}
            </p>
              {entry.detail && (
                <p className="text-xs text-slate-600 mt-1 bg-slate-50 rounded-md px-2.5 py-1.5 border border-slate-100 italic">
                  &ldquo;{entry.detail}&rdquo;
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

function ImageWithFallback({ src, caption }: { src: string; caption?: string }) {
  const [error, setError] = useState(false);
  
  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
        <Camera className="w-5 h-5 text-slate-300 mb-1" />
        <span className="text-[11px] text-slate-500 font-medium">Ảnh không khả dụng</span>
        <span className="text-[9px] text-slate-400 mt-0.5">File gốc không còn trong storage</span>
      </div>
    );
  }
  
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      src={src} 
      alt={caption || ''} 
      className="w-full h-full object-cover" 
      onError={() => setError(true)}
    />
  );
}

export function ReportDetailDrawer({ 
  report, 
  isOpen, 
  onClose,
  onApprove,
  onReject,
  onSubmit,
  onEdit,
  onDelete,
  onPrintPreview,
  onViewGallery,
  currentUser
}: ReportDetailDrawerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [history, setHistory] = useState<{ id: string; action: "SUBMITTED" | "APPROVED" | "REJECTED" | "RETURNED" | "REVISION_REQUESTED"; actor: string; role: string; timestamp: string; detail?: string }[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (isOpen && report) {
      setRejectMode(false);
      setRejectReason("");
      
      // Fetch history
      setIsLoadingHistory(true);
      fetch(`/api/reports/${report.id}/history`)
        .then(res => res.json())
        .then(data => {
          if (data.history) {
            setHistory(data.history);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoadingHistory(false));
    }
  }, [isOpen, report]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen && !isProcessing) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isProcessing]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!report) return null;

  async function handleApprove() {
    if (!report) return;
    setIsProcessing(true);
    await onApprove?.(report.id);
    setIsProcessing(false);
  }

  async function handleReject() {
    if (!report) return;
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    setIsProcessing(true);
    await onReject?.(report.id, rejectReason);
    setRejectMode(false);
    setIsProcessing(false);
  }

  async function handleSubmit() {
    if (!report) return;
    setIsProcessing(true);
    await onSubmit?.(report.id);
    setIsProcessing(false);
  }

  function handlePrintAction() {
    if (!report) return;
    onClose();
    if (onPrintPreview) {
      onPrintPreview(report);
      return;
    }
    window.open(`/print/reports/${report.id}`, '_blank');
  }

  const projectStatusMeta = getProjectStatusMeta(report.projectStatus);

  const displayWorkLines = buildDisplayWorkLines(report);
  const isReportDeletable =
    !!currentUser &&
    (report.status === "DRAFT" ||
      report.status === "REJECTED" ||
      report.status === "REVISION_REQUESTED" ||
      report.status === "SUBMITTED") &&
    ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"].includes(currentUser.role || "");
  const isReportEditable =
    !!currentUser &&
    (report.status === "DRAFT" ||
      report.status === "REJECTED" ||
      report.status === "REVISION_REQUESTED") &&
    (report.createdById === currentUser.id ||
      ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"].includes(currentUser.role || ""));
  const canSubmitReport =
    (report.status === "DRAFT" ||
      report.status === "REJECTED" ||
      report.status === "REVISION_REQUESTED") &&
    currentUser?.id === report.createdById;
  const canModerateReport =
    report.status === "SUBMITTED" &&
    !!currentUser &&
    ["ADMIN", "DIRECTOR"].includes(currentUser.role || "");

  return (
    <AppDrawer
      isOpen={isOpen}
      onClose={!isProcessing ? onClose : undefined}
      ariaLabel="Chi tiết báo cáo hiện trường"
      panelClassName="sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl"
      closeOnOverlayClick={!isProcessing}
    >
      <div
        aria-label="Chi tiết báo cáo hiện trường"
        className="flex min-h-0 flex-1 flex-col bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Sticky Header ─── */}
        <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)] backdrop-blur-sm sm:px-6 sm:rounded-t-2xl">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-950 truncate sm:text-xl" title={report.reportNo}>{report.code}</h2>
              <StatusBadge variant={getStatusVariant(report.status)} size="sm">
                {getStatusLabel(report.status)}
              </StatusBadge>
              <StatusBadge variant="neutral" size="sm">
                {report.type === 'WEEKLY' ? 'Báo cáo tuần' : 'Báo cáo ngày'}
              </StatusBadge>
              <StatusBadge variant={projectStatusMeta.variant} size="sm">
                {projectStatusMeta.label}
              </StatusBadge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {report.projectName}
              </span>
              <span className="text-slate-300">·</span>
              <span>{report.creatorName}</span>
              <span className="text-slate-300">·</span>
              <span>{report.type === 'WEEKLY' ? `${formatDateVN(report.weekStartDate)} — ${formatDateVN(report.weekEndDate)}` : `${formatDateVN(report.date)} ${formatTimeVN('1970-01-01T' + (report.time || '00:00'))}`}</span>
              {report.type === 'DAILY' && report.weatherCondition && (
                <span className="inline-flex items-center gap-1 ml-1 rounded-md bg-slate-100 px-1.5 py-0.5">
                  <WeatherIcon weather={report.weatherCondition} />
                  <span className="text-[11px]">{WEATHER_OPTIONS.find(o => o.value === report.weatherCondition)?.label}</span>
                </span>
              )}
            </div>
          </div>
          <CloseButton onClick={onClose} disabled={isProcessing} tone="neutral" />
        </div>

        {/* ─── Scrollable Body ─── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/40 px-4 py-5 pb-6 sm:px-6 lg:px-8 space-y-6">
          {/* We removed the redundant 4 info cards since header already contains them.
              But we keep GPS location if available. */}
          {report.gpsLocation && (
            <div className="bg-slate-50 rounded-lg px-3 py-2.5 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Vị trí GPS</p>
                <p className="text-sm font-semibold text-slate-800">{report.gpsLocation}</p>
              </div>
            </div>
          )}

          {report.type === 'WEEKLY' && report.summary && (
            <DetailSection
              title="Đánh giá chung"
              icon={<AlignLeft className="w-4 h-4 text-blue-600" />}
            >
              {report.summary}
            </DetailSection>
          )}

          {/* Work Lines Table or Content */}
          {displayWorkLines.length > 0 ? (
            <ContentCard className="overflow-hidden p-0 sm:p-0 mb-4">
              <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg border border-slate-200 bg-white shadow-sm flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-[15px]">
                  {report.type === 'WEEKLY' ? 'Tổng theo công việc' : 'Nội dung công việc'} ({displayWorkLines.length})
                </h3>
              </div>
              <div className="p-0 sm:p-0">
                <div className="space-y-3 md:hidden p-4">
                  {displayWorkLines.map((line, idx) => (
                    <article
                      key={line.id || idx}
                      className="rounded-[14px] border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {line.code && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                                {line.code}
                              </span>
                            )}
                            {!getDisplayProgressLine(line, report.type).hasDesignQuantity && (
                              <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                                Chưa có TK
                              </span>
                            )}
                            {report.type === "WEEKLY" && line.count > 1 && (
                              <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700">
                                {line.count} lần phát sinh
                              </span>
                            )}
                          </div>
                          <h5 className="mt-1.5 text-sm font-semibold leading-snug text-slate-900">
                            {line.workContent}
                          </h5>
                          {report.type === "WEEKLY" && report.weekStartDate && report.weekEndDate && (
                            <p className="mt-1 text-xs font-medium text-slate-500">
                              {report.weekStartDate} - {report.weekEndDate}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-base font-bold text-blue-700">
                            {formatProgressQuantityDisplay(getDisplayProgressLine(line, report.type).quantityToday)}
                          </p>
                          <p className="text-xs font-semibold text-slate-500">
                            {line.unit || "-"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">
                        <span>TK: <strong>{formatProgressQuantityDisplay(getDisplayProgressLine(line, report.type).designQuantity)}</strong></span>
                        <span>Trước: <strong>{formatProgressQuantityDisplay(getDisplayProgressLine(line, report.type).quantityBefore)}</strong></span>
                        <span>Lũy kế: <strong>{formatProgressQuantityDisplay(getDisplayProgressLine(line, report.type).quantityCumulative)}</strong></span>
                        <span>Còn lại: <strong>{formatProgressQuantityDisplay(getDisplayProgressLine(line, report.type).remainingQuantity)}</strong></span>
                        <span className="col-span-2">% HT: <strong>{formatProgressPercentDisplay(getDisplayProgressLine(line, report.type).progressPercent)}</strong></span>
                      </div>
                      {line.notes.length > 0 && (
                        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
                          {line.notes.slice(0, 2).map((note) => (
                            <p key={note}>{note}</p>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>

                <div className="hidden overflow-x-auto border-t border-slate-200 md:block custom-scrollbar">
                  <table className="min-w-[980px] w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-slate-100">
                      <tr>
                        <th className="sticky left-0 z-[2] border-b bg-slate-100 px-3 py-2 text-left font-semibold text-slate-700 shadow-[1px_0_0_0_rgba(226,232,240,1)]">Hạng mục / Công việc</th>
                        <th className="w-[82px] border-b px-2 py-2 text-right font-semibold text-slate-600">TK</th>
                        <th className="w-[82px] border-b px-2 py-2 text-right font-semibold text-slate-600">Trước</th>
                        <th className="w-[88px] border-b px-2 py-2 text-right font-semibold text-slate-600">{report.type === "WEEKLY" ? "Tuần này" : "Hôm nay"}</th>
                        <th className="w-[88px] border-b px-2 py-2 text-right font-semibold text-slate-600">Lũy kế</th>
                        <th className="w-[82px] border-b px-2 py-2 text-right font-semibold text-slate-600">Còn lại</th>
                        <th className="w-[64px] border-b px-2 py-2 text-right font-semibold text-slate-600">%</th>
                        <th className="w-[68px] border-b px-3 py-2 text-center font-semibold text-slate-600">Đ.vị</th>
                        {report.type === "WEEKLY" && (
                          <th className="w-[92px] border-b px-3 py-2 text-center font-semibold text-slate-600">Phát sinh</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayWorkLines.map((line, idx) => (
                        <tr key={line.id || idx}>
                          <td className="sticky left-0 z-[1] bg-white px-3 py-2 shadow-[1px_0_0_0_rgba(226,232,240,1)]">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {line.code && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-500">
                                  {line.code}
                                </span>
                              )}
                              {!getDisplayProgressLine(line, report.type).hasDesignQuantity && (
                                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                                  Chưa có TK
                                </span>
                              )}
                              <span className="font-medium text-slate-800">{line.workContent}</span>
                            </div>
                            {line.notes.map((note) => (
                              <p key={note} className="mt-0.5 text-xs text-slate-500">{note}</p>
                            ))}
                          </td>
                          <td className="px-2 py-2 text-right font-medium text-slate-600">{formatProgressQuantityDisplay(getDisplayProgressLine(line, report.type).designQuantity)}</td>
                          <td className="px-2 py-2 text-right font-medium text-slate-600">{formatProgressQuantityDisplay(getDisplayProgressLine(line, report.type).quantityBefore)}</td>
                          <td className="px-2 py-2 text-right font-semibold text-blue-600">{formatProgressQuantityDisplay(getDisplayProgressLine(line, report.type).quantityToday)}</td>
                          <td className="px-2 py-2 text-right font-semibold text-emerald-700">{formatProgressQuantityDisplay(getDisplayProgressLine(line, report.type).quantityCumulative)}</td>
                          <td className="px-2 py-2 text-right font-medium text-slate-700">{formatProgressQuantityDisplay(getDisplayProgressLine(line, report.type).remainingQuantity)}</td>
                          <td className="px-2 py-2 text-right text-xs font-semibold text-slate-600">{formatProgressPercentDisplay(getDisplayProgressLine(line, report.type).progressPercent)}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{line.unit || "-"}</td>
                          {report.type === "WEEKLY" && (
                            <td className="px-3 py-2 text-center text-xs font-semibold text-slate-500">
                              {line.count} lần
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </ContentCard>
          ) : (report.workContent && report.workContent !== "No content") ? (
            <DetailSection
              title={report.type === 'WEEKLY' ? "Tổng hợp công việc" : "Nội dung công việc"}
              icon={<FileText className="w-4 h-4 text-blue-600" />}
              empty={false}
            >
              {report.workContent}
            </DetailSection>
          ) : null}

          {report.type === 'WEEKLY' && report.weeklyNote?.nextWeekPlan && report.weeklyNote.nextWeekPlan.length > 0 && (
            <ContentCard className="overflow-hidden p-0 sm:p-0 mb-4">
              <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg border border-slate-200 bg-white shadow-sm flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-[15px]">
                  Kế hoạch thực hiện tuần sau
                </h3>
              </div>
              
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm min-w-[900px]">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Công việc</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600 w-16">ĐVT</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-600 w-24">Còn lại</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-600 w-28 text-blue-700">Tuần tới</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600 w-24">Từ ngày</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600 w-24">Đến ngày</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Phụ trách</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Vật tư</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Thiết bị</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Ghi chú / Rủi ro</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {report.weeklyNote.nextWeekPlan.map((item: any, iIdx: number) => (
                        <tr key={iIdx} className="hover:bg-slate-50/50">
                          <td className="px-3 py-2.5 font-medium text-slate-800">{item.workContent}</td>
                          <td className="px-3 py-2.5 text-center text-slate-600">{item.unit || "-"}</td>
                          <td className="px-3 py-2.5 text-right font-medium text-slate-600">{item.remainingQuantity ? formatNumberSafe(item.remainingQuantity) : "-"}</td>
                          <td className="px-3 py-2.5 text-right font-bold text-blue-700">{item.plannedQuantityNextWeek ? formatNumberSafe(item.plannedQuantityNextWeek) : "-"}</td>
                          <td className="px-3 py-2.5 text-slate-600">{item.plannedStartDate ? item.plannedStartDate.split("-").reverse().join("/") : "-"}</td>
                          <td className="px-3 py-2.5 text-slate-600">{item.plannedEndDate ? item.plannedEndDate.split("-").reverse().join("/") : "-"}</td>
                          <td className="px-3 py-2.5 text-slate-600">{item.constructionCrew || "-"}</td>
                          <td className="px-3 py-2.5 text-slate-600">{item.materialNeeds || "-"}</td>
                          <td className="px-3 py-2.5 text-slate-600">{item.equipmentNeeds || "-"}</td>
                          <td className="px-3 py-2.5 text-slate-600 text-[12px]">{item.riskNote || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            </ContentCard>
          )}

          

          {report.type === 'DAILY' && (
            <>
              <DetailSection
                title="Nguồn lực & Vấn đề"
                icon={<Package className="w-4 h-4 text-amber-600" />}
                empty={!report.materials && !report.labor && !report.quality}
              >
                {report.materials && <><span className="font-semibold text-slate-700">Vật tư:</span> {report.materials}{'\n'}</>}
                {report.labor && <><span className="font-semibold text-slate-700">Nhân công/Máy móc:</span> {report.labor}{'\n'}</>}
                {report.quality && <><span className="font-semibold text-slate-700">Chất lượng/An toàn:</span> {report.quality}</>}
              </DetailSection>
            </>
          )}

          {report.issues && (
            <DetailSection
              title={report.type === 'WEEKLY' ? "Vấn đề phát sinh" : "Vấn đề phát sinh"}
              icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
              empty={!report.issues}
            >
              {report.issues}
            </DetailSection>
          )}

          {report.recommendations && (
            <DetailSection
              title={report.type === 'WEEKLY' ? "Kiến nghị / kế hoạch tuần sau" : "Kiến nghị / Đề xuất"}
              icon={<Lightbulb className="w-4 h-4 text-amber-500" />}
              empty={!report.recommendations}
            >
              {report.recommendations}
            </DetailSection>
          )}

          {/* Photo gallery */}
          {report.photos && report.photos.length > 0 && (
            <ContentCard className="overflow-hidden p-0 sm:p-0 mb-4">
              <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg border border-slate-200 bg-white shadow-sm flex items-center justify-center">
                  <Camera className="w-4 h-4 text-sky-600" />
                </div>
                <h3 className="font-bold text-slate-800 text-[15px]">
                  {report.type === 'WEEKLY' ? 'Ảnh tiêu biểu' : 'Hình ảnh hiện trường'} ({report.photos.length})
                </h3>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {report.photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden hover:border-blue-300 transition-colors cursor-pointer relative group"
                    onClick={() => { if(!photo.isMissing) onViewGallery?.(report, index); }}
                  >
                    {photo.isMissing ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 border border-slate-200">
                        <Camera className="w-5 h-5 text-slate-300 mx-auto" />
                        <span className="text-[10px] text-slate-500 font-medium mt-1">Ảnh lỗi</span>
                      </div>
                    ) : photo.url ? (
                      <ImageWithFallback src={photo.url} caption={photo.caption} />
                    ) : (
                      <div className="text-center">
                        <Camera className="w-5 h-5 text-slate-300 mx-auto" />
                        <p className="text-[9px] text-slate-400 mt-1 px-1 truncate">{photo.caption}</p>
                      </div>
                    )}
                    {photo.url && photo.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-black/50 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[9px] text-white truncate text-center">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              </div>
            </ContentCard>
          )}

          {/* Attachments */}
          {report.attachments && report.attachments.length > 0 && (
            <ContentCard className="overflow-hidden p-0 sm:p-0 mb-4">
              <div className="bg-slate-50/80 px-5 py-3.5 border-b border-slate-200 flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg border border-slate-200 bg-white shadow-sm flex items-center justify-center">
                  <Paperclip className="w-4 h-4 text-slate-500" />
                </div>
                <h3 className="font-bold text-slate-800 text-[15px]">
                  File đính kèm ({report.attachments.length})
                </h3>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {report.attachments.map((att) => (
                    <div
                      key={att.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${att.isMissing ? 'bg-slate-50/50 border-slate-200 cursor-not-allowed opacity-80' : 'bg-slate-50 border-slate-100 hover:border-blue-200 cursor-pointer group'}`}
                      onClick={() => { if(!att.isMissing && att.url) window.open(att.url, '_blank') }}
                    >
                      <div className={`flex items-center justify-center w-8 h-8 rounded-md shrink-0 border border-slate-200 bg-white group-hover:border-blue-200 transition-colors ${att.isMissing ? 'text-slate-400' : 'text-blue-500'}`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium truncate transition-colors ${att.isMissing ? 'text-slate-500 line-through' : 'text-slate-700 group-hover:text-blue-700'}`}>{att.name}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-slate-400">{att.size}</p>
                          {att.isMissing && (
                            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-100 px-1.5 rounded-sm" title="File gốc không còn trong storage">File thiếu</span>
                          )}
                        </div>
                      </div>
                      {!att.isMissing && <Download className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0 transition-colors" />}
                    </div>
                  ))}
                </div>
              </div>
            </ContentCard>
          )}

          {/* Approval History */}
          <div className="space-y-3">
            <button 
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors w-full text-left"
            >
              <History className="w-4 h-4 text-slate-500" />
              Lịch sử duyệt
              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full ml-1 font-medium">{history.length || 0}</span>
            </button>
            {showHistory && (
              <div className="pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                {isLoadingHistory ? (
                  <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>
                ) : !history || history.length === 0 ? (
                  <p className="text-sm text-slate-500 italic pl-0 sm:pl-6">Chưa có lịch sử trạng thái</p>
                ) : (
                  <div className="pl-0 sm:pl-6">
                    <ApprovalTimeline history={history} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── Sticky Footer ─── */}
        <ActionFooter>
          {rejectMode ? (
            <div className="space-y-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối (bắt buộc)..."
                className="w-full min-h-[80px] p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
              />
              <div className="flex flex-col-reverse gap-2 md:flex-row md:items-center md:justify-end">
                <Button variant="outline" onClick={() => setRejectMode(false)} disabled={isProcessing} className="h-11 w-full md:h-10 md:w-auto">
                  Hủy
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={isProcessing || !rejectReason.trim()}
                  className="h-11 w-full md:h-10 md:w-auto gap-1.5"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Xác nhận từ chối
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* ─── Mobile: stacked action buttons ─── */}
              <div className="space-y-2 md:hidden">
                {/* Primary actions first */}
                {canModerateReport && (
                  <Button
                    variant="success"
                    onClick={handleApprove}
                    disabled={isProcessing}
                    className="h-12 w-full gap-2 text-[15px]"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Duyệt báo cáo
                  </Button>
                )}

                {canSubmitReport && (
                  <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    className="h-12 w-full gap-2 text-[15px]"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Gửi báo cáo
                  </Button>
                )}

                {canModerateReport && (
                  <Button
                    variant="outline"
                    onClick={() => setRejectMode(true)}
                    disabled={isProcessing}
                    className="h-12 w-full border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50"
                  >
                    Từ chối
                  </Button>
                )}

                {/* Secondary actions row */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    variant="outline"
                    className="h-11 gap-1.5"
                    onClick={handlePrintAction}
                  >
                    <Printer className="w-4 h-4" />
                    In/PDF
                  </Button>
                  {isReportEditable ? (
                    <Button
                      variant="outline"
                      onClick={() => { onClose(); onEdit?.(report); }}
                      disabled={isProcessing}
                      className="h-11 gap-1.5 border-blue-200 text-blue-600"
                    >
                      <Edit2 className="w-4 h-4" />
                      Sửa
                    </Button>
                  ) : (
                    <Button variant="outline" className="h-11" onClick={onClose} disabled={isProcessing}>
                      Đóng
                    </Button>
                  )}
                </div>

                {isReportDeletable && (
                  <Button
                    variant="ghost"
                    onClick={() => onDelete?.(report)}
                    disabled={isProcessing}
                    className="h-10 w-full text-rose-500 hover:bg-rose-50 hover:text-rose-700 gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa báo cáo
                  </Button>
                )}
              </div>

              {/* ─── Desktop: left/right footer layout ─── */}
              <div className="hidden items-center justify-between gap-3 md:flex">
                {/* Left side: Print/Export */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={handlePrintAction}
                  >
                    <Printer className="w-4 h-4" />
                    In / Xuất PDF
                  </Button>
                </div>

                {/* Right side: Close, Edit, Delete | Reject, Approve */}
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={onClose} disabled={isProcessing}>
                    Đóng
                  </Button>

                  {isReportEditable && (
                    <Button
                      variant="outline"
                      onClick={() => { onClose(); onEdit?.(report); }}
                      disabled={isProcessing}
                      className="gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 hover:border-blue-300"
                    >
                      <Edit2 className="w-4 h-4" />
                      Sửa
                    </Button>
                  )}

                  {isReportDeletable && (
                    <Button
                      variant="ghost"
                      onClick={() => onDelete?.(report)}
                      disabled={isProcessing}
                      className="gap-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                      Xóa
                    </Button>
                  )}

                  {/* Visual separator before approval actions */}
                  {(canSubmitReport || canModerateReport) && (
                    <div className="h-6 w-px bg-slate-200 mx-1" />
                  )}

                  {canSubmitReport && (
                    <Button
                      variant="primary"
                      onClick={handleSubmit}
                      disabled={isProcessing}
                      className="gap-1.5"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Gửi báo cáo
                    </Button>
                  )}

                  {canModerateReport && (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => setRejectMode(true)}
                        disabled={isProcessing}
                        className="gap-1.5 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                      >
                        Từ chối
                      </Button>
                      <Button
                        variant="success"
                        onClick={handleApprove}
                        disabled={isProcessing}
                        className="gap-1.5"
                      >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                        Duyệt
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </ActionFooter>
      </div>
    </AppDrawer>
  );
}
