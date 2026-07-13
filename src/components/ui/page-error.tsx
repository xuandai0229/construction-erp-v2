"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, Home } from "lucide-react";

export function PageError({
  error,
  reset,
  title = "Đã xảy ra lỗi khi tải dữ liệu",
  message = "Hệ thống đang gặp sự cố khi xử lý trang này. Vui lòng thử lại sau hoặc quay về trang chủ.",
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  message?: string;
}) {
  const router = useRouter();
  const showTechnicalDetails = process.env.NODE_ENV !== "production";

  useEffect(() => {
    console.error("Page Crash:", { message: error.message, digest: error.digest, error });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[420px] w-full items-center justify-center p-4">
      <div className="w-full max-w-[540px] rounded-2xl border border-rose-100 bg-white p-6 sm:p-8 text-center shadow-lg shadow-rose-950/[0.02]">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-8 ring-rose-50/50">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="mx-auto mt-2 text-sm leading-relaxed text-slate-600">
          {message}
        </p>
        
        {showTechnicalDetails && error.message && (
          <div className="mt-4 p-3 bg-slate-50 border border-slate-100 rounded-lg text-left text-xs font-mono text-slate-500 overflow-x-auto max-h-32">
            {error.message}
          </div>
        )}
        {error.digest ? <p className="mt-3 text-xs text-slate-400">Mã tham chiếu: {error.digest}</p> : null}
        
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {reset && (
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white transition-all hover:bg-blue-700 active:scale-95 shadow-sm shadow-blue-600/20"
            >
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </button>
          )}
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 shadow-sm"
          >
            Quay lại
          </button>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 shadow-sm"
          >
            <Home className="h-4 w-4" />
            Về trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
