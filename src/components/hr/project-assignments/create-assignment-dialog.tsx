"use client";

import React, { useState } from "react";
import { UserPlus, Calendar, Building2, Briefcase, FileText, AlertCircle } from "lucide-react";
import {
  assignEmployeeToProjectAction,
  AssignmentFormOptionEmployee,
  AssignmentFormOptionProject,
  AssignmentFormOptionRole,
} from "@/app/hr/project-assignments/actions/project-assignment-actions";
import { AllocationOverlapDialog } from "./allocation-overlap-dialog";

interface CreateAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employees: AssignmentFormOptionEmployee[];
  projects: AssignmentFormOptionProject[];
  roles: AssignmentFormOptionRole[];
  canOverride: boolean;
}

export function CreateAssignmentDialog({
  isOpen,
  onClose,
  onSuccess,
  employees,
  projects,
  roles,
  canOverride,
}: CreateAssignmentDialogProps) {
  const [employeeId, setEmployeeId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedEndDate, setExpectedEndDate] = useState("");
  const [allocationPercentage, setAllocationPercentage] = useState<number>(100);
  const [decisionNumber, setDecisionNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Overlap Dialog State
  const [showOverlapDialog, setShowOverlapDialog] = useState(false);
  const [overlapErrorMessage, setOverlapErrorMessage] = useState("");

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent, allowOverride = false, overrideReason?: string) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!employeeId) return setErrorMessage("Vui lòng chọn nhân viên điều động");
    if (!projectId) return setErrorMessage("Vui lòng chọn công trình / dự án");
    if (!roleId) return setErrorMessage("Vui lòng chọn vai trò công trường");
    if (!startDate) return setErrorMessage("Vui lòng chọn ngày bắt đầu phân công");
    if (allocationPercentage < 1 || allocationPercentage > 100) {
      return setErrorMessage("Tỷ lệ phân bổ phải từ 1% đến 100%");
    }

    setIsSubmitting(true);
    try {
      const res = await assignEmployeeToProjectAction({
        employeeId,
        projectId,
        projectPersonnelRoleId: roleId,
        startDate,
        expectedEndDate: expectedEndDate || undefined,
        allocationPercentage,
        decisionNumber: decisionNumber || undefined,
        notes: notes || undefined,
        allowOverlapOverride: allowOverride,
        overrideReason: overrideReason || undefined,
      });

      if (!res.success) {
        if (res.code === "ALLOCATION_OVERLAP_EXCEEDED") {
          setOverlapErrorMessage(res.error);
          setShowOverlapDialog(true);
        } else {
          setErrorMessage(res.error);
        }
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || "Lỗi không xác định khi tạo phân công");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <UserPlus className="w-5 h-5 text-blue-100" />
              <h3 className="text-base font-bold">Phân công nhân sự công trình</h3>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="text-blue-100 hover:text-white text-lg font-bold leading-none p-1 rounded-lg hover:bg-blue-700 transition"
            >
              &times;
            </button>
          </div>

          {/* Form */}
          <form onSubmit={(e) => handleFormSubmit(e, false)} className="p-6 space-y-4 overflow-y-auto">
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Employee */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Nhân sự điều động <span className="text-rose-500">*</span>
              </label>
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
              >
                <option value="">-- Chọn nhân viên --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    [{emp.code}] {emp.fullName} {emp.orgUnitName ? `(${emp.orgUnitName})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Project & Role Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                  Công trình / Dự án <span className="text-rose-500">*</span>
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                >
                  <option value="">-- Chọn công trình --</option>
                  {projects.map((prj) => (
                    <option key={prj.id} value={prj.id}>
                      [{prj.code}] {prj.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                  Vai trò công trường <span className="text-rose-500">*</span>
                </label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                >
                  <option value="">-- Chọn vai trò --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates & Allocation Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                  Ngày bắt đầu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                  Dự kiến kết thúc
                </label>
                <input
                  type="date"
                  value={expectedEndDate}
                  onChange={(e) => setExpectedEndDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                  Tỷ lệ phân bổ (%) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={allocationPercentage}
                  onChange={(e) => setAllocationPercentage(parseInt(e.target.value, 10) || 0)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
                />
              </div>
            </div>

            {/* Decision Number */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Số quyết định điều động / Văn bản
              </label>
              <input
                type="text"
                value={decisionNumber}
                onChange={(e) => setDecisionNumber(e.target.value)}
                placeholder="Ví dụ: QĐ-2026/ĐĐ-CT01"
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-800">
                Ghi chú bổ sung
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nhập chi tiết nhiệm vụ hoặc yêu cầu công tác..."
                rows={2}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            {/* Actions */}
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
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                {isSubmitting && (
                  <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-3.5 h-3.5" />
                )}
                Tạo phân công
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Allocation Overlap Dialog */}
      <AllocationOverlapDialog
        isOpen={showOverlapDialog}
        onClose={() => setShowOverlapDialog(false)}
        canOverride={canOverride}
        errorMessage={overlapErrorMessage}
        onConfirmOverride={async (reason) => {
          await handleFormSubmit(null as any, true, reason);
        }}
      />
    </>
  );
}
