"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileText, Loader2, Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InAppPdfViewer } from "@/components/ui/in-app-pdf-viewer";

export interface SafetyDocumentPreviewToolbarProps {
  documentCode?: string;
  backHref: string;
  wordUrl: string;
  pdfUrl?: string;
}

export function SafetyDocumentPreviewToolbar({
  documentCode,
  backHref,
  wordUrl,
  pdfUrl,
}: SafetyDocumentPreviewToolbarProps) {
  const [downloadingWord, setDownloadingWord] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  const handleDownloadWord = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (downloadingWord) return;

    try {
      setDownloadingWord(true);
      const response = await fetch(wordUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Không thể tạo tệp Word.");

      const contentType = response.headers.get("content-type");
      if (contentType && (contentType.includes("text/html") || contentType.includes("application/json"))) {
        throw new Error("Không thể tạo tệp Word.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      const sanitized = documentCode ? documentCode.replace(/[/\\?%*:|"<>]/g, "_") : "Doc";
      anchor.href = objectUrl;
      anchor.download = `Bao-cao-ATLĐ_${sanitized}.docx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      console.error("[SafetyToolbar] Download Word failed:", err);
    } finally {
      setDownloadingWord(false);
    }
  };

  return (
    <>
      <div className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 shadow-xs print:hidden" data-preview-toolbar="true">
        <div className="max-w-[297mm] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left Navigation & Metadata */}
          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại chỉnh sửa</span>
            </Link>

            {documentCode && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {documentCode}
              </span>
            )}
          </div>

          {/* Standardized Right Action Toolbar: [Tải Word] | [Xem / In PDF] | [Đóng] */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadWord}
              disabled={downloadingWord}
              className="h-8 text-xs font-bold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              {downloadingWord ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              ) : (
                <Download className="h-3.5 w-3.5 text-blue-600" />
              )}
              <span>{downloadingWord ? "Đang tạo Word..." : "Tải Word (.docx)"}</span>
            </Button>

            {pdfUrl && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowPdfViewer(true)}
                className="h-8 text-xs font-bold gap-1.5 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg"
              >
                <Eye className="h-3.5 w-3.5 text-rose-600" />
                <span>Xem / In PDF</span>
              </Button>
            )}

            <Link href={backHref}>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 rounded-lg"
                title="Đóng"
              >
                <X className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {pdfUrl && (
        <InAppPdfViewer
          isOpen={showPdfViewer}
          onClose={() => setShowPdfViewer(false)}
          pdfUrl={pdfUrl}
          title={`Báo cáo An toàn Lao động - ${documentCode || ""}`}
          fileName={`Bao-cao-ATLĐ_${documentCode || "doc"}.pdf`}
        />
      )}
    </>
  );
}
