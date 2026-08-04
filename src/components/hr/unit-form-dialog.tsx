"use client";

import React, { useState, useTransition } from "react";
import { createOrgUnitAction, updateOrgUnitAction } from "@/app/hr/organization/actions/organization-actions";
import { Building2, X, Loader2 } from "lucide-react";

interface OrganizationUnitItem {
  id: string;
  code: string;
  name: string;
  parentId?: string | null;
}

interface UnitFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  units: OrganizationUnitItem[];
  editUnit?: {
    id: string;
    code: string;
    name: string;
    parentId?: string | null;
    description?: string | null;
    orderIndex?: number;
  } | null;
  defaultParentId?: string | null;
}

export function UnitFormDialog({
  isOpen,
  onClose,
  units,
  editUnit,
  defaultParentId,
}: UnitFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState(editUnit?.code || "");
  const [name, setName] = useState(editUnit?.name || "");
  const [parentId, setParentId] = useState<string>(
    editUnit ? (editUnit.parentId || "") : (defaultParentId || "")
  );
  const [description, setDescription] = useState(editUnit?.description || "");
  const [orderIndex, setOrderIndex] = useState<number>(editUnit?.orderIndex ?? 0);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload = {
        id: editUnit?.id,
        code,
        name,
        parentId: parentId || null,
        description: description || null,
        orderIndex,
      };

      const res = editUnit
        ? await updateOrgUnitAction(payload)
        : await createOrgUnitAction(payload);

      if (res.success) {
        onClose();
      } else {
        setError(res.error || "Đã xảy ra lỗi khi lưu đơn vị.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {editUnit ? "Chỉnh sửa đơn vị / phòng ban" : "Thêm mới đơn vị / phòng ban"}
            </h3>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mã đơn vị <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="VD: BGD, PKT, KETOAN"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs uppercase text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số thứ tự hiển thị
              </label>
              <input
                type="number"
                value={orderIndex}
                onChange={(e) => setOrderIndex(parseInt(e.target.value, 10) || 0)}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên đơn vị / Phòng ban <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Phòng Kỹ thuật và Công nghệ"
              className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Đơn vị cấp trên
            </label>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">-- Là Đơn vị cấp cao nhất (Trực thuộc Công ty) --</option>
              {units
                .filter((u) => u.id !== editUnit?.id)
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.code})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mô tả nhiệm vụ và chức năng
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả tóm tắt chức năng phòng ban..."
              className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              <span>{editUnit ? "Lưu thay đổi" : "Tạo đơn vị"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
