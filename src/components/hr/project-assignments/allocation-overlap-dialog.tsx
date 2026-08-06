"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  Lock,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HrDialogShell } from "../hr-dialog-shell";

interface AllocationOverlapDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmOverride: (reason: string) => Promise<void>;
  canOverride: boolean;
  errorMessage: string;
}

export function AllocationOverlapDialog({
  isOpen,
  onClose,
  onConfirmOverride,
  canOverride,
  errorMessage,
}: AllocationOverlapDialogProps) {
  const [overrideReason, setOverrideReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canOverride) return;

    if (overrideReason.trim().length < 10) {
      setValidationError("Lý do giải trình ngoại lệ bắt buộc phải có ít nhất 10 ký tự.");
      return;
    }

    setValidationError(null);
    setIsSubmitting(true);
    try {
      await onConfirmOverride(overrideReason.trim());
      setOverrideReason("");
      onClose();
    } catch (err: any) {
      setValidationError(err?.message || "Không thể phê duyệt ghi đè. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <HrDialogShell isOpen={isOpen} onClose={onClose} title="Cảnh báo vượt định mức phân bổ" icon={<AlertTriangle className="h-5 w-5" />} maxWidth="max-w-lg">

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 leading-relaxed">
            {errorMessage}
          </div>

          {!canOverride ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
              <Lock className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-900">Không có quyền ghi đè ngoại lệ</p>
                <p className="mt-0.5 text-rose-700">
                  Tài khoản của bạn không thuộc vai trò Giám đốc (Director) hoặc Quản trị hệ thống (Admin). Vui lòng điều chỉnh lại tỷ lệ phân bổ hoặc thời gian phân công bên dưới.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="overrideReasonInput"
                  className="block text-sm font-semibold text-slate-800 uppercase tracking-wider"
                >
                  Lý do giải trình phê duyệt ngoại lệ <span className="text-rose-500">*</span>
                </label>
                <span className="text-sm text-slate-500">Tối thiểu 10 ký tự</span>
              </div>
              <textarea
                id="overrideReasonInput"
                value={overrideReason}
                onChange={(e) => {
                  setOverrideReason(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Ví dụ: Phê duyệt phân công 120% cho Dự án khẩn cấp quốc gia theo Quyết định số QD-2026/PĐ..."
                rows={3}
                className="w-full text-sm p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-hidden transition"
              />
              {validationError && (
                <p className="text-sm font-medium text-rose-600 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5 shrink-0" />
                  {validationError}
                </p>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Quay lại chỉnh sửa
            </button>
            {canOverride && (
              <button
                type="submit"
                disabled={isSubmitting || overrideReason.trim().length < 10}
                className={cn(
                  "px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-xs transition flex items-center gap-1.5",
                  overrideReason.trim().length >= 10
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-slate-300 cursor-not-allowed"
                )}
              >
                {isSubmitting ? (
                  <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Phê duyệt ngoại lệ và lưu
              </button>
            )}
          </div>
        </form>
    </HrDialogShell>
  );
}
