"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, Save, Send, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/toast-context";
import { CloseButton } from "@/components/ui/close-button";
import { AppDrawer } from "@/components/ui/app-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { createMaterialRequest, updateMaterialRequest } from "@/app/actions/material-request";
import { EnterpriseCombobox, type EnterpriseComboboxOption } from "@/components/ui/enterprise-combobox";
import { fromDateInputValue, safeParseDate, toDateInputValue } from "@/lib/date-utils";
import { DateFieldVN } from "@/components/ui/date-field-vn";
import type { MaterialItemDto, ProjectStockDto } from "@/app/(dashboard)/materials/actions";

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

  const [items, setItems] = useState<any[]>(() => 
    initialData?.items?.length ? initialData.items : [
      { id: Date.now().toString(), materialName: "", unit: "Cái", requestedQuantity: "", note: "", fieldProgressItemId: "" }
    ]
  );

  const isEditing = !!initialData;
  const stockByMaterialId = new Map(stocks.map((stock) => [stock.materialItemId, stock]));
  const stockByCode = new Map(stocks.map((stock) => [stock.materialItem.code, stock]));
  const hasCatalog = materialItems.length > 0;
  const materialOptions = materialItems.map<EnterpriseComboboxOption>((material) => ({
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
    setItems([...items, { id: Date.now().toString(), materialName: "", unit: "Cái", requestedQuantity: "", note: "", fieldProgressItemId: "" }]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter(i => i.id !== id));
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleMaterialSelect = (id: string, materialId: string) => {
    const selected = materialItems.find((material) => material.id === materialId);
    if (!selected) {
      setItems(items.map((item) => item.id === id ? { ...item, materialItemId: "", materialCode: "", materialName: "", unit: "" } : item));
      return;
    }
    setItems(items.map((item) => item.id === id ? {
      ...item,
      materialItemId: selected.id,
      materialCode: selected.code,
      materialName: selected.name,
      unit: selected.unit,
    } : item));
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
          requestedQuantity: Number(i.requestedQuantity),
          fieldProgressItemId: i.fieldProgressItemId || undefined,
          wbsItemId: i.wbsItemId || undefined,
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

      const invalidItems = items.filter(i => !i.materialName?.trim() || !i.requestedQuantity || Number(i.requestedQuantity) <= 0);
      if (invalidItems.length > 0) {
        throw new Error("Vui lòng nhập đầy đủ tên và số lượng > 0 cho tất cả vật tư.");
      }

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
        <div className="flex-1 overflow-y-auto p-4 sm:px-6 pb-[calc(140px+env(safe-area-inset-bottom))] sm:pb-6 space-y-6">
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
              <input 
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
            <div className="hidden sm:grid grid-cols-[minmax(260px,1fr)_120px_140px_minmax(260px,1fr)_48px] gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
              <div>Tên vật tư <span className="text-red-500">*</span></div>
              <div>Đơn vị</div>
              <div>SL đề xuất <span className="text-red-500">*</span></div>
              <div>Công việc liên quan (Tùy chọn)</div>
              <div className="text-center">Xóa</div>
            </div>

            {/* Items */}
            <div className="space-y-4 sm:space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="relative bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-lg border border-slate-200 sm:border-none grid grid-cols-1 sm:grid-cols-[minmax(260px,1fr)_120px_140px_minmax(260px,1fr)_48px] gap-3 sm:gap-2 items-start">
                  
                  {/* Mobile Label */}
                  <div className="sm:hidden font-semibold text-sm text-slate-700 border-b border-slate-200 pb-2 mb-1 flex justify-between">
                    <span>Vật tư {index + 1}</span>
                    <button aria-label={`Xóa dòng vật tư ${index + 1}`} onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor={`materialName-${index}`} className="sm:hidden text-xs font-medium text-slate-500 mb-1 block">Tên vật tư</label>
                    <label htmlFor={`materialName-${index}`} className="hidden sm:block sr-only">Tên vật tư</label>
                    {hasCatalog ? (
                      <EnterpriseCombobox
                        id={`materialName-${index}`}
                        value={item.materialItemId || getSelectedMaterial(item)?.id || ""}
                        options={materialOptions}
                        onChange={(value) => handleMaterialSelect(item.id, value)}
                        placeholder="Chọn từ danh mục..."
                        searchPlaceholder="Tìm mã hoặc tên vật tư..."
                        emptyMessage="Không tìm thấy vật tư phù hợp."
                        buttonClassName="rounded-md border-slate-300"
                      />
                    ) : (
                      <input 
                        id={`materialName-${index}`}
                        name={`materialName-${index}`}
                        type="text"
                        value={item.materialName}
                        onChange={(e) => handleItemChange(item.id, "materialName", e.target.value)}
                        placeholder="Tên vật tư..."
                        className="w-full px-3 h-10 bg-white text-slate-900 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor={`unit-${index}`} className="sm:hidden text-xs font-medium text-slate-500 mb-1 block">Đơn vị</label>
                    <label htmlFor={`unit-${index}`} className="hidden sm:block sr-only">Đơn vị</label>
                    <input 
                      id={`unit-${index}`}
                      name={`unit-${index}`}
                      type="text"
                      value={item.unit}
                      disabled={hasCatalog && !!item.materialCode}
                      onChange={(e) => handleItemChange(item.id, "unit", e.target.value)}
                      placeholder="Đơn vị..."
                      className="w-full px-3 h-10 bg-white text-slate-900 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor={`requestedQuantity-${index}`} className="sm:hidden text-xs font-medium text-slate-500 mb-1 block">SL đề xuất</label>
                    <label htmlFor={`requestedQuantity-${index}`} className="hidden sm:block sr-only">SL đề xuất</label>
                    <input 
                      id={`requestedQuantity-${index}`}
                      name={`requestedQuantity-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.requestedQuantity}
                      onChange={(e) => handleItemChange(item.id, "requestedQuantity", e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 h-10 bg-white text-slate-900 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    {(() => {
                      const stock = getStockForItem(item);
                      if (!stock) return null;
                      const requestedQty = Number(item.requestedQuantity || 0);
                      const isOverStock = requestedQty > stock.stock;
                      return (
                        <div className="flex flex-wrap items-center gap-1 mt-0.5 whitespace-nowrap">
                          <span className="inline-flex bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-200">
                            Tồn: {stock.stock}
                          </span>
                          {isOverStock && (
                            <span className="inline-flex bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded text-[10px] font-bold border border-rose-100 ml-1">
                              Thiếu {(requestedQty - stock.stock).toFixed(2)}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex flex-col gap-1">
                    <label htmlFor={`wbs-${index}`} className="sm:hidden text-xs font-medium text-slate-500 mb-1 block">Công việc liên quan</label>
                    <label htmlFor={`wbs-${index}`} className="hidden sm:block sr-only">Công việc liên quan</label>
                    <EnterpriseCombobox
                      id={`wbs-${index}`}
                      value={item.wbsItemId || item.fieldProgressItemId || ""}
                      options={workOptions}
                      onChange={(value) => handleItemChange(item.id, "wbsItemId", value)}
                      placeholder="Tùy chọn"
                      searchPlaceholder="Tìm mã hoặc tên công việc..."
                      emptyMessage="Không tìm thấy công việc phù hợp."
                      buttonClassName="rounded-md border-slate-300"
                    />
                  </div>

                  <div className="hidden sm:block text-center pt-2">
                    <button 
                      type="button"
                      aria-label={`Xóa dòng vật tư ${index + 1}`}
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={items.length <= 1}
                      className="text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-3 flex flex-col gap-3 rounded-b-xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium border-b border-slate-200 pb-2 mb-1">
            <span className="text-slate-600">Tổng: <span className="font-bold text-slate-900">{items.length}</span> dòng</span>
            {(() => {
              const missing = items.filter(i => !i.materialName?.trim() || !i.requestedQuantity || Number(i.requestedQuantity) <= 0).length;
              return missing > 0 ? <span className="text-amber-600 font-bold">Thiếu thông tin: {missing}</span> : null;
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
