"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, Save, Send, AlertTriangle, Copy, Eraser } from "lucide-react";
import { useToast } from "@/components/ui/toast-context";
import { CloseButton } from "@/components/ui/close-button";
import { AppDrawer } from "@/components/ui/app-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createMaterialRequest, updateMaterialRequest } from "@/app/actions/material-request";
import { EnterpriseCombobox, type EnterpriseComboboxOption } from "@/components/ui/enterprise-combobox";
import { fromDateInputValue, safeParseDate, toDateInputValue } from "@/lib/date-utils";
import { DateFieldVN } from "@/components/ui/date-field-vn";
import { cn } from "@/lib/utils";
import { MaterialRowActionMenu } from "@/components/materials/materials-ui";
import { NumericInput } from "@/components/ui/numeric-input";
import type { MaterialItemDto, ProjectStockDto } from "@/app/(dashboard)/materials/actions";

type MaterialSourceMode = "CATALOG" | "CUSTOM";
type WorkSourceMode = "CATALOG" | "CUSTOM";

function createBlankRequestItem() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    materialSourceMode: "CATALOG" as MaterialSourceMode,
    workSourceMode: "CATALOG" as WorkSourceMode,
    materialItemId: "",
    materialCode: "",
    materialName: "",
    unit: "",
    requestedQuantity: "",
    note: "",
    fieldProgressItemId: "",
    wbsItemId: "",
    workItemNameSnapshot: "",
  };
}

