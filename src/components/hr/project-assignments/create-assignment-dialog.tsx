"use client";

import React, { useMemo, useState } from "react";
import { UserPlus, AlertCircle } from "lucide-react";
import {
  assignEmployeeToProjectAction,
  AssignmentFormOptionEmployee,
  AssignmentFormOptionProject,
  AssignmentFormOptionRole,
} from "@/app/hr/project-assignments/actions/project-assignment-actions";
import { AllocationOverlapDialog } from "./allocation-overlap-dialog";
import { EnterpriseCombobox, EnterpriseComboboxOption } from "@/components/ui/enterprise-combobox";
import { HrDialogShell } from "../hr-dialog-shell";

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
  const [allocationPercentage, setAllocationPercentage] = useState<number | "">("");
  const [decisionNumber, setDecisionNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Overlap Dialog State
  const [showOverlapDialog, setShowOverlapDialog] = useState(false);
  const [overlapErrorMessage, setOverlapErrorMessage] = useState("");

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === employeeId),
    [employees, employeeId]
  );

  const employeeOptions: EnterpriseComboboxOption[] = useMemo(
    () =>
      employees.map((emp) => ({
        value: emp.id,
        label: emp.fullName,
        code: emp.code,
        name: emp.fullName,
        description: emp.orgUnitName || "Chưa thuộc đơn vị",
      })),
    [employees]
  );

  const projectOptions: EnterpriseComboboxOption[] = useMemo(
    () =>
      projects.map((prj) => ({
        value: prj.id,
        label: prj.name,
        code: prj.code,
        name: prj.name,
      })),
    [projects]
  );

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

  if (!isOpen) return null;

  const handleFormSubmit = async (e: React.FormEvent | null, allowOverride = false, overrideReason?: string) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    if (!employeeId) return setErrorMessage("Vui lòng chọn nhân sự điều động");
    if (!projectId) return setErrorMessage("Vui lòng chọn công trình / dự án");
    if (!roleId) return setErrorMessage("Vui lòng chọn vai trò công trường");
    if (!startDate) return setErrorMessage("Vui lòng chọn ngày bắt đầu điều động");
    const allocation = Number(allocationPercentage);
    if (!Number.isInteger(allocation) || allocation < 1 || allocation > 100) {
      return setErrorMessage("Tỷ lệ phân bổ phải từ 1% đến 100%");
    }
    if (expectedEndDate && expectedEndDate < startDate) {
      return setErrorMessage("Ngày dự kiến kết thúc không thể trước ngày bắt đầu");
    }

    setIsSubmitting(true);
    try {
      const res = await assignEmployeeToProjectAction({
        employeeId,
        projectId,
        projectPersonnelRoleId: roleId,
        startDate,
        expectedEndDate: expectedEndDate || undefined,
        allocationPercentage: allocation,
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
      setErrorMessage(err?.message || "Lỗi không xác định khi tạo điều động");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <HrDialogShell isOpen={isOpen} onClose={onClose} title="Tạo điều động nhân sự" icon={<UserPlus className="h-5 w-5" />} maxWidth="max-w-xl">
        {/* Form */}
        <form onSubmit={(e) => handleFormSubmit(e, false)} className="p-6 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Employee Combobox */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              Nhân sự điều động <span className="text-rose-500">*</span>
            </label>
            <EnterpriseCombobox
              options={employeeOptions}
              value={employeeId}
              onChange={(val) => setEmployeeId(val)}
              placeholder="-- Chọn nhân sự --"
              searchPlaceholder="Tìm theo tên hoặc mã nhân viên..."
              maxPanelHeight={320}
              testId="create-assignment-employee-combobox"
            />
          </div>

          {/* Decision Support: Selected Employee Allocation Capacity Preview */}
          {selectedEmployee && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center justify-between text-slate-700 font-medium">
                <span>Phòng ban: <strong className="text-slate-900">{selectedEmployee.orgUnitName || "Chưa phân đơn vị"}</strong></span>
                <span>Chức danh: <strong className="text-slate-900">{selectedEmployee.positionTitle || "Chưa xác định"}</strong></span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-600">Công trình đang tham gia: <strong>{selectedEmployee.activeProjectCount}</strong></span>
                <span className="font-semibold">
                  Đã phân bổ:{" "}
                  <span className={selectedEmployee.currentTotalAllocation > 100 ? "text-rose-600 font-bold" : selectedEmployee.currentTotalAllocation === 100 ? "text-amber-600" : "text-emerald-600"}>
                    {selectedEmployee.currentTotalAllocation}%
                  </span>
                </span>
              </div>
              {selectedEmployee.activeProjects && selectedEmployee.activeProjects.length > 0 && (
                <div className="mt-1 pt-1 border-t border-slate-200/60 text-slate-500 space-y-0.5 max-h-24 overflow-y-auto">
                  {selectedEmployee.activeProjects.map((ap, idx) => (
                    <div key={idx} className="flex items-start justify-between gap-2 text-[11px]">
                      <span className="min-w-0 pr-2 leading-snug line-clamp-2" title={ap.projectName}>{ap.projectName}</span>
                      <span className="font-mono text-slate-700 shrink-0">{ap.allocationPercentage}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Project & Role Comboboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800">
                Công trình / Dự án <span className="text-rose-500">*</span>
              </label>
              <EnterpriseCombobox
                options={projectOptions}
                value={projectId}
                onChange={(val) => setProjectId(val)}
                placeholder="-- Chọn công trình --"
                searchPlaceholder="Tìm theo mã hoặc tên công trình..."
                maxPanelHeight={320}
                testId="create-assignment-project-combobox"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800">
                Vai trò công trường <span className="text-rose-500">*</span>
              </label>
              <EnterpriseCombobox
                options={roleOptions}
                value={roleId}
                onChange={(val) => setRoleId(val)}
                placeholder="-- Chọn vai trò --"
                searchPlaceholder="Tìm vai trò..."
                maxPanelHeight={260}
                testId="create-assignment-role-combobox"
              />
            </div>
          </div>

          {/* Dates & Allocation Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800">
                Ngày bắt đầu <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800">
                Dự kiến kết thúc
              </label>
              <input
                type="date"
                value={expectedEndDate}
                onChange={(e) => setExpectedEndDate(e.target.value)}
                className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-800">
                Tỷ lệ phân bổ (%) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={allocationPercentage}
                onChange={(e) => setAllocationPercentage(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Nhập tỷ lệ từ 1 đến 100"
                className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>

          {/* Decision Number */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              Số quyết định điều động / Văn bản
            </label>
            <input
              type="text"
              value={decisionNumber}
              onChange={(e) => setDecisionNumber(e.target.value)}
              placeholder="Ví dụ: QĐ-2026/ĐĐ-CT01"
              className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-slate-800">
              Ghi chú bổ sung
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhập chi tiết nhiệm vụ hoặc yêu cầu công tác..."
              rows={2}
              className="w-full text-sm p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
          </div>

          {/* Actions */}
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
              className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              {isSubmitting && (
                <span className="inline-block animate-spin border-2 border-white border-t-transparent rounded-full w-3.5 h-3.5" />
              )}
              Tạo điều động
            </button>
          </div>
        </form>
      </HrDialogShell>

      {/* Allocation Overlap Dialog */}
      <AllocationOverlapDialog
        isOpen={showOverlapDialog}
        onClose={() => setShowOverlapDialog(false)}
        canOverride={canOverride}
        errorMessage={overlapErrorMessage}
        onConfirmOverride={async (reason) => {
          await handleFormSubmit(null, true, reason);
        }}
      />
    </>
  );
}
