"use client";

import Link from "next/link";

export default function DashboardError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[420px] w-full max-w-[900px] items-center justify-center px-4">
      <div className="w-full rounded-2xl border border-red-100 bg-white p-6 text-center shadow-sm shadow-slate-950/[0.04] sm:p-8">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-700">
          !
        </div>
        <h1 className="text-xl font-bold text-slate-950">Không tải được dashboard</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
          Hệ thống đang gặp lỗi khi tổng hợp dữ liệu. Vui lòng thử lại, hoặc quay về danh sách công trình để tiếp tục làm việc.
        </p>
        <p className="mt-3 text-xs font-medium text-slate-500">Mã tham chiếu: ERR-DASHBOARD-UNAVAILABLE</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-700 px-4 text-sm font-bold text-white transition-colors hover:bg-blue-800"
          >
            Thử lại
          </button>
          <Link
            href="/projects"
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50"
          >
            Về danh sách công trình
          </Link>
        </div>
      </div>
    </div>
  );
}
