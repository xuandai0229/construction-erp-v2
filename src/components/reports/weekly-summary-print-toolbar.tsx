"use client";

import { useState } from "react";
import { ArrowLeft, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InAppPdfViewer } from "@/components/ui/in-app-pdf-viewer";

interface WeeklySummaryPrintToolbarProps {
  weekStart: string;
  isDownloadingDocx?: boolean;
}

export function WeeklySummaryPrintToolbar({
  weekStart,
}: WeeklySummaryPrintToolbarProps) {
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  const handleDownloadDocx = () => {
    window.location.href = `/api/reports/weekly-summary/export?weekStart=${weekStart}`;
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = `/reports/field?tab=weekly&weekStart=${weekStart}`;
    }
  };

  const pdfUrl = `/api/reports/weekly-summary/export-pdf?weekStart=${weekStart}`;

  return (
    <>
      <div className="no-print sticky top-0 z-50 mb-6 border-b border-slate-200 bg-white/95 p-4 shadow-sm backdrop-blur-xs">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="gap-1.5 text-slate-700 hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại
            </Button>
            <div>
              <h1 className="text-base font-bold text-slate-900">Xem trước bản in / PDF</h1>
              <p className="text-xs text-slate-500">Tổng hợp báo cáo tuần hiện trường</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadDocx}
              className="gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <FileText className="h-4 w-4 text-blue-600" />
              Tải file Word (.docx)
            </Button>

            <Button
              size="sm"
              onClick={() => setShowPdfViewer(true)}
              className="gap-1.5 bg-rose-600 font-semibold text-white shadow-sm hover:bg-rose-700"
            >
              <Eye className="h-4 w-4" />
              Xem / In PDF
            </Button>
          </div>
        </div>
      </div>

      <InAppPdfViewer
        isOpen={showPdfViewer}
        onClose={() => setShowPdfViewer(false)}
        pdfUrl={pdfUrl}
        title="Tổng hợp Báo cáo tuần hiện trường (PDF)"
        fileName={`Tong-hop-bao-cao-tuan_${weekStart}.pdf`}
      />
    </>
  );
}
