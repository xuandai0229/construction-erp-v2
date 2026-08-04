"use client";

export default function HrError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-rose-200 bg-white p-8 text-center dark:border-rose-900/60 dark:bg-slate-900">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Không thể tải phân hệ nhân sự</h2>
      <p className="mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
        Đã xảy ra lỗi khi đọc dữ liệu. Vui lòng thử lại hoặc liên hệ quản trị viên.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        Thử lại
      </button>
    </div>
  );
}
