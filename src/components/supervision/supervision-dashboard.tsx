"use client";

import Link from "next/link";
import { ClipboardCheck, MapPin, Search, CheckCircle, AlertTriangle, FileText, ChevronRight } from "lucide-react";

export function SupervisionDashboard({ visitsToday, activeReports, unresolvedFindings, actorId }: any) {
  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tổng quan giám sát</h1>
        <p className="text-sm text-slate-500 mt-1">Nắm bắt hoạt động kiểm tra hiện trường hôm nay và trạng thái các báo cáo.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Nhật ký hôm nay */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-blue-600"/> Nhật ký hôm nay</h3>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{visitsToday.length} bản ghi</span>
          </div>
          <div className="flex-1 space-y-3">
            {visitsToday.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Chưa ghi nhận hoạt động nào hôm nay.</p>
            ) : (
              visitsToday.slice(0, 4).map((v: any) => (
                <div key={v.id} className="text-sm">
                  <div className="font-semibold text-slate-800 truncate">{v.project?.name}</div>
                  <div className="text-slate-500 text-xs flex justify-between mt-1">
                    <span>{v.shift === "MORNING" ? "Sáng" : v.shift === "AFTERNOON" ? "Chiều" : "Tối"}</span>
                    <span className={v.result.toLowerCase().includes("không") ? "text-red-600 font-medium" : "text-emerald-600 font-medium"}>{v.result}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <Link href="/supervision/journal" className="text-sm font-semibold text-blue-600 hover:underline flex items-center justify-between">
              Đến màn hình nhập nhật ký <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Báo cáo đang mở */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600"/> Báo cáo đang lập</h3>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{activeReports.length} báo cáo</span>
          </div>
          <div className="flex-1 space-y-3">
            {activeReports.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Không có báo cáo nào đang ở trạng thái nháp.</p>
            ) : (
              activeReports.slice(0, 4).map((r: any) => (
                <div key={r.id} className="text-sm bg-slate-50 p-2 rounded border border-slate-100">
                  <div className="font-semibold text-slate-800">
                    Tuần {new Date(r.weekStart).toLocaleDateString("vi-VN")} - {new Date(r.weekEnd).toLocaleDateString("vi-VN")}
                  </div>
                  <div className="text-xs mt-1">
                    {r.status === "REVISION_REQUIRED" ? <span className="text-red-600 font-bold">Yêu cầu sửa</span> : <span className="text-slate-500">Bản nháp</span>}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <Link href="/supervision/weekly-reports" className="text-sm font-semibold text-indigo-600 hover:underline flex items-center justify-between">
              Xem danh sách báo cáo tuần <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Tồn tại chưa xử lý */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500"/> Tồn tại cần theo dõi</h3>
            <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{unresolvedFindings.length} tồn tại</span>
          </div>
          <div className="flex-1 space-y-3">
            {unresolvedFindings.length === 0 ? (
              <p className="text-sm text-slate-500 italic">Không có tồn tại nào cần theo dõi.</p>
            ) : (
              unresolvedFindings.map((f: any) => (
                <div key={f.id} className="text-sm pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                  <div className="font-semibold text-slate-800 truncate" title={f.description}>{f.description}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{f.project?.code} • Hạn: {f.dueDate ? new Date(f.dueDate).toLocaleDateString("vi-VN") : "Chưa có"}</div>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <Link href="/supervision/findings" className="text-sm font-semibold text-amber-600 hover:underline flex items-center justify-between">
              Quản lý tồn tại & khắc phục <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
