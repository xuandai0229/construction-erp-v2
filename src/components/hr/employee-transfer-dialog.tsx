"use client";

import React, { useState, useTransition } from "react";
import { ArrowRightLeft, X, Loader2, AlertCircle, Building2, ShieldCheck } from "lucide-react";
import { transferEmployeeOrgAction } from "@/app/hr/organization/actions/organization-actions";

interface UnitOption {
  id: string;
  code: string;
  name: string;
}

interface PositionOption {
  id: string;
  code: string;
  title: string;
}

interface EmployeeOption {
  id: string;
  code: string;
  fullName: string;
  currentUnitName?: string | null;
  currentPositionTitle?: string | null;
}

interface EmployeeTransferDialogProps {
  isOpen: boolean;
  onClose: () => void;
  units: UnitOption[];
  positions: PositionOption[];
  employees: EmployeeOption[];
  defaultEmployeeId?: string;
}

export function EmployeeTransferDialog({
  isOpen,
  onClose,
  units,
  positions,
  employees,
  defaultEmployeeId,
}: EmployeeTransferDialogProps) {
  const [employeeId, setEmployeeId] = useState(defaultEmployeeId || employees[0]?.id || "");
  const [organizationUnitId, setOrganizationUnitId] = useState(units[0]?.id || "");
  const [positionId, setPositionId] = useState(positions[0]?.id || "");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [decisionNo, setDecisionNo] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const selectedEmployee = employees.find((e) => e.id === employeeId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await transferEmployeeOrgAction({
        employeeId,
        organizationUnitId,
        positionId,
        effectiveDate,
        decisionNo: decisionNo || null,
        reason: reason || null,
        notes: notes || null,
      });

      if (res.success) {
        onClose();
      } else {
        setError(res.error || "Không thể thực hiện điều chuyển nhân viên.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Điều chuyển Phòng ban & Chức danh
              </h3>
              <p className="text-[11px] text-slate-500">
                Cập nhật phân công chính và lưu lịch sử biến động nhân sự
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nhân viên điều chuyển <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} [{emp.code}]
                </option>
              ))}
            </select>
            {selectedEmployee && (
              <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-2">
                <span>Hiện tại:</span>
                <span className="font-semibold text-slate-700">
                  {selectedEmployee.currentUnitName || "Chưa phân công"} — {selectedEmployee.currentPositionTitle || "Chưa có chức danh"}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phòng ban / Đơn vị mới <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={organizationUnitId}
                onChange={(e) => setOrganizationUnitId(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Chức danh mới <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={positionId}
                onChange={(e) => setPositionId(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày hiệu lực điều chuyển <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số Quyết định điều chuyển
              </label>
              <input
                type="text"
                value={decisionNo}
                onChange={(e) => setDecisionNo(e.target.value)}
                placeholder="VD: QD-2026/DC-05"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lý do điều chuyển
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Điều chuyển theo yêu cầu tái cơ cấu tổ chức"
              className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú thêm
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ghi chú về quyết định..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Xác nhận điều chuyển</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
