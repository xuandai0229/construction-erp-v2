"use client";

import React, { useState } from "react";
import { Calendar, AlertCircle } from "lucide-react";
import { extendProjectAssignmentAction } from "@/app/hr/project-assignments/actions/project-assignment-actions";
import { ProjectAssignmentDTO } from "@/lib/hr/project-assignment-dto";
import { HrDialogShell } from "../hr-dialog-shell";

interface ExtendAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignment: ProjectAssignmentDTO | null;
}

export function ExtendAssignmentDialog({
  isOpen,
  onClose,
  onSuccess,
  assignment,
}: ExtendAssignmentDialogProps) {
  const [newExpectedEndDate, setNewExpectedEndDate] = useState(
    assignment?.expectedEndDate || new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !assignment) return null;

  const isFinite = Boolean(assignment.expectedEndDate);
  const dialogTitle = isFinite ? "Gia hạn điều động" : "Thiết lập ngày dự kiến kết thúc";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newExpectedEndDate) return setErrorMessage("Vui lòng chọn ngày dự kiến kết thúc");

    if (isFinite && assignment.expectedEndDate && newExpectedEndDate <= assignment.expectedEndDate) {
      return setErrorMessage(`Ngày gia hạn mới phải sau ngày dự kiến kết thúc hiện tại (${assignment.expectedEndDate}).`);
    }

    setIsSubmitting(true);
    try {
      const res = await extendProjectAssignmentAction({
        assignmentId: assignment.id,
        newExpectedEndDate,
        notes: notes || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Lỗi không xác định khi cập nhật ngày kết thúc");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <HrDialogShell isOpen={isOpen} onClose={onClose} title={dialogTitle} icon={<Calendar className="h-5 w-5" />} maxWidth="max-w-md">
      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-3.5 bg-sky-50 border border-sky-100 rounded-xl text-sm text-sky-900 space-y-1">
          <p className="font-semibold">{assignment.employeeName} ({assignment.employeeCode})</p>
          <p className="text-sky-700">Công trình: {assignment.projectCode} - {assignment.projectName}</p>
          <p className="text-sky-700">Dự kiến kết thúc hiện tại: {assignment.expectedEndDate || "Không giới hạn"}</p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800">
            {isFinite ? "Ngày dự kiến kết thúc mới" : "Ngày dự kiến kết thúc"} <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={newExpectedEndDate}
            onChange={(e) => setNewExpectedEndDate(e.target.value)}
            className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 outline-hidden"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800">
            {isFinite ? "Lý do gia hạn" : "Ghi chú bổ sung"}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isFinite ? "Nhập lý do gia hạn tiến độ..." : "Nhập lý do thiết lập ngày kết thúc..."}
            rows={2}
            className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-sky-500 outline-hidden"
          />
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            {isSubmitting && (
              <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-3.5 h-3.5" />
            )}
            {isFinite ? "Lưu gia hạn" : "Lưu ngày kết thúc"}
          </button>
        </div>
      </form>
    </HrDialogShell>
  );
}
