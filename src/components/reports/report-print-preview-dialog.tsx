"use client";

import React, { useEffect } from "react";
import { X, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportPrintTemplate } from "./report-print-template";
import type { FieldReport } from "./types";

interface ReportPrintPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  report: FieldReport | null;
}

export function ReportPrintPreviewDialog({
  isOpen,
  onClose,
  report
}: ReportPrintPreviewDialogProps) {
  
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

  if (!isOpen || !report) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-slate-200 w-full h-full sm:h-[95vh] sm:rounded-xl shadow-2xl flex flex-col relative w-full max-w-5xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}
      >
        {/* Toolbar (print-hidden) */}
        <div className="print-hidden bg-white px-4 sm:px-6 py-3 border-b border-slate-300 flex items-center justify-between z-20 shrink-0 shadow-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800">Xem bản in báo cáo</h2>
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-semibold">
              {report.reportNo}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handlePrint}
              className="h-9 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Printer className="w-4 h-4" />
              In / Lưu PDF
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="h-9 gap-1.5"
            >
              <X className="w-4 h-4" />
              Đóng
            </Button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="print-hidden-scroll flex-1 overflow-y-auto custom-scrollbar p-2 sm:p-6 pb-20">
          <div className="mx-auto shadow-lg bg-white rounded-sm border border-slate-300 print-wrapper overflow-hidden">
            <ReportPrintTemplate report={report} />
          </div>
        </div>

        {/* Specialized CSS for this dialog's printing behavior */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * {
              visibility: hidden;
            }
            /* Override Next.js layout hiding */
            #__next, .app-layout { 
              visibility: visible !important;
              position: static !important;
            }
            .fixed.inset-0.z-\\[100\\] {
              position: absolute;
              left: 0;
              top: 0;
              margin: 0;
              padding: 0;
              visibility: visible !important;
              width: 100% !important;
              background: transparent !important;
              box-shadow: none !important;
            }
            .print-hidden {
              display: none !important;
            }
            .print-wrapper {
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
            }
            .print-wrapper * {
              visibility: visible;
            }
            .print-area {
              visibility: visible !important;
            }
            .print-hidden-scroll {
              overflow: visible !important;
              height: auto !important;
              max-height: none !important;
              padding: 0 !important;
            }
          }
        `}} />
      </div>
    </div>
  );
}
