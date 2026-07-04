"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  X,
  Calendar,
  User,
  MapPin,
  FileText,
  TrendingUp,
  Package,
  Users,
  Wrench,
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
import { formatDateVN, formatTimeVN, formatReportCode } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-context";
import { getProjectStatusMeta } from "@/lib/project-status";

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
  quantityToday: number;
  count: number;
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
      quantityToday: Number(line.quantityToday || 0),
      count: 1,
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
        quantityToday: Number(line.quantityToday || 0),
        count: 1,
        notes: cleanNote ? [cleanNote] : [],
      });
      return;
    }

    existing.quantityToday += Number(line.quantityToday || 0);
    existing.count += 1;
    if (cleanNote && !existing.notes.includes(cleanNote)) {
      existing.notes.push(cleanNote);
    }
  });

  return Array.from(grouped.values());
}

function formatReportQuantity(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 2,
  }).format(value);
}

function DetailSection({ title, icon, children, empty }: DetailSectionProps) {
  if (empty) return null;
  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
        {icon}
        {title}
      </h4>
      <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line pl-0 sm:pl-6">
        {children}
      </div>
    </div>
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const weatherLabel = WEATHER_OPTIONS.find(o => o.value === report.weatherCondition)?.label || "Khác";
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
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-slate-900/20 transition-all duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      onClick={!isProcessing ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết báo cáo hiện trường"
        className={`flex h-full w-full max-w-xl flex-col bg-white shadow-2xl transition-transform duration-300 ease-out sm:max-w-2xl ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-3 border-b border-slate-200 shrink-0 bg-white">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 truncate" title={report.reportNo}>{report.code}</h2>
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
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              {report.projectName} · {report.creatorName} · {report.type === 'WEEKLY' ? `${formatDateVN(report.weekStartDate)} - ${formatDateVN(report.weekEndDate)}` : `${formatDateVN(report.date)} ${formatTimeVN('1970-01-01T' + (report.time || '00:00'))}`}
              {report.type === 'DAILY' && report.weatherCondition && (
                <span className="inline-flex items-center gap-1 ml-2">
                  <WeatherIcon weather={report.weatherCondition} />
                  {WEATHER_OPTIONS.find(o => o.value === report.weatherCondition)?.label}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 md:h-10 md:w-10"
            title="Đóng"
            aria-label="Đóng chi tiết báo cáo"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-5 sm:px-6 py-4 pb-6 space-y-6">
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
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                {report.type === 'WEEKLY' ? 'Tổng theo công việc' : 'Nội dung công việc'} ({displayWorkLines.length})
              </h4>
              <div className="pl-0 sm:pl-6">
                <div className="space-y-3 md:hidden">
                  {displayWorkLines.map((line, idx) => (
                    <article
                      key={line.id || idx}
                      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {line.code && (
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                                {line.code}
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
                            {formatReportQuantity(line.quantityToday)}
                          </p>
                          <p className="text-xs font-semibold text-slate-500">
                            {line.unit || "-"}
                          </p>
                        </div>
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

                <div className="hidden overflow-hidden rounded-lg border border-slate-200 md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="border-b px-3 py-2 text-left font-semibold text-slate-600">Hạng mục / Công việc</th>
                        <th className="w-[96px] border-b px-3 py-2 text-right font-semibold text-slate-600">K.lượng</th>
                        <th className="w-[68px] border-b px-3 py-2 text-center font-semibold text-slate-600">Đ.vị</th>
                        {report.type === "WEEKLY" && (
                          <th className="w-[92px] border-b px-3 py-2 text-center font-semibold text-slate-600">Phát sinh</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {displayWorkLines.map((line, idx) => (
                        <tr key={line.id || idx}>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {line.code && (
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-500">
                                  {line.code}
                                </span>
                              )}
                              <span className="font-medium text-slate-800">{line.workContent}</span>
                            </div>
                            {line.notes.map((note) => (
                              <p key={note} className="mt-0.5 text-xs text-slate-500">{note}</p>
                            ))}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-600">{formatReportQuantity(line.quantityToday)}</td>
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
            </div>
          ) : (report.workContent && report.workContent !== "No content") ? (
            <DetailSection
              title={report.type === 'WEEKLY' ? "Tổng hợp công việc" : "Nội dung công việc"}
              icon={<FileText className="w-4 h-4 text-blue-600" />}
              empty={false}
            >
              {report.workContent}
            </DetailSection>
          ) : null}

                    {report.type === 'WEEKLY' && report.weeklyNote?.nextWeekPlanGroups && report.weeklyNote.nextWeekPlanGroups.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <TrendingUp className="w-[18px] h-[18px] text-blue-600" />
                  Kế hoạch thực hiện tuần sau
                  {report.weeklyNote.nextWeekPlanRange?.fromDate && report.weeklyNote.nextWeekPlanRange?.toDate && (
                    <span className="text-xs font-normal text-slate-500">
                      ({report.weeklyNote.nextWeekPlanRange.fromDate} - {report.weeklyNote.nextWeekPlanRange.toDate})
                    </span>
                  )}
                </h4>
                
                <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Công việc</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-600 w-24">K.Lượng</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600 w-20">ĐVT</th>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600">Phụ trách</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600">Mức độ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {report.weeklyNote.nextWeekPlanGroups.map((group: any, gIdx: number) => (
                        <React.Fragment key={gIdx}>
                          <tr className="bg-slate-100/50">
                            <td colSpan={5} className="px-3 py-2 font-semibold text-slate-700">{group.categoryName}</td>
                          </tr>
                          {group.items.map((item: any, iIdx: number) => (
                            <tr key={iIdx}>
                              <td className="px-3 py-2 pl-6 font-medium text-slate-800">{item.workContent}</td>
                              <td className="px-3 py-2 text-right font-medium text-slate-900">{item.plannedQuantity || "-"}</td>
                              <td className="px-3 py-2 text-center">{item.unit || "-"}</td>
                              <td className="px-3 py-2 text-slate-600">{item.ownerName || "-"}</td>
                              <td className="px-3 py-2 text-center">
                                {item.priority === "HIGH" ? <span className="text-red-600 font-medium text-[10px] bg-red-50 px-1.5 py-0.5 rounded border border-red-200">Cao</span> : 
                                 item.priority === "LOW" ? <span className="text-slate-600 font-medium text-[10px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">Thấp</span> : 
                                 <span className="text-blue-600 font-medium text-[10px] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">Vừa</span>}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
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
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Camera className="w-4 h-4 text-sky-600" />
                {report.type === 'WEEKLY' ? 'Ảnh tiêu biểu' : 'Hình ảnh hiện trường'} ({report.photos.length})
              </h4>

              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pl-0 sm:pl-6">
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
          )}

          {/* Attachments */}
          {report.attachments && report.attachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Paperclip className="w-4 h-4 text-slate-500" />
                File đính kèm ({report.attachments.length})
              </h4>

              <div className="space-y-1.5 pl-0 sm:pl-6">
                {report.attachments.map((att) => (
                  <div
                    key={att.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${att.isMissing ? 'bg-slate-50/50 border-slate-200 cursor-not-allowed opacity-80' : 'bg-slate-50 border-slate-100 hover:border-blue-200 cursor-pointer group'}`}
                    onClick={() => { if(!att.isMissing && att.url) window.open(att.url, '_blank') }}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-md shrink-0 ${att.isMissing ? 'bg-slate-200 text-slate-400' : 'bg-blue-50 text-blue-500'}`}>
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium truncate ${att.isMissing ? 'text-slate-500 line-through' : 'text-slate-700'}`}>{att.name}</p>
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

        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] md:px-6 md:py-4">
          {rejectMode ? (
            <div className="space-y-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối (bắt buộc)..."
                className="w-full min-h-[80px] p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
              />
              <div className="flex flex-col-reverse gap-2 md:flex-row md:items-center md:justify-end">
                <Button variant="outline" onClick={() => setRejectMode(false)} disabled={isProcessing} className="h-11 w-full md:h-10 md:w-auto">
                  Hủy
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={isProcessing || !rejectReason.trim()}
                  className="h-11 w-full bg-red-600 text-white hover:bg-red-700 md:h-10 md:w-auto"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  Xác nhận từ chối
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2 md:hidden">
                {canModerateReport && (
                  <Button
                    onClick={handleApprove}
                    disabled={isProcessing}
                    className="h-11 w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Duyệt
                  </Button>
                )}

                {canSubmitReport && (
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    className="h-11 w-full gap-2 bg-blue-600 text-white hover:bg-blue-700"
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
                    className="h-11 w-full border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
                  >
                    Từ chối
                  </Button>
                )}

                {isReportDeletable && (
                  <Button
                    variant="outline"
                    onClick={() => onDelete?.(report)}
                    disabled={isProcessing}
                    className="h-11 w-full border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa
                  </Button>
                )}

                {isReportEditable && (
                  <Button
                    variant="outline"
                    onClick={() => { onClose(); onEdit?.(report); }}
                    disabled={isProcessing}
                    className="h-11 w-full border-blue-200 text-blue-600 hover:border-blue-300 hover:bg-blue-50"
                  >
                    <Edit2 className="w-4 h-4" />
                    Sửa
                  </Button>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-11 gap-1.5"
                    onClick={() => { onClose(); onPrintPreview ? onPrintPreview(report) : window.open(`/print/reports/${report.id}`, '_blank'); }}
                  >
                    <Printer className="w-4 h-4" />
                    In/PDF
                  </Button>
                  <Button variant="outline" className="h-11" onClick={onClose} disabled={isProcessing}>
                    Đóng
                  </Button>
                </div>
              </div>

              <div className="hidden items-center justify-between gap-3 md:flex">
                <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => { onClose(); onPrintPreview ? onPrintPreview(report) : window.open(`/print/reports/${report.id}`, '_blank'); }}
                >
                  <Printer className="w-4 h-4" />
                  In / Xuất PDF
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                  Đóng
                </Button>

                {/* Edit and Delete for DRAFT/REJECTED/SUBMITTED */}
                {currentUser && (
                  <>
                    {isReportDeletable && (
                      <Button
                        variant="outline"
                        onClick={() => onDelete?.(report)}
                        disabled={isProcessing}
                        className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-transparent hover:border-red-200"
                      >
                        <Trash2 className="w-4 h-4" />
                        Xóa
                      </Button>
                    )}
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
                  </>
                )}

                {canSubmitReport && (
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white ml-auto"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Gửi báo cáo
                  </Button>
                )}

                {/* Approve/Reject buttons for ADMIN/DIRECTOR in SUBMITTED */}
                {canModerateReport && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setRejectMode(true)}
                      disabled={isProcessing}
                      className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 ml-auto"
                    >
                      Từ chối
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={isProcessing}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white ml-2"
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
        </div>
      </div>
    </div>
  );
}
