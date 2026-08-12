import Link from "next/link";
import { FileQuestion, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md text-center bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-5">
          <FileQuestion className="h-8 w-8" />
        </div>
        
        <h1 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
          Nội dung không tồn tại hoặc đã bị xóa
        </h1>
        
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          Dữ liệu bạn đang truy cập có thể đã được người dùng khác cập nhật, xóa bỏ hoặc phân quyền truy cập đã thay đổi.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Home className="h-4 w-4" />
            Về Trang Chủ
          </Link>
          <Link
            href="/reports"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Xem Danh Sách Báo Cáo
          </Link>
        </div>
      </div>
    </div>
  );
}
