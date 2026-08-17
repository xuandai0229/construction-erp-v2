"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Printer, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportPrintTemplate } from "./report-print-template";
import type { FieldReport } from "./types";

interface ReportPrintPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  report: FieldReport | null;
}

function isUuid(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

export function ReportPrintPreviewDialog({
  isOpen,
  onClose,
  report
}: ReportPrintPreviewDialogProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen || !report || !mounted) return null;

  const handlePrint = () => {
    window.print();
  };

  const displayReportNo = report.reportNo && !isUuid(report.reportNo) ? report.reportNo : null;

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex flex-col bg-slate-200 w-screen h-screen h-[100dvh] overflow-hidden print:static print:h-auto print:w-auto print:overflow-visible"
      role="dialog"
      aria-modal="true"
    >
      {/* Sticky Header Toolbar */}
      <div className="flex h-14 flex-none items-center justify-between border-b border-slate-300 bg-white px-4 sm:px-6 shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Quay lại chỉnh sửa</span>
          </button>

          {displayReportNo ? (
            <span className="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
              {displayReportNo}
            </span>
          ) : (
            <span className="text-xs font-semibold text-slate-600">
              {report.type === "WEEKLY" ? "Xem trước Báo cáo Tuần" : "Xem trước Báo cáo Ngày"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="h-8 text-xs font-bold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            <Printer className="h-4 w-4 text-slate-600" />
            <span>In / Tải PDF</span>
          </Button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            title="Đóng xem trước"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* A4 Workspace Document Canvas */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-8 flex justify-center print:bg-white print:p-0 print:block">
        <div className="bg-white shadow-2xl origin-top mb-8 print:shadow-none print:m-0 print:rounded-none w-[210mm] min-h-[297mm] p-[15mm] sm:p-[20mm] shrink-0">
          <ReportPrintTemplate report={report} />
        </div>
      </div>

      {/* CSS specific for window print */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #__next, main, .app-layout { 
            visibility: visible !important;
            position: static !important;
          }
          .fixed.inset-0.z-\\[9999\\] {
            position: absolute !important;
            inset: 0 !important;
            visibility: visible !important;
            background: white !important;
            height: auto !important;
            width: 100% !important;
            overflow: visible !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print-area, .print-area * {
            visibility: visible !important;
          }
        }
      `}} />
    </div>,
    document.body
  );
}
