"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Link2,
  Unlink,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { linkUserAccountAction } from "@/app/hr/employees/actions/employee-actions";
import { EnterpriseCombobox, type EnterpriseComboboxOption } from "@/components/ui/enterprise-combobox";

interface UserOption {
  id: string;
  username: string | null;
  email: string | null;
  role: string;
}

interface LinkUserAccountModalProps {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  currentUserId?: string | null;
  currentUsername?: string | null;
  currentUserEmail?: string | null;
  availableUsers: UserOption[];
  isOpen: boolean;
  onClose: () => void;
}

export function LinkUserAccountModal({
  employeeId,
  employeeName,
  employeeCode,
  currentUserId,
  currentUsername,
  currentUserEmail,
  availableUsers,
  isOpen,
  onClose,
}: LinkUserAccountModalProps) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState(currentUserId || "");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || typeof document === "undefined") return null;

  const userOptions: EnterpriseComboboxOption[] = availableUsers.map((u) => {
    const handleName = u.username || u.email?.split("@")[0] || u.id;
    return {
      value: u.id,
      label: `@${handleName} · ${u.email || "Chưa có email"} (${u.role})`,
      name: `@${handleName}`,
      code: u.email || u.username || u.id,
      description: u.role,
    };
  });

  const handleLink = async (targetUserId: string | null) => {
    setSubmitting(true);
    setError(null);

    const res = await linkUserAccountAction(employeeId, targetUserId, reason.trim() || undefined);
    setSubmitting(false);

    if (!res.success) {
      setError(res.error || "Không thể thực hiện liên kết tài khoản.");
      return;
    }

    onClose();
    router.refresh();
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              Liên kết Tài khoản Hệ thống
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
          <div className="font-extrabold text-slate-900">
            {employeeName} <span className="font-mono text-blue-700">({employeeCode})</span>
          </div>
          <div className="text-slate-600">
            Trạng thái tài khoản:{" "}
            {currentUserId ? (
              <span className="font-bold text-emerald-700">
                Đã liên kết với @{currentUsername || "User"} ({currentUserEmail})
              </span>
            ) : (
              <span className="font-bold text-slate-500">Chưa liên kết tài khoản hệ thống</span>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {currentUserId ? (
          <div className="space-y-3 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Nhân viên này đang được liên kết với tài khoản hệ thống <strong>@{currentUsername || "User"}</strong>.
              Bạn có thể hủy liên kết nếu muốn tách biệt hoặc đổi sang tài khoản khác.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleLink(null)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Unlink className="w-4 h-4" />
                    <span>Hủy liên kết tài khoản</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (selectedUserId) handleLink(selectedUserId);
            }}
            className="space-y-4 text-xs"
          >
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Tài khoản hệ thống chưa liên kết <span className="text-rose-500">*</span>
              </label>
              <EnterpriseCombobox
                options={userOptions}
                value={selectedUserId}
                onChange={(val) => setSelectedUserId(val)}
                placeholder="-- Chọn tài khoản từ hệ thống --"
                searchPlaceholder="Tìm username hoặc email..."
                emptyMessage="Không tìm thấy tài khoản phù hợp"
                clearable
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Lý do liên kết (Không bắt buộc)
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Cấp tài khoản truy cập hệ thống ERP..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting || !selectedUserId}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    <span>Xác nhận liên kết</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
