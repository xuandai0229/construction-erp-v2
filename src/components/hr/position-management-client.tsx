"use client";

import React, { useState, useTransition } from "react";
import {
  ShieldCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  Users,
} from "lucide-react";
import {
  createPositionAction,
  updatePositionAction,
  deactivatePositionAction,
} from "@/app/hr/organization/actions/organization-actions";

export interface PositionItem {
  id: string;
  code: string;
  title: string;
  description: string | null;
  level: number | null;
  isActive: boolean;
  activeEmployeeCount: number;
}

interface PositionManagementClientProps {
  positions: PositionItem[];
  canManage: boolean;
}

export function PositionManagementClient({ positions, canManage }: PositionManagementClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<PositionItem | null>(null);

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<number | "">("");

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpenCreate = () => {
    setEditingPosition(null);
    setCode("");
    setTitle("");
    setDescription("");
    setLevel("");
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pos: PositionItem) => {
    setEditingPosition(pos);
    setCode(pos.code);
    setTitle(pos.title);
    setDescription(pos.description || "");
    setLevel(pos.level ?? "");
    setError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const payload = {
        id: editingPosition?.id,
        code,
        title,
        description: description || null,
        level: level !== "" ? Number(level) : null,
      };

      const res = editingPosition
        ? await updatePositionAction(payload)
        : await createPositionAction(payload);

      if (res.success) {
        setIsModalOpen(false);
      } else {
        setError(res.error || "Không thể lưu chức danh.");
      }
    });
  };

  const handleDeactivate = (pos: PositionItem) => {
    if (!confirm(`Bạn có chắc chắn muốn vô hiệu hóa chức danh '${pos.title}' (${pos.code})?`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await deactivatePositionAction(pos.id);
      if (!res.success) {
        setError(res.error || "Không thể vô hiệu hóa chức danh.");
      }
    });
  };

  const filteredPositions = positions.filter((pos) => {
    const matchesSearch =
      pos.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pos.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? pos.isActive
        : !pos.isActive;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center justify-between p-3.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 text-xs font-bold">
            Đóng
          </button>
        </div>
      )}

      {/* Filter & Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm mã hoặc tên chức danh..."
              className="w-full h-9 pl-9 pr-3 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 border border-slate-300 rounded-lg px-2.5 text-xs text-slate-700 bg-slate-50/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã vô hiệu hóa</option>
          </select>
        </div>

        {canManage && (
          <button
            onClick={handleOpenCreate}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm chức danh mới</span>
          </button>
        )}
      </div>

      {/* Positions Table / Empty State */}
      {positions.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-xs text-center space-y-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-bold text-slate-900">
              Chưa có danh mục chức danh
            </h3>
            <p className="text-xs text-slate-500">
              Thêm các vị trí chức danh và cấp bậc công việc để bắt đầu phân công cho nhân sự.
            </p>
          </div>
          {canManage && (
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm chức danh đầu tiên</span>
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-900 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Mã chức danh</th>
                  <th className="py-3 px-4">Tên chức danh</th>
                  <th className="py-3 px-4 text-center">Cấp bậc</th>
                  <th className="py-3 px-4">Mô tả</th>
                  <th className="py-3 px-4 text-center">Nhân sự đang làm việc</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  {canManage && <th className="py-3 px-4 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPositions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Không tìm thấy chức danh nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredPositions.map((pos) => (
                    <tr key={pos.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900 uppercase">{pos.code}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{pos.title}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-slate-100 text-slate-800 border border-slate-200">
                          {pos.level ?? "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                        {pos.description || "-"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-slate-700 font-bold bg-slate-100 px-2 py-0.5 rounded-md">
                          <Users className="w-3 h-3 text-slate-400" />
                          {pos.activeEmployeeCount}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {pos.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Đã vô hiệu hóa
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(pos)}
                              title="Sửa"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {pos.isActive && (
                              <button
                                onClick={() => handleDeactivate(pos)}
                                disabled={isPending}
                                title="Vô hiệu hóa"
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Dialog Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingPosition ? "Chỉnh sửa chức danh" : "Thêm mới chức danh"}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Mã chức danh <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="VD: GDT, TP, CV"
                    className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs uppercase text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cấp bậc từ 1 đến 10
                  </label>
                  <input
                    type="number"
                    value={level}
                    onChange={(e) => setLevel(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="VD: 1, 2, 3"
                    className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên chức danh <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Trưởng phòng Kỹ thuật"
                  className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mô tả vai trò và trách nhiệm
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả chức năng công việc..."
                  className="w-full rounded-lg border border-slate-300 p-3 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
                  <span>{editingPosition ? "Lưu thay đổi" : "Tạo chức danh"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
