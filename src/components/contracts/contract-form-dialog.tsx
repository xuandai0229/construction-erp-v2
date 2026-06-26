"use client";

import { useState, useEffect } from "react";
import { X, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContractDto } from "@/app/(dashboard)/contracts/actions";

interface ContractFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
  initialData?: ContractDto | null;
  projects: { id: string; name: string; code: string }[];
  suppliers: { id: string; name: string; code: string }[];
}

export function ContractFormDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  initialData,
  projects,
  suppliers
}: ContractFormDialogProps) {
  const [projectId, setProjectId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [contractNo, setContractNo] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("CLIENT");
  const [status, setStatus] = useState("DRAFT");
  const [value, setValue] = useState("");
  const [signDate, setSignDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setProjectId(initialData.projectId);
        setSupplierId(initialData.supplierId || "");
        setContractNo(initialData.contractNo);
        setName(initialData.name);
        setType(initialData.type);
        setStatus(initialData.status);
        setValue(initialData.value.toString());
        setSignDate(initialData.signDate ? initialData.signDate.substring(0, 10) : "");
        setStartDate(initialData.startDate ? initialData.startDate.substring(0, 10) : "");
        setEndDate(initialData.endDate ? initialData.endDate.substring(0, 10) : "");
      } else {
        setProjectId(projects.length === 1 ? projects[0].id : "");
        setSupplierId("");
        setContractNo("");
        setName("");
        setType("SUBCONTRACTOR");
        setStatus("DRAFT");
        setValue("");
        setSignDate("");
        setStartDate("");
        setEndDate("");
      }
    }
  }, [isOpen, initialData, projects]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      projectId,
      supplierId: supplierId || undefined,
      contractNo,
      name,
      type,
      status,
      value: Number(value),
      signDate: signDate || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:p-6">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-950">
            {initialData ? "Sửa hợp đồng" : "Thêm hợp đồng mới"}
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

        <form onSubmit={handleSubmit}>
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Công trình <span className="text-rose-500">*</span></label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">-- Chọn công trình --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Số hợp đồng <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={contractNo}
                  onChange={(e) => setContractNo(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="VD: HĐ-2026/01"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Tên hợp đồng <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="VD: Thi công cơ điện"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Loại hợp đồng <span className="text-rose-500">*</span></label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                  disabled={isSubmitting}
                >
                  <option value="CLIENT">Với chủ đầu tư</option>
                  <option value="SUBCONTRACTOR">Với thầu phụ</option>
                  <option value="SUPPLIER">Với nhà cung cấp</option>
                  <option value="LABOR">Khoán nhân công</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Trạng thái <span className="text-rose-500">*</span></label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  required
                  disabled={isSubmitting}
                >
                  <option value="DRAFT">Nháp</option>
                  <option value="ACTIVE">Đang thực hiện</option>
                  <option value="COMPLETED">Đã hoàn thành</option>
                  <option value="TERMINATED">Chấm dứt</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Giá trị hợp đồng (VNĐ) <span className="text-rose-500">*</span></label>
                <input
                  type="number"
                  min="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="VD: 1500000000"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Đối tác liên kết</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  disabled={isSubmitting || type === "CLIENT"}
                >
                  <option value="">-- Không gắn đối tác --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                  ))}
                </select>
                {type === "CLIENT" && (
                  <p className="text-xs text-slate-500">Hợp đồng chủ đầu tư không cần chọn đối tác.</p>
                )}
              </div>

              <div className="col-span-2 grid gap-5 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Ngày ký</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={signDate}
                      onChange={(e) => setSignDate(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Ngày bắt đầu</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Ngày kết thúc</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 rounded-b-2xl">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : initialData ? "Cập nhật" : "Thêm hợp đồng"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
