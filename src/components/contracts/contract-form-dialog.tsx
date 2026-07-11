"use client";

import { useState, useEffect } from "react";
import { CalendarIcon, AlertTriangle } from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import { Button } from "@/components/ui/button";
import { EnterpriseCombobox, type EnterpriseComboboxOption } from "@/components/ui/enterprise-combobox";
import { fromDateInputValue, toDateInputValue } from "@/lib/date-utils";
import type { ContractDto } from "@/app/(dashboard)/contracts/actions";
import { stripMoney, formatVndInput, getVndShortText } from "@/lib/contracts/contract-money-utils";

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
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      if (initialData) {
        setProjectId(initialData.projectId);
        setSupplierId(initialData.supplierId || "");
        setContractNo(initialData.contractNo);
        setName(initialData.name);
        setType(initialData.type);
        setStatus(initialData.status);
        const rawDbValue = initialData.value ? initialData.value.toString().split(".")[0] : "";
        setValue(formatVndInput(rawDbValue));
        setSignDate(toDateInputValue(initialData.signDate));
        setStartDate(toDateInputValue(initialData.startDate));
        setEndDate(toDateInputValue(initialData.endDate));
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

  useEffect(() => {
    setError("");
  }, [isOpen, projectId, supplierId, contractNo, name, type, status, value, signDate, startDate, endDate]);

  if (!isOpen) return null;

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setValue(formatVndInput(raw));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const rawValue = stripMoney(value);
    const numericValue = Number(rawValue);

    if (!rawValue) {
      setError("Giá trị hợp đồng là bắt buộc.");
      return;
    }

    if (isNaN(numericValue) || numericValue <= 0) {
      setError("Giá trị hợp đồng phải lớn hơn 0.");
      return;
    }

    if (!projectId) {
      setError("Vui lòng chọn công trình.");
      return;
    }

    if (rawValue.length > 15) {
      setError("Giá trị hợp đồng quá lớn.");
      return;
    }

    if (startDate && endDate) {
      const start = fromDateInputValue(startDate);
      const end = fromDateInputValue(endDate);
      if (!start || !end) {
        setError("Ngày hợp đồng không hợp lệ.");
        return;
      }
      if (end < start) {
        setError("Ngày kết thúc không được trước ngày bắt đầu.");
        return;
      }
    }

    try {
      await onSubmit({
        projectId,
        supplierId: supplierId || undefined,
        contractNo,
        name,
        type,
        status,
        value: numericValue,
        signDate: signDate || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi lưu hợp đồng.");
    }
  };

  const projectOptions = projects.map<EnterpriseComboboxOption>((project) => ({
    value: project.id,
    code: project.code,
    name: project.name,
    label: `${project.code} — ${project.name}`,
  }));
  const supplierOptions = suppliers.map<EnterpriseComboboxOption>((supplier) => ({
    value: supplier.id,
    code: supplier.code,
    name: supplier.name,
    label: `${supplier.code} — ${supplier.name}`,
  }));

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:p-6">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-950">
            {initialData ? "Sửa hợp đồng" : "Thêm hợp đồng mới"}
          </h2>
          <CloseButton onClick={onClose} disabled={isSubmitting} tone="neutral" />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Công trình <span className="text-rose-500">*</span></label>
                <EnterpriseCombobox
                  value={projectId}
                  onChange={setProjectId}
                  options={projectOptions}
                  placeholder="Chọn công trình"
                  searchPlaceholder="Tìm mã hoặc tên công trình..."
                  emptyMessage="Không tìm thấy công trình phù hợp."
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Số hợp đồng <span className="text-rose-500">*</span></label>
                <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
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
                <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
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
                  type="text"
                  inputMode="numeric"
                  
                  value={value}
                  onChange={handleValueChange}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder="VD: 1.500.000.000"
                  required
                  disabled={isSubmitting}
                />
                {value && (
                  <p className="text-xs text-slate-500 italic mt-0.5">
                    {getVndShortText(value)}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">Đối tác liên kết</label>
                <EnterpriseCombobox
                  value={supplierId}
                  onChange={setSupplierId}
                  options={supplierOptions}
                  placeholder="Không gắn đối tác"
                  searchPlaceholder="Tìm mã hoặc tên đối tác..."
                  emptyMessage="Không tìm thấy đối tác phù hợp."
                  disabled={isSubmitting || type === "CLIENT"}
                />
                {type === "CLIENT" ? (
                  <p className="text-xs text-slate-500">Hợp đồng chủ đầu tư không cần chọn đối tác.</p>
                ) : (
                  !supplierId && (
                    <p className="text-xs text-amber-600 font-medium italic mt-0.5">
                      Nên chọn đối tác để dễ theo dõi hợp đồng.
                    </p>
                  )
                )}
              </div>

              <div className="col-span-2 grid gap-5 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-slate-700">Ngày ký</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
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
                    <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
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
                    <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
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

          {error && (
            <div className="mx-6 mb-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-600 border border-rose-100 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 rounded-b-2xl">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : initialData ? "Lưu" : "Thêm hợp đồng"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
