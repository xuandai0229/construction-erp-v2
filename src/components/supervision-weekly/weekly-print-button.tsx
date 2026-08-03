"use client";

import { Printer } from "lucide-react";

export function WeeklyPrintButton({
  dossierId,
  documentType = "RESULT",
}: {
  dossierId?: string;
  documentType?: "RESULT" | "NEXT_WEEK_PLAN";
}) {
  const handlePrint = () => {
    if (dossierId) {
      const url = `/api/supervision/weekly/${dossierId}/export?format=pdf&disposition=inline&document=${documentType}`;
      window.open(url, "_blank");
    } else {
      window.print();
    }
  };

  return (
    <button
      className="print-actions inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
      type="button"
      onClick={handlePrint}
    >
      <Printer className="h-4 w-4 text-slate-500" />
      <span>In Báo Cáo (Clean PDF)</span>
    </button>
  );
}
