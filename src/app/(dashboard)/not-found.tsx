"use client";

import Link from "next/link";
import { FileQuestion, ArrowLeft, RefreshCw, Home } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DashboardNotFound() {
  const router = useRouter();

  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-lg text-center bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-5">
          <FileQuestion className="h-8 w-8" />
        </div>
        
        <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
          Hồ sơ này không còn tồn tại hoặc đã bị xóa
        </h2>
        
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Nội dung hoặc báo cáo bạn đang xem có thể đã được người dùng khác cập nhật, xóa khỏi hệ thống hoặc bạn đã bị thay đổi quyền truy cập.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>
          
          <button
            onClick={() => router.refresh()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Tải lại dữ liệu
          </button>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            Về Trang Chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
