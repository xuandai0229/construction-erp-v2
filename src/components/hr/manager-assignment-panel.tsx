"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  UserCheck,
  Plus,
  RefreshCw,
  Clock,
  X,
  Loader2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import {
  assignUnitManagerAction,
  endUnitManagerTermAction,
} from "@/app/hr/organization/actions/organization-actions";
import { EnterpriseCombobox, type EnterpriseComboboxOption } from "@/components/ui/enterprise-combobox";

export interface ManagerInfo {
  id: string;
  employeeId: string;
  fullName: string;
  employeeCode: string;
  startDate: string;
  decisionNo?: string | null;
  notes?: string | null;
}

interface ManagerAssignmentPanelProps {
  unitId: string;
  unitCode: string;
  unitName: string;
  currentManager: ManagerInfo | null;
  canManage: boolean;
  activeEmployees?: { id: string; fullName: string; code: string }[];
}

export function ManagerAssignmentPanel({
  unitId,
  unitCode,
  unitName,
  currentManager,
  canManage,
  activeEmployees = [],
}: ManagerAssignmentPanelProps) {
  const router = useRouter();
  const [showAppointModal, setShowAppointModal] = useState(false);
  const [showEndTermModal, setShowEndTermModal] = useState(false);

  // Appoint / Replace Form State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [decisionNo, setDecisionNo] = useState("");
  const [notes, setNotes] = useState("");
  const [submittingAppoint, setSubmittingAppoint] = useState(false);
  const [appointError, setAppointError] = useState<string | null>(null);

  // End Term Form State
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [submittingEnd, setSubmittingEnd] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);

  const employeeOptions: EnterpriseComboboxOption[] = activeEmployees.map((emp) => ({
    value: emp.id,
    label: `${emp.fullName} (${emp.code})`,
    name: emp.fullName,
    code: emp.code,
  }));

  const handleAppointSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      setAppointError("Vui lòng chọn nhân sự bổ nhiệm làm người phụ trách.");
      return;
    }

    setSubmittingAppoint(true);
    setAppointError(null);

    const res = await assignUnitManagerAction({
      organizationUnitId: unitId,
      employeeId: selectedEmployeeId,
      startDate,
      decisionNo: decisionNo.trim() || undefined,
      notes: notes.trim() || undefined,
      isPrimary: true,
    });

    setSubmittingAppoint(false);

    if (!res.success) {
      setAppointError(res.error || "Không thể thực hiện bổ nhiệm.");
      return;
    }

    setShowAppointModal(false);
    setSelectedEmployeeId("");
    setDecisionNo("");
    setNotes("");
    router.refresh();
  };

  const handleEndTermSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentManager) return;

    setSubmittingEnd(true);
    setEndError(null);

    const res = await endUnitManagerTermAction(currentManager.id, endDate);
    setSubmittingEnd(false);

    if (!res.success) {
      setEndError(res.error || "Không thể kết thúc nhiệm kỳ.");
      return;
    }

    setShowEndTermModal(false);
    router.refresh();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <UserCheck className="w-4 h-4 text-blue-600" />
          <span>Người phụ trách / Trưởng đơn vị</span>
        </div>
        {canManage && (
          <div>
            {!currentManager ? (
              <button
                type="button"
                onClick={() => {
                  setAppointError(null);
                  setShowAppointModal(true);
                }}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bổ nhiệm người phụ trách</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setAppointError(null);
                    setShowAppointModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  title="Thay đổi người phụ trách (kết thúc nhiệm kỳ cũ và mở nhiệm kỳ mới)"
                >
                  <RefreshCw className="w-3 h-3 text-blue-600" />
                  <span>Thay đổi</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEndError(null);
                    setShowEndTermModal(true);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                  title="Kết thúc nhiệm kỳ hiện tại mà chưa bổ nhiệm người mới"
                >
                  <Clock className="w-3 h-3 text-rose-600" />
                  <span>Kết thúc nhiệm kỳ</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {currentManager ? (
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
              {currentManager.fullName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5">
                <span>{currentManager.fullName}</span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.2 rounded">
                  {currentManager.employeeCode}
                </span>
              </div>
              <div className="text-[11px] text-slate-600 mt-0.5 flex items-center gap-2">
                <span>Bổ nhiệm từ: <strong className="font-semibold">{new Date(currentManager.startDate).toLocaleDateString("vi-VN")}</strong></span>
                {currentManager.decisionNo && (
                  <span>· Số QĐ: <strong className="font-semibold">{currentManager.decisionNo}</strong></span>
                )}
              </div>
            </div>
          </div>
          {currentManager.notes && (
            <div className="text-[11px] text-slate-500 italic bg-white/70 p-2 rounded-lg border border-blue-100">
              Ghi chú: {currentManager.notes}
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-xs italic flex items-center justify-between">
          <span>Chưa bổ nhiệm người phụ trách cho đơn vị này</span>
        </div>
      )}

      {/* Appoint / Replace Modal */}
      {showAppointModal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {currentManager ? "Thay đổi Người phụ trách đơn vị" : "Bổ nhiệm Người phụ trách đơn vị"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAppointModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Đơn vị: <strong className="text-slate-900 font-bold">{unitName} ({unitCode})</strong>.
              {currentManager && (
                <span className="block mt-1 text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
                  Lưu ý: Việc bổ nhiệm người mới sẽ tự động kết thúc nhiệm kỳ hiện tại của <strong>{currentManager.fullName}</strong>.
                </span>
              )}
            </p>

            <form onSubmit={handleAppointSubmit} className="space-y-4">
              {appointError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{appointError}</span>
                </div>
              )}

              {/* Employee Selection: Unified Combobox */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn nhân sự bổ nhiệm <span className="text-rose-500">*</span>
                </label>
                <EnterpriseCombobox
                  options={employeeOptions}
                  value={selectedEmployeeId}
                  onChange={(val) => setSelectedEmployeeId(val)}
                  placeholder="-- Chọn nhân sự từ danh sách --"
                  searchPlaceholder="Tìm theo tên hoặc mã nhân viên..."
                  emptyMessage="Không tìm thấy nhân sự phù hợp"
                  clearable
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngày bắt đầu hiệu lực <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Decision Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số Quyết định bổ nhiệm (Không bắt buộc)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: QĐ-2026/01-BGD"
                  value={decisionNo}
                  onChange={(e) => setDecisionNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú nhiệm kỳ
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú thêm về quyết định hoặc bàn giao công việc..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAppointModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingAppoint || !selectedEmployeeId}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submittingAppoint ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Xác nhận bổ nhiệm</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* End Term Modal */}
      {showEndTermModal && currentManager && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Kết thúc nhiệm kỳ Người phụ trách
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEndTermModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn đang thực hiện kết thúc nhiệm kỳ của <strong>{currentManager.fullName} ({currentManager.employeeCode})</strong> tại đơn vị <strong>{unitName}</strong>.
            </p>

            <form onSubmit={handleEndTermSubmit} className="space-y-4">
              {endError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{endError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngày kết thúc nhiệm kỳ <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEndTermModal(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submittingEnd}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {submittingEnd ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Xác nhận kết thúc</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

