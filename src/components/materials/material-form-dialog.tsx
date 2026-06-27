"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

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
}

const initialForm = {
  code: "",
  name: "",
  unit: "",
  group: "",
  minStockLevel: "0",
  description: "",
};

export function MaterialFormDialog({ isOpen, onClose, onSubmit, isSubmitting, initialData }: MaterialFormDialogProps) {
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
          minStockLevel: initialData.minStockLevel?.toString() || "0",
          description: initialData.description || "",
        });
      } else {
        setFormData(initialForm);
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
    const minStockLevel = Number(formData.minStockLevel);

    if (!name) return setError("Tên vật tư là bắt buộc.");
    if (!unit) return setError("Đơn vị tính là bắt buộc.");
    if (!Number.isFinite(minStockLevel) || minStockLevel < 0) return setError("Tồn tối thiểu phải lớn hơn hoặc bằng 0.");

    try {
      await onSubmit({
        code: formData.code.trim() || undefined,
        name,
        unit,
        group: formData.group.trim() || undefined,
        description: formData.description.trim() || undefined,
        minStockLevel,
      });
      setFormData(initialForm);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể lưu vật tư.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-slate-950/20 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">{initialData ? "Sửa vật tư" : "Thêm vật tư"}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Đóng form thêm vật tư"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          <div className="grid gap-4">
            <div>
              <label htmlFor="material-code" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Mã vật tư <span className="font-normal text-slate-400">(tùy chọn)</span>
              </label>
              <input
                id="material-code"
                value={formData.code}
                onChange={(event) => updateField("code", event.target.value)}
                placeholder="VD: THEP-D10"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label htmlFor="material-name" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Tên vật tư <span className="text-rose-600">*</span>
              </label>
              <input
                id="material-name"
                value={formData.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="VD: Thép cuộn D10"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="material-unit" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Đơn vị tính <span className="text-rose-600">*</span>
                </label>
                  <input
                    id="material-unit"
                    value={formData.unit}
                    onChange={(event) => updateField("unit", event.target.value)}
                    placeholder="VD: kg, bao, cây"
                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
              </div>
              <div>
                <label htmlFor="material-group" className="mb-1.5 block text-sm font-semibold text-slate-700">Nhóm vật tư</label>
                <input
                  id="material-group"
                  value={formData.group}
                  onChange={(event) => updateField("group", event.target.value)}
                  placeholder="VD: Thép"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="material-min-stock" className="mb-1.5 block text-sm font-semibold text-slate-700">Tồn tối thiểu tại công trình</label>
              <input
                id="material-min-stock"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={formData.minStockLevel}
                onChange={(event) => updateField("minStockLevel", event.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-right text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label htmlFor="material-description" className="mb-1.5 block text-sm font-semibold text-slate-700">Ghi chú</label>
              <textarea
                id="material-description"
                value={formData.description}
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Quy cách, thương hiệu, tiêu chuẩn nghiệm thu..."
                className="min-h-24 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
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