function ModeToggle<TMode extends string>({
  value,
  options,
  onChange,
  ariaLabel,
}: {
  value: TMode;
  options: { value: TMode; label: string }[];
  onChange: (value: TMode) => void;
  ariaLabel: string;
}) {
  return (
    <div className="flex h-7 w-fit rounded-md border border-slate-200 bg-slate-50 p-0.5" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "h-6 rounded px-2 text-[11px] font-semibold transition-colors",
            value === option.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function MaterialRequestForm({
  projectId,
  initialData,
  wbsItems,
  materialItems = [],
  stocks = [],
  onClose,
  onSuccess
}: {
  projectId: string;
  initialData: any;
  wbsItems: any[];
  materialItems?: MaterialItemDto[];
  stocks?: ProjectStockDto[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [loadingAction, setLoadingAction] = useState<"DRAFT" | "SUBMITTED" | null>(null);
  const [error, setError] = useState("");
  const submittingRef = useRef(false);
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    variant: "warning" | "danger" | "info" | "success";
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    description: "",
    confirmText: "",
    variant: "warning",
    onConfirm: () => {},
  });
  
  const [formData, setFormData] = useState({
    neededDate: toDateInputValue(initialData?.neededDate),
    priority: initialData?.priority || "MEDIUM",
    note: initialData?.note || "",
    status: initialData?.status || "DRAFT"
  });

  const [showLineErrors, setShowLineErrors] = useState(false);
  const [items, setItems] = useState<any[]>(() => {
    const sourceItems = initialData?.items?.length ? initialData.items : [createBlankRequestItem()];
    return sourceItems.map((item: any) => {
      const matchedMaterial = materialItems.find((material) =>
        material.id === item.materialItemId ||
        material.code === item.materialCode ||
        material.name === item.materialName
      );
      const isCustomWork = Boolean(item.workItemNameSnapshot && !item.wbsItemId && !item.fieldProgressItemId);
      return {
        ...createBlankRequestItem(),
        ...item,
        materialItemId: item.materialItemId || matchedMaterial?.id || "",
        materialSourceMode: matchedMaterial ? "CATALOG" : "CUSTOM",
        workSourceMode: isCustomWork ? "CUSTOM" : "CATALOG",
      };
    });
  });

  const isEditing = !!initialData;
  const stockByMaterialId = new Map(stocks.map((stock) => [stock.materialItemId, stock]));
  const stockByCode = new Map(stocks.map((stock) => [stock.materialItem.code, stock]));
  const materialOptions = materialItems.filter((material) => material.isActive).map<EnterpriseComboboxOption>((material) => ({
    value: material.id,
    code: material.code,
    name: material.name,
    label: `${material.code} — ${material.name}`,
    description: `${material.unit}${material.group ? ` · ${material.group}` : ""}`,
  }));
  const workOptions = wbsItems
    .filter((work) => !work.itemType || work.itemType === "WORK")
    .map<EnterpriseComboboxOption>((work) => {
      const code = typeof work.code === "string" ? work.code.trim() : "";
      const workContent =
        typeof work.workContent === "string" && work.workContent.trim()
          ? work.workContent.trim()
          : typeof work.name === "string" && work.name.trim()
            ? work.name.trim()
            : "";
      const fallback = code ? "Chưa có tên công việc" : "Công việc chưa có tên";
      return {
        value: work.id,
        code,
        name: workContent || fallback,
        label: code ? `${code} — ${workContent || fallback}` : workContent || fallback,
        description: work.categoryName || work.constructionCrew || undefined,
      };
    });

  const getSelectedMaterial = (item: any) => {
    return materialItems.find((material) => material.id === item.materialItemId || material.code === item.materialCode || material.name === item.materialName) || null;
  };

  const getStockForItem = (item: any) => {
    const selected = getSelectedMaterial(item);
    if (selected) return stockByMaterialId.get(selected.id) || stockByCode.get(selected.code) || null;
    return stockByCode.get(item.materialCode) || null;
  };

  const handleAddItem = () => {
    setItems([...items, createBlankRequestItem()]);
  };

  const handleDuplicateItem = (id: string) => {
    setItems((prev) => {
      const source = prev.find((i) => i.id === id);
      if (!source) return prev;
      const copy = { ...source, id: crypto.randomUUID() };
      const index = prev.findIndex((i) => i.id === id);
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const handleClearItem = (id: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...createBlankRequestItem(),
              id, // Keep the same id
            }
          : i
      )
    );
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) {
      handleClearItem(id);
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems(items.map(i => {
      if (i.id !== id) return i;
      
      const updated = { ...i, [field]: value };
      
      if (field === "materialName" && value === "") {
        updated.materialItemId = "";
        updated.materialCode = "";
        updated.unit = "";
      }
      
      if (field === "workItemNameSnapshot" && value === "") {
        updated.wbsItemId = "";
        updated.fieldProgressItemId = "";
      }
      
      return updated;
    }));
  };

  const handleMaterialModeChange = (id: string, mode: MaterialSourceMode) => {
    setItems(items.map((item) => item.id === id ? {
      ...item,
      materialSourceMode: mode,
      materialItemId: "",
      materialCode: "",
      materialName: "",
      unit: "",
    } : item));
  };

  const handleMaterialSelect = (id: string, materialId: string) => {
    const selected = materialItems.find((material) => material.id === materialId);
    if (!selected) {
      setItems(items.map((item) => item.id === id ? { ...item, materialItemId: "", materialCode: "", materialName: "", unit: "" } : item));
      return;
    }
    setItems(items.map((item) => item.id === id ? {
      ...item,
      materialSourceMode: "CATALOG",
      materialItemId: selected.id,
      materialCode: selected.code,
      materialName: selected.name,
      unit: selected.unit,
    } : item));
  };

  const handleWorkModeChange = (id: string, mode: WorkSourceMode) => {
    setItems(items.map((item) => item.id === id ? {
      ...item,
      workSourceMode: mode,
      wbsItemId: "",
      fieldProgressItemId: "",
      workItemNameSnapshot: "",
    } : item));
  };

  const handleWorkSelect = (id: string, workId: string) => {
    const selected = wbsItems.find((work) => work.id === workId);
    if (!selected) {
      setItems(items.map((item) => item.id === id ? {
        ...item,
        wbsItemId: "",
        fieldProgressItemId: "",
        workItemNameSnapshot: "",
      } : item));
      return;
    }

    const label = workOptions.find((option) => option.value === workId)?.label || "";
    const isFieldProgressItem = "templateId" in selected || "itemType" in selected;
    setItems(items.map((item) => item.id === id ? {
      ...item,
      workSourceMode: "CATALOG",
      wbsItemId: isFieldProgressItem ? "" : selected.id,
      fieldProgressItemId: isFieldProgressItem ? selected.id : "",
      workItemNameSnapshot: label,
    } : item));
  };

  const getItemErrors = (item: any) => {
    const errors: string[] = [];
    const materialMode = (item.materialSourceMode || "CATALOG") as MaterialSourceMode;
    if (materialMode === "CATALOG") {
      if (!item.materialItemId && !getSelectedMaterial(item)) errors.push("Chọn vật tư từ danh mục");
    } else {
      if (!item.materialName?.trim()) errors.push("Nhập tên vật tư ngoài danh mục");
      if (!item.unit?.trim()) errors.push("Nhập đơn vị tính");
    }
    if (!item.requestedQuantity || Number(item.requestedQuantity) <= 0) errors.push("Số lượng phải lớn hơn 0");
    return errors;
  };

  const getLineMeta = (item: any) => {
    const meta: string[] = [];
    if (item.materialSourceMode === "CUSTOM" && item.materialName?.trim()) {
      meta.push("Chỉ lưu vào phiếu, chưa thêm vào danh mục vật tư");
    }
    if (item.workSourceMode === "CUSTOM" && item.workItemNameSnapshot?.trim()) {
      meta.push("Mô tả tự do, không tạo WBS mới");
    }
    return meta;
  };

  const executeSubmit = async (status: string) => {
    try {
      setLoadingAction(status as "DRAFT" | "SUBMITTED");
      setError("");

      const payload = {
        projectId,
        requestDate: initialData?.requestDate || new Date(),
        neededDate: fromDateInputValue(formData.neededDate) || new Date(),
        priority: formData.priority,
        status: status,
        note: formData.note,
        items: items.map(i => ({
          ...i,
          materialCode: i.materialSourceMode === "CUSTOM" ? null : (i.materialCode || null),
          materialName: String(i.materialName || "").trim(),
          unit: String(i.unit || "").trim(),
          requestedQuantity: Number(i.requestedQuantity),
          fieldProgressItemId: i.fieldProgressItemId || undefined,
          wbsItemId: i.wbsItemId || undefined,
          workItemNameSnapshot: i.workItemNameSnapshot?.trim() || undefined,
        }))
      };

      if (isEditing) {
        await updateMaterialRequest(initialData.id, payload);
      } else {
        await createMaterialRequest(payload);
      }

      if (status === "SUBMITTED") {
        toast.success("Đã gửi phiếu đến Trung tâm phê duyệt. Người có quyền duyệt (Giám đốc/Phó giám đốc/Admin) sẽ xử lý tại module Phê duyệt.");
      } else {
        toast.success(isEditing ? "Đã cập nhật phiếu nháp." : "Đã lưu nháp thành công.");
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi lưu phiếu.");
    } finally {
      submittingRef.current = false;
      setLoadingAction(null);
    }
  };

  const handleSubmit = async (status: string) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    try {
      setLoadingAction(status as "DRAFT" | "SUBMITTED");
      setError("");

      // Validate
      if (!formData.neededDate || formData.neededDate.trim() === "") {
        throw new Error("Vui lòng chọn ngày cần vật tư.");
      }
      
      const requestDateStr = toDateInputValue(safeParseDate(initialData?.requestDate) || new Date());
      if (formData.neededDate < requestDateStr) {
        throw new Error("Ngày cần vật tư không được trước ngày đề xuất.");
      }

      if (items.length === 0) {
        throw new Error("Vui lòng thêm ít nhất một dòng vật tư.");
      }

      const invalidItems = items.filter(i => getItemErrors(i).length > 0);
      if (invalidItems.length > 0) {
        setShowLineErrors(true);
        throw new Error("Vui lòng kiểm tra các dòng vật tư còn thiếu thông tin.");
      }
      setShowLineErrors(false);

      if (status === "SUBMITTED") {
        const hasOverStock = items.some(item => {
          const stock = getStockForItem(item);
          return stock && Number(item.requestedQuantity) > stock.stock;
        });

        if (hasOverStock) {
          setConfirmState({
            isOpen: true,
            title: "Cảnh báo vượt tồn kho",
            description: "Có vật tư vượt tồn hiện tại. Bạn vẫn muốn gửi phê duyệt?",
            variant: "warning",
            confirmText: "Gửi phê duyệt",
            onConfirm: () => {
              setConfirmState(prev => ({ ...prev, isOpen: false }));
              executeSubmit(status);
            }
          });
          submittingRef.current = false;
          return;
        }
      }

      await executeSubmit(status);
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra");
      submittingRef.current = false;
      setLoadingAction(null);
    }
  };

  return (
    <AppDrawer isOpen={true} onClose={onClose} ariaLabel={isEditing ? "Sửa đề xuất" : "Tạo đề xuất"}>
      <div className="flex h-full flex-col bg-white">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id="modal-title" className="text-lg font-bold text-slate-900">
              {isEditing ? `Sửa đề xuất: ${initialData.requestNo}` : "Tạo đề xuất vật tư mới"}
            </h2>
            <CloseButton onClick={onClose} tone="neutral" />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:px-6 pb-[calc(220px+env(safe-area-inset-bottom))] sm:pb-[calc(180px+env(safe-area-inset-bottom))] space-y-6">
          {error && (
            <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-sm border border-rose-200 font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* General Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="neededDate" className="text-sm font-semibold text-slate-700">Ngày cần vật tư <span className="text-red-500">*</span></label>
              <DateFieldVN 
                id="neededDate"
                name="neededDate"
                value={formData.neededDate}
                onChange={(val) => setFormData({ ...formData, neededDate: val })}
                className="border-slate-300"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="priority" className="text-sm font-semibold text-slate-700">Mức ưu tiên</label>
              <select 
                id="priority"
                name="priority"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="LOW">Thấp</option>
                <option value="MEDIUM">Trung bình</option>
                <option value="HIGH">Cao</option>
                <option value="URGENT">Khẩn cấp</option>
              </select>
            </div>
            <div className="sm:col-span-2 space-y-1.5">
              <label htmlFor="note" className="text-sm font-semibold text-slate-700">Ghi chú chung</label>
              <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" 
                id="note"
                name="note"
                type="text" 
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Ví dụ: Cấp cho thi công phần thân block A"
                className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          <div className="h-px w-full bg-slate-200" />

          {/* Items List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Danh sách vật tư</h3>
              <button 
                onClick={handleAddItem}
                className="text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Thêm dòng
              </button>
            </div>

            {/* Desktop Table Header */}
            <div className="hidden sm:grid grid-cols-[minmax(300px,1.3fr)_110px_130px_minmax(300px,1.2fr)_44px] gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
              <div>Tên vật tư <span className="text-red-500">*</span></div>
              <div>Đơn vị</div>
              <div>SL đề xuất <span className="text-red-500">*</span></div>
              <div>Công việc liên quan (Tùy chọn)</div>
              <div className="text-center">Xóa</div>
            </div>

            {/* Items */}
            <div className="space-y-4 sm:space-y-3">
              {items.map((item, index) => {
                const materialMode = (item.materialSourceMode || "CATALOG") as MaterialSourceMode;
                const workMode = (item.workSourceMode || "CATALOG") as WorkSourceMode;
                const lineErrors = showLineErrors ? getItemErrors(item) : [];
                const stock = getStockForItem(item);
                const requestedQty = Number(item.requestedQuantity || 0);
                const isOverStock = Boolean(stock && requestedQty > stock.stock);
                const lineMeta = [
                  ...getLineMeta(item),
                  stock ? `Tồn hiện tại: ${stock.stock} ${stock.materialItem.unit}` : "",
                  isOverStock && stock ? `Thiếu ${(requestedQty - stock.stock).toFixed(2)} ${stock.materialItem.unit}` : "",
                ].filter(Boolean);

                return (
                  <div key={item.id} className="relative grid grid-cols-1 items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[minmax(300px,1.3fr)_110px_130px_minmax(300px,1.2fr)_44px] sm:gap-2 sm:border-none sm:bg-transparent sm:p-0">
                    <div className="flex justify-between border-b border-slate-200 pb-2 text-sm font-semibold text-slate-700 sm:hidden">
                      <span>Vật tư {index + 1}</span>
                      <button aria-label={`Xóa dòng vật tư ${index + 1}`} onClick={() => handleRemoveItem(item.id)} className="rounded p-1 text-red-500 transition-colors hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <label htmlFor={`materialName-${index}`} className="text-xs font-medium text-slate-500 sm:sr-only">Tên vật tư</label>
                      <ModeToggle<MaterialSourceMode>
                        value={materialMode}
                        ariaLabel={`Chế độ nhập vật tư dòng ${index + 1}`}
                        options={[
                          { value: "CATALOG", label: "Danh mục" },
                          { value: "CUSTOM", label: "Ngoài danh mục" },
                        ]}
                        onChange={(mode) => handleMaterialModeChange(item.id, mode)}
                      />
                      {materialMode === "CATALOG" ? (
                        <EnterpriseCombobox
                          id={`materialName-${index}`}
                          value={item.materialItemId || getSelectedMaterial(item)?.id || ""}
                          options={materialOptions}
                          onChange={(value) => handleMaterialSelect(item.id, value)}
                          placeholder="Chọn vật tư..."
                          searchPlaceholder="Tìm mã, tên, nhóm vật tư..."
                          emptyMessage="Không tìm thấy vật tư phù hợp."
                          buttonClassName="rounded-md border-slate-300"
                          density="compact"
                          maxPanelHeight={220}
                        />
                      ) : (
                        <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                          id={`materialName-${index}`}
                          name={`materialName-${index}`}
                          type="text"
                          value={item.materialName}
                          onChange={(event) => handleItemChange(item.id, "materialName", event.target.value)}
                          placeholder="Nhập tên vật tư ngoài danh mục"
                          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <label htmlFor={`unit-${index}`} className="text-xs font-medium text-slate-500 sm:sr-only">Đơn vị</label>
                      <div className="hidden h-7 sm:block" />
                      <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                        id={`unit-${index}`}
                        name={`unit-${index}`}
                        type="text"
                        value={item.unit}
                        disabled={materialMode === "CATALOG"}
                        onChange={(event) => handleItemChange(item.id, "unit", event.target.value)}
                        placeholder="Đơn vị"
                        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <label htmlFor={`requestedQuantity-${index}`} className="text-xs font-medium text-slate-500 sm:sr-only">SL đề xuất</label>
                      <div className="hidden h-7 sm:block" />
                      <NumericInput
                        id={`requestedQuantity-${index}`}
                        value={item.requestedQuantity}
                        onChange={(val) => handleItemChange(item.id, "requestedQuantity", val)}
                        placeholder="0.00"
                        className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="min-w-0 space-y-1">
                      <label htmlFor={`wbs-${index}`} className="text-xs font-medium text-slate-500 sm:sr-only">Công việc liên quan</label>
                      <ModeToggle<WorkSourceMode>
                        value={workMode}
                        ariaLabel={`Chế độ công việc dòng ${index + 1}`}
                        options={[
                          { value: "CATALOG", label: "Chọn công việc" },
                          { value: "CUSTOM", label: "Mô tả tự do" },
                        ]}
                        onChange={(mode) => handleWorkModeChange(item.id, mode)}
                      />
                      {workMode === "CATALOG" ? (
                        <EnterpriseCombobox
                          id={`wbs-${index}`}
                          value={item.wbsItemId || item.fieldProgressItemId || ""}
                          options={workOptions}
                          onChange={(value) => handleWorkSelect(item.id, value)}
                          placeholder="Chọn công việc..."
                          searchPlaceholder="Tìm mã hoặc tên công việc..."
                          emptyMessage="Không tìm thấy công việc phù hợp."
                          buttonClassName="rounded-md border-slate-300"
                          density="compact"
                          maxPanelHeight={220}
                        />
                      ) : (
                        <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                          id={`wbs-${index}`}
                          name={`wbs-${index}`}
                          type="text"
                          value={item.workItemNameSnapshot || ""}
                          onChange={(event) => handleItemChange(item.id, "workItemNameSnapshot", event.target.value)}
                          placeholder="Nhập mô tả công việc"
                          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition-all focus:ring-2 focus:ring-blue-500"
                        />
                      )}
                    </div>

                    <div className="hidden sm:flex items-center justify-center pt-7">
                      <MaterialRowActionMenu
                        actions={[
                          {
                            label: "Nhân bản dòng",
                            icon: <Copy className="h-4 w-4" />,
                            onClick: () => handleDuplicateItem(item.id),
                          },
                          {
                            label: "Xóa trắng",
                            icon: <Eraser className="h-4 w-4" />,
                            onClick: () => handleClearItem(item.id),
                          },
                          {
                            label: "Xóa dòng",
                            icon: <Trash2 className="h-4 w-4" />,
                            danger: true,
                            onClick: () => handleRemoveItem(item.id),
                          },
                        ]}
                      />
                    </div>

                    {(lineErrors.length > 0 || lineMeta.length > 0) && (
                      <div className="sm:col-span-5">
                        {lineErrors.length > 0 ? (
                          <div className="rounded-md border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700">
                            {lineErrors.join(" · ")}
                          </div>
                        ) : (
                          <div className="truncate text-[11px] font-medium text-slate-500" title={lineMeta.join(" · ")}>
                            {lineMeta.join(" · ")}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div data-boundary="dropdown-boundary" data-combobox-boundary-footer="material-request-footer" className="sticky bottom-0 z-10 border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-3 flex flex-col gap-3 rounded-b-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium border-b border-slate-200 pb-2 mb-1">
            <span className="text-slate-600">Tổng: <span className="font-bold text-slate-900">{items.length}</span> dòng</span>
            {(() => {
              const missing = items.filter(i => getItemErrors(i).length > 0).length;
              return missing > 0 ? <span className="font-bold text-amber-600">Thiếu thông tin: {missing}</span> : null;
            })()}
            {(() => {
              const customMaterials = items.filter(i => i.materialSourceMode === "CUSTOM" && i.materialName?.trim()).length;
              return customMaterials > 0 ? <span className="text-slate-600">Vật tư ngoài danh mục: <span className="font-bold text-slate-900">{customMaterials}</span></span> : null;
            })()}
            {(() => {
              const customWorks = items.filter(i => i.workSourceMode === "CUSTOM" && i.workItemNameSnapshot?.trim()).length;
              return customWorks > 0 ? <span className="text-slate-600">Công việc tự nhập: <span className="font-bold text-slate-900">{customWorks}</span></span> : null;
            })()}
            {(() => {
              const over = items.filter(i => getStockForItem(i) && Number(i.requestedQuantity) > getStockForItem(i)!.stock).length;
              return over > 0 ? <span className="text-rose-600 font-bold">Vượt tồn: {over}</span> : null;
            })()}
          </div>
          <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              disabled={loadingAction !== null}
              className="w-full sm:w-auto px-4 h-10 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg transition-colors text-sm disabled:opacity-50"
            >
              Hủy
            </button>
            <button 
              type="button"
              onClick={() => handleSubmit("DRAFT")}
              disabled={loadingAction !== null}
              className="w-full sm:w-auto px-4 h-10 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg text-sm hover:bg-slate-50 active:bg-slate-100 flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
            >
              <Save className="w-4 h-4" /> 
              {loadingAction === "DRAFT" ? "Đang lưu..." : "Lưu nháp"}
            </button>
            <button 
              type="button"
              onClick={() => handleSubmit("SUBMITTED")}
              disabled={loadingAction !== null}
              className="w-full sm:w-auto px-6 h-10 bg-blue-600 text-white font-semibold rounded-lg text-sm hover:bg-blue-700 active:bg-blue-800 flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" /> 
              {loadingAction === "SUBMITTED" ? "Đang gửi..." : "Gửi phê duyệt"}
            </button>
          </div>
        </div>
      </div>
      <ConfirmDialog 
        {...confirmState}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </AppDrawer>
  );
}
