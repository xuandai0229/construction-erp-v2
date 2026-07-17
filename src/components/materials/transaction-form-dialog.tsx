"use client";

import { useEffect, useState } from "react";
import { CloseButton } from "@/components/ui/close-button";
import { Button } from "@/components/ui/button";
import { EnterpriseCombobox, type EnterpriseComboboxOption } from "@/components/ui/enterprise-combobox";
import { fromDateTimeLocalInputValue, toDateTimeLocalInputValue } from "@/lib/date-utils";
import { DateTimeFieldVN } from "@/components/ui/date-field-vn";
import { formatQuantity } from "./materials-formatters";
import { NumericInput } from "@/components/ui/numeric-input";
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
    movementDate: toDateTimeLocalInputValue(new Date()),
    notes: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setFormData({
      materialItemId: initialMaterialId || "",
      quantity: "",
      movementDate: toDateTimeLocalInputValue(new Date()),
      notes: "",
    });
  }, [initialMaterialId, isOpen, type]);

  if (!isOpen) return null;
  if (type === "IMPORT" && !permissions.canImport) return null;
  if (type === "EXPORT" && !permissions.canExport) return null;

  const selectedMaterial = materialItems.find(m => m.id === formData.materialItemId);
  const currentStock = stocks.find(s => s.materialItemId === formData.materialItemId)?.stock || 0;
  const qtyValue = Number(formData.quantity || 0);
  const normalizedQty = Number.isFinite(qtyValue) && qtyValue > 0 ? qtyValue : 0;
  const stockAfter = selectedMaterial ? (type === "IMPORT" ? currentStock + normalizedQty : currentStock - normalizedQty) : null;
  const isOverStock = type === "EXPORT" && selectedMaterial && Number.isFinite(qtyValue) && qtyValue > currentStock;
  const materialOptions = materialItems.filter((material) => material.isActive).map<EnterpriseComboboxOption>((material) => ({
    value: material.id,
    code: material.code,
    name: material.name,
    label: `${material.code} — ${material.name}`,
    description: `${material.unit}${material.group ? ` · ${material.group}` : ""}`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.materialItemId) return setError("Vui lòng chọn vật tư");
    
    const qty = Number(formData.quantity);
    if (isNaN(qty) || qty <= 0) return setError("Số lượng phải lớn hơn 0");
    const movementDate = fromDateTimeLocalInputValue(formData.movementDate);
    if (!movementDate) return setError("Ngày giao dịch không hợp lệ.");

    if (type === "EXPORT" && qty > currentStock) {
      return setError(`Số lượng xuất vượt quá tồn kho hiện tại (${currentStock} ${selectedMaterial?.unit})`);
    }

    try {
      await onSubmit({
        materialItemId: formData.materialItemId,
        type,
        quantity: qty,
        movementDate,
        notes: formData.notes,
      });
      setFormData({ materialItemId: "", quantity: "", movementDate: toDateTimeLocalInputValue(new Date()), notes: "" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    }
  };

  const isImport = type === "IMPORT";

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-[var(--surface)] shadow-xl sm:rounded-[var(--radius-xl)]">
        <div className="flex justify-between items-center p-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--foreground)]">
            {isImport ? "Nhập kho" : "Xuất kho"}
          </h2>
          <CloseButton onClick={onClose} tone="neutral" />
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-4 pb-[calc(96px+env(safe-area-inset-bottom))]">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-[var(--radius-lg)] border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="transaction-material" className="block text-sm font-medium text-[var(--foreground)] mb-1">Vật tư <span className="text-red-500">*</span></label>
            <EnterpriseCombobox
              id="transaction-material"
              value={formData.materialItemId} 
              onChange={value => setFormData({ ...formData, materialItemId: value })}
              options={materialOptions}
              placeholder="Chọn vật tư"
              searchPlaceholder="Tìm mã hoặc tên vật tư..."
              emptyMessage="Không tìm thấy vật tư phù hợp."
            />
            {formData.materialItemId && selectedMaterial && (
              <div className="mt-2 grid grid-cols-3 gap-2 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-subtle)] p-2 text-xs">
                <div>
                  <div className="text-[var(--muted-foreground)]">Tồn hiện tại</div>
                  <div className="font-semibold text-[var(--foreground)]">{formatQuantity(currentStock)} {selectedMaterial.unit}</div>
                </div>
                <div>
                  <div className="text-[var(--muted-foreground)]">Đơn vị</div>
                  <div className="font-semibold text-[var(--foreground)]">{selectedMaterial.unit}</div>
                </div>
                <div>
                  <div className="text-[var(--muted-foreground)]">Tồn sau</div>
                  <div className={`font-semibold ${isOverStock ? "text-rose-700" : "text-[var(--foreground)]"}`}>
                    {stockAfter === null ? "—" : `${formatQuantity(stockAfter)} ${selectedMaterial.unit}`}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="transaction-quantity" className="block text-sm font-medium text-[var(--foreground)] mb-1">Số lượng {isImport ? 'nhập kho thật' : 'xuất kho thật'} <span className="text-red-500">*</span></label>
              <div className="relative">
                <NumericInput 
                  id="transaction-quantity"
                  value={formData.quantity} 
                  onChange={val => setFormData({ ...formData, quantity: val })}
                  placeholder="0.00"
                  className="w-full h-10 pl-3 pr-10 text-sm rounded-[var(--radius-lg)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  required
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[var(--muted-foreground)] text-sm">
                  {selectedMaterial?.unit || ""}
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="transaction-date" className="block text-sm font-medium text-[var(--foreground)] mb-1">Ngày giao dịch <span className="text-red-500">*</span></label>
              <DateTimeFieldVN 
                id="transaction-date"
                value={formData.movementDate} 
                onChange={val => setFormData({ ...formData, movementDate: val })}
                required
              />
            </div>
            {isOverStock && (
              <p className="mt-1 text-xs font-medium text-rose-600">
                Không thể xuất vượt tồn kho hiện tại. Vui lòng giảm số lượng hoặc nhập bổ sung trước.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="transaction-notes" className="block text-sm font-medium text-[var(--foreground)] mb-1">Ghi chú</label>
            <textarea autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" 
              id="transaction-notes"
              value={formData.notes} 
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              placeholder={isImport ? "Biển số xe, người giao..." : "Người nhận, hạng mục thi công..."}
              className="w-full p-3 text-sm rounded-[var(--radius-lg)] border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none h-20"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" className={`${isImport ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"} text-white`} disabled={isSubmitting || !!isOverStock}>
              {isSubmitting ? "Đang lưu..." : isImport ? "Lưu nhập kho" : "Lưu xuất kho"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
