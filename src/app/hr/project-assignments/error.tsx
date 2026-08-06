"use client";

import React, { useEffect } from "react";
import { HrWorkspaceShell } from "@/components/hr/hr-workspace-shell";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function HrProjectAssignmentsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Project Assignments UI Error:", error);
  }, [error]);

  return (
    <HrWorkspaceShell>
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center max-w-md mx-auto my-12 shadow-xl space-y-4">
        <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-600">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900">Không thể tải không gian điều động nhân sự</h3>
          <p className="text-xs text-slate-500">{error.message || "Đã xảy ra lỗi không xác định trong quá trình tải dữ liệu."}</p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Thử lại</span>
        </button>
      </div>
    </HrWorkspaceShell>
  );
}
