"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer, X, Loader2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SafetyDocumentPreviewToolbarProps {
  documentCode?: string;
  backHref: string;
  wordUrl: string;
  pdfUrl?: string;
}

async function printPdfBlob(blob: Blob): Promise<void> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");

    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "1px";
    iframe.style.height = "1px";
    iframe.style.opacity = "0";
    iframe.style.border = "0";
    iframe.style.pointerEvents = "none";
    iframe.src = objectUrl;

    document.body.appendChild(iframe);

    const cleanup = () => {
      window.setTimeout(() => {
        try {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          URL.revokeObjectURL(objectUrl);
        } catch {
          // ignore cleanup errors
        }
        resolve();
      }, 1000);
    };

    iframe.onload = () => {
      window.setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.error("[SafetyToolbar] Iframe PDF print error:", err);
        } finally {
          cleanup();
        }
      }, 400);
    };
  });
}

export function SafetyDocumentPreviewToolbar({
  documentCode,
  backHref,
  wordUrl,
  pdfUrl,
}: SafetyDocumentPreviewToolbarProps) {
  const [downloadingWord, setDownloadingWord] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [printingPdf, setPrintingPdf] = useState(false);

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
      anchor.download = `Safety-${sanitized}.docx`;
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

  const handleDownloadPdf = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (downloadingPdf || !pdfUrl) return;

    try {
      setDownloadingPdf(true);
      const response = await fetch(pdfUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Không thể tạo tệp PDF.");

      const contentType = response.headers.get("content-type");
      if (contentType && (contentType.includes("text/html") || contentType.includes("application/json"))) {
        throw new Error("Không thể tạo tệp PDF.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      const sanitized = documentCode ? documentCode.replace(/[/\\?%*:|"<>]/g, "_") : "Doc";
      anchor.href = objectUrl;
      anchor.download = `Safety-${sanitized}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      console.error("[SafetyToolbar] Download PDF failed:", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrintPdf = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (printingPdf || !pdfUrl) return;

    try {
      setPrintingPdf(true);
      const response = await fetch(pdfUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Không thể khởi tạo bản in PDF.");

      const contentType = response.headers.get("content-type");
      if (contentType && (contentType.includes("text/html") || contentType.includes("application/json"))) {
        throw new Error("Không thể khởi tạo bản in PDF.");
      }

      const blob = await response.blob();
      await printPdfBlob(blob);
    } catch (err) {
      console.error("[SafetyToolbar] Print PDF failed:", err);
    } finally {
      setPrintingPdf(false);
    }
  };

  return (
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

        {/* Right Action Toolbar */}
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
            <span>{downloadingWord ? "Đang tạo..." : "Tải Word (.docx)"}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={downloadingPdf || !pdfUrl}
            className="h-8 text-xs font-bold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            {downloadingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
            ) : (
              <FileDown className="h-3.5 w-3.5 text-rose-600" />
            )}
            <span>{downloadingPdf ? "Đang tạo..." : "Tải PDF"}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handlePrintPdf}
            disabled={printingPdf || !pdfUrl}
            className="h-8 text-xs font-bold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg"
          >
            {printingPdf ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
            ) : (
              <Printer className="h-3.5 w-3.5 text-emerald-600" />
            )}
            <span>{printingPdf ? "Đang xử lý..." : "In"}</span>
          </Button>

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
  );
}
