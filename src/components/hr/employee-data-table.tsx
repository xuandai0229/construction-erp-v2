"use client";

import React from "react";
import Link from "next/link";
import { EmployeeListDTO } from "@/lib/hr/hr-projection";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Eye,
  Edit,
  Building2,
  Briefcase,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Plus,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HrEmptyState } from "./hr-empty-state";

interface EmployeeDataTableProps {
  employees: EmployeeListDTO[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  canUpdate: boolean;
  canArchive: boolean;
  canCreate?: boolean;
  searchQuery: string;
}

const STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  ACTIVE: { label: "Đang làm việc", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PROBATION: { label: "Đang thử việc", style: "bg-amber-50 text-amber-700 border-amber-200" },
  SUSPENDED: { label: "Tạm ngừng", style: "bg-orange-50 text-orange-700 border-orange-200" },
  RESIGNED: { label: "Đã nghỉ việc", style: "bg-rose-50 text-rose-700 border-rose-200" },
  RETIRED: { label: "Nghỉ hưu", style: "bg-slate-100 text-slate-700 border-slate-200" },
};

function getInitials(name: string): string {
  if (!name) return "NV";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function EmployeeDataTable({
  employees,
  totalCount,
  currentPage,
  pageSize,
  canUpdate,
  canArchive,
  canCreate,
  searchQuery,
}: EmployeeDataTableProps) {
  const totalPages = Math.ceil(totalCount / pageSize) || 1;
  const pageHref = (page: number) => {
    const params = new URLSearchParams(searchQuery);
    params.set("page", String(page));
    return `/hr/employees?${params.toString()}`;
  };

  const hasSearchOrFilters = Boolean(searchQuery);

  if (employees.length === 0) {
    if (hasSearchOrFilters) {
      return (
        <HrEmptyState
          variant="filter-mismatch"
          title="Không tìm thấy hồ sơ nhân viên phù hợp"
          description="Vui lòng thử tìm kiếm lại với từ khóa khác hoặc xóa bớt bộ lọc đang áp dụng."
          action={
            <Link
              href="/hr/employees"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc</span>
            </Link>
          }
        />
      );
    }

    return (
      <HrEmptyState
        variant="no-data"
        title="Chưa có hồ sơ nhân viên nào"
        description="Hệ thống chưa ghi nhận hồ sơ nhân viên. Tạo hồ sơ đầu tiên để bắt đầu quản lý nhân sự."
        action={
          canCreate ? (
            <Link
              href="/hr/employees/new"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm nhân viên mới</span>
            </Link>
          ) : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Nhân viên</th>
                <th className="py-3 px-4">Mã NV</th>
                <th className="py-3 px-4">Phòng ban</th>
                <th className="py-3 px-4">Chức danh</th>
                <th className="py-3 px-4">Số điện thoại</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Tài khoản hệ thống</th>
                <th className="py-3 px-4">Ngày vào</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => {
                const statusCfg = STATUS_CONFIG[emp.status] || {
                  label: emp.status,
                  style: "bg-slate-100 text-slate-700 border-slate-200",
                };
                const joinDateFormatted = emp.joinedDate
                  ? format(new Date(emp.joinedDate), "dd/MM/yyyy", { locale: vi })
                  : "—";

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {getInitials(emp.fullName)}
                        </div>
                        <div>
                          <Link
                            href={`/hr/employees/${emp.id}`}
                            className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                          >
                            {emp.fullName}
                          </Link>
                          {emp.personalEmail && (
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              <span>{emp.personalEmail}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-xs text-slate-700">
                      {emp.code}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 text-xs">
                      {emp.currentDepartmentName ? (
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{emp.currentDepartmentName}</span>
                        </div>
                      ) : (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200">
                          Chưa phân công
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 text-xs">
                      {emp.currentPositionTitle ? (
                        <div className="flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{emp.currentPositionTitle}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700 text-xs font-mono">
                      {emp.phoneNumber ? (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{emp.phoneNumber}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Bị ẩn / Không có</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border", statusCfg.style)}>
                        {statusCfg.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      {emp.userName ? (
                        <div className="text-slate-900 font-medium">
                          {emp.userName}
                        </div>
                      ) : (
                        <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
                          Chưa liên kết
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {joinDateFormatted}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/hr/employees/${emp.id}`}
                          title="Xem hồ sơ"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {canUpdate && (
                          <Link
                            href={`/hr/employees/${emp.id}/edit`}
                            title="Chỉnh sửa"
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="grid grid-cols-1 gap-3 lg:hidden">
        {employees.map((emp) => {
          const statusCfg = STATUS_CONFIG[emp.status] || { label: emp.status, style: "bg-slate-100 text-slate-700 border-slate-200" };
          return (
            <div
              key={emp.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
                    {getInitials(emp.fullName)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {emp.fullName}
                    </h3>
                    <span className="text-xs font-mono text-slate-500">
                      Mã: {emp.code}
                    </span>
                  </div>
                </div>
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border shrink-0", statusCfg.style)}>
                  {statusCfg.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-slate-100 py-2 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Phòng ban</span>
                  <span className="font-medium text-slate-900">
                    {emp.currentDepartmentName || "Chưa phân công"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Chức danh</span>
                  <span className="font-medium text-slate-900">
                    {emp.currentPositionTitle || "—"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-500">
                  Tài khoản: {emp.userName || "Chưa liên kết"}
                </span>
                <Link
                  href={`/hr/employees/${emp.id}`}
                  className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Chi tiết</span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl p-3 shadow-xs text-xs text-slate-600">
        <div>
          Hiển thị <span className="font-bold text-slate-900">{employees.length}</span> trên tổng số{" "}
          <span className="font-bold text-slate-900">{totalCount}</span> hồ sơ nhân viên
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Link
              href={pageHref(Math.max(1, currentPage - 1))}
              className={cn(
                "p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-slate-700",
                currentPage <= 1 && "pointer-events-none opacity-40"
              )}
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <span className="font-medium px-2">
              Trang {currentPage} / {totalPages}
            </span>
            <Link
              href={pageHref(Math.min(totalPages, currentPage + 1))}
              className={cn(
                "p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-slate-700",
                currentPage >= totalPages && "pointer-events-none opacity-40"
              )}
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
