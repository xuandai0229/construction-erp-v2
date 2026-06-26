"use client";

import { X, Pencil, Trash2, Building2, MapPin, Hash, User, Calendar, FileText, BadgePercent } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContractDto } from "@/app/(dashboard)/contracts/actions";
import { getContractDisplayStatus } from "@/lib/contracts/contracts-permissions";

interface ContractDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  contract: ContractDto | null;
  onEdit: (contract: ContractDto) => void;
  onDelete: (contract: ContractDto) => void;
  isSubmitting: boolean;
}

const TYPE_MAP: Record<string, string> = {
  CLIENT: "Với chủ đầu tư",
  SUBCONTRACTOR: "Với thầu phụ",
  SUPPLIER: "Với nhà cung cấp",
  LABOR: "Khoán nhân công",
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Nháp", color: "bg-slate-100 text-slate-600 border-slate-200" },
  ACTIVE: { label: "Đang thực hiện", color: "bg-blue-50 text-blue-700 border-blue-200" },
  COMPLETED: { label: "Đã hoàn thành", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  TERMINATED: { label: "Chấm dứt", color: "bg-rose-50 text-rose-700 border-rose-200" },
  OVERDUE: { label: "Quá hạn", color: "bg-red-50 text-red-700 border-red-200" },
  EXPIRING: { label: "Sắp hết hạn", color: "bg-amber-50 text-amber-700 border-amber-200" },
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat("vi-VN").format(val) + " đ";
}

function formatDate(dateString: string | null) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function ContractDetailDrawer({
  isOpen,
  onClose,
  contract,
  onEdit,
  onDelete,
  isSubmitting,
}: ContractDetailDrawerProps) {
  if (!isOpen || !contract) return null;

  const displayStatus = getContractDisplayStatus(contract.status, contract.endDate);
  const statusInfo = STATUS_MAP[displayStatus] || STATUS_MAP.DRAFT;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/45 p-0 backdrop-blur-sm sm:items-stretch sm:p-0">
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      
      <div className="relative flex w-full flex-col bg-white shadow-2xl sm:w-[500px] sm:max-w-[500px] mt-auto max-h-[92dvh] rounded-t-2xl sm:mt-0 sm:max-h-full sm:h-full sm:rounded-none transition-transform animate-in slide-in-from-bottom-full sm:slide-in-from-right-full duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-950">Chi tiết hợp đồng</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-6 flex flex-col gap-2">
            <h3 className="text-xl font-bold text-slate-950 leading-tight">{contract.name}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <div className="flex items-center rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-600">
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                {contract.contractNo}
              </div>
              <div className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold ${statusInfo.color}`}>
                {statusInfo.label}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <section>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Giá trị</h4>
              <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 text-center shadow-sm">
                <div className="text-sm font-medium text-blue-600 mb-1">Tổng giá trị hợp đồng</div>
                <div className="text-2xl font-bold tracking-tight text-blue-950">{formatCurrency(contract.value)}</div>
              </div>
            </section>

            <section>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Thông tin chung</h4>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden text-sm">
                <div className="grid grid-cols-3 border-b border-slate-100">
                  <div className="p-3 text-slate-500 border-r border-slate-100 bg-slate-50/50">Công trình</div>
                  <div className="p-3 col-span-2 font-medium text-slate-900">
                    <span className="font-mono text-xs text-slate-500 mr-2">{contract.project.code}</span>
                    {contract.project.name}
                  </div>
                </div>
                <div className="grid grid-cols-3 border-b border-slate-100">
                  <div className="p-3 text-slate-500 border-r border-slate-100 bg-slate-50/50">Đối tác</div>
                  <div className="p-3 col-span-2 font-medium text-slate-900">
                    {contract.type === "CLIENT" ? (
                      <span className="text-slate-500 font-medium">Chủ đầu tư</span>
                    ) : contract.supplier ? (
                      <>
                        <span className="font-mono text-xs text-slate-500 mr-2">{contract.supplier.code}</span>
                        {contract.supplier.name}
                      </>
                    ) : (
                      <span className="text-amber-600 font-medium italic">Chưa chọn đối tác</span>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3">
                  <div className="p-3 text-slate-500 border-r border-slate-100 bg-slate-50/50">Loại hợp đồng</div>
                  <div className="p-3 col-span-2 font-medium text-slate-900">
                    {TYPE_MAP[contract.type] || contract.type}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Tiến độ</h4>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden text-sm grid grid-cols-3">
                <div className="p-3 border-r border-slate-100 flex flex-col items-center justify-center text-center">
                  <div className="text-xs text-slate-500 mb-1">Ngày ký</div>
                  <div className="font-medium text-slate-900 font-mono">{formatDate(contract.signDate)}</div>
                </div>
                <div className="p-3 border-r border-slate-100 flex flex-col items-center justify-center text-center bg-slate-50/30">
                  <div className="text-xs text-slate-500 mb-1">Bắt đầu</div>
                  <div className="font-medium text-slate-900 font-mono">{formatDate(contract.startDate)}</div>
                </div>
                <div className="p-3 flex flex-col items-center justify-center text-center bg-slate-50/30">
                  <div className="text-xs text-slate-500 mb-1">Kết thúc</div>
                  <div className="font-medium text-slate-900 font-mono">{formatDate(contract.endDate)}</div>
                </div>
              </div>
            </section>

            {/* Meta */}
            <section className="text-xs text-slate-400 space-y-1 pt-2">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Ngày tạo: {formatDate(contract.createdAt)}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Cập nhật lần cuối: {formatDate(contract.updatedAt)}
              </div>
            </section>
          </div>
        </div>

        {/* Footer Actions */}
        {(contract.canUpdate || contract.canDelete) && (
          <div className="border-t border-slate-100 bg-slate-50/50 p-4 flex gap-3">
            {contract.canUpdate && (
              <Button 
                variant="outline" 
                className="flex-1 bg-white" 
                onClick={() => {
                  onClose();
                  onEdit(contract);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Sửa
              </Button>
            )}
            {contract.canDelete && (
              <Button 
                variant="outline" 
                className="flex-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 hover:border-rose-300 bg-white"
                onClick={() => {
                  if (!isSubmitting) {
                    onClose();
                    onDelete(contract);
                  }
                }}
                disabled={isSubmitting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Xóa
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
