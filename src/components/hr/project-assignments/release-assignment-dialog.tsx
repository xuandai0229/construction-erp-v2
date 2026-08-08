"use client";

import React, { useState } from "react";
import { LogOut, AlertCircle } from "lucide-react";
import { releaseEmployeeFromProjectAction } from "@/app/hr/project-assignments/actions/project-assignment-actions";
import { ProjectAssignmentDTO } from "@/lib/hr/project-assignment-dto";
import { EmployeeProjectAssignmentEndReason } from "@prisma/client";
import { HrDialogShell } from "../hr-dialog-shell";

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

  const isFinite = Boolean(assignment.expectedEndDate);

  const [releaseDate, setReleaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [endReason, setEndReason] = useState<EmployeeProjectAssignmentEndReason | "">("");
  const [decisionNumber, setDecisionNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!releaseDate) return setErrorMessage("Vui lòng chọn ngày rút khỏi công trình");
    if (!endReason) return setErrorMessage("Vui lòng chọn lý do rút nhân sự khỏi công trình");

    if (endReason === EmployeeProjectAssignmentEndReason.EARLY_RELEASE && isFinite && assignment.expectedEndDate && releaseDate >= assignment.expectedEndDate) {
      return setErrorMessage("Rút nhân sự sớm chỉ áp dụng khi ngày rút trước ngày dự kiến kết thúc hiện tại.");
    }

    setIsSubmitting(true);
    try {
      const res = await releaseEmployeeFromProjectAction({
        assignmentId: assignment.id,
        releaseDate,
        endReason: endReason as EmployeeProjectAssignmentEndReason,
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
    <HrDialogShell isOpen={isOpen} onClose={onClose} title="Rút nhân sự khỏi công trình" icon={<LogOut className="h-5 w-5" />} maxWidth="max-w-md">
      {/* Form */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-900 space-y-1">
          <p className="font-semibold">{assignment.employeeName} ({assignment.employeeCode})</p>
          <p className="text-amber-700">Công trình: {assignment.projectCode} - {assignment.projectName}</p>
          <p className="text-amber-700">Vai trò: {assignment.projectPersonnelRoleName} ({assignment.allocationPercentage}%)</p>
          <p className="text-amber-700 text-xs">Dự kiến kết thúc: {assignment.expectedEndDate || "Không giới hạn"}</p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800">
            Ngày rút khỏi công trình <span className="text-rose-500">*</span>
          </label>
          <input
            type="date"
            value={releaseDate}
            onChange={(e) => setReleaseDate(e.target.value)}
            className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800">
            Lý do rút nhân sự <span className="text-rose-500">*</span>
          </label>
          <select
            value={endReason}
            onChange={(e) => setEndReason(e.target.value as EmployeeProjectAssignmentEndReason | "")}
            className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden"
          >
            <option value="">-- Chọn lý do rút nhân sự --</option>
            <option value={EmployeeProjectAssignmentEndReason.COMPLETED}>Hoàn thành nhiệm vụ công trình</option>
            {(!isFinite || (assignment.expectedEndDate && releaseDate < assignment.expectedEndDate)) && (
              <option value={EmployeeProjectAssignmentEndReason.EARLY_RELEASE}>Rút nhân sự sớm trước dự kiến</option>
            )}
            <option value={EmployeeProjectAssignmentEndReason.PROJECT_TRANSFER}>Điều chuyển sang công trình khác</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800">
            Số quyết định / Quyết định điều động
          </label>
          <input
            type="text"
            value={decisionNumber}
            onChange={(e) => setDecisionNumber(e.target.value)}
            placeholder="Ví dụ: QĐ-2026/RUT-01"
            className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-slate-800">
            Ghi chú bổ sung
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Nhập ghi chú chi tiết lý do rút..."
            rows={2}
            className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-hidden"
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
            className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
          >
            {isSubmitting && (
              <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-3.5 h-3.5" />
            )}
            Xác nhận rút nhân sự
          </button>
        </div>
      </form>
    </HrDialogShell>
  );
}
