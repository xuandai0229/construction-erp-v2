"use client";

import { useState, useEffect } from "react";
import { X, CalendarIcon, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaymentRequestDto, AccountingContractOptionDto } from "../actions";
import { stripMoney, formatVndInput, getVndShortText } from "@/lib/contracts/contract-money-utils";

interface PaymentRequestFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
  initialData?: PaymentRequestDto | null;
  projects: { id: string; name: string; code: string }[];
  suppliers: { id: string; name: string }[];
  contracts: AccountingContractOptionDto[];
}

export function PaymentRequestFormDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
  projects,
  suppliers,
  contracts
}: PaymentRequestFormDialogProps) {
  const [projectId, setProjectId] = useState("");
  const [title, setTitle] = useState("");
  const [type, setType] = useState("OTHER");
  const [supplierId, setSupplierId] = useState("");
  const [contractId, setContractId] = useState("");
  const [subTotal, setSubTotal] = useState("");
  const [vatAmount, setVatAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const filteredContracts = contracts.filter(c => c.projectId === projectId);

  useEffect(() => {
    if (isOpen) {
      setError("");
      if (initialData) {
        setProjectId(initialData.projectId);
        setTitle(initialData.title);
        setType(initialData.type);
        setSupplierId(initialData.supplierId || "");
        setContractId(initialData.contractId || "");
        
        const rawSubTotal = initialData.subTotal ? initialData.subTotal.toString().split(".")[0] : "";
        setSubTotal(formatVndInput(rawSubTotal));
        
        const rawVat = initialData.vatAmount ? initialData.vatAmount.toString().split(".")[0] : "";
        setVatAmount(formatVndInput(rawVat));

        setDueDate(initialData.dueDate ? initialData.dueDate.substring(0, 10) : "");
        setNotes(initialData.notes || "");
      } else {
        setProjectId(projects.length === 1 ? projects[0].id : "");
        setTitle("");
        setType("PROGRESS");
        setSupplierId("");
        setContractId("");
        setSubTotal("");
        setVatAmount("");
        setDueDate("");
        setNotes("");
      }
    }
  }, [isOpen, initialData, projects]);

  useEffect(() => {
    if (!filteredContracts.find(c => c.id === contractId)) {
      setContractId("");
    }
  }, [projectId]);

  useEffect(() => {
    setError("");
  }, [projectId, title, type, supplierId, contractId, subTotal, vatAmount, dueDate, notes]);

  if (!isOpen) return null;

  const numSubTotal = Number(stripMoney(subTotal)) || 0;
  const numVat = Number(stripMoney(vatAmount)) || 0;
  const numTotal = numSubTotal + numVat;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!projectId) {
      setError("Vui lòng chọn công trình.");
      return;
    }

    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề hồ sơ.");
      return;
    }

    if (numTotal <= 0) {
      setError("Tổng tiền thanh toán phải lớn hơn 0.");
      return;
    }

    try {
      await onSubmit({
        projectId,
        title,
        type,
        supplierId: supplierId || undefined,
        contractId: contractId || undefined,
        subTotal: numSubTotal,
        vatAmount: numVat,
        totalAmount: numTotal,
        dueDate: dueDate || undefined,
        notes: notes || undefined
      });
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi lưu hồ sơ.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:p-6">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0">
          <h2 className="text-lg font-bold text-slate-950">
            {initialData ? "Sửa hồ sơ thanh toán" : "Tạo hồ sơ thanh toán mới"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            disabled={isSubmitting}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-5 flex-1">

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Tiêu đề <span className="text-rose-500">*</span></label>
              <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder="VD: Đề nghị thanh toán đợt 1 - HĐ XYZ"
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Công trình <span className="text-rose-500">*</span></label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={isSubmitting || !!initialData}
              >
                <option value="">-- Chọn công trình --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Loại thanh toán <span className="text-rose-500">*</span></label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={isSubmitting}
              >
                <option value="ADVANCE">Tạm ứng</option>
                <option value="PROGRESS">Thanh toán khối lượng</option>
                <option value="FINAL">Quyết toán</option>
                <option value="RETENTION">Giữ lại / Bảo hành</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Hợp đồng liên quan</label>
              <select
                value={contractId}
                onChange={(e) => setContractId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={isSubmitting || !projectId}
              >
                <option value="">-- Không gắn hợp đồng --</option>
                {filteredContracts.map((c) => (
                  <option key={c.id} value={c.id}>{c.contractNo} - {c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Nhà cung cấp / Đối tác</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={isSubmitting}
              >
                <option value="">-- Chọn đối tác --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="col-span-2 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Trước thuế (VNĐ) <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={subTotal}
                  onChange={(e) => setSubTotal(formatVndInput(e.target.value))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="0"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Thuế VAT (VNĐ)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  
                  value={vatAmount}
                  onChange={(e) => setVatAmount(formatVndInput(e.target.value))}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="0"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-blue-700">Tổng thanh toán</label>
                <div className="h-10 w-full rounded-lg border border-blue-100 bg-blue-50/50 px-3 flex items-center font-mono font-bold text-blue-700">
                  {new Intl.NumberFormat("vi-VN").format(numTotal)} đ
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Hạn thanh toán</label>
              <div className="relative">
                <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">Ghi chú</label>
              <textarea autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-none"
                placeholder="Nhập ghi chú thêm..."
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-4 mt-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-600 border border-rose-100 flex items-center gap-2 shrink-0">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-6 py-4 rounded-b-2xl shrink-0">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <div className="flex gap-2">
            <Button 
              type="button" 
              disabled={isSubmitting}
              onClick={(e) => handleSubmit(e)}
            >
              {initialData ? "Cập nhật hồ sơ" : "Lưu hồ sơ"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
