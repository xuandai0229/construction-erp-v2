"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, Home, Lock, FileQuestion, ArrowLeft } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[Dashboard Error Boundary Caught]", error);
  }, [error]);

  const message = error?.message || "";
  const isConflict = message.includes("CONFLICT") || message.includes("mới hơn bản đang mở");
  const isForbidden = message.includes("không có quyền") || message.includes("truy cập phân hệ") || message.includes("DENIED");
  const isNotFound = message.includes("không tồn tại") || message.includes("đã bị xóa") || message.includes("NOT_FOUND");

  if (isForbidden) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center p-6">
        <div className="w-full max-w-lg text-center bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-600 mb-5">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
            Bạn không còn quyền truy cập nội dung này
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Quyền hạn hoặc tư cách thành viên của bạn đối với công trình/tài nguyên này đã thay đổi ở một phiên làm việc khác.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
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

  if (isNotFound) {
    return (
      <div className="w-full min-h-[60vh] flex items-center justify-center p-6">
        <div className="w-full max-w-lg text-center bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-5">
            <FileQuestion className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
            Nội dung này không còn tồn tại hoặc đã bị xóa
          </h2>
          <p className="text-sm text-slate-600 mb-6 leading-relaxed">
            Hồ sơ hoặc dữ liệu bạn đang mở có thể đã được người dùng khác xóa khỏi hệ thống.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => router.back()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
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

  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-lg text-center bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-5">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 mb-2">
          {isConflict ? "Dữ liệu đã được người khác cập nhật" : "Tạm thời không thể tải dữ liệu"}
        </h2>
        <p className="text-sm text-slate-600 mb-6 leading-relaxed">
          {isConflict
            ? "Phiên bản dữ liệu trên máy chủ đã thay đổi ở một thiết bị khác. Vui lòng tải dữ liệu mới nhất."
            : "Đã xảy ra sự cố khi tải trang. Hãy kiểm tra kết nối mạng hoặc thử tải lại."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => {
              reset();
              router.refresh();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Tải lại dữ liệu
          </button>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <Home className="h-4 w-4" />
            Trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
