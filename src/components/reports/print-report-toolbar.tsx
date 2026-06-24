"use client";

import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintReportToolbar() {
  return (
    <div className="no-print flex justify-end mb-6 gap-3 border-b pb-4">
      <Button
        type="button"
        variant="outline"
        onClick={() => window.close()} 
      >
        <X className="w-4 h-4" />
        Đóng
      </Button>
      <Button
        type="button"
        onClick={() => window.print()} 
      >
        <Printer className="w-4 h-4" />
        In / Lưu PDF
      </Button>
    </div>
  );
}
