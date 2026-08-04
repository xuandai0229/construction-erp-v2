"use client";

import { useState } from "react";
import { Printer, Loader2 } from "lucide-react";
import { printDocument } from "@/lib/document-export/document-export-client";
import { useToast } from "@/components/ui/toast-context";

export function WeeklyPrintButton({
  dossierId,
  documentType = "RESULT",
}: {
  dossierId?: string;
  documentType?: "RESULT" | "NEXT_WEEK_PLAN";
}) {
  const [isPrinting, setIsPrinting] = useState(false);
  const toast = useToast();

  const executePrint = async () => {
    if (isPrinting) return;

    if (!dossierId) {
      window.print();
      return;
    }

    setIsPrinting(true);

    try {
      const url = `/api/supervision/weekly/${dossierId}/export?format=pdf&disposition=inline&document=${documentType}`;
      await printDocument({
        url,
        title: "In Báo Cáo Giám Sát Tuần",
        preferredMode: "same-tab",
      });
    } catch (err: any) {
      if (err?.code !== "ABORTED") {
        toast.error(err?.message || "Không thể thực hiện in bản báo cáo.");
      }
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <button
      className="print-actions inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors disabled:opacity-50"
      type="button"
      disabled={isPrinting}
      onClick={executePrint}
    >
      {isPrinting ? (
        <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
      ) : (
        <Printer className="h-4 w-4 text-slate-500" />
      )}
      <span>{isPrinting ? "Đang chuẩn bị in..." : "In Báo Cáo (Clean PDF)"}</span>
    </button>
  );
}
