"use client";

import { X, Calendar, User, FileText, Building2, ShieldAlert, CheckCircle2, FileX2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PaymentRequestDto } from "../actions";

interface PaymentRequestDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  paymentRequest: PaymentRequestDto | null;
}

export function PaymentRequestDetailDrawer({
  isOpen,
  onClose,
  paymentRequest
}: PaymentRequestDetailDrawerProps) {
  if (!isOpen || !paymentRequest) return null;

  const pr = paymentRequest;
  const today = new Date();
  const dueDateObj = pr.dueDate ? new Date(pr.dueDate) : null;
  const isOverdue = dueDateObj && dueDateObj < today && pr.status !== "PAID" && pr.status !== "CANCELLED";

  const formatDateOnly = (dateStr: string | null) => {
    if (!dateStr) return "Chưa có hạn";
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case "ADVANCE": return "Tạm ứng";
      case "PROGRESS": return "Thanh toán khối lượng";
      case "FINAL": return "Quyết toán";
      case "RETENTION": return "Giữ lại / Bảo hành";
      case "OTHER": return "Khác";
      default: return type;
    }
  };

  const formatVnd = (value: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm sm:p-6">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-wider text-slate-500 uppercase">{pr.requestCode}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-200 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto px-6 py-6 flex-1 space-y-6">
          {/* Overdue alert */}
          {isOverdue && (
            <div className="flex gap-3 items-start rounded-xl bg-amber-50 p-4 border border-amber-200/60">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-amber-800">Hồ sơ quá hạn thanh toán</h4>
                <p className="text-xs text-amber-700 mt-0.5">
                  Hạn thanh toán là ngày {formatDateOnly(pr.dueDate)}. Vui lòng liên hệ kế toán để thực hiện chi trả.
                </p>
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-tight">{pr.title}</h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Left Block - General Information */}
            <div className="space-y-4 rounded-xl border border-slate-100 p-4 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-500" />
                Thông tin chung
              </h3>
              
              <div className="grid grid-cols-3 gap-y-3 text-sm">
                <div className="text-slate-500">Loại:</div>
                <div className="col-span-2 font-medium text-slate-900">{getPaymentTypeLabel(pr.type)}</div>

                <div className="text-slate-500">Công trình:</div>
                <div className="col-span-2 font-medium text-slate-900">
                  <div className="font-semibold text-slate-950">{pr.project.code}</div>
                  <div className="text-xs text-slate-500 leading-normal">{pr.project.name}</div>
                </div>

                <div className="text-slate-500">Hợp đồng:</div>
                <div className="col-span-2 font-medium text-slate-900">
                  {pr.contract ? (
                    <>
                      <div className="font-semibold text-slate-950">{pr.contract.contractNo}</div>
                      <div className="text-xs text-slate-500 leading-normal">{pr.contract.name}</div>
                    </>
                  ) : (
                    <span className="text-slate-400 italic">Không gắn hợp đồng</span>
                  )}
                </div>

                <div className="text-slate-500">Nhà cung cấp:</div>
                <div className="col-span-2 font-medium text-slate-900">
                  {pr.supplier ? (
                    <div className="text-slate-950">{pr.supplier.name}</div>
                  ) : (
                    <span className="text-slate-400 italic">Chưa xác định</span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Block - Financial Information */}
            <div className="space-y-4 rounded-xl border border-slate-100 p-4 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-500" />
                Thông tin thanh toán
              </h3>

              <div className="grid grid-cols-3 gap-y-3 text-sm">
                <div className="text-slate-500 mt-1">Trước thuế:</div>
                <div className="col-span-2 font-semibold text-slate-800 text-base">{formatVnd(pr.subTotal)}</div>

                <div className="text-slate-500 mt-1">VAT:</div>
                <div className="col-span-2 font-semibold text-slate-800 text-base">{formatVnd(pr.vatAmount)}</div>

                <div className="text-slate-500 mt-1 font-bold">Tổng cộng:</div>
                <div className="col-span-2 font-extrabold text-blue-600 text-lg">{formatVnd(pr.totalAmount)}</div>

                <div className="text-slate-500 mt-1">Hạn thanh toán:</div>
                <div className="col-span-2 font-medium text-slate-800 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  {formatDateOnly(pr.dueDate)}
                </div>
              </div>
            </div>
          </div>

          {/* Workflow & Audit Information */}
          <div className="rounded-xl border border-slate-100 p-4 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              Tiến trình phê duyệt & Nhật ký
            </h3>

            <div className="grid grid-cols-1 gap-y-3 gap-x-6 sm:grid-cols-2 text-sm">
              <div className="flex justify-between border-b border-slate-50 pb-1.5">
                <span className="text-slate-500">Người tạo:</span>
                <span className="font-medium text-slate-950">{pr.createdBy.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-1.5">
                <span className="text-slate-500">Ngày tạo:</span>
                <span className="font-medium text-slate-800">{formatDate(pr.createdAt)}</span>
              </div>
            </div>            {/* Notes */}
            {pr.notes && (
              <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Ghi chú / Diễn giải</div>
                <div className="text-sm text-slate-700 mt-1 leading-relaxed whitespace-pre-wrap">{pr.notes}</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 px-6 py-4 shrink-0 bg-slate-50 rounded-b-2xl">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-lg border-slate-300 font-medium text-slate-700 hover:bg-slate-200"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
