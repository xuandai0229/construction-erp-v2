"use client";

import React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { HrReportDetailsTableResult } from "@/lib/hr/reporting-service";
import { ChevronLeft, ChevronRight, FileSpreadsheet, Inbox } from "lucide-react";

interface HrReportDetailTableProps {
  tableData: HrReportDetailsTableResult;
}

export function HrReportDetailTable({ tableData }: HrReportDetailTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const { items, totalCount, page, pageSize, totalPages } = tableData;

  const goToPage = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`${pathname}?${params.toString()}`);
  };

  const statusBadgeMap: Record<string, { label: string; style: string }> = {
    ACTIVE: { label: "Đang hiệu lực", style: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    PLANNING: { label: "Kế hoạch", style: "bg-blue-50 text-blue-700 border-blue-200" },
    RELEASED: { label: "Đã rút", style: "bg-amber-50 text-amber-700 border-amber-200" },
    COMPLETED: { label: "Hoàn thành", style: "bg-slate-100 text-slate-700 border-slate-200" },
    CANCELLED: { label: "Đã hủy", style: "bg-rose-50 text-rose-700 border-rose-200" },
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b border-slate-100 bg-slate-50/50">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            Danh sách chi tiết điều động nhân sự
          </h3>
          <p className="text-xs text-slate-500">
            Hiển thị {items.length} trên tổng số {totalCount} bản ghi phù hợp bộ lọc
          </p>
        </div>

        {/* Pagination Status */}
        {totalCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span>
              Trang {page} / {totalPages}
            </span>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-2xs">
              <th className="px-3 py-3 w-12 text-center">STT</th>
              <th className="px-3 py-3 whitespace-nowrap sticky left-0 bg-slate-100 z-10 shadow-xs">
                Nhân sự (Mã NV & Họ tên)
              </th>
              <th className="px-3 py-3 whitespace-nowrap">Đơn vị gốc</th>
              <th className="px-3 py-3 whitespace-nowrap">Công trình / Dự án</th>
              <th className="px-3 py-3 whitespace-nowrap">Vai trò công trường</th>
              <th className="px-3 py-3 whitespace-nowrap text-center">Thời gian điều động</th>
              <th className="px-3 py-3 whitespace-nowrap text-center">Tỷ lệ %</th>
              <th className="px-3 py-3 whitespace-nowrap text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <div className="inline-flex flex-col items-center gap-2">
                    <Inbox className="w-8 h-8 text-slate-300" />
                    <span className="font-semibold text-sm">Không tìm thấy bản ghi điều động nào.</span>
                    <span className="text-xs text-slate-500">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</span>
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item, idx) => {
                const stBadge = statusBadgeMap[item.status] || {
                  label: item.status,
                  style: "bg-slate-100 text-slate-700 border-slate-200",
                };
                const stt = (page - 1) * pageSize + idx + 1;
                return (
                  <tr key={item.assignmentId} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-center font-medium text-slate-500">{stt}</td>
                    <td className="px-3 py-3 whitespace-nowrap sticky left-0 bg-white z-10 shadow-xs">
                      <div className="font-bold text-slate-900">{item.employeeFullName}</div>
                      <div className="text-2xs font-mono font-semibold text-blue-700">{item.employeeCode}</div>
                    </td>
                    <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                      {item.orgUnitName || "Chưa gán"}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{item.projectName}</div>
                      <div className="text-2xs text-slate-500 font-mono">{item.projectCode}</div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap font-medium text-slate-800">
                      {item.projectRoleName}
                    </td>
                    <td className="px-3 py-3 text-center font-mono whitespace-nowrap text-slate-700">
                      <span>{item.startDate}</span>
                      <span className="mx-1 text-slate-400">→</span>
                      <span>{item.expectedEndDate || "Không thời hạn"}</span>
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-bold text-2xs ${
                          item.allocationPercentage > 100
                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                            : item.allocationPercentage === 100
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {item.allocationPercentage}%
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full border text-2xs font-bold ${stBadge.style}`}
                      >
                        {stBadge.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
          <span className="text-xs text-slate-500 font-medium">
            Hiển thị từ {(page - 1) * pageSize + 1} đến {Math.min(page * pageSize, totalCount)} trên {totalCount} bản ghi
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              Trang trước
            </button>
            <span className="px-3 py-1 text-xs font-bold text-slate-800">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Trang sau
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
