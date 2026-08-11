"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer, X, Loader2, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SafetyDocumentPreviewShellProps {
  documentCode?: string;
  backHref: string;
  wordExportUrl: string;
  pdfExportUrl?: string;
  documentTitle?: string;
  children: React.ReactNode;
}

/**
 * Clean iframe PDF printing helper.
 * Appends a hidden <iframe> to document.body, loads the PDF blob URL, and triggers print.
 * Guaranteed NOT to print the ERP AppShell, toolbar, or navigation chrome.
 */
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
          console.error("[SafetyPreview] Iframe PDF print error:", err);
        } finally {
          cleanup();
        }
      }, 400);
    };
  });
}

export function SafetyDocumentPreviewShell({
  documentCode,
  backHref,
  wordExportUrl,
  pdfExportUrl,
  documentTitle,
  children,
}: SafetyDocumentPreviewShellProps) {
  const [downloadingWord, setDownloadingWord] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [printingPdf, setPrintingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isAssessment = documentTitle?.toLowerCase().includes("báo cáo") ?? false;
  const docPrefix = isAssessment
    ? "Bao-cao-tu-danh-gia-ATLD-PCCC-VSMT"
    : "Ke-hoach-kiem-tra-ATLD-PCCC-VSMT";

  const handleDownloadWord = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (downloadingWord) return;

    try {
      setDownloadingWord(true);
      setErrorMessage(null);

      const response = await fetch(wordExportUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        throw new Error(errorJson?.error || `Không thể tạo tệp Word. (Mã lỗi: ${response.status})`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && (contentType.includes("text/html") || contentType.includes("application/json"))) {
        throw new Error("Không thể tạo tệp Word. Vui lòng thử lại.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      const sanitizedCode = documentCode ? documentCode.replace(/[/\\?%*:|"<>]/g, "_") : "Doc";
      const filename = `${docPrefix}-${sanitizedCode}.docx`;

      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);
    } catch (err: any) {
      console.error("[SafetyPreview] Download Word error:", err);
      setErrorMessage(err?.message || "Lỗi khi tải tệp Word. Vui lòng thử lại.");
    } finally {
      setDownloadingWord(false);
    }
  };

  const handleDownloadPdf = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (downloadingPdf || !pdfExportUrl) return;

    try {
      setDownloadingPdf(true);
      setErrorMessage(null);

      const response = await fetch(pdfExportUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        throw new Error(errorJson?.error || `Không thể tạo tệp PDF. (Mã lỗi: ${response.status})`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && (contentType.includes("text/html") || contentType.includes("application/json"))) {
        throw new Error("Không thể tạo tệp PDF. Vui lòng thử lại.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      const sanitizedCode = documentCode ? documentCode.replace(/[/\\?%*:|"<>]/g, "_") : "Doc";
      const filename = `${docPrefix}-${sanitizedCode}.pdf`;

      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);
    } catch (err: any) {
      console.error("[SafetyPreview] Download PDF error:", err);
      setErrorMessage(err?.message || "Không thể tạo tệp PDF. Vui lòng thử lại.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrintPdf = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (printingPdf || !pdfExportUrl) return;

    try {
      setPrintingPdf(true);
      setErrorMessage(null);

      const response = await fetch(pdfExportUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        throw new Error(errorJson?.error || `Không thể khởi tạo bản in PDF. (Mã lỗi: ${response.status})`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && (contentType.includes("text/html") || contentType.includes("application/json"))) {
        throw new Error("Không thể khởi tạo bản in PDF. Vui lòng thử lại.");
      }

      const blob = await response.blob();
      await printPdfBlob(blob);
    } catch (err: any) {
      console.error("[SafetyPreview] Print PDF error:", err);
      setErrorMessage(err?.message || "Không thể khởi tạo bản in. Vui lòng thử lại.");
    } finally {
      setPrintingPdf(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-200/90 font-sans print:bg-white print:p-0 flex flex-col items-center pb-12">
      {/* Unified Sticky Preview Toolbar */}
      <header
        data-preview-toolbar="true"
        className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 shadow-xs print:hidden"
      >
        <div className="max-w-[297mm] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left Navigation & Metadata */}
          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              replace
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

            {documentTitle && (
              <span className="hidden md:inline font-medium text-slate-500 truncate max-w-xs">
                {documentTitle}
              </span>
            )}
          </div>

          {/* Right Action Toolbar: 3 DISTINCT ACTIONS */}
          <div className="flex items-center gap-2">
            {errorMessage && (
              <span className="text-xs font-semibold text-rose-600 mr-2 animate-pulse">
                {errorMessage}
              </span>
            )}

            {/* Action 1: Download Word */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadWord}
              disabled={downloadingWord}
              className="h-8 text-xs font-bold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg"
              title="Tải tệp Word (.docx) về máy"
            >
              {downloadingWord ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              ) : (
                <Download className="h-3.5 w-3.5 text-blue-600" />
              )}
              <span>{downloadingWord ? "Đang tạo..." : "Tải Word (.docx)"}</span>
            </Button>

            {/* Action 2: Download PDF */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || !pdfExportUrl}
              className="h-8 text-xs font-bold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg"
              title="Tải tệp PDF chuẩn A4 về máy"
            >
              {downloadingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
              ) : (
                <FileDown className="h-3.5 w-3.5 text-rose-600" />
              )}
              <span>{downloadingPdf ? "Đang tạo..." : "Tải PDF"}</span>
            </Button>

            {/* Action 3: Print Clean PDF */}
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrintPdf}
              disabled={printingPdf || !pdfExportUrl}
              className="h-8 text-xs font-bold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg"
              title="Mở hộp thoại In tệp PDF sạch"
            >
              {printingPdf ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
              ) : (
                <Printer className="h-3.5 w-3.5 text-emerald-600" />
              )}
              <span>{printingPdf ? "Đang xử lý..." : "In"}</span>
            </Button>

            {/* Close Preview */}
            <Link href={backHref} replace>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 rounded-lg"
                title="Đóng xem trước"
              >
                <X className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main A4 Document Preview Canvas */}
      <main
        data-print-document="true"
        className="w-full flex justify-center py-6 print:p-0 print:m-0 print:w-full print:block"
      >
        {children}
      </main>
    </div>
  );
}
