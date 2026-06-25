"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TransactionFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { materialItemId: string; type: "IMPORT" | "EXPORT"; quantity: number; movementDate: Date; notes?: string }) => Promise<void>;
  isSubmitting: boolean;
  materialItems: any[];
  stocks: any[];
  type: "IMPORT" | "EXPORT";
  initialMaterialId?: string;
  permissions: {
    canImport: boolean;
    canExport: boolean;
  };
}

export function TransactionFormDialog({ isOpen, onClose, onSubmit, isSubmitting, materialItems, stocks, type, initialMaterialId, permissions }: TransactionFormDialogProps) {
  const [formData, setFormData] = useState({
    materialItemId: initialMaterialId || "",
    quantity: "",
    movementDate: new Date().toISOString().slice(0, 16),
    notes: "",
  });
  const [error, setError] = useState("");

  if (!isOpen) return null;
  if (type === "IMPORT" && !permissions.canImport) return null;
  if (type === "EXPORT" && !permissions.canExport) return null;

  const selectedMaterial = materialItems.find(m => m.id === formData.materialItemId);
  const currentStock = stocks.find(s => s.materialItemId === formData.materialItemId)?.stock || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.materialItemId) return setError("Vui lòng chọn vật tư");
    
    const qty = Number(formData.quantity);
    if (isNaN(qty) || qty <= 0) return setError("Số lượng phải lớn hơn 0");

    if (type === "EXPORT" && qty > currentStock) {
      return setError(`Số lượng xuất vượt quá tồn kho hiện tại (${currentStock} ${selectedMaterial?.unit})`);
    }

    try {
      await onSubmit({
        materialItemId: formData.materialItemId,
        type,
        quantity: qty,
        movementDate: new Date(formData.movementDate),
        notes: formData.notes,
      });
      setFormData({ materialItemId: "", quantity: "", movementDate: new Date().toISOString().slice(0, 16), notes: "" });
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi");
    }
  };

  const isImport = type === "IMPORT";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">
            {isImport ? "Nhập kho" : "Xuất kho"}
          </h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vật tư <span className="text-red-500">*</span></label>
            <select 
              value={formData.materialItemId} 
              onChange={e => setFormData({ ...formData, materialItemId: e.target.value })}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="" disabled>-- Chọn vật tư --</option>
              {materialItems.map(m => (
                <option key={m.id} value={m.id}>{m.name} ({m.code})</option>
              ))}
            </select>
            {formData.materialItemId && type === "EXPORT" && (
              <p className="text-xs text-slate-500 mt-1">Tồn kho hiện tại: <strong className="text-slate-700">{currentStock} {selectedMaterial?.unit}</strong></p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Số lượng <span className="text-red-500">*</span></label>
              <div className="relative">
                <input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  value={formData.quantity} 
                  onChange={e => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="0.00"
                  className="w-full h-10 pl-3 pr-10 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-500 text-sm">
                  {selectedMaterial?.unit || ""}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ngày GD <span className="text-red-500">*</span></label>
              <input 
                type="datetime-local" 
                value={formData.movementDate} 
                onChange={e => setFormData({ ...formData, movementDate: e.target.value })}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
            <textarea 
              value={formData.notes} 
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder={isImport ? "Biển số xe, người giao..." : "Người nhận, hạng mục thi công..."}
              className="w-full p-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" className={`${isImport ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"} text-white`} disabled={isSubmitting}>
              {isSubmitting ? "Đang xử lý..." : (isImport ? "Nhập kho" : "Xuất kho")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
