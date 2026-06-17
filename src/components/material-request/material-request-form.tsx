"use client";

import { useState } from "react";
import { X, Plus, Trash2, Save, Send } from "lucide-react";
import { createMaterialRequest, updateMaterialRequest } from "@/app/actions/material-request";
import { format } from "date-fns";

export function MaterialRequestForm({
  projectId,
  initialData,
  wbsItems,
  onClose,
  onSuccess
}: {
  projectId: string;
  initialData: any;
  wbsItems: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    neededDate: initialData?.neededDate ? format(new Date(initialData.neededDate), "yyyy-MM-dd") : "",
    priority: initialData?.priority || "MEDIUM",
    note: initialData?.note || "",
    status: initialData?.status || "DRAFT"
  });

  const [items, setItems] = useState<any[]>(
    initialData?.items?.length ? initialData.items : [
      { id: Date.now().toString(), materialName: "", unit: "Cái", requestedQuantity: "", note: "", fieldProgressItemId: "" }
    ]
  );

  const isEditing = !!initialData;

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

  const handleSubmit = async (status: string) => {
    try {
      setLoading(true);
      setError("");

      // Validate
      if (!formData.neededDate) throw new Error("Vui lòng chọn ngày cần vật tư.");
      
      const requestDateStr = format(new Date(initialData?.requestDate || new Date()), "yyyy-MM-dd");
      if (formData.neededDate < requestDateStr) {
        throw new Error("Ngày cần vật tư không được nhỏ hơn ngày đề xuất.");
      }

      if (items.length === 0) {
        throw new Error("Vui lòng thêm ít nhất một dòng vật tư.");
      }

      if (items.some(i => !i.materialName.trim() || !i.requestedQuantity || Number(i.requestedQuantity) <= 0)) {
        throw new Error("Vui lòng nhập đầy đủ tên và số lượng > 0 cho các vật tư.");
      }

      const payload = {
        projectId,
        requestDate: initialData?.requestDate || new Date(),
        neededDate: new Date(formData.neededDate),
        priority: formData.priority,
        status: status,
        note: formData.note,
        items: items.map(i => ({
          ...i,
          requestedQuantity: Number(i.requestedQuantity),
        }))
      };

      if (isEditing) {
        await updateMaterialRequest(initialData.id, payload);
      } else {
        await createMaterialRequest(payload);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      {/* Mobile: Bottom Sheet, Desktop: Modal/Drawer */}
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-6xl sm:rounded-xl shadow-2xl flex flex-col mt-12 sm:mt-0 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in-0 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200">
          <div>
            <h2 id="modal-title" className="text-lg sm:text-xl font-bold text-slate-900">
              {isEditing ? `Sửa đề xuất: ${initialData.requestNo}` : "Tạo đề xuất vật tư mới"}
            </h2>
          </div>
          <button onClick={onClose} aria-label="Đóng form tạo đề xuất vật tư" className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:px-6 pb-[calc(96px+env(safe-area-inset-bottom))] sm:pb-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200 font-medium">
              {error}
            </div>
          )}

          {/* General Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="neededDate" className="text-sm font-semibold text-slate-700">Ngày cần vật tư <span className="text-red-500">*</span></label>
              <input 
                id="neededDate"
                name="neededDate"
                type="date" 
                value={formData.neededDate}
                onChange={(e) => setFormData({ ...formData, neededDate: e.target.value })}
                className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
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
            <div className="hidden sm:grid grid-cols-[minmax(260px,1fr)_120px_140px_minmax(260px,340px)_48px] gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600">
              <div>Tên vật tư <span className="text-red-500">*</span></div>
              <div>Đơn vị</div>
              <div>SL đề xuất <span className="text-red-500">*</span></div>
              <div>Công việc liên quan (Tùy chọn)</div>
              <div className="text-center">Xóa</div>
            </div>

            {/* Items */}
            <div className="space-y-3 sm:space-y-2">
              {items.map((item, index) => (
                <div key={item.id} className="relative bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-lg border border-slate-200 sm:border-none grid grid-cols-1 sm:grid-cols-[minmax(260px,1fr)_120px_140px_minmax(260px,340px)_48px] gap-3 sm:gap-2 items-start sm:items-center">
                  
                  {/* Mobile Label */}
                  <div className="sm:hidden font-semibold text-sm text-slate-700 border-b border-slate-200 pb-2 mb-1 flex justify-between">
                    <span>Vật tư {index + 1}</span>
                    <button aria-label={`Xóa dòng vật tư ${index + 1}`} onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <label htmlFor={`materialName-${index}`} className="sm:hidden text-xs font-medium text-slate-500 mb-1 block">Tên vật tư</label>
                    <label htmlFor={`materialName-${index}`} className="hidden sm:block sr-only">Tên vật tư</label>
                    <input 
                      id={`materialName-${index}`}
                      name={`materialName-${index}`}
                      type="text" 
                      placeholder="Tên vật tư..."
                      value={item.materialName}
                      onChange={(e) => handleItemChange(item.id, 'materialName', e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-[120px_140px] sm:contents gap-2">
                    <div className="w-full">
                      <label htmlFor={`unit-${index}`} className="sm:hidden text-xs font-medium text-slate-500 mb-1 block">Đơn vị</label>
                      <label htmlFor={`unit-${index}`} className="hidden sm:block sr-only">Đơn vị</label>
                      <input 
                        id={`unit-${index}`}
                        name={`unit-${index}`}
                        type="text" 
                        placeholder="Đơn vị"
                        value={item.unit}
                        onChange={(e) => handleItemChange(item.id, 'unit', e.target.value)}
                        className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                    <div className="w-full">
                      <label htmlFor={`requestedQuantity-${index}`} className="sm:hidden text-xs font-medium text-slate-500 mb-1 block">Số lượng</label>
                      <label htmlFor={`requestedQuantity-${index}`} className="hidden sm:block sr-only">Số lượng</label>
                      <input 
                        id={`requestedQuantity-${index}`}
                        name={`requestedQuantity-${index}`}
                        type="number" 
                        min="0"
                        placeholder="SL"
                        value={item.requestedQuantity}
                        onChange={(e) => handleItemChange(item.id, 'requestedQuantity', e.target.value)}
                        className="w-full px-3 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="w-full">
                    <label htmlFor={`fieldProgressItemId-${index}`} className="sm:hidden text-xs font-medium text-slate-500 mb-1 block">Công việc liên quan</label>
                    <label htmlFor={`fieldProgressItemId-${index}`} className="hidden sm:block sr-only">Công việc liên quan</label>
                    <select
                      id={`fieldProgressItemId-${index}`}
                      name={`fieldProgressItemId-${index}`}
                      value={item.fieldProgressItemId}
                      onChange={(e) => handleItemChange(item.id, 'fieldProgressItemId', e.target.value)}
                      className="w-full px-3 py-2 bg-white text-slate-900 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all truncate"
                    >
                      <option value="">-- Chọn công việc (Không bắt buộc) --</option>
                      {wbsItems.filter(w => w.itemType === 'WORK').map(w => (
                        <option key={w.id} value={w.id}>
                          {w.code ? `${w.code} - ` : ''}{w.workContent}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="hidden sm:block text-center pt-1">
                    <button 
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
        <div className="border-t border-slate-200 px-4 sm:px-6 py-4 bg-slate-50 flex sm:justify-end gap-3 sticky bottom-0 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4 z-20 rounded-b-xl shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] sm:shadow-none">
          <button 
            type="button" 
            onClick={onClose}
            className="hidden sm:block px-4 py-2 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg transition-colors text-sm"
          >
            Hủy
          </button>
          <button 
            type="button"
            onClick={() => handleSubmit("DRAFT")}
            disabled={loading}
            className="flex-1 sm:flex-none px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg text-sm hover:bg-slate-50 active:bg-slate-100 flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Save className="w-4 h-4" /> Lưu nháp
          </button>
          <button 
            type="button"
            onClick={() => handleSubmit("REQUESTED")}
            disabled={loading}
            className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg text-sm hover:bg-blue-700 active:bg-blue-800 flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
          >
            <Send className="w-4 h-4" /> Đề xuất
          </button>
        </div>
      </div>
    </div>
  );
}
