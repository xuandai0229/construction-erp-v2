"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { CloseButton } from "@/components/ui/close-button";
import { DateTimeFieldVN } from "@/components/ui/date-field-vn";
import { NumericInput } from "@/components/ui/numeric-input";
import { fromDateTimeLocalInputValue, toDateTimeLocalInputValue } from "@/lib/date-utils";

type MaterialSubmitData = {
  code?: string;
  name: string;
  unit: string;
  manufacturer?: string;
  origin?: string;
  description?: string;
  minStockLevel?: number;
  initialStock?: number;
  initialStockDate?: Date;
  initialStockNotes?: string;
};

interface MaterialFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MaterialSubmitData) => Promise<void>;
  isSubmitting: boolean;
  initialData?: {
    id?: string;
    code: string;
    name: string;
    unit: string;
    manufacturer: string | null;
    origin: string | null;
    description: string | null;
    minStockLevel?: number;
    hasMovement?: boolean;
  };
}

const emptyForm = {
  code: "",
  name: "",
  unit: "",
  manufacturer: "",
  origin: "",
  minStockLevel: "",
  description: "",
  hasInitialStock: false,
  initialStock: "",
  initialStockDate: "",
  initialStockNotes: "",
};

function FieldLabel({ htmlFor, children, required = false }: { htmlFor: string; children: React.ReactNode; required?: boolean }) {
  return <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-[var(--foreground)]">{children}{required && <span className="ml-1 text-rose-600">*</span>}</label>;
}

