"use client";

import React, { useState } from "react";
import { Calendar, AlertCircle } from "lucide-react";
import { extendProjectAssignmentAction } from "@/app/hr/project-assignments/actions/project-assignment-actions";
import { ProjectAssignmentDTO } from "@/lib/hr/project-assignment-dto";

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
  if (!isOpen || !assignment) return null;

  const [newExpectedEndDate, setNewExpectedEndDate] = useState(
    assignment.expectedEndDate || new Date().toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newExpectedEndDate) return setErrorMessage("Vui lòng chọn ngày dự kiến kết thúc mới");

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
      setErrorMessage(err?.message || "Lỗi không xác định khi gia hạn đợt công tác");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-sky-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-sky-100" />
            <h3 className="text-base font-bold">Gia hạn điều động</h3>
          </div>
            <button
              onClick={onClose}
              type="button"
              aria-label="Đóng biểu mẫu gia hạn điều động"
            className="text-sky-100 hover:text-white text-lg font-bold leading-none p-1 rounded-lg hover:bg-sky-700 transition"
          >
            &times;
          </button>
        </div>

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
            <p className="text-sky-700">Dự kiến kết thúc hiện tại: {assignment.expectedEndDate || "Chưa xác định"}</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              Ngày dự kiến kết thúc mới <span className="text-rose-500">*</span>
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
              Lý do gia hạn
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập lý do gia hạn tiến độ..."
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
              Lưu gia hạn
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
