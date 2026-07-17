"use client";

import Link from "next/link";
import { Plus, FileText, ChevronRight, CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { useState, useTransition } from "react";
import { createSupervisionPackage } from "@/app/(dashboard)/supervision/actions";
import { useRouter } from "next/navigation";

function getStatusBadge(status: string) {
  switch (status) {
    case "DRAFT": return <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">Bản nháp</span>;
    case "SUBMITTED": return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Chờ duyệt</span>;
    case "REVISION_REQUIRED": return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Yêu cầu sửa</span>;
    case "CONFIRMED": return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">Đã duyệt</span>;
    case "LOCKED": return <span className="bg-slate-800 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">Đã khóa</span>;
    default: return <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-bold">{status}</span>;
  }
}

export function WeeklyReportsWorkspace({ initialReports, actorId }: { initialReports: any[]; actorId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCreate = () => {
    startTransition(async () => {
      // By default it creates a package for the current week, but we can just use createSupervisionPackage
      const res = await createSupervisionPackage({});
      if (res && res.id) {
        router.push(`/supervision/weekly-reports/${res.id}`);
      }
    });
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Báo cáo kết quả tuần</h1>
          <p className="text-sm text-slate-500 mt-1">Quản lý và tổng hợp báo cáo giám sát hàng tuần gửi Ban Giám đốc.</p>
        </div>
        <button onClick={handleCreate} disabled={isPending} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50">
          <Plus className="w-4 h-4" /> Tạo báo cáo mới
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {initialReports.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-base font-medium text-slate-900 mb-1">Chưa có báo cáo nào</p>
            <p className="text-sm mb-4">Các báo cáo tuần sẽ tự động lấy dữ liệu từ Nhật ký giám sát của bạn.</p>
            <button onClick={handleCreate} className="inline-flex items-center text-sm font-semibold text-blue-600 hover:underline">Tạo báo cáo đầu tiên</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="px-4 py-3">Tuần báo cáo</th>
                  <th className="px-4 py-3">Số văn bản</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-center">Lượt kiểm tra</th>
                  <th className="px-4 py-3">Người lập</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {initialReports.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {new Date(r.weekStart).toLocaleDateString('vi-VN')} - {new Date(r.weekEnd).toLocaleDateString('vi-VN')}
                      </div>
                      <div className="text-xs text-slate-500">Nơi lập: {r.place || "Hà Nội"}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{r.reportNumber || "—"}</td>
                    <td className="px-4 py-3">{getStatusBadge(r.status)}</td>
                    <td className="px-4 py-3 text-center font-medium text-slate-700">{r._count?.visits || 0}</td>
                    <td className="px-4 py-3 text-slate-600">{r.createdBy?.name}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/supervision/weekly-reports/${r.id}`} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm">
                        Chi tiết <ChevronRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
