"use client";

import React, { useMemo, useState } from "react";
import { RefreshCw, AlertCircle, Info } from "lucide-react";
import {
  transferProjectRoleOrAllocationAction,
  AssignmentFormOptionRole,
} from "@/app/hr/project-assignments/actions/project-assignment-actions";
import { ProjectAssignmentDTO } from "@/lib/hr/project-assignment-dto";
import { EmployeeProjectAssignmentEndReason } from "@prisma/client";
import { AllocationOverlapDialog } from "./allocation-overlap-dialog";
import { EnterpriseCombobox, EnterpriseComboboxOption } from "@/components/ui/enterprise-combobox";
import { HrDialogShell } from "../hr-dialog-shell";

interface TransferAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  assignment: ProjectAssignmentDTO | null;
  roles: AssignmentFormOptionRole[];
  canOverride: boolean;
}

export function TransferAssignmentDialog({
  isOpen,
  onClose,
  onSuccess,
  assignment,
  roles,
  canOverride,
}: TransferAssignmentDialogProps) {
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [newRoleId, setNewRoleId] = useState(assignment?.projectPersonnelRoleId || "");
  const [newAllocation, setNewAllocation] = useState<number>(assignment?.allocationPercentage || 0);
  const [endReason, setEndReason] = useState<EmployeeProjectAssignmentEndReason>(
    EmployeeProjectAssignmentEndReason.ROLE_TRANSFER
  );
  const [decisionNumber, setDecisionNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [showOverlapDialog, setShowOverlapDialog] = useState(false);
  const [overlapErrorMessage, setOverlapErrorMessage] = useState("");

  const roleOptions: EnterpriseComboboxOption[] = useMemo(
    () =>
      roles.map((r) => ({
        value: r.id,
        label: r.name,
        code: r.code,
        name: r.name,
      })),
    [roles]
  );

  if (!isOpen || !assignment) return null;

  const handleSubmit = async (e: React.FormEvent | null, allowOverride = false, overrideReason?: string) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!effectiveDate) return setErrorMessage("Vui lòng chọn ngày có hiệu lực");

    setIsSubmitting(true);
    try {
      const res = await transferProjectRoleOrAllocationAction({
        assignmentId: assignment.id,
        effectiveDate,
        newProjectPersonnelRoleId: newRoleId !== assignment.projectPersonnelRoleId ? newRoleId : undefined,
        newAllocationPercentage: newAllocation !== assignment.allocationPercentage ? newAllocation : undefined,
        endReason,
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
      setErrorMessage(err?.message || "Lỗi không xác định khi thay đổi vai trò hoặc tỷ lệ");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <HrDialogShell isOpen={isOpen} onClose={onClose} title="Thay đổi vai trò hoặc tỷ lệ" icon={<RefreshCw className="h-5 w-5" />} maxWidth="max-w-lg">
        {/* Form with sticky footer */}
        <form onSubmit={(e) => handleSubmit(e, false)} className="flex flex-col min-h-0 flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="p-3.5 bg-purple-50 border border-purple-100 rounded-xl text-sm text-purple-900 space-y-1">
              <p className="font-semibold">{assignment.employeeName} ({assignment.employeeCode})</p>
              <p className="text-purple-700">Công trình: {assignment.projectCode} - {assignment.projectName}</p>
              <p className="text-purple-700">Vai trò hiện tại: {assignment.projectPersonnelRoleName} ({assignment.allocationPercentage}%)</p>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Thao tác này sẽ đóng đợt điều động hiện tại tại ngày hiệu lực và tự động tạo đợt điều động mới. Lịch sử phân công được bảo lưu vết đầy đủ.
              </span>
            </div>

            {/* Effective Date */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800">
                Ngày bắt đầu hiệu lực mới <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800">
                Lý do điều chỉnh <span className="text-rose-500">*</span>
              </label>
              <select
                value={endReason}
                onChange={(e) => setEndReason(e.target.value as EmployeeProjectAssignmentEndReason)}
                className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-hidden"
              >
                <option value={EmployeeProjectAssignmentEndReason.ROLE_TRANSFER}>Thay đổi vai trò công trường</option>
                <option value={EmployeeProjectAssignmentEndReason.ALLOCATION_CHANGE}>Điều chỉnh tỷ lệ phân bổ</option>
                <option value={EmployeeProjectAssignmentEndReason.PROJECT_TRANSFER}>Chuyển đổi công trình</option>
              </select>
            </div>

            {/* Grid for New Role and Allocation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-800">
                  Vai trò mới
                </label>
                <EnterpriseCombobox
                  options={roleOptions}
                  value={newRoleId}
                  onChange={(val) => setNewRoleId(val)}
                  placeholder="-- Chọn vai trò --"
                  searchPlaceholder="Tìm vai trò..."
                  maxPanelHeight={240}
                  testId="transfer-assignment-role-combobox"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-800">
                  Tỷ lệ phân bổ mới (%)
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={newAllocation}
                  onChange={(e) => setNewAllocation(parseInt(e.target.value, 10) || 0)}
                  className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-hidden"
                />
              </div>
            </div>

            {/* Decision Number */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800">
                Số quyết định / Văn bản
              </label>
              <input
                type="text"
                value={decisionNumber}
                onChange={(e) => setDecisionNumber(e.target.value)}
                placeholder="Ví dụ: QĐ-2026/ĐC-02"
                className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800">
                Ghi chú điều chỉnh
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ghi chú chi tiết nguyên nhân điều chuyển..."
                rows={2}
                className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-hidden"
              />
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="shrink-0 bg-white px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
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
              className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              {isSubmitting && (
                <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-3.5 h-3.5" />
              )}
              Xác nhận thay đổi
            </button>
          </div>
        </form>
      </HrDialogShell>

      <AllocationOverlapDialog
        isOpen={showOverlapDialog}
        onClose={() => setShowOverlapDialog(false)}
        canOverride={canOverride}
        errorMessage={overlapErrorMessage}
        onConfirmOverride={async (reason) => {
          await handleSubmit(null, true, reason);
        }}
      />
    </>
  );
}
