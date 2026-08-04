import React from "react";
import { ShieldAlert } from "lucide-react";

interface HrAccessDeniedProps {
  title?: string;
  message?: string;
  requiredPermission?: string;
}

export function HrAccessDenied({
  title = "Truy cập bị từ chối (403)",
  message = "Bạn không có quyền xem thông tin phân hệ Quản lý Nhân sự.",
  requiredPermission,
}: HrAccessDeniedProps) {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center rounded-xl border border-rose-200 bg-white p-8 text-center shadow-xs">
      <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4">
        <ShieldAlert className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-1.5 max-w-md text-xs leading-5 text-slate-600">
        {message}
      </p>
      {requiredPermission && (
        <p className="mt-3 text-[11px] text-slate-500">
          Quyền truy cập yêu cầu: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-mono">{requiredPermission}</code>
        </p>
      )}
    </div>
  );
}
