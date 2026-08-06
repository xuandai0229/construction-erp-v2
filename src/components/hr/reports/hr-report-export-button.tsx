"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import { FileSpreadsheet, RefreshCw, AlertCircle } from "lucide-react";

export function HrReportExportButton() {
  const searchParams = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setErrorMessage(null);

    try {
      const exportUrl = `/api/hr/reports/export?${searchParams.toString()}`;
      const res = await fetch(exportUrl, { method: "GET" });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || `Lỗi xuất báo cáo Excel (mã HTTP ${res.status})`);
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      let filename = `Bao_cao_dieu_dong_nhan_su_${Date.now()}.xlsx`;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("[HrReportExportButton]", err);
      setErrorMessage(err.message || "Lỗi xuất báo cáo Excel.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors shrink-0"
      >
        {isExporting ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Đang khởi tạo file Excel...</span>
          </>
        ) : (
          <>
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>Xuất báo cáo Excel</span>
          </>
        )}
      </button>
      {errorMessage && (
        <span className="text-xs text-rose-600 font-semibold flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {errorMessage}
        </span>
      )}
    </div>
  );
}
