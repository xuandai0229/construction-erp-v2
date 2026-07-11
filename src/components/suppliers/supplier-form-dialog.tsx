"use client";

import { useEffect, useState } from "react";
import { CloseButton } from "@/components/ui/close-button";
import { Button } from "@/components/ui/button";

interface SupplierFormData {
  code?: string;
  name: string;
  taxCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  contactPerson?: string;
}

interface SupplierFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SupplierFormData) => Promise<void>;
  isSubmitting: boolean;
  initialData?: {
    id: string;
    code: string;
    name: string;
    taxCode: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    contactPerson: string | null;
  } | null;
}

const emptyForm = {
  code: "",
  name: "",
  taxCode: "",
  address: "",
  phone: "",
  email: "",
  contactPerson: "",
};

export function SupplierFormDialog({ isOpen, onClose, onSubmit, isSubmitting, initialData }: SupplierFormDialogProps) {
  const [formData, setFormData] = useState(emptyForm);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      if (initialData) {
        setFormData({
          code: initialData.code || "",
          name: initialData.name || "",
          taxCode: initialData.taxCode || "",
          address: initialData.address || "",
          phone: initialData.phone || "",
          email: initialData.email || "",
          contactPerson: initialData.contactPerson || "",
        });
      } else {
        setFormData(emptyForm);
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const updateField = (field: keyof typeof emptyForm, value: string) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const name = formData.name.trim();
    if (!name) return setError("Tên đối tác là bắt buộc.");

    try {
      await onSubmit({
        code: formData.code.trim() || undefined,
        name,
        taxCode: formData.taxCode.trim() || undefined,
        address: formData.address.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        email: formData.email.trim() || undefined,
        contactPerson: formData.contactPerson.trim() || undefined,
      });
      setFormData(emptyForm);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể lưu.");
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl shadow-slate-950/20 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">{initialData ? "Sửa đối tác" : "Thêm đối tác"}</h2>
          </div>
          <CloseButton onClick={onClose} tone="neutral" />
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto p-4">
          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}

          <div className="grid gap-4">
            {/* Code - only for new suppliers */}
            {!initialData && (
              <div>
                <label htmlFor="supplier-code" className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Mã đối tác <span className="font-normal text-slate-400">(tùy chọn)</span>
                </label>
                <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                  id="supplier-code"
                  value={formData.code}
                  onChange={(e) => updateField("code", e.target.value)}
                  placeholder="VD: NCC-THEP-HN"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            <div>
              <label htmlFor="supplier-name" className="mb-1.5 block text-sm font-semibold text-slate-700">
                Tên đối tác <span className="text-rose-600">*</span>
              </label>
              <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                id="supplier-name"
                value={formData.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="VD: Công ty CP Thép Hòa Phát"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="supplier-contact" className="mb-1.5 block text-sm font-semibold text-slate-700">Người liên hệ</label>
                <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                  id="supplier-contact"
                  value={formData.contactPerson}
                  onChange={(e) => updateField("contactPerson", e.target.value)}
                  placeholder="VD: Nguyễn Văn A"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label htmlFor="supplier-phone" className="mb-1.5 block text-sm font-semibold text-slate-700">Số điện thoại</label>
                <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                  id="supplier-phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="VD: 0912 345 678"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="supplier-email" className="mb-1.5 block text-sm font-semibold text-slate-700">Email</label>
                <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                  id="supplier-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  placeholder="VD: lienhe@hoaphat.vn"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label htmlFor="supplier-tax" className="mb-1.5 block text-sm font-semibold text-slate-700">Mã số thuế</label>
                <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                  id="supplier-tax"
                  inputMode="numeric"
                  value={formData.taxCode}
                  onChange={(e) => updateField("taxCode", e.target.value)}
                  placeholder="VD: 0100112345"
                  className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label htmlFor="supplier-address" className="mb-1.5 block text-sm font-semibold text-slate-700">Địa chỉ</label>
              <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                id="supplier-address"
                value={formData.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="VD: Số 39 Nguyễn Đình Chiểu, Q1, TP.HCM"
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
