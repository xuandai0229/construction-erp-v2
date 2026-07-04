import React, { useState, useEffect, useMemo, useCallback } from "react";
import { X, Save, Send, AlertCircle, FileText, CheckCircle2, ListTodo, FileImage, Files, MapPin, Building2, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GeneralInfoCard } from "./create-dialog/general-info-card";
import { WorkPicker, type PickerWorkItem } from "./create-dialog/work-picker";
import { SelectedWorkCard } from "./create-dialog/selected-work-card";
import { ResourcesAndQuality } from "./create-dialog/resources-and-quality";
import { AttachmentsCard } from "./create-dialog/attachments-card";
import { type CreateReportFormData, type FieldReport, type ReportWorkLine } from "./types";
import { getProjectWorkItems } from "@/app/(dashboard)/reports/actions";

interface CreateReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateReportFormData, isDraft: boolean) => Promise<void>;
  initialReport?: FieldReport | null;
  mode?: "create" | "edit";
  activeProjects: { id: string; name: string }[];
  currentUser: { id: string; name: string; role?: string };
  isSubmitting: boolean;
  currentProjectId?: string;
}

export function CreateReportDialog({
  isOpen,
  onClose,
  onSubmit,
  initialReport,
  mode = "create",
  activeProjects,
  currentUser,
  isSubmitting,
  currentProjectId,
}: CreateReportDialogProps) {
  const toast = useToast();
  
  // Default Form
  const getDefaultForm = useCallback((): CreateReportFormData => {
    const now = new Date();
    return {
      type: "DAILY",
      projectId: currentProjectId || (activeProjects.length === 1 ? activeProjects[0].id : ""), // Automatically select if 1 project
      date: now.toISOString().split("T")[0],
      time: now.toTimeString().split(" ")[0].slice(0, 5),
      creatorName: currentUser.name,
      weatherCondition: "SUNNY",
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
  }, [currentUser.name, currentProjectId]);

  // States
  const [form, setForm] = useState<CreateReportFormData>(getDefaultForm());
  const [initialFormState, setInitialFormState] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showConfirmClose, setShowConfirmClose] = useState(false);
  const [workItemsData, setWorkItemsData] = useState<any[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  // Load Initial Data
  useEffect(() => {
    if (isOpen) {
      if (initialReport) {
        const loadedForm = {
          type: initialReport.type,
          projectId: initialReport.projectId,
          date: initialReport.date,
          time: initialReport.time,
          creatorName: initialReport.creatorName,
          weatherCondition: initialReport.weatherCondition,
          weatherTemperature: initialReport.weatherTemperature,
          workLines: initialReport.workLines.map(line => ({ ...line })),
          materials: initialReport.materials,
          labor: initialReport.labor,
          quality: initialReport.quality,
          issues: initialReport.issues,
          recommendations: initialReport.recommendations,
          gpsLocation: initialReport.gpsLocation || "",
          photos: [], // In a real app, load existing photos
          attachments: [],
        };
        setForm(loadedForm);
        setInitialFormState(JSON.stringify(loadedForm));
      } else {
        const d = getDefaultForm();
        setForm(d);
        setInitialFormState(JSON.stringify(d));
      }
      setErrors({});
    }
  }, [isOpen, initialReport, getDefaultForm]);

  // Load Baseline Items based on Project
  useEffect(() => {
    if (!form.projectId) {
      setWorkItemsData([]);
      return;
    }
    async function loadItems() {
      setIsLoadingItems(true);
      try {
        const items = await getProjectWorkItems(form.projectId, form.date);
        setWorkItemsData(items || []);
      } catch (e) {
        console.error("Failed to load baseline items:", e);
      } finally {
        setIsLoadingItems(false);
      }
    }
    loadItems();
  }, [form.projectId, form.date]);

  // Derived Summary
  const selectedCount = form.workLines.length;
  const totalQtyToday = form.workLines.reduce((sum, line) => sum + (Number(line.quantityToday) || 0), 0);
  const isDirty = JSON.stringify(form) !== initialFormState;

  // Updaters
  const updateField = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const updateWorkLine = (index: number, field: keyof Omit<ReportWorkLine, 'id'>, value: any) => {
    setForm(prev => {
      const nextLines = [...prev.workLines];
      nextLines[index] = { ...nextLines[index], [field]: value };
      return { ...prev, workLines: nextLines };
    });
  };

  const removeWorkLine = (index: number) => {
    setForm(prev => {
      const nextLines = [...prev.workLines];
      nextLines.splice(index, 1);
      return { ...prev, workLines: nextLines };
    });
  };

  const handleSelectWorkItems = (items: PickerWorkItem[]) => {
    const newLines = items.map(item => {
      const existing = form.workLines.find(l => l.fieldProgressItemId === item.fieldProgressItemId);
      if (existing) return null;
      
      return {
        fieldProgressItemId: item.fieldProgressItemId,
        categoryName: item.categoryName,
        code: item.code,
        workContent: item.name,
        unit: item.unit,
        designQuantity: item.designQuantity,
        quantityBefore: item.approvedCumulative,
        approvedCumulative: item.approvedCumulative,
        remainingQuantity: item.remainingQuantity,
        quantityToday: 0,
        note: "",
        proposalNote: "",
      } as ReportWorkLine;
    }).filter(Boolean) as ReportWorkLine[];

    if (newLines.length > 0) {
      setForm(prev => ({
        ...prev,
        workLines: [...prev.workLines, ...newLines]
      }));
      toast.success(`Đã thêm ${newLines.length} công việc vào báo cáo.`);
      if (errors.workLines) {
        setErrors(prev => { const n = {...prev}; delete n.workLines; return n; });
      }
    }
  };

  // Actions
  const handleClose = () => {
    if (isDirty && !isSubmitting) {
      setShowConfirmClose(true);
    } else {
      onClose();
    }
  };

  const validate = (isDraft: boolean): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.projectId) newErrors.projectId = "Vui lòng chọn công trình";
    if (!form.date) newErrors.date = "Vui lòng chọn ngày";
    
    if (!isDraft && form.type === "DAILY" && form.workLines.length === 0) {
      newErrors.workLines = "Báo cáo ngày cần ít nhất 1 công việc. Bấm Thêm khối lượng để chọn công việc từ bảng khối lượng gốc.";
    }
    
    const hasOverQty = form.workLines.some(l => (l.quantityToday || 0) > (l.remainingQuantity || 0));
    if (!isDraft && hasOverQty) {
      newErrors.workLines = "Khối lượng không được vượt phần còn lại.";
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      if (newErrors.workLines) {
        document.getElementById('work-lines-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }
    return true;
  };

  const submitAction = async (action: "DRAFT" | "SUBMIT") => {
    const isDraft = action === "DRAFT";
    if (!validate(isDraft)) return;
    try {
      await onSubmit(form, isDraft);
      setInitialFormState(JSON.stringify(form)); // Reset dirty
    } catch (e: any) {
      toast.error(e.message || "Đã xảy ra lỗi không mong muốn khi tạo báo cáo");
    }
  };

  if (!isOpen) return null;

  // Picker format items
  const pickerItems: PickerWorkItem[] = workItemsData.map(w => ({
    id: w.id,
    fieldProgressItemId: w.id,
    code: w.code,
    categoryName: w.categoryName,
    name: w.name,
    workContent: w.name,
    designQuantity: Number(w.designQuantity || 0),
    approvedCumulative: Number(w.cumulativeBefore || 0),
    todayQuantity: 0,
    remainingQuantity: Math.max(0, Number(w.designQuantity || 0) - Number(w.cumulativeBefore || 0)),
    unit: w.unit || 'Lần',
    status: "OPEN"
  }));

  const canSaveDraft = !!form.projectId && !!form.date;
  const canSubmit = !!form.projectId && !!form.date && (form.type === "WEEKLY" || form.workLines.length > 0);

  return (
    <>
      <div className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200 overflow-hidden">
        <div className="bg-slate-50 w-full h-full sm:h-auto sm:max-h-full sm:rounded-2xl shadow-2xl flex flex-col relative w-[calc(100vw-16px)] md:w-[min(1180px,calc(100vw-48px))] max-w-6xl overflow-hidden animate-in zoom-in-95 duration-300">
          
          {/* Sticky Header */}
          <div className="bg-white px-4 sm:px-6 py-4 border-b border-slate-200 flex items-center justify-between z-20 shrink-0 shadow-sm relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                  {initialReport ? "Chỉnh sửa báo cáo" : "Tạo báo cáo mới"}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[12px] text-slate-500">Điền thông tin báo cáo thi công tại công trường</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`hidden sm:inline-flex text-[11px] font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${initialReport?.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                {initialReport ? initialReport.status : "Tạo Mới"}
              </span>
              <button onClick={handleClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6">
            <div className="max-w-none md:max-w-[1100px] mx-auto space-y-6">
              
              {/* Tabs */}
              <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm inline-flex mb-2">
                <button
                  onClick={() => updateField('type', 'DAILY')}
                  className={`px-6 py-2.5 rounded-lg text-[14px] font-bold transition-all ${form.type === 'DAILY' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  Báo cáo ngày
                </button>
                <button
                  onClick={() => updateField('type', 'WEEKLY')}
                  className={`px-6 py-2.5 rounded-lg text-[14px] font-bold transition-all ${form.type === 'WEEKLY' ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  Báo cáo tuần
                </button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="bg-blue-50 p-2.5 rounded-lg text-blue-600"><ListTodo className="w-5 h-5" /></div>
                  <div><p className="text-[11px] font-bold text-slate-400 uppercase">Công việc</p><p className="font-bold text-slate-800 text-[18px] leading-tight">{selectedCount}</p></div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600"><CheckCircle2 className="w-5 h-5" /></div>
                  <div><p className="text-[11px] font-bold text-slate-400 uppercase">Tổng KL nhập</p><p className="font-bold text-slate-800 text-[18px] leading-tight">{totalQtyToday.toLocaleString()}</p></div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="bg-purple-50 p-2.5 rounded-lg text-purple-600"><FileImage className="w-5 h-5" /></div>
                  <div><p className="text-[11px] font-bold text-slate-400 uppercase">Ảnh đính kèm</p><p className="font-bold text-slate-800 text-[18px] leading-tight">{form.photos.length}</p></div>
                </div>
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <div className="bg-amber-50 p-2.5 rounded-lg text-amber-600"><Files className="w-5 h-5" /></div>
                  <div><p className="text-[11px] font-bold text-slate-400 uppercase">Tài liệu</p><p className="font-bold text-slate-800 text-[18px] leading-tight">{form.attachments.length}</p></div>
                </div>
              </div>

              {/* General Info */}
              <GeneralInfoCard form={form} updateField={updateField} activeProjects={activeProjects} errors={errors} />

              {/* Work Lines Section (Only for DAILY) */}
              {form.type === 'DAILY' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="work-lines-section">
                  <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-10">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-blue-100 p-1.5 rounded-lg text-blue-600">
                        <ListTodo className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-[15px]">Khối lượng thực hiện hôm nay</h3>
                        <p className="text-[12px] text-slate-500 mt-0.5">Chọn công việc từ bảng khối lượng gốc của công trình</p>
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      disabled={!form.projectId}
                      onClick={() => setIsPickerOpen(true)}
                      className={`${!form.projectId ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'} font-bold h-10 px-5 rounded-xl transition-all whitespace-nowrap flex items-center`}
                      title={!form.projectId ? "Chọn công trình trước" : "Thêm công việc"}
                    >
                      <Plus className="w-4 h-4 mr-1.5" /> Thêm khối lượng
                    </Button>
                  </div>

                  <div className="p-4 sm:p-5 bg-slate-50/30">
                    {!form.projectId ? (
                      <div className="py-10 flex flex-col items-center justify-center text-center bg-white rounded-xl border border-dashed border-slate-200">
                        <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                          <Building2 className="w-6 h-6 text-slate-400" />
                        </div>
                        <h4 className="font-bold text-slate-700 text-[15px]">Chưa chọn công trình</h4>
                        <p className="text-[13px] text-slate-500 mt-1 max-w-[300px]">
                          Vui lòng chọn công trình ở phần Thông tin chung trước khi thêm khối lượng công việc.
                        </p>
                      </div>
                    ) : isLoadingItems ? (
                      <div className="py-10 flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
                        <p className="text-[13px] text-slate-500 font-medium">Đang tải danh sách công việc gốc...</p>
                      </div>
                    ) : form.workLines.length === 0 ? (
                      <div className="py-10 flex flex-col items-center justify-center text-center bg-white rounded-xl border border-dashed border-blue-200">
                        <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-3">
                          <ListTodo className="w-6 h-6 text-blue-400" />
                        </div>
                        <h4 className="font-bold text-slate-700 text-[15px]">Chưa có khối lượng trong báo cáo</h4>
                        <p className="text-[13px] text-slate-500 mt-1 mb-4 max-w-[350px]">
                          Bấm Thêm khối lượng để chọn công việc từ bảng khối lượng gốc.
                        </p>
                        <Button
                          type="button"
                          onClick={() => setIsPickerOpen(true)}
                          className="bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold h-9 px-5 rounded-lg"
                        >
                          <span className="flex items-center"><Plus className="w-4 h-4 mr-1.5" /> Thêm khối lượng</span>
                        </Button>
                      </div>
                    ) : (
                      
                      <div className="space-y-4">
                        {errors.workLines && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-[13px] font-medium flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{errors.workLines}</span>
                          </div>
                        )}
                        
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                          <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead className="bg-slate-50 border-b border-slate-200 text-[12px] uppercase text-slate-500 font-bold sticky top-0 z-10">
                              <tr>
                                <th className="w-12 px-3 py-3 text-center">STT</th>
                                <th className="px-4 py-3">Công việc</th>
                                <th className="w-20 px-2 py-3 text-center">ĐVT</th>
                                <th className="w-24 px-3 py-3 text-right">TK/Duyệt</th>
                                <th className="w-24 px-3 py-3 text-right">Còn lại</th>
                                <th className="w-32 px-4 py-3 text-right text-blue-700">KL hôm nay</th>
                                <th className="w-48 px-3 py-3">Ghi chú</th>
                                <th className="w-48 px-3 py-3">Đề xuất</th>
                                <th className="w-12 px-3 py-3 text-center">Xóa</th>
                              </tr>
                            </thead>
                            <tbody className="text-[13px] align-top">
                              {form.workLines.map((line, idx) => {
                                const design = Number(line.designQuantity || 0);
                                const before = Number(line.approvedCumulative || 0);
                                const today = Number(line.quantityToday || 0);
                                const remaining = Number(line.remainingQuantity || 0);
                                const isOver = today > remaining;
                                const isDone = remaining <= 0 && today === 0;
                                const inputClass = "w-full h-9 px-2.5 text-[13px] text-slate-900 bg-white border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400";
                                
                                return (
                                  <tr key={idx} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isOver ? 'bg-red-50/30' : ''}`}>
                                    <td className="px-3 py-4 text-center font-medium text-slate-400">{idx + 1}</td>
                                    <td className="px-4 py-4">
                                      {line.categoryName && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 line-clamp-1">{line.categoryName}</div>}
                                      <div className="font-bold text-slate-800 line-clamp-2">
                                        {line.code ? <span className="text-blue-600 mr-1.5 font-mono text-[12px]">[{line.code}]</span> : null}
                                        {line.workContent}
                                      </div>
                                      {isDone && !isOver && <div className="text-[11px] text-emerald-600 font-bold mt-1">Đã hoàn thành</div>}
                                    </td>
                                    <td className="px-2 py-4 text-center font-medium text-slate-600">{line.unit}</td>
                                    <td className="px-3 py-4 text-right">
                                      <div className="font-medium text-slate-600">{design}</div>
                                      <div className="text-[11px] text-emerald-600 font-medium">{before}</div>
                                    </td>
                                    <td className="px-3 py-4 text-right font-black text-slate-900">{remaining}</td>
                                    <td className="px-4 py-3">
                                      <div className="relative">
                                        <input
                                          type="number"
                                          value={line.quantityToday || ''}
                                          onChange={e => updateWorkLine(idx, "quantityToday", Number(e.target.value))}
                                          placeholder="0.0"
                                          className={`${inputClass} pr-1 font-bold text-right ${isOver ? 'border-red-400 bg-red-50 text-red-700' : ''}`}
                                        />
                                      </div>
                                      {isOver && <div className="text-[10px] text-red-600 font-bold mt-1 leading-tight text-right">Vượt {remaining}!</div>}
                                    </td>
                                    <td className="px-3 py-3">
                                      <input
                                        type="text"
                                        value={line.note || ''}
                                        onChange={e => updateWorkLine(idx, "note", e.target.value)}
                                        placeholder="Vị trí..."
                                        className={inputClass}
                                      />
                                    </td>
                                    <td className="px-3 py-3">
                                      <input
                                        type="text"
                                        value={line.proposalNote || ''}
                                        onChange={e => updateWorkLine(idx, "proposalNote", e.target.value)}
                                        placeholder="Xử lý..."
                                        className={inputClass}
                                      />
                                    </td>
                                    <td className="px-3 py-4 text-center">
                                      <button 
                                        type="button" 
                                        onClick={() => removeWorkLine(idx)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors mx-auto block"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Cards */}
                        <div className="md:hidden space-y-4">
                          {form.workLines.map((line, idx) => (
                            <SelectedWorkCard
                              key={idx}
                              line={line}
                              index={idx}
                              updateWorkLine={updateWorkLine}
                              removeWorkLine={removeWorkLine}
                            />
                          ))}
                        </div>

                      </div>
                    )}
                  </div>
                </div>
              )}

              {form.type === 'WEEKLY' && (
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 sm:p-8 text-center">
                  <h3 className="font-bold text-blue-800 mb-2">Chế độ báo cáo tuần</h3>
                  <p className="text-blue-600 text-sm">Khối lượng sẽ được tự động tổng hợp từ các báo cáo ngày đã được duyệt trong tuần. Bạn có thể bổ sung nhận xét chung trong phần Chất lượng & Vướng mắc.</p>
                </div>
              )}

              {/* Photos & Attachments */}
              <AttachmentsCard
                photos={form.photos}
                attachments={form.attachments}
                onAddPhotos={e => {
                  if (e.target.files) setForm(prev => ({ ...prev, photos: [...prev.photos, ...Array.from(e.target.files!)] }));
                }}
                onRemovePhoto={idx => {
                  setForm(prev => {
                    const arr = [...prev.photos]; arr.splice(idx, 1);
                    return { ...prev, photos: arr };
                  });
                }}
                onAddFiles={e => {
                  if (e.target.files) setForm(prev => ({ ...prev, attachments: [...prev.attachments, ...Array.from(e.target.files!)] }));
                }}
                onRemoveFile={idx => {
                  setForm(prev => {
                    const arr = [...prev.attachments]; arr.splice(idx, 1);
                    return { ...prev, attachments: arr };
                  });
                }}
              />

              {/* Resources & Quality */}
              <ResourcesAndQuality form={form} updateField={updateField} />

            </div>
          </div>

          {/* Sticky Footer Action Bar */}
          <div className="bg-white border-t border-slate-200 p-4 sm:px-6 shrink-0 z-20 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
            <div className="max-w-none md:max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
              <div className="text-[12px] font-medium hidden sm:block">
                {!form.projectId ? (
                  <span className="text-red-500">Vui lòng chọn công trình trước</span>
                ) : (
                  <span className="text-slate-500">Có thể lưu nháp trước, bổ sung khối lượng sau. Gửi báo cáo cần ít nhất 1 công việc.</span>
                )}
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 sm:flex-none h-11 rounded-xl text-slate-600 font-bold hover:bg-slate-50 border-slate-200"
                >
                  Hủy
                </Button>
                <Button
                  variant="outline"
                  onClick={() => submitAction("DRAFT")}
                  disabled={isSubmitting || !canSaveDraft}
                  className="flex-1 sm:flex-none h-11 rounded-xl bg-slate-50 text-slate-700 hover:bg-slate-100 font-bold border-slate-200"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Lưu nháp
                </Button>
                <Button
                  onClick={() => submitAction("SUBMIT")}
                  disabled={isSubmitting || !canSubmit}
                  className="flex-1 sm:flex-none h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-500/20"
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Đang xử lý...
                    </span>
                  ) : (
                    <span className="flex items-center">
                      <Send className="w-4 h-4 mr-2" />
                      Gửi báo cáo
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <WorkPicker
        isOpen={isPickerOpen}
        onClose={() => setIsPickerOpen(false)}
        workItems={pickerItems}
        onSelect={handleSelectWorkItems}
        isLoading={isLoadingItems}
      />

      
      {showConfirmClose && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Bạn muốn xử lý báo cáo đang nhập thế nào?</h3>
              <p className="text-[14px] text-slate-500 mb-6">Có dữ liệu bạn đã nhập nhưng chưa được lưu lại.</p>
              
              <div className="flex flex-col gap-3">
                {canSaveDraft && (
                  <Button 
                    onClick={() => { setShowConfirmClose(false); submitAction("DRAFT"); }} 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 rounded-xl"
                  >
                    <Save className="w-4 h-4 mr-2" /> Lưu bản nháp
                  </Button>
                )}
                <Button 
                  onClick={() => { setShowConfirmClose(false); onClose(); }} 
                  variant="outline" 
                  className="w-full border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold h-11 rounded-xl"
                >
                  <X className="w-4 h-4 mr-2" /> Bỏ thay đổi & Thoát
                </Button>
                <Button 
                  onClick={() => setShowConfirmClose(false)} 
                  variant="ghost" 
                  className="w-full text-slate-600 hover:bg-slate-100 font-bold h-11 rounded-xl"
                >
                  Tiếp tục chỉnh sửa
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

