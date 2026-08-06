"use client";

import React, { useState } from "react";
import { LogOut, AlertCircle } from "lucide-react";
import { releaseEmployeeFromProjectAction } from "@/app/hr/project-assignments/actions/project-assignment-actions";
import { ProjectAssignmentDTO } from "@/lib/hr/project-assignment-dto";
import { EmployeeProjectAssignmentEndReason } from "@prisma/client";

interface ReleaseAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignment: ProjectAssignmentDTO | null;
}

export function ReleaseAssignmentDialog({
  isOpen,
  onClose,
  onSuccess,
  assignment,
}: ReleaseAssignmentDialogProps) {
  if (!isOpen || !assignment) return null;

  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [endReason, setEndReason] = useState<EmployeeProjectAssignmentEndReason>(
    EmployeeProjectAssignmentEndReason.EARLY_RELEASE
  );
  const [decisionNumber, setDecisionNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!releaseDate) return setErrorMessage("Vui lòng chọn ngày rút khỏi công trình");

    setIsSubmitting(true);
    try {
      const res = await releaseEmployeeFromProjectAction({
        assignmentId: assignment.id,
        releaseDate,
        endReason,
        decisionNumber: decisionNumber || undefined,
        notes: notes || undefined,
      });

      if (!res.success) {
        setErrorMessage(res.error);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Lỗi không xác định khi rút nhân sự");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-amber-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <LogOut className="w-5 h-5 text-amber-100" />
            <h3 className="text-base font-bold">Rút nhân sự khỏi công trình</h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="text-amber-100 hover:text-white text-lg font-bold leading-none p-1 rounded-lg hover:bg-amber-700 transition"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-900 space-y-1">
            <p className="font-semibold">{assignment.employeeName} ({assignment.employeeCode})</p>
            <p className="text-amber-700">Công trình: {assignment.projectCode} - {assignment.projectName}</p>
            <p className="text-amber-700">Vai trò: {assignment.projectPersonnelRoleName} ({assignment.allocationPercentage}%)</p>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800">
              Ngày rút khỏi công trình <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800">
              Lý do rút nhân sự <span className="text-rose-500">*</span>
            </label>
            <select
              value={endReason}
              onChange={(e) => setEndReason(e.target.value as EmployeeProjectAssignmentEndReason)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden"
            >
              <option value={EmployeeProjectAssignmentEndReason.EARLY_RELEASE}>Rút nhân sự sớm trước dự kiến</option>
              <option value={EmployeeProjectAssignmentEndReason.COMPLETED}>Hoàn thành nhiệm vụ công trình</option>
              <option value={EmployeeProjectAssignmentEndReason.PROJECT_TRANSFER}>Điều chuyển sang công trình khác</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800">
              Số quyết định / Quyết định điều động
            </label>
            <input
              type="text"
              value={decisionNumber}
              onChange={(e) => setDecisionNumber(e.target.value)}
              placeholder="Ví dụ: QĐ-2026/RUT-01"
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-800">
              Ghi chú bổ sung
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập ghi chú chi tiết lý do rút..."
              rows={2}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              {isSubmitting && (
                <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-3.5 h-3.5" />
              )}
              Xác nhận rút nhân sự
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
