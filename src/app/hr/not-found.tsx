export default function HrNotFound() {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Không tìm thấy hồ sơ</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Hồ sơ nhân viên không tồn tại hoặc nằm ngoài phạm vi được phép.</p>
    </div>
  );
}
