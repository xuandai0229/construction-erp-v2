"use client";

import React, { useState } from "react";
import { Ban, AlertCircle } from "lucide-react";
import { cancelFutureProjectAssignmentAction } from "@/app/hr/project-assignments/actions/project-assignment-actions";
import { ProjectAssignmentDTO } from "@/lib/hr/project-assignment-dto";
import { HrDialogShell } from "../hr-dialog-shell";

interface CancelAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignment: ProjectAssignmentDTO | null;
}

export function CancelAssignmentDialog({
  isOpen,
  onClose,
  onSuccess,
  assignment,
}: Readonly<CancelAssignmentDialogProps>) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !assignment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (reason.trim().length < 3) {
      return setErrorMessage("Lý do hủy phân công phải có ít nhất 3 ký tự");
    }

    setIsSubmitting(true);
    try {
      const res = await cancelFutureProjectAssignmentAction({
        assignmentId: assignment.id,
        reason: reason.trim(),
      });

      if (!res.success) {
        setErrorMessage(res.error);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Lỗi không xác định khi hủy phân công");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <HrDialogShell isOpen={isOpen} onClose={onClose} title="Hủy điều động" icon={<Ban className="h-5 w-5" />} maxWidth="max-w-md">

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-sm text-rose-900 space-y-1">
            <p className="font-semibold">{assignment.employeeName} ({assignment.employeeCode})</p>
            <p className="text-rose-700">Công trình: {assignment.projectCode} - {assignment.projectName}</p>
            <p className="text-rose-700">Ngày bắt đầu dự kiến: {assignment.startDate}</p>
          </div>

          <p className="text-sm text-slate-600 leading-relaxed">
            Hủy phân công tương lai sẽ không xóa bản ghi khỏi cơ sở dữ liệu mà chuyển trạng thái sang <span className="font-semibold text-rose-700">Đã hủy (CANCELLED)</span> để bảo đảm tính toàn vẹn vết lịch sử.
          </p>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              Lý do hủy bỏ phân công <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập lý do hủy đợt phân công công tác..."
              rows={3}
              className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-hidden"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Quay lại
            </button>
            <button
              type="submit"
              disabled={isSubmitting || reason.trim().length < 3}
              className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              {isSubmitting && (
                <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-3.5 h-3.5" />
              )}
              Xác nhận hủy
            </button>
          </div>
        </form>
    </HrDialogShell>
  );
}
