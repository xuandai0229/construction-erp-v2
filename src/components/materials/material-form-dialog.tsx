"use client";

import { useEffect, useState } from "react";
import { CloseButton } from "@/components/ui/close-button";
import { Button } from "@/components/ui/button";
import { fromDateTimeLocalInputValue, toDateTimeLocalInputValue } from "@/lib/date-utils";
import { DateTimeFieldVN } from "@/components/ui/date-field-vn";
import { NumericInput } from "@/components/ui/numeric-input";
import { EditableCombobox } from "@/components/ui/editable-combobox";

interface MaterialFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    code?: string;
    name: string;
    unit: string;
    group?: string;
    description?: string;
    minStockLevel?: number;
    initialStock?: number;
    initialStockDate?: Date;
    initialStockNotes?: string;
  }) => Promise<void>;
  isSubmitting: boolean;
  initialData?: {
    id?: string;
    code: string;
    name: string;
    unit: string;
    group: string | null;
    description: string | null;
    minStockLevel?: number;
    hasMovement?: boolean;
  };
  existingGroups?: string[];
}

const initialForm = {
  code: "",
  name: "",
  unit: "",
  group: "",
  minStockLevel: "",
  description: "",
  hasInitialStock: false,
  initialStock: "",
  initialStockDate: "", // will be initialized in component
  initialStockNotes: "",
};

