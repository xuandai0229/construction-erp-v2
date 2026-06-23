"use client";

import { useEffect, useState } from "react";
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
  AlignLeft
} from "lucide-react";
import type { FieldReport, ApprovalHistoryEntry, WeatherCondition } from "./types";
import { getStatusLabel, getStatusVariant, WEATHER_OPTIONS } from "./types";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-context";

interface ReportDetailDrawerProps {
  report: FieldReport | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (reportId: string, note?: string) => void;
  onReject?: (reportId: string, reason: string) => void;
  onSubmit?: (reportId: string) => void;
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
      case "REJECTED": return <XCircle className="w-3.5 h-3.5 text-red-500" />;
      case "RETURNED": return <RotateCcw className="w-3.5 h-3.5 text-amber-500" />;
    }
  }

  function getActionLabel(action: ApprovalHistoryEntry["action"]) {
    switch (action) {
      case "SUBMITTED": return "Đã gửi";
      case "APPROVED": return "Đã duyệt";
      case "REJECTED": return "Từ chối";
      case "RETURNED": return "Trả lại";
    }
  }

  function getActionColor(action: ApprovalHistoryEntry["action"]) {
    switch (action) {
      case "SUBMITTED": return "bg-blue-100 border-blue-200";
      case "APPROVED": return "bg-emerald-100 border-emerald-200";
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
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
        <Camera className="w-4 h-4 text-slate-300 mb-1" />
        <span className="text-[10px] text-slate-400 text-center px-1">Không tải được ảnh</span>
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
  onViewGallery,
  currentUser
}: ReportDetailDrawerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [history, setHistory] = useState<{ id: string; action: "SUBMITTED" | "APPROVED" | "REJECTED" | "RETURNED"; actor: string; role: string; timestamp: string; detail?: string }[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
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

  if (!isOpen || !report) return null;

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

  const validWorkLines = (report.workLines || []).filter(l => 
    (l.workContent && l.workContent !== "No content") || (l.quantityToday !== undefined && l.quantityToday > 0)
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/30 backdrop-blur-[2px] animate-in fade-in duration-200"
      onClick={!isProcessing ? onClose : undefined}
    >
      <div
        className="w-full max-w-xl sm:max-w-2xl bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-200 shrink-0 bg-white">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 truncate" title={report.reportNo}>{report.code}</h2>
              <StatusBadge variant={getStatusVariant(report.status)} size="sm">
                {getStatusLabel(report.status)}
              </StatusBadge>
              <StatusBadge variant="neutral" size="sm">
                {report.type === 'WEEKLY' ? 'Báo cáo tuần' : 'Báo cáo ngày'}
              </StatusBadge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5 truncate">{report.projectName}</p>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0 disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 pb-8 space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg px-3 py-2.5 space-y-0.5">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Người tạo</p>
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {report.creatorName}
              </p>
              <p className="text-xs text-slate-500">{report.creatorRole}</p>
            </div>
            <div className="bg-slate-50 rounded-lg px-3 py-2.5 space-y-0.5">
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Thời gian</p>
              <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {report.type === 'WEEKLY' ? `${report.weekStartDate} - ${report.weekEndDate}` : report.date}
              </p>
              {report.type === 'DAILY' && <p className="text-xs text-slate-500">{report.time}</p>}
            </div>
            
            {report.type === 'DAILY' && (
              <div className="bg-slate-50 rounded-lg px-3 py-2.5 space-y-0.5">
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Thời tiết</p>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <WeatherIcon weather={report.weatherCondition} />
                  {weatherLabel} {report.weatherTemperature ? `${report.weatherTemperature}°C` : ''}
                </p>
              </div>
            )}

            {report.gpsLocation && (
              <div className="bg-slate-50 rounded-lg px-3 py-2.5 space-y-0.5">
                <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Vị trí GPS</p>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {report.gpsLocation}
                </p>
              </div>
            )}
          </div>

          {report.type === 'WEEKLY' && report.summary && (
            <DetailSection
              title="Đánh giá tuần"
              icon={<AlignLeft className="w-4 h-4 text-blue-600" />}
            >
              {report.summary}
            </DetailSection>
          )}

          {/* Work Lines Table or Content */}
          {validWorkLines.length > 0 ? (
            <div className="space-y-2">
              <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Nội dung công việc ({validWorkLines.length})
              </h4>
              <div className="pl-0 sm:pl-6">
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-slate-600 border-b">Hạng mục / Công việc</th>
                        <th className="px-3 py-2 text-right font-semibold text-slate-600 border-b w-[80px]">K.lượng</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600 border-b w-[60px]">Đ.vị</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {validWorkLines.map((line, idx) => (
                        <tr key={line.id || idx}>
                          <td className="px-3 py-2">
                            <span className="font-medium text-slate-800">{line.workContent}</span>
                            {line.note && <p className="text-xs text-slate-500 mt-0.5">{line.note}</p>}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-blue-600">{line.quantityToday}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{line.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <DetailSection
              title="Nội dung công việc"
              icon={<FileText className="w-4 h-4 text-blue-600" />}
              empty={false}
            >
              {(!report.workContent || report.workContent === "No content") ? "Chưa có nội dung công việc" : report.workContent}
            </DetailSection>
          )}

          <DetailSection
            title="Vật tư sử dụng"
            icon={<Package className="w-4 h-4 text-amber-600" />}
            empty={!report.materials}
          >
            {report.materials}
          </DetailSection>

          <DetailSection
            title="Nhân công / Máy móc"
            icon={<Users className="w-4 h-4 text-sky-600" />}
            empty={!report.labor}
          >
            {report.labor}
          </DetailSection>

          <DetailSection
            title="Kỹ thuật / Chất lượng"
            icon={<Wrench className="w-4 h-4 text-violet-600" />}
            empty={!report.quality}
          >
            {report.quality}
          </DetailSection>

          <DetailSection
            title="Vấn đề phát sinh"
            icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
            empty={!report.issues}
          >
            {report.issues}
          </DetailSection>

          <DetailSection
            title="Kiến nghị / Đề xuất"
            icon={<Lightbulb className="w-4 h-4 text-amber-500" />}
            empty={!report.recommendations}
          >
            {report.recommendations}
          </DetailSection>

          {/* Photo gallery */}
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Camera className="w-4 h-4 text-sky-600" />
              Hình ảnh hiện trường ({report.photos?.length || 0})
            </h4>
            {!report.photos || report.photos.length === 0 ? (
              <p className="text-sm text-slate-500 italic pl-0 sm:pl-6">Chưa có ảnh/file đính kèm</p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pl-0 sm:pl-6">
                {report.photos.map((photo, index) => (
                  <div
                    key={photo.id}
                    className="aspect-square bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 overflow-hidden hover:border-blue-300 transition-colors cursor-pointer relative group"
                    onClick={() => onViewGallery?.(report, index)}
                  >
                    {photo.url ? (
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
            )}
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Paperclip className="w-4 h-4 text-slate-500" />
              File đính kèm ({report.attachments?.length || 0})
            </h4>
            {!report.attachments || report.attachments.length === 0 ? (
              <p className="text-sm text-slate-500 italic pl-0 sm:pl-6">Chưa có ảnh/file đính kèm</p>
            ) : (
              <div className="space-y-1.5 pl-0 sm:pl-6">
                {report.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-3 p-2.5 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer group"
                    onClick={() => { if(att.url) window.open(att.url, '_blank') }}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-blue-50 text-blue-500 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-700 truncate">{att.name}</p>
                      <p className="text-xs text-slate-400">{att.size}</p>
                    </div>
                    <Download className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Approval History */}
          <div className="space-y-3">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <History className="w-4 h-4 text-slate-500" />
              Lịch sử duyệt
            </h4>
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
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-slate-50 px-5 sm:px-6 py-4">
          {rejectMode ? (
            <div className="space-y-3">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối (bắt buộc)..."
                className="w-full min-h-[80px] p-2.5 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none resize-none"
              />
              <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" onClick={() => setRejectMode(false)} disabled={isProcessing}>
                  Hủy
                </Button>
                <Button
                  onClick={handleReject}
                  disabled={isProcessing || !rejectReason.trim()}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {isProcessing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  Xác nhận từ chối
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => window.open(`/print/reports/${report.id}`, '_blank')}
                >
                  <Printer className="w-4 h-4" />
                  In / Xuất PDF
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                  Đóng
                </Button>

                {/* Submit button for creator in DRAFT/REJECTED */}
                {(report.status === "DRAFT" || report.status === "REJECTED") && currentUser?.id === report.createdById && (
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing}
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Gửi báo cáo
                  </Button>
                )}

                {/* Approve/Reject buttons for ADMIN/DIRECTOR in SUBMITTED */}
                {report.status === "SUBMITTED" && currentUser && ['ADMIN', 'DIRECTOR'].includes(currentUser.role || '') && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setRejectMode(true)}
                      disabled={isProcessing}
                      className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                    >
                      Từ chối
                    </Button>
                    <Button
                      onClick={handleApprove}
                      disabled={isProcessing}
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      Duyệt
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
