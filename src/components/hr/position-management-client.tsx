"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  RotateCcw,
  Loader2,
  AlertCircle,
  Users,
  ExternalLink,
} from "lucide-react";
import {
  createPositionAction,
  updatePositionAction,
  deactivatePositionAction,
  reactivatePositionAction,
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
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPosition, setEditingPosition] = useState<PositionItem | null>(null);

  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (canManage && searchParams.get("create") === "1") handleOpenCreate();
  }, [canManage, searchParams]);

  const handleOpenCreate = () => {
    setEditingPosition(null);
    setCode("");
    setTitle("");
    setDescription("");
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pos: PositionItem) => {
    setEditingPosition(pos);
    setCode(pos.code);
    setTitle(pos.title);
    setDescription(pos.description || "");
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
        level: editingPosition?.level ?? null,
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

  const handleReactivate = (pos: PositionItem) => {
    if (!confirm(`Bạn có chắc chắn muốn kích hoạt lại chức danh '${pos.title}' (${pos.code})?`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await reactivatePositionAction(pos.id);
      if (!res.success) {
        setError(res.error || "Không thể kích hoạt lại chức danh.");
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
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-800 text-xs font-bold cursor-pointer">
            Đóng
          </button>
        </div>
      )}

      {/* Filter Toolbar (Single Primary CTA Enforcement: Header Contains Create CTA) */}
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
              Tạo chức danh đầu tiên để phục vụ phân công nhân sự phòng ban trong công ty.
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
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-slate-50/90 border-b border-slate-200 font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 w-[20%]">Mã chức danh</th>
                  <th className="py-3 px-4 w-[40%]">Tên chức danh</th>
                  <th className="py-3 px-4 w-[20%] text-center">Nhân sự hiện tại</th>
                  <th className="py-3 px-4 w-[10%] text-center">Trạng thái</th>
                  {canManage && <th className="py-3 px-4 w-[10%] text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPositions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      Không tìm thấy chức danh nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredPositions.map((pos) => (
                    <tr key={pos.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 uppercase">
                        <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-block">
                          {pos.code}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 text-xs">
                        {pos.title}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {pos.activeEmployeeCount > 0 ? (
                          <Link
                            href={`/hr/employees?positionId=${pos.id}`}
                            title={`Xem danh sách ${pos.activeEmployeeCount} nhân sự giữ chức danh '${pos.title}'`}
                            className="inline-flex items-center gap-1.5 text-blue-700 font-bold bg-blue-50 hover:bg-blue-100 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-hidden px-2.5 py-1 rounded-lg border border-blue-200/80 transition-colors group cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span>{pos.activeEmployeeCount} nhân sự</span>
                            <ExternalLink className="w-3 h-3 text-blue-400 group-hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium px-2.5 py-1 text-xs select-none">
                            <Users className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                            <span>0 nhân sự</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {pos.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đang hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            Đã vô hiệu hóa
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(pos)}
                              title="Chỉnh sửa chức danh"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {pos.isActive ? (
                              <button
                                type="button"
                                onClick={() => handleDeactivate(pos)}
                                disabled={isPending}
                                title="Vô hiệu hóa chức danh"
                                className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleReactivate(pos)}
                                disabled={isPending}
                                title="Kích hoạt lại chức danh"
                                className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                              >
                                <RotateCcw className="w-4 h-4" />
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
                type="button"
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã chức danh <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="VD: GDT, TP, KTV, KSXD"
                  className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs uppercase font-mono text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
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
                  Mô tả nhiệm vụ và phạm vi trách nhiệm
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả phạm vi công việc và tính chất nhiệm vụ..."
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
