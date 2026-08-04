"use client";

import React, { useState } from "react";
import { Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { printDocument } from "@/lib/document-export/document-export-client";
import { useToast } from "@/components/ui/toast-context";

export function SafetyPrintButton({
  pdfUrl,
  className = "",
}: {
  planId?: string;
  reportId?: string;
  pdfUrl?: string;
  className?: string;
}) {
  const [isPrinting, setIsPrinting] = useState(false);
  const toast = useToast();

  const executePrint = async () => {
    if (!pdfUrl || isPrinting) return;

    setIsPrinting(true);

    try {
      await printDocument({
        url: pdfUrl,
        title: "In Báo Cáo An Toàn",
        preferredMode: "same-tab",
      });
    } catch (err: any) {
      if (err?.code !== "ABORTED") {
        toast.error(err?.message || "Không thể tải PDF để in.");
      }
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={(e) => {
        e.preventDefault();
        executePrint();
      }}
      disabled={isPrinting || !pdfUrl}
      className={`h-8 text-xs font-bold rounded-lg gap-1.5 border-slate-300 hover:bg-slate-50 text-slate-700 ${className}`}
    >
      {isPrinting ? (
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
      ) : (
        <Printer className="h-4 w-4 text-emerald-600" />
      )}
      <span>{isPrinting ? "Đang xử lý..." : "In PDF"}</span>
    </Button>
  );
}