export function MaterialFormDialog({ isOpen, onClose, onSubmit, isSubmitting, initialData, existingGroups = [] }: MaterialFormDialogProps) {
  const [formData, setFormData] = useState(initialForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      if (initialData) {
        setFormData({
          code: initialData.code || "",
          name: initialData.name || "",
          unit: initialData.unit || "",
          group: initialData.group || "",
          minStockLevel: initialData.minStockLevel !== undefined && initialData.minStockLevel !== null && initialData.minStockLevel > 0 ? initialData.minStockLevel.toString() : "",
          description: initialData.description || "",
          hasInitialStock: false,
          initialStock: "",
          initialStockDate: toDateTimeLocalInputValue(new Date()),
          initialStockNotes: "",
        });
      } else {
        setFormData({ ...initialForm, initialStockDate: toDateTimeLocalInputValue(new Date()) });
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const name = formData.name.trim();
    const unit = formData.unit.trim();
    const minStockLevelRaw = formData.minStockLevel.toString().trim();
    const minStockLevel = minStockLevelRaw === "" ? 0 : Number(minStockLevelRaw);

    if (!name) return setError("Tên vật tư là bắt buộc.");
    if (!unit) return setError("Đơn vị tính là bắt buộc.");
    if (!Number.isFinite(minStockLevel) || minStockLevel < 0) return setError("Tồn tối thiểu phải lớn hơn hoặc bằng 0.");

    let initialStockParam: number | undefined = undefined;
    let initialStockDateParam: Date | undefined = undefined;
    let initialStockNotesParam: string | undefined = undefined;

    if (!initialData && formData.hasInitialStock) {
      initialStockParam = Number(formData.initialStock);
      if (isNaN(initialStockParam) || initialStockParam <= 0) return setError("Số lượng tồn ban đầu phải lớn hơn 0.");
      
      const parsedDate = fromDateTimeLocalInputValue(formData.initialStockDate);
      if (!parsedDate) return setError("Ngày nhập tồn ban đầu không hợp lệ.");
      initialStockDateParam = parsedDate;
      initialStockNotesParam = formData.initialStockNotes;
    }

    try {
      await onSubmit({
        code: formData.code.trim() || undefined,
        name,
        unit,
        group: formData.group.trim() || undefined,
        description: formData.description.trim() || undefined,
        minStockLevel,
        initialStock: initialStockParam,
        initialStockDate: initialStockDateParam,
        initialStockNotes: initialStockNotesParam,
      });
      setFormData({ ...initialForm, initialStockDate: toDateTimeLocalInputValue(new Date()) });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể lưu vật tư.");
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-[var(--surface)] shadow-2xl shadow-slate-950/20 sm:rounded-[var(--radius-xl)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">{initialData ? "Sửa vật tư" : "Thêm vật tư"}</h2>
          </div>
          <CloseButton onClick={onClose} tone="neutral" />
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-[var(--radius-lg)] border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          <div className="grid gap-4">
            <div>
              <label htmlFor="material-code" className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]">
                Mã vật tư <span className="font-normal text-[var(--muted-foreground)] opacity-70">(tùy chọn)</span>
              </label>
              <input
                id="material-code"
                value={formData.code}
                onChange={(event) => updateField("code", event.target.value)}
                placeholder="VD: THEP-D10"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-1p-ignore="true"
                data-lpignore="true"
                className="h-10 w-full rounded-[var(--radius-lg)] border border-[var(--border)] px-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] opacity-70 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label htmlFor="material-name" className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]">
                Tên vật tư <span className="text-rose-600">*</span>
              </label>
              <input
                id="material-name"
                value={formData.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="VD: Thép cuộn D10"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-1p-ignore="true"
                data-lpignore="true"
                className="h-10 w-full rounded-[var(--radius-lg)] border border-[var(--border)] px-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] opacity-70 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="material-unit" className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]">
                  Đơn vị tính <span className="text-rose-600">*</span>
                </label>
                  <input
                    id="material-unit"
                    value={formData.unit}
                    onChange={(event) => updateField("unit", event.target.value)}
                    placeholder="VD: kg, bao, cây"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-1p-ignore="true"
                    data-lpignore="true"
                    className="h-10 w-full rounded-[var(--radius-lg)] border border-[var(--border)] px-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] opacity-70 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
              </div>
              <div>
                <label htmlFor="material-group" className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]">Nhóm vật tư</label>
                <EditableCombobox
                  id="material-group"
                  value={formData.group}
                  options={existingGroups.map(g => ({ value: g, label: g }))}
                  onChange={(val) => updateField("group", val)}
                  placeholder="Chọn hoặc nhập nhóm vật tư..."
                  customOptionLabel={(query) => `Dùng nhóm mới: "${query}"`}
                  emptyMessage="Chưa có nhóm nào."
                />
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">Có thể chọn nhóm đã có hoặc nhập nhóm mới.</p>
              </div>
            </div>

            <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
              <label htmlFor="material-min-stock" className="mb-1 block text-sm font-semibold text-[var(--foreground)]">Ngưỡng cảnh báo tồn tối thiểu</label>
              <p className="mb-2 text-xs text-[var(--muted-foreground)]">Số này chỉ dùng để cảnh báo khi tồn kho thấp, không phải tồn ban đầu.</p>
              <NumericInput
                id="material-min-stock"
                value={formData.minStockLevel}
                onChange={(value) => updateField("minStockLevel", value)}
                placeholder="VD: 100"
                className="h-10 w-full rounded-[var(--radius-lg)] border border-[var(--border)] px-3 text-right text-sm text-[var(--foreground)] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label htmlFor="material-description" className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]">Ghi chú</label>
              <textarea
                id="material-description"
                value={formData.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Quy cách, thương hiệu, tiêu chuẩn nghiệm thu..."
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-1p-ignore="true"
                data-lpignore="true"
                className="min-h-24 w-full resize-none rounded-[var(--radius-lg)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] opacity-70 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {!initialData && (
              <div className="rounded-[var(--radius-xl)] border border-blue-100 bg-blue-50/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="has-initial-stock"
                    checked={formData.hasInitialStock}
                    onChange={(e) => setFormData(prev => ({ ...prev, hasInitialStock: e.target.checked }))}
                    className="h-4 w-4 rounded border-[var(--border)] text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="has-initial-stock" className="text-sm font-semibold text-[var(--foreground)] cursor-pointer">
                    Nhập số tồn kho thực tế ban đầu (Tồn kho thật)
                  </label>
                </div>
                
                {formData.hasInitialStock && (
                  <div className="grid gap-4 sm:grid-cols-2 mt-2 pt-3 border-t border-blue-100">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Số lượng tồn ban đầu <span className="text-rose-500">*</span></label>
                      <NumericInput
                        value={formData.initialStock}
                        onChange={(val) => updateField("initialStock", val)}
                        placeholder="0.00"
                        className="h-10 w-full rounded-[var(--radius-lg)] border border-[var(--border)] px-3 text-right text-sm text-[var(--foreground)] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Ngày nhập <span className="text-rose-500">*</span></label>
                      <DateTimeFieldVN 
                        value={formData.initialStockDate} 
                        onChange={val => updateField("initialStockDate", val)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-medium text-[var(--foreground)]">Ghi chú nhập kho ban đầu</label>
                      <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                        type="text"
                        value={formData.initialStockNotes}
                        onChange={(e) => updateField("initialStockNotes", e.target.value)}
                        placeholder="Ví dụ: Kiểm kê đầu kỳ..."
                        className="h-10 w-full rounded-[var(--radius-lg)] border border-[var(--border)] px-3 text-sm text-[var(--foreground)] outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Hủy</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Lưu"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
