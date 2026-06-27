"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  X,
  Building2,
  Calendar,
  Clock,
  User,
  CloudSun,
  FileText,
  TrendingUp,
  Package,
  Wrench,
  Camera,
  Paperclip,
  MapPin,
  Loader2,
  Save,
  Send,
  UploadCloud,
  Image as ImageIcon,
  File as FileIcon,
  Trash2,
  Plus,
  AlignLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-context";
import { 
  WEATHER_OPTIONS, 
  type CreateReportFormData, 
  type WeatherCondition, 
  type ReportType,
  type ReportWorkLine
} from "./types";
import { getProjectWorkItems, getWeeklyReportPreview } from "@/app/(dashboard)/reports/actions";

interface CreateReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateReportFormData, isDraft: boolean) => void;
  isSubmitting?: boolean;
  activeProjects: {id: string; name: string}[];
  currentUser: { id: string; name: string };
  mode?: "create" | "edit";
  initialReport?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface FormErrors {
  projectId?: string;
  date?: string;
  time?: string;
  workLines?: string; // general error if no worklines
}

const EMPTY_FORM: CreateReportFormData = {
  type: "DAILY",
  projectId: "",
  date: "",
  time: "",
  creatorName: "", // Will be set by currentUser
  weatherCondition: "SUNNY",
  weatherTemperature: undefined,
  
  workLines: [],
  
  materials: "",
  labor: "",
  quality: "",
  issues: "",
  recommendations: "",
  gpsLocation: "",
  photos: [],
  attachments: [],
};

export function CreateReportDialog({ isOpen, onClose, onSubmit, isSubmitting, activeProjects, currentUser, mode = "create", initialReport }: CreateReportDialogProps) {
  if (!isOpen) return null;
  return <CreateReportDialogInner onClose={onClose} onSubmit={onSubmit} isSubmitting={isSubmitting} activeProjects={activeProjects} currentUser={currentUser} mode={mode} initialReport={initialReport} />;
}

