"use client";

import { Pencil, Trash2, Building2, MapPin, Phone, Mail, Hash, User, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CloseButton } from "@/components/ui/close-button";
import type { SupplierDto } from "@/app/(dashboard)/suppliers/actions";
import type { SupplierPermissionSet } from "@/lib/suppliers/suppliers-permissions";

interface SupplierDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: SupplierDto | null;
  permissions: SupplierPermissionSet;
  onEdit: (supplier: SupplierDto) => void;
  onDelete: (supplier: SupplierDto) => void;
  isSubmitting: boolean;
}

export function SupplierDetailDrawer({
  isOpen,
  onClose,
  supplier,
  permissions,
  onEdit,
  onDelete,
  isSubmitting,
}: SupplierDetailDrawerProps) {
  if (!isOpen || !supplier) return null;

  const hasContracts = supplier.contractCount > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-slate-950/45 p-0 backdrop-blur-sm sm:items-stretch sm:p-0">
      {/* Background click to close */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />
      
      {/* Drawer panel */}
      <div className="relative flex w-full flex-col bg-white shadow-2xl sm:w-[480px] sm:max-w-[480px] mt-auto max-h-[92dvh] rounded-t-2xl sm:mt-0 sm:max-h-full sm:h-full sm:rounded-none transition-transform animate-in slide-in-from-bottom-full sm:slide-in-from-right-full duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-950">Chi tiết đối tác</h2>
          <CloseButton onClick={onClose} tone="neutral" />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Main Info */}
          <div className="mb-6 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-xl font-bold text-slate-950 leading-tight">{supplier.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-600">
                <Hash className="mr-1 h-3.5 w-3.5" />
                {supplier.code}
              </div>
              <div className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${hasContracts ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {hasContracts ? "Có hợp đồng" : "Chưa có hợp đồng"}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Contact Info */}
            <section>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Thông tin liên hệ</h4>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden text-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 p-3 last:border-0">
                  <User className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="font-medium text-slate-900">{supplier.contactPerson || "—"}</div>
                </div>
                <div className="flex items-center gap-3 border-b border-slate-100 p-3 last:border-0">
                  <Phone className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="font-medium text-slate-900">{supplier.phone || "—"}</div>
                </div>
                <div className="flex items-center gap-3 border-b border-slate-100 p-3 last:border-0">
                  <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="text-slate-900">{supplier.email || "—"}</div>
                </div>
              </div>
            </section>

            {/* Legal / Address Info */}
            <section>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Thông tin pháp lý</h4>
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden text-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 p-3 last:border-0">
                  <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-0.5">Mã số thuế</div>
                    <div className="font-mono font-medium text-slate-900">{supplier.taxCode || "—"}</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 border-b border-slate-100 p-3 last:border-0">
                  <MapPin className="mt-0.5 h-4 w-4 text-slate-400 shrink-0" />
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-0.5">Địa chỉ</div>
                    <div className="text-slate-900">{supplier.address || "—"}</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Contracts */}
            <section>
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Hợp đồng liên kết</h4>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center shadow-sm text-sm">
                {hasContracts ? (
                  <div className="text-slate-700">
                    Số hợp đồng liên kết: <span className="font-bold text-slate-950">{supplier.contractCount}</span>
                  </div>
                ) : (
                  <div className="text-slate-500">Chưa có hợp đồng liên kết.</div>
                )}
              </div>
            </section>

            {/* Meta */}
            {(supplier.createdAt || supplier.updatedAt) && (
              <section className="text-xs text-slate-400 space-y-1 pt-2">
                {supplier.createdAt && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Ngày tạo: {new Date(supplier.createdAt).toLocaleDateString("vi-VN")}
                  </div>
                )}
                {supplier.updatedAt && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Cập nhật lần cuối: {new Date(supplier.updatedAt).toLocaleDateString("vi-VN")}
                  </div>
                )}
              </section>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        {(permissions.canUpdate || permissions.canDelete) && (
          <div className="border-t border-slate-100 bg-slate-50/50 p-4 flex gap-3">
            {permissions.canUpdate && (
              <Button 
                variant="outline" 
                className="flex-1 bg-white" 
                onClick={() => {
                  onClose();
                  onEdit(supplier);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Sửa
              </Button>
            )}
            {permissions.canDelete && (
              <Button 
                variant="outline" 
                className={`flex-1 ${hasContracts ? "opacity-50 cursor-not-allowed" : "text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200 hover:border-rose-300 bg-white"}`}
                onClick={() => {
                  if (!hasContracts && !isSubmitting) {
                    onClose();
                    onDelete(supplier);
                  }
                }}
                disabled={hasContracts || isSubmitting}
                title={hasContracts ? "Không thể xóa khi có hợp đồng" : "Xóa đối tác"}
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
