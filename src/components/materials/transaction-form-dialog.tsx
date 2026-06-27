"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MaterialItemDto, ProjectStockDto } from "@/app/(dashboard)/materials/actions";

interface TransactionFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { materialItemId: string; type: "IMPORT" | "EXPORT"; quantity: number; movementDate: Date; notes?: string }) => Promise<void>;
  isSubmitting: boolean;
  materialItems: MaterialItemDto[];
  stocks: ProjectStockDto[];
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

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setFormData({
      materialItemId: initialMaterialId || "",
      quantity: "",
      movementDate: new Date().toISOString().slice(0, 16),
      notes: "",
    });
  }, [initialMaterialId, isOpen, type]);

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    }
  };

  const isImport = type === "IMPORT";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-xl">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">
            {isImport ? "Nhập kho" : "Xuất kho"}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100" aria-label="Đóng form giao dịch">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="transaction-material" className="block text-sm font-medium text-slate-700 mb-1">Vật tư <span className="text-red-500">*</span></label>
            <select 
              id="transaction-material"
              value={formData.materialItemId} 
              onChange={e => setFormData({ ...formData, materialItemId: e.target.value })}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="" disabled>Chọn vật tư</option>
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
              <label htmlFor="transaction-quantity" className="block text-sm font-medium text-slate-700 mb-1">Số lượng <span className="text-red-500">*</span></label>
              <div className="relative">
                <input 
                  id="transaction-quantity"
                  type="number" 
                  step="0.01"
                  min="0.01"
                  inputMode="decimal"
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
              <label htmlFor="transaction-date" className="block text-sm font-medium text-slate-700 mb-1">Ngày giao dịch <span className="text-red-500">*</span></label>
              <input 
                id="transaction-date"
                type="datetime-local" 
                value={formData.movementDate} 
                onChange={e => setFormData({ ...formData, movementDate: e.target.value })}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="transaction-notes" className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
            <textarea 
              id="transaction-notes"
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
              {isSubmitting ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
