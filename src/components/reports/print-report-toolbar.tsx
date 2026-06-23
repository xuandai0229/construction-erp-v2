"use client";

import { Printer, X } from "lucide-react";

export function PrintReportToolbar() {
  return (
    <div className="no-print flex justify-end mb-6 gap-3 border-b pb-4">
      <button 
        type="button"
        onClick={() => window.close()} 
        className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <X className="w-4 h-4" />
        Đóng
      </button>
      <button 
        type="button"
        onClick={() => window.print()} 
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
      >
        <Printer className="w-4 h-4" />
        In / Lưu PDF
      </button>
    </div>
  );
}
