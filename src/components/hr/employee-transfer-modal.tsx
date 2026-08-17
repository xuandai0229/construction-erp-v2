"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ArrowRightLeft,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { transferEmployeeOrgAction } from "@/app/hr/organization/actions/organization-actions";
import { EnterpriseCombobox, type EnterpriseComboboxOption } from "@/components/ui/enterprise-combobox";

interface OrgUnitOption {
  id: string;
  code: string;
  name: string;
}

interface PositionOption {
  id: string;
  code: string;
  title: string;
}

interface EmployeeTransferModalProps {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  currentOrgUnitId?: string | null;
  currentOrgUnitName?: string | null;
  currentPositionId?: string | null;
  currentPositionTitle?: string | null;
  orgUnits: OrgUnitOption[];
  positions: PositionOption[];
  isOpen: boolean;
  onClose: () => void;
}

export function EmployeeTransferModal({
  employeeId,
  employeeName,
  employeeCode,
  currentOrgUnitId,
  currentOrgUnitName,
  currentPositionId,
  currentPositionTitle,
  orgUnits,
  positions,
  isOpen,
  onClose,
}: EmployeeTransferModalProps) {
  const router = useRouter();

  const [targetOrgUnitId, setTargetOrgUnitId] = useState(currentOrgUnitId || "");
  const [targetPositionId, setTargetPositionId] = useState(currentPositionId || "");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);
  const [decisionNo, setDecisionNo] = useState("");
  const [reason, setReason] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || typeof document === "undefined") return null;

  const orgUnitOptions: EnterpriseComboboxOption[] = orgUnits.map((u) => ({
    value: u.id,
    label: `${u.name} (${u.code})`,
    name: u.name,
    code: u.code,
  }));

  const positionOptions: EnterpriseComboboxOption[] = positions.map((p) => ({
    value: p.id,
    label: `${p.title} (${p.code})`,
    name: p.title,
    code: p.code,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetOrgUnitId || !targetPositionId) {
      setError("Vui lòng chọn đầy đủ Phòng ban và Chức danh tiếp nhận.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const res = await transferEmployeeOrgAction({
      employeeId,
      organizationUnitId: targetOrgUnitId,
      positionId: targetPositionId,
      effectiveDate,
      decisionNo: decisionNo.trim() || undefined,
      reason: reason.trim() || undefined,
    });

    setSubmitting(false);

    if (!res.success) {
      setError(res.error || "Không thể thực hiện điều chuyển công tác.");
      return;
    }

    onClose();
    router.refresh();
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900">
              Điều chuyển Công tác & Chức danh
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
          <div className="font-extrabold text-slate-900">
            {employeeName} <span className="font-mono text-blue-700">({employeeCode})</span>
          </div>
          <div className="text-slate-600">
            Hiện tại: <strong>{currentOrgUnitName || "Chưa thuộc phòng ban"}</strong> · <strong>{currentPositionTitle || "Chưa chọn chức danh"}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* New Org Unit */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Phòng ban / Đơn vị mới <span className="text-rose-500">*</span>
            </label>
            <EnterpriseCombobox
              options={orgUnitOptions}
              value={targetOrgUnitId}
              onChange={(val) => setTargetOrgUnitId(val)}
              placeholder="-- Chọn phòng ban tiếp nhận --"
              searchPlaceholder="Tìm theo tên hoặc mã phòng ban..."
              emptyMessage="Không tìm thấy phòng ban phù hợp"
              clearable
            />
          </div>

          {/* New Position */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Chức danh chuyên môn mới <span className="text-rose-500">*</span>
            </label>
            <EnterpriseCombobox
              options={positionOptions}
              value={targetPositionId}
              onChange={(val) => setTargetPositionId(val)}
              placeholder="-- Chọn chức danh mới --"
              searchPlaceholder="Tìm theo tên hoặc mã chức danh..."
              emptyMessage="Không tìm thấy chức danh phù hợp"
              clearable
            />
          </div>

          {/* Effective Date */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Ngày hiệu lực điều chuyển <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Decision Number */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Số Quyết định điều chuyển (Không bắt buộc)
            </label>
            <input
              type="text"
              placeholder="Ví dụ: QĐ-2026/05-ĐĐ"
              value={decisionNo}
              onChange={(e) => setDecisionNo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Reason */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Lý do điều chuyển
            </label>
            <textarea
              rows={2}
              placeholder="Lý do điều chuyển hoặc phân công nhiệm vụ mới..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || !targetOrgUnitId || !targetPositionId}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang ghi nhận...</span>
                </>
              ) : (
                <>
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Xác nhận điều chuyển</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

