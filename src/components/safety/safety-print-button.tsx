"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SafetyPrintButton({ planId, className = "" }: { planId?: string; className?: string }) {
  const handlePrint = () => {
    if (planId) {
      // Official Print Flow (Section IV): Open server-generated PDF in a new tab for native clean printing (0 browser headers/footers)
      const pdfExportUrl = `/api/reports/safety/plans/${planId}/export?format=pdf`;
      const printWin = window.open(pdfExportUrl, "_blank");
      if (printWin) {
        printWin.focus();
      }
    } else {
      window.print();
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handlePrint}
      className={`h-8 text-xs font-bold rounded-lg gap-1.5 border-slate-300 hover:bg-slate-50 text-slate-700 ${className}`}
    >
      <Printer className="h-4 w-4 text-emerald-600" />
      <span>In bản PDF</span>
    </Button>
  );
}