function CreateReportDialogInner({ onClose, onSubmit, isSubmitting, activeProjects, currentUser, mode, initialReport }: Omit<CreateReportDialogProps, 'isOpen'>) {
  const toast = useToast();
  const now = new Date();
  
  const [form, setForm] = useState<CreateReportFormData>(() => {
    if (mode === "edit" && initialReport) {
      return {
        type: initialReport.type || "DAILY",
        projectId: initialReport.projectId || "",
        date: initialReport.date || now.toISOString().split("T")[0],
        time: initialReport.time || `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
        creatorName: initialReport.creatorName || currentUser.name,
        weatherCondition: initialReport.weatherCondition || "SUNNY",
        weatherTemperature: initialReport.weatherTemperature,
        workLines: initialReport.workLines && initialReport.workLines.length > 0 
          ? initialReport.workLines 
          : [{ workContent: "", unit: "Lần", quantityToday: 0 }],
        materials: initialReport.materials || "",
        labor: initialReport.labor || "",
        quality: initialReport.quality || "",
        issues: initialReport.issues || "",
        recommendations: initialReport.recommendations || "",
        gpsLocation: initialReport.gpsLocation || "",
        photos: [], // Edit mode does not pre-fill file objects
        attachments: [], // Edit mode does not pre-fill file objects
      };
    }
    return {
      ...EMPTY_FORM,
      creatorName: currentUser.name,
      date: now.toISOString().split("T")[0],
      time: `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      workLines: [{ workContent: "", unit: "Lần", quantityToday: 0 }],
    };
  });
  
  const [workItems, setWorkItems] = useState<{id: string, name: string, unit: string}[]>([]);
  const [loadingWorkItems, setLoadingWorkItems] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const dialogRef = useRef<HTMLDivElement>(null);

  // File refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  // Weekly Preview state
  const [weeklyPreview, setWeeklyPreview] = useState<{
    approvedCount: number;
    pendingCount: number;
    rejectedCount: number;
    missingDays: number;
    totalPhotos: number;
    totalFiles: number;
    aggregatedItems: { workName: string; unit?: string | null; totalQuantity: number }[];
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Fetch work items when project changes
  useEffect(() => {
    if (form.projectId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoadingWorkItems(true);
      getProjectWorkItems(form.projectId).then((items) => {
        setWorkItems(items);
      }).catch(console.error).finally(() => {
        setLoadingWorkItems(false);
      });
    } else {
      setWorkItems([]);
    }
  }, [form.projectId]);

  useEffect(() => {
    return () => {
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !isSubmitting) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isSubmitting]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const updateField = useCallback((field: keyof CreateReportFormData, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value } as CreateReportFormData));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const updateWorkLine = (index: number, field: keyof ReportWorkLine, value: string | number) => {
    setForm(prev => {
      const newLines = [...prev.workLines];
      newLines[index] = { ...newLines[index], [field]: value };
      
      // Auto-fill unit if a wbsItem is selected
      if (field === "wbsItemId" && value) {
        const item = workItems.find(i => i.id === value);
        if (item) {
          newLines[index].workContent = item.name;
          newLines[index].unit = item.unit;
        }
      }
      
      return { ...prev, workLines: newLines };
    });
  };

  const addWorkLine = () => {
    setForm(prev => ({
      ...prev,
      workLines: [...prev.workLines, { workContent: "", unit: "Lần", quantityToday: 0 }]
    }));
  };

  const removeWorkLine = (index: number) => {
    setForm(prev => ({
      ...prev,
      workLines: prev.workLines.filter((_, i) => i !== index)
    }));
  };

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!form.projectId) newErrors.projectId = "Vui lòng chọn công trình";
    if (form.type === 'DAILY' && !form.date) newErrors.date = "Vui lòng chọn ngày";
    
    const validWorkLines = form.workLines.filter(l => l.workContent.trim());
    if (form.type === 'DAILY' && validWorkLines.length === 0) {
      newErrors.workLines = "Vui lòng nhập ít nhất 1 dòng công việc";
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      toast.error("Vui lòng điền đầy đủ các trường bắt buộc");
      const dialogBody = dialogRef.current?.querySelector('.overflow-y-auto');
      if (dialogBody) dialogBody.scrollTop = 0;
      return false;
    }
    
    // Cleanup empty worklines before submit
    if (form.type === 'DAILY') {
      setForm((prev) => ({ ...prev, workLines: validWorkLines }));
    }
    
    return true;
  }

  function handleSubmit(isDraft: boolean) {
    if (!isDraft && !validate()) return;
    
    // For weekly, check if preview exists
    if (form.type === 'WEEKLY' && !weeklyPreview) {
      toast.error("Vui lòng Xem tổng hợp tuần trước khi tạo báo cáo.");
      return;
    }
    if (form.type === 'WEEKLY' && weeklyPreview?.approvedCount === 0) {
      toast.error("Không có báo cáo ngày nào được duyệt trong tuần này!");
      return;
    }

    onSubmit(form, isDraft);
  }

  const handlePreviewWeekly = async () => {
    if (!form.projectId) { toast.error("Vui lòng chọn công trình"); return; }
    if (!form.weekStartDate || !form.weekEndDate) { toast.error("Vui lòng chọn Từ ngày và Đến ngày"); return; }
    
    setLoadingPreview(true);
    setWeeklyPreview(null);
    try {
      const preview = await getWeeklyReportPreview(form.projectId, new Date(form.weekStartDate), new Date(form.weekEndDate));
      setWeeklyPreview(preview);
      toast.success("Đã lấy dữ liệu tổng hợp tuần");
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || "Lỗi khi lấy dữ liệu tổng hợp");
    } finally {
      setLoadingPreview(false);
    }
  };

  // File Handlers
  const handlePhotoFiles = (files: FileList | File[]) => {
    const newFiles = Array.from(files).filter(f => {
      if (!f.type.startsWith("image/") && !f.name.match(/\.(jpe?g|png|gif|webp|bmp|heic)$/i)) {
        toast.error(`File ${f.name} không đúng định dạng. Chỉ chấp nhận ảnh.`);
        return false;
      }
      return true;
    });
    const validFiles = newFiles.filter(f => {
      if (f.size === 0) { toast.error(`File rỗng không hợp lệ`); return false; }
      return true;
    });
    if (form.photos.length + validFiles.length > 10) {
      toast.error("Chỉ được tải tối đa 10 ảnh");
      validFiles.splice(10 - form.photos.length);
    }
    if (validFiles.length > 0) {
      updateField("photos", [...form.photos, ...validFiles]);
      const newUrls = validFiles.map(f => URL.createObjectURL(f));
      setPhotoPreviews(prev => [...prev, ...newUrls]);
    }
  };

  const handleDocFiles = (files: FileList | File[]) => {
    const FILE_EXTS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt'];
    const validFiles = Array.from(files).filter(f => {
      const ext = f.name.toLowerCase().substring(f.name.lastIndexOf('.'));
      if (!FILE_EXTS.includes(ext)) {
        toast.error(`File không đúng định dạng (${ext}). Chỉ chấp nhận PDF, Word, Excel, TXT.`);
        return false;
      }
      if (f.size === 0) { toast.error(`File rỗng không hợp lệ`); return false; }
      return true;
    });
    if (form.attachments.length + validFiles.length > 5) {
      toast.error("Chỉ được tải tối đa 5 file tài liệu");
      validFiles.splice(5 - form.attachments.length);
    }
    if (validFiles.length > 0) {
      updateField("attachments", [...form.attachments, ...validFiles]);
    }
  };

  const inputClass = "w-full h-[42px] px-3 text-[14px] text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-slate-500 disabled:bg-slate-50";
  const textareaClass = "w-full px-3 py-2.5 text-[14px] text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-slate-500 resize-y leading-relaxed";

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center items-end sm:items-center bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200 sm:p-4"
      onClick={!isSubmitting ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        className="flex max-h-[calc(100dvh-0.5rem)] w-full flex-col rounded-t-2xl bg-slate-50 shadow-2xl animate-in slide-in-from-bottom-4 zoom-in-98 duration-300 sm:max-h-[90dvh] sm:max-w-[800px] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white rounded-t-2xl shrink-0 z-20 shadow-sm">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900">{mode === "edit" ? "Sửa báo cáo" : "Tạo báo cáo mới"}</h2>
            <p className="text-sm text-slate-500 mt-0.5">Điền thông tin báo cáo thi công tại công trường</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5 sm:space-y-6 pb-8">
          
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${form.type === 'DAILY' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => updateField('type', 'DAILY')}
            >
              Báo cáo ngày
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${form.type === 'WEEKLY' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => updateField('type', 'WEEKLY')}
            >
              Báo cáo tuần
            </button>
          </div>

          {/* Section 1: Basic info */}
          <div className="space-y-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="flex items-center gap-2 text-[15px] font-bold text-slate-800 pb-3 border-b border-slate-100">
              <FileText className="w-[18px] h-[18px] text-blue-600" />
              Thông tin chung
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Công trình <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
                  <select
                    value={form.projectId}
                    onChange={(e) => updateField("projectId", e.target.value)}
                    className={`${inputClass} pl-[38px] cursor-pointer appearance-none ${errors.projectId ? "border-red-400 bg-red-50" : ""}`}
                  >
                    <option value="" disabled className="text-slate-500">Chọn công trình...</option>
                    {activeProjects.map((p) => (
                      <option key={p.id} value={p.id} className="text-slate-900">{p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Người tạo</label>
                <div className="h-[42px] px-3 bg-slate-100/80 border border-slate-200 rounded-lg flex items-center gap-2 cursor-not-allowed">
                  <User className="w-[18px] h-[18px] text-slate-400" />
                  <span className="text-[14px] text-slate-700 font-medium">{form.creatorName}</span>
                </div>
              </div>

              {form.type === 'DAILY' ? (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Ngày báo cáo <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
                      <input
                        type="date"
                        value={form.date}
                        onChange={(e) => updateField("date", e.target.value)}
                        className={`${inputClass} pl-[38px] ${errors.date ? "border-red-400 bg-red-50" : ""}`}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Giờ báo cáo</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="time"
                        value={form.time}
                        onChange={(e) => updateField("time", e.target.value)}
                        className={`${inputClass} pl-[34px]`}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Từ ngày</label>
                    <input type="date" value={form.weekStartDate || ''} onChange={e => updateField('weekStartDate', e.target.value)} className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700">Đến ngày</label>
                    <input type="date" value={form.weekEndDate || ''} onChange={e => updateField('weekEndDate', e.target.value)} className={inputClass} />
                  </div>
                </>
              )}

              {/* Weather Row */}
              <div className="col-span-1 sm:col-span-2 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Thời tiết</label>
                  <div className="relative">
                    <CloudSun className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <select
                      value={form.weatherCondition}
                      onChange={(e) => updateField("weatherCondition", e.target.value)}
                      className={`${inputClass} pl-[34px] appearance-none cursor-pointer`}
                    >
                      {WEATHER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Nhiệt độ (°C)</label>
                  <input
                    type="number"
                    placeholder="VD: 32"
                    value={form.weatherTemperature || ''}
                    onChange={(e) => updateField("weatherTemperature", e.target.value ? Number(e.target.value) : undefined)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Work content */}
          {form.type === 'DAILY' ? (
            <div className="space-y-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="flex items-center gap-2 text-[15px] font-bold text-slate-800">
                  <TrendingUp className="w-[18px] h-[18px] text-blue-600" />
                  Nội dung thi công
                </h4>
              </div>
              
              <div className="space-y-4 pt-2">
                {form.workLines.map((line, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3 relative">
                    {/* Delete button */}
                    <button 
                      type="button" 
                      onClick={() => removeWorkLine(idx)}
                      className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      title="Xóa dòng"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="pr-8 space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Hạng mục / Công việc</label>
                      <div className="flex gap-2 flex-col sm:flex-row">
                        {workItems.length > 0 && (
                          <select
                            value={line.wbsItemId || ""}
                            onChange={(e) => updateWorkLine(idx, "wbsItemId", e.target.value)}
                            className={`${inputClass} sm:w-1/3 appearance-none cursor-pointer`}
                          >
                            <option value="">-- Chọn hạng mục dự án --</option>
                            {workItems.map(wi => <option key={wi.id} value={wi.id}>{wi.name}</option>)}
                          </select>
                        )}
                        <input
                          type="text"
                          value={line.workContent}
                          onChange={(e) => updateWorkLine(idx, "workContent", e.target.value)}
                          placeholder="Mô tả công việc thực hiện..."
                          className={`${inputClass} flex-1`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Khối lượng</label>
                        <input
                          type="number"
                          value={line.quantityToday || ''}
                          onChange={e => updateWorkLine(idx, "quantityToday", Number(e.target.value))}
                          placeholder="0.0"
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Đơn vị</label>
                        <input
                          type="text"
                          value={line.unit || ''}
                          onChange={e => updateWorkLine(idx, "unit", e.target.value)}
                          placeholder="VD: m3, tấn"
                          className={inputClass}
                        />
                      </div>
                      <div className="space-y-1.5 col-span-2">
                        <label className="text-xs font-semibold text-slate-700">Ghi chú</label>
                        <input
                          type="text"
                          value={line.note || ''}
                          onChange={e => updateWorkLine(idx, "note", e.target.value)}
                          placeholder="Khu vực, tầng, mũi thi công..."
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                {errors.workLines && <p className="text-xs text-red-500 font-medium">{errors.workLines}</p>}

                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={addWorkLine}
                  className="w-full border-dashed border-2 border-slate-300 text-slate-600 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm dòng công việc
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="flex items-center gap-2 text-[15px] font-bold text-slate-800">
                  <AlignLeft className="w-[18px] h-[18px] text-blue-600" />
                  Tổng hợp báo cáo tuần
                </h4>
                <Button type="button" onClick={handlePreviewWeekly} disabled={loadingPreview} variant="outline" className="h-8">
                  {loadingPreview ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  Xem tổng hợp tuần
                </Button>
              </div>

              {weeklyPreview && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">BC Đã duyệt</p>
                      <p className="text-xl font-bold text-emerald-600 mt-1">{weeklyPreview.approvedCount}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Chưa duyệt</p>
                      <p className="text-xl font-bold text-amber-600 mt-1">{weeklyPreview.pendingCount}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Bị từ chối</p>
                      <p className="text-xl font-bold text-red-600 mt-1">{weeklyPreview.rejectedCount}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Ngày trống</p>
                      <p className="text-xl font-bold text-slate-700 mt-1">{weeklyPreview.missingDays}</p>
                    </div>
                  </div>

                  {weeklyPreview.aggregatedItems.length > 0 ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="text-left px-3 py-2 text-slate-600 font-semibold">Hạng mục / Công việc</th>
                            <th className="text-center px-3 py-2 text-slate-600 font-semibold w-24">ĐVT</th>
                            <th className="text-right px-3 py-2 text-slate-600 font-semibold w-32">Khối lượng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {weeklyPreview.aggregatedItems.map((item: { workName: string, unit?: string | null, totalQuantity: number }, idx: number) => (
                            <tr key={idx}>
                              <td className="px-3 py-2">{item.workName}</td>
                              <td className="px-3 py-2 text-center">{item.unit || '-'}</td>
                              <td className="px-3 py-2 text-right font-medium text-slate-900">{item.totalQuantity}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-center text-slate-500 text-sm py-4 border border-dashed border-slate-200 rounded-lg">Không có khối lượng công việc nào được tổng hợp (Yêu cầu báo cáo ngày phải được duyệt).</p>
                  )}
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                <label className="text-sm font-semibold text-slate-700">Đánh giá chung</label>
                <textarea
                  value={form.summary}
                  onChange={e => updateField('summary', e.target.value)}
                  className={`${textareaClass} min-h-[100px]`}
                  placeholder="Tiến độ tổng quan trong tuần, các mốc quan trọng đạt được..."
                />
              </div>
            </div>
          )}

          {/* Section 3: Media & Files */}
          <div className="space-y-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="flex items-center gap-2 text-[15px] font-bold text-slate-800 pb-3 border-b border-slate-100">
              <Camera className="w-[18px] h-[18px] text-blue-600" />
              Hình ảnh & Tài liệu đính kèm
            </h4>
            
            {mode === "edit" && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg mb-4">
                <p className="text-sm text-blue-700">
                  <span className="font-semibold">Lưu ý:</span> Ảnh/file hiện có được quản lý trong chi tiết báo cáo. Bạn chỉ có thể tải thêm ảnh/file mới tại đây.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-3">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700">Hình ảnh hiện trường ({form.photos.length}/10)</label>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" className="flex-1 text-blue-700 border-blue-200 hover:bg-blue-50" onClick={() => cameraInputRef.current?.click()}>
                    <Camera className="w-4 h-4 mr-2" /> Chụp ảnh
                  </Button>
                  <Button type="button" variant="outline" className="flex-1 text-slate-700" onClick={() => photoInputRef.current?.click()}>
                    <ImageIcon className="w-4 h-4 mr-2" /> Chọn ảnh
                  </Button>
                </div>
                <input type="file" accept="image/*" capture="environment" className="hidden" ref={cameraInputRef} onChange={(e) => { if (e.target.files) handlePhotoFiles(e.target.files); e.target.value = ''; }} />
                <input type="file" accept="image/*" multiple className="hidden" ref={photoInputRef} onChange={(e) => { if (e.target.files) handlePhotoFiles(e.target.files); e.target.value = ''; }} />

                <div
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors ${isDraggingPhoto ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingPhoto(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingPhoto(false); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingPhoto(false); handlePhotoFiles(e.dataTransfer.files); }}
                >
                  <UploadCloud className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Kéo thả ảnh vào đây</p>
                </div>

                {form.photos.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {form.photos.map((photo, index) => (
                      <div key={index} className="relative aspect-square rounded-lg border border-slate-200 overflow-hidden group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoPreviews[index]} alt="" className="w-full h-full object-cover" />
                        <button type="button" className="absolute right-1 top-1 rounded-md bg-black/65 p-1 text-white transition-colors hover:bg-rose-600" title="Xóa ảnh" aria-label={`Xóa ảnh ${index + 1}`} onClick={() => { URL.revokeObjectURL(photoPreviews[index]); const newPhotos = form.photos.filter((_, i) => i !== index); const newPreviews = photoPreviews.filter((_, i) => i !== index); updateField("photos", newPhotos); setPhotoPreviews(newPreviews); }}>
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700">Tài liệu đính kèm ({form.attachments.length}/5)</label>
                <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" className="hidden" ref={fileInputRef} onChange={(e) => { if (e.target.files) handleDocFiles(e.target.files); e.target.value = ''; }} />
                <div
                  className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors cursor-pointer h-[126px] flex flex-col justify-center ${isDraggingFile ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFile(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFile(false); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingFile(false); handleDocFiles(e.dataTransfer.files); }}
                >
                  <Paperclip className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">Bấm hoặc kéo thả file</p>
                </div>
                {form.attachments.length > 0 && (
                  <div className="space-y-2">
                    {form.attachments.map((file, index) => (
                      <div key={index} className="flex items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg gap-3">
                        <FileIcon className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                          <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button type="button" className="p-1.5 text-slate-400 hover:text-red-500" onClick={() => updateField("attachments", form.attachments.filter((_, i) => i !== index))}><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-1.5 pt-2">
              <label className="text-sm font-semibold text-slate-700">Vị trí GPS</label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-slate-400 pointer-events-none" />
                <input type="text" value={form.gpsLocation} onChange={(e) => updateField("gpsLocation", e.target.value)} placeholder="VD: 21.02, 105.81" className={`${inputClass} pl-[38px]`} />
              </div>
            </div>
          </div>

          {/* Section 4: Resources */}
          <div className="space-y-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="flex items-center gap-2 text-[15px] font-bold text-slate-800 pb-3 border-b border-slate-100">
              <Package className="w-[18px] h-[18px] text-blue-600" />
              Nguồn lực sử dụng
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Vật tư sử dụng</label>
                <textarea value={form.materials} onChange={(e) => updateField("materials", e.target.value)} className={`${textareaClass} min-h-[80px]`} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Nhân công / Máy móc</label>
                <textarea value={form.labor} onChange={(e) => updateField("labor", e.target.value)} className={`${textareaClass} min-h-[80px]`} />
              </div>
            </div>
          </div>

          {/* Section 5: Quality & Issues */}
          <div className="space-y-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
            <h4 className="flex items-center gap-2 text-[15px] font-bold text-slate-800 pb-3 border-b border-slate-100">
              <Wrench className="w-[18px] h-[18px] text-blue-600" />
              Kỹ thuật & Phát sinh
            </h4>
            <div className="space-y-1.5 pt-1">
              <label className="text-sm font-semibold text-slate-700">Kỹ thuật / Chất lượng</label>
              <textarea value={form.quality} onChange={(e) => updateField("quality", e.target.value)} className={`${textareaClass} min-h-[80px]`} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Vấn đề phát sinh</label>
                <textarea value={form.issues} onChange={(e) => updateField("issues", e.target.value)} className={`${textareaClass} min-h-[80px]`} />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Kiến nghị / Đề xuất</label>
                <textarea value={form.recommendations} onChange={(e) => updateField("recommendations", e.target.value)} className={`${textareaClass} min-h-[80px]`} />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-slate-200 bg-white rounded-b-2xl shrink-0 z-20 shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)]">
          <Button variant="outline" onClick={() => handleSubmit(true)} disabled={isSubmitting} className="gap-2 flex-1 sm:flex-none h-11 px-6">
            {isSubmitting ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <Save className="w-[18px] h-[18px]" />} 
            {isSubmitting ? "Đang xử lý..." : "Lưu thay đổi"}
          </Button>
          {mode === "create" && (
            <Button onClick={() => handleSubmit(false)} disabled={isSubmitting} className="gap-2 flex-1 sm:flex-none h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white">
              {isSubmitting ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <Send className="w-[18px] h-[18px]" />} 
              {isSubmitting ? "Đang xử lý..." : "Gửi báo cáo"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