const inputClassName = "h-10 w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export function MaterialFormDialog({ isOpen, onClose, onSubmit, isSubmitting, initialData }: MaterialFormDialogProps) {
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setError("");
    setFormData(initialData ? {
      code: initialData.code || "",
      name: initialData.name || "",
      unit: initialData.unit || "",
      manufacturer: initialData.manufacturer || "",
      origin: initialData.origin || "",
      minStockLevel: initialData.minStockLevel && initialData.minStockLevel > 0 ? String(initialData.minStockLevel) : "",
      description: initialData.description || "",
      hasInitialStock: false,
      initialStock: "",
      initialStockDate: toDateTimeLocalInputValue(new Date()),
      initialStockNotes: "",
    } : { ...emptyForm, initialStockDate: toDateTimeLocalInputValue(new Date()) });

    return () => previousFocus.current?.focus();
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const updateField = (field: keyof typeof emptyForm, value: string | boolean) => setFormData((current) => ({ ...current, [field]: value }));
  const close = () => { if (!isSubmitting) onClose(); };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const name = formData.name.trim();
    const unit = formData.unit.trim();
    const threshold = formData.minStockLevel.trim() === "" ? 0 : Number(formData.minStockLevel);
    if (!name) return setError("Vui lòng nhập tên vật tư.");
    if (!unit) return setError("Vui lòng nhập đơn vị tính.");
    if (!Number.isFinite(threshold) || threshold < 0) return setError("Ngưỡng cảnh báo không được nhỏ hơn 0.");

    let initialStock: number | undefined;
    let initialStockDate: Date | undefined;
    if (!initialData && formData.hasInitialStock) {
      initialStock = Number(formData.initialStock);
      if (!Number.isFinite(initialStock) || initialStock <= 0) return setError("Tồn kho ban đầu phải lớn hơn 0.");
      initialStockDate = fromDateTimeLocalInputValue(formData.initialStockDate) || undefined;
      if (!initialStockDate) return setError("Vui lòng chọn ngày ghi nhận tồn kho ban đầu.");
    }

    try {
      await onSubmit({
        code: formData.code.trim() || undefined,
        name,
        unit,
        manufacturer: formData.manufacturer.trim() || undefined,
        origin: formData.origin.trim() || undefined,
        description: formData.description.trim() || undefined,
        minStockLevel: threshold,
        initialStock,
        initialStockDate,
        initialStockNotes: formData.initialStockNotes.trim() || undefined,
      });
      setFormData({ ...emptyForm, initialStockDate: toDateTimeLocalInputValue(new Date()) });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể lưu vật tư.");
    }
  };

  return <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="material-form-title" className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-[var(--surface)] shadow-2xl shadow-slate-950/20 sm:rounded-[var(--radius-xl)]" onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); close(); } }}>
      <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4 sm:px-6">
        <div>
          <h2 id="material-form-title" className="text-lg font-bold text-slate-950">{initialData ? "Sửa vật tư" : "Thêm vật tư"}</h2>
          {!initialData && <p className="mt-1 text-sm text-[var(--muted-foreground)]">Thêm vật tư vào danh mục của công trình.</p>}
        </div>
        <CloseButton onClick={close} tone="neutral" disabled={isSubmitting} />
      </header>

      <form id="material-form" onSubmit={handleSubmit} className="min-h-0 overflow-y-auto px-5 py-5 sm:px-6">
        {error && <div role="alert" className="mb-5 rounded-[var(--radius-lg)] border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</div>}

        <div className="space-y-6">
          <fieldset className="space-y-4">
            <legend className="text-sm font-bold text-slate-950">Thông tin vật tư</legend>
            <div><FieldLabel htmlFor="material-name" required>Tên vật tư</FieldLabel><input id="material-name" value={formData.name} onChange={(event) => updateField("name", event.target.value)} placeholder="VD: Thép thanh vằn D10 CB300-V" className={inputClassName} required autoFocus /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><FieldLabel htmlFor="material-code">Mã vật tư</FieldLabel><input id="material-code" value={formData.code} onChange={(event) => updateField("code", event.target.value)} placeholder="Để trống để hệ thống tự sinh mã" className={inputClassName} autoComplete="off" spellCheck={false} /></div>
              <div><FieldLabel htmlFor="material-unit" required>Đơn vị tính</FieldLabel><input id="material-unit" value={formData.unit} onChange={(event) => updateField("unit", event.target.value)} placeholder="VD: kg, bao, cây" className={inputClassName} required /></div>
            </div>
          </fieldset>

          <fieldset className="border-t border-[var(--border)] pt-5">
            <legend className="text-sm font-bold text-slate-950">Nguồn gốc</legend>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><FieldLabel htmlFor="material-manufacturer">Hãng sản xuất</FieldLabel><input id="material-manufacturer" value={formData.manufacturer} onChange={(event) => updateField("manufacturer", event.target.value)} placeholder="VD: Hòa Phát" className={inputClassName} /></div>
              <div><FieldLabel htmlFor="material-origin">Xuất xứ</FieldLabel><input id="material-origin" value={formData.origin} onChange={(event) => updateField("origin", event.target.value)} placeholder="VD: Việt Nam" className={inputClassName} /></div>
            </div>
          </fieldset>

          <fieldset className="border-t border-[var(--border)] pt-5">
            <legend className="text-sm font-bold text-slate-950">Quản lý tồn kho</legend>
            <div className="mt-4 max-w-xs"><FieldLabel htmlFor="material-min-stock">Ngưỡng cảnh báo tồn kho</FieldLabel><NumericInput id="material-min-stock" value={formData.minStockLevel} onChange={(value) => updateField("minStockLevel", value)} placeholder="VD: 100" className={`${inputClassName} text-right`} /><p className="mt-1.5 text-xs leading-5 text-[var(--muted-foreground)]">Hệ thống cảnh báo khi tồn kho bằng hoặc thấp hơn mức này.</p></div>
            {!initialData && <div className="mt-5 rounded-[var(--radius-lg)] border border-blue-100 bg-blue-50/40 p-4"><label className="flex cursor-pointer items-start gap-3"><input id="has-initial-stock" type="checkbox" checked={formData.hasInitialStock} onChange={(event) => updateField("hasInitialStock", event.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" /><span><span className="block text-sm font-semibold text-slate-950">Khai báo tồn kho ban đầu</span><span className="mt-1 block text-xs leading-5 text-[var(--muted-foreground)]">Dùng khi vật tư đã có sẵn tại công trình trước khi được tạo trên hệ thống.</span></span></label>
              {formData.hasInitialStock && <div className="mt-4 grid gap-4 border-t border-blue-100 pt-4 sm:grid-cols-2"><div><FieldLabel htmlFor="initial-stock" required>Tồn kho ban đầu</FieldLabel><NumericInput id="initial-stock" value={formData.initialStock} onChange={(value) => updateField("initialStock", value)} placeholder="0" className={`${inputClassName} text-right`} /></div><div><FieldLabel htmlFor="initial-stock-date" required>Ngày ghi nhận</FieldLabel><DateTimeFieldVN value={formData.initialStockDate} onChange={(value) => updateField("initialStockDate", value)} /></div><div className="sm:col-span-2"><FieldLabel htmlFor="initial-stock-note">Ghi chú tồn đầu kỳ</FieldLabel><input id="initial-stock-note" value={formData.initialStockNotes} onChange={(event) => updateField("initialStockNotes", event.target.value)} placeholder="VD: Kiểm kê đầu kỳ" className={inputClassName} /></div></div>}
            </div>}
          </fieldset>

          <fieldset className="border-t border-[var(--border)] pt-5"><FieldLabel htmlFor="material-description">Ghi chú</FieldLabel><textarea id="material-description" value={formData.description} onChange={(event) => updateField("description", event.target.value)} placeholder="Quy cách, tiêu chuẩn nghiệm thu hoặc thông tin cần lưu ý..." className="min-h-20 w-full resize-y rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-blue-500 focus:ring-2 focus:ring-blue-100" rows={3} /></fieldset>
        </div>
      </form>

      <footer className="flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--border)] bg-[var(--surface)] px-5 py-3 sm:flex-row sm:justify-end sm:px-6"><Button type="button" variant="outline" onClick={close} disabled={isSubmitting}>Hủy</Button><Button type="submit" form="material-form" className="bg-blue-600 text-white hover:bg-blue-700" disabled={isSubmitting}>{isSubmitting ? "Đang lưu..." : initialData ? "Lưu thay đổi" : "Thêm vật tư"}</Button></footer>
    </section>
  </div>;
}
