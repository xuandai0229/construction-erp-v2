"use client";

import React, { useState, useTransition } from "react";
import {
  UserCheck,
  Plus,
  Search,
  Calendar,
  Building2,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  assignUnitManagerAction,
  endUnitManagerTermAction,
} from "@/app/hr/organization/actions/organization-actions";

export interface ManagerAssignmentItem {
  id: string;
  organizationUnitId: string;
  organizationUnit: { id: string; name: string; code: string };
  employeeId: string;
  employee: { id: string; fullName: string; code: string };
  startDate: string;
  endDate: string | null;
  isPrimary: boolean;
  decisionNo: string | null;
  createdAt: string;
}

export interface UnitOption {
  id: string;
  code: string;
  name: string;
}

export interface EmployeeOption {
  id: string;
  code: string;
  fullName: string;
}

interface UnitManagerManagementClientProps {
  assignments: ManagerAssignmentItem[];
  units: UnitOption[];
  employees: EmployeeOption[];
  canManage: boolean;
}

export function UnitManagerManagementClient({
  assignments,
  units,
  employees,
  canManage,
}: UnitManagerManagementClientProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("active");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [unitId, setUnitId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [decisionNo, setDecisionNo] = useState("");
  const [isPrimary, setIsPrimary] = useState(true);

  const [isEndingTermId, setIsEndingTermId] = useState<string | null>(null);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleOpenAppoint = (defaultUnitId?: string) => {
    setUnitId(defaultUnitId || units[0]?.id || "");
    setEmployeeId(employees[0]?.id || "");
    setStartDate(new Date().toISOString().split("T")[0]);
    setDecisionNo("");
    setIsPrimary(true);
    setError(null);
    setIsModalOpen(true);
  };

  const handleAppointSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await assignUnitManagerAction({
        organizationUnitId: unitId,
        employeeId,
        startDate,
        isPrimary,
        decisionNo: decisionNo || null,
      });

      if (res.success) {
        setIsModalOpen(false);
      } else {
        setError(res.error || "Không thể bổ nhiệm người quản lý.");
      }
    });
  };

  const handleEndTerm = (assignmentId: string) => {
    setError(null);
    startTransition(async () => {
      const res = await endUnitManagerTermAction(assignmentId, endDate);
      if (res.success) {
        setIsEndingTermId(null);
      } else {
        setError(res.error || "Không thể kết thúc nhiệm kỳ.");
      }
    });
  };

  const filteredAssignments = assignments.filter((a) => {
    const matchesSearch =
      a.employee.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.employee.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.organizationUnit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.organizationUnit.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesUnit = unitFilter === "all" ? true : a.organizationUnitId === unitFilter;
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? a.endDate === null
        : a.endDate !== null;

    return matchesSearch && matchesUnit && matchesStatus;
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

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên quản lý hoặc phòng ban..."
              className="w-full h-9 pl-9 pr-3 text-xs border border-slate-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
            />
          </div>

          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="h-9 border border-slate-300 rounded-lg px-2.5 text-xs text-slate-700 bg-slate-50/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">Tất cả phòng ban</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.code})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 border border-slate-300 rounded-lg px-2.5 text-xs text-slate-700 bg-slate-50/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="active">Đang đương nhiệm</option>
            <option value="historical">Lịch sử (Đã mãn nhiệm)</option>
            <option value="all">Tất cả lịch sử</option>
          </select>
        </div>

        {canManage && (
          <button
            onClick={() => handleOpenAppoint()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Bổ nhiệm người quản lý đơn vị</span>
          </button>
        )}
      </div>

      {/* Table / Empty State */}
      {assignments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-xs text-center space-y-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
            <UserCheck className="w-8 h-8" />
          </div>
          <div className="space-y-1 max-w-md">
            <h3 className="text-base font-bold text-slate-900">
              Chưa có thông tin bổ nhiệm người quản lý
            </h3>
            <p className="text-xs text-slate-500">
              Hệ thống cần có dữ liệu Đơn vị/phòng ban và Hồ sơ nhân viên trước khi thực hiện bổ nhiệm người phụ trách.
            </p>
          </div>
          {canManage && (
            <button
              onClick={() => handleOpenAppoint()}
              disabled={units.length === 0 || employees.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>Bổ nhiệm người quản lý đầu tiên</span>
            </button>
          )}
          {(units.length === 0 || employees.length === 0) && (
            <p className="text-[11px] text-amber-600 font-medium bg-amber-50 px-3 py-1 rounded-md border border-amber-200">
              Vui lòng tạo đơn vị phòng ban và hồ sơ nhân viên trước khi bổ nhiệm.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 font-semibold text-slate-900 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Đơn vị / Phòng ban</th>
                  <th className="py-3 px-4">Người phụ trách / Trưởng đơn vị</th>
                  <th className="py-3 px-4 text-center">Loại phân công</th>
                  <th className="py-3 px-4">Số Quyết định</th>
                  <th className="py-3 px-4">Thời gian đương nhiệm</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  {canManage && <th className="py-3 px-4 text-right">Thao tác</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAssignments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      Chưa có lịch sử phân công quản lý phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-slate-400" />
                          <span>{a.organizationUnit.name}</span>
                          <span className="text-[10px] text-slate-400">({a.organizationUnit.code})</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-blue-600" />
                          <span>{a.employee.fullName}</span>
                          <span className="text-[10px] text-slate-500">[{a.employee.code}]</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {a.isPrimary ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                            Trưởng đơn vị chính
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            Phó / Phụ trách
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700">
                        {a.decisionNo || "-"}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Date(a.startDate).toLocaleDateString("vi-VN")}</span>
                          <span>-</span>
                          <span>
                            {a.endDate ? new Date(a.endDate).toLocaleDateString("vi-VN") : "Hiện tại"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {a.endDate === null ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Đang đương nhiệm
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            <Clock className="w-3 h-3" /> Đã mãn nhiệm
                          </span>
                        )}
                      </td>
                      {canManage && (
                        <td className="py-3 px-4 text-right">
                          {a.endDate === null && (
                            <button
                              onClick={() => setIsEndingTermId(a.id)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors"
                            >
                              Mãn nhiệm
                            </button>
                          )}
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

      {/* Appoint Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Bổ nhiệm người quản lý đơn vị
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAppointSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3.5 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Đơn vị / Phòng ban bổ nhiệm <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={unitId}
                  onChange={(e) => setUnitId(e.target.value)}
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
                  Chọn nhân viên được bổ nhiệm <span className="text-red-500">*</span>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày hiệu lực bổ nhiệm <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số Quyết định bổ nhiệm
                  </label>
                  <input
                    type="text"
                    value={decisionNo}
                    onChange={(e) => setDecisionNo(e.target.value)}
                    placeholder="VD: QD-2026/BN-01"
                    className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPrimaryManager"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isPrimaryManager" className="text-xs font-medium text-slate-700">
                  Là Trưởng đơn vị chính (Tự động kết thúc nhiệm kỳ của trưởng đơn vị cũ nếu có)
                </label>
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
                  <span>Xác nhận bổ nhiệm</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* End Term Modal */}
      {isEndingTermId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 font-bold text-slate-900 text-sm">
              Xác nhận kết thúc nhiệm kỳ
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Nhập ngày chính thức mãn nhiệm để đóng lịch sử phân công quản lý này:
              </p>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs text-slate-900"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEndingTermId(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => handleEndTerm(isEndingTermId)}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  {isPending ? "Đang xử lý..." : "Mãn nhiệm"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
