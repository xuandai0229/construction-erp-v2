"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, Lock, FileQuestion } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Root Error Boundary Caught]", error);
  }, [error]);

  const message = error?.message || "";
  const isConflict = message.includes("CONFLICT") || message.includes("mới hơn bản đang mở");
  const isForbidden = message.includes("không có quyền") || message.includes("truy cập phân hệ") || message.includes("DENIED");
  const isNotFound = message.includes("không tồn tại") || message.includes("đã bị xóa") || message.includes("NOT_FOUND");

  if (isForbidden) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-md text-center bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-5">
            <Lock className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Bạn không còn quyền truy cập nội dung này
          </h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Quyền truy cập của tài khoản đối với công trình hoặc tài nguyên này đã thay đổi bởi Quản trị viên.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Home className="h-4 w-4" />
              Về Trang Chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-md text-center bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-5">
            <FileQuestion className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            Nội dung này không còn tồn tại hoặc đã bị xóa
          </h1>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Dữ liệu hoặc hồ sơ bạn đang truy cập có thể đã được người dùng khác xóa khỏi hệ thống.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Home className="h-4 w-4" />
              Về Trang Chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md text-center bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-5">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2">
          {isConflict ? "Dữ liệu đã được người khác cập nhật" : "Hệ thống gặp sự cố khi xử lý yêu cầu"}
        </h1>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {isConflict
            ? "Dữ liệu trên máy chủ đã thay đổi ở một phiên làm việc khác. Vui lòng tải dữ liệu mới."
            : "Đã xảy ra lỗi không mong muốn khi tải trang. Vui lòng thử lại hoặc quay lại trang chủ."}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </button>
          <Link
            href="/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
          >
            <Home className="h-4 w-4" />
            Về Trang Chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
