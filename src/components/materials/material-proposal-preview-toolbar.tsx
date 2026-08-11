"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FileSpreadsheet, Printer, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MaterialProposalPreviewToolbarProps {
  proposalId: string;
  proposalNo: string;
  backHref: string;
}

export function MaterialProposalPreviewToolbar({
  proposalId,
  proposalNo,
  backHref,
}: MaterialProposalPreviewToolbarProps) {
  const [downloadingFormat, setDownloadingFormat] = useState<"excel" | "pdf" | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Cleanup print iframe if component unmounts
  useEffect(() => {
    return () => {
      const existingFrame = document.getElementById("material-proposal-print-frame");
      if (existingFrame) {
        existingFrame.remove();
      }
    };
  }, []);

  const handleExport = async (format: "excel" | "pdf") => {
    if (downloadingFormat !== null || isPrinting) return;
    setDownloadingFormat(format);
    setErrorMessage(null);

    try {
      const exportUrl = `/materials/proposals/${proposalId}/export?format=${format}`;
      const res = await fetch(exportUrl, { cache: "no-store", credentials: "include" });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        throw new Error(errorText || `Tải file thất bại (Mã lỗi ${res.status}).`);
      }

      const blob = await res.blob();
      if (blob.size === 0) {
        throw new Error("Tập tin tải về không có dữ liệu. Vui lòng thử lại.");
      }

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;

      const dispositionHeader = res.headers.get("content-disposition") || "";
      let filename = "";
      const filenameMatch = dispositionHeader.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/);
      if (filenameMatch) {
        filename = decodeURIComponent(filenameMatch[1] || filenameMatch[2] || "");
      }
      if (!filename) {
        const ext = format === "excel" ? "xlsx" : "pdf";
        const sanitizedNo = proposalNo.replace(/[^a-zA-Z0-9._-]/g, "-");
        filename = `De-xuat-vat-tu_${sanitizedNo}.${ext}`;
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err: any) {
      console.error("[Proposal Export Error]", err);
      setErrorMessage(err.message || "Đã xảy ra lỗi khi tạo tập tin. Vui lòng thử lại.");
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handlePrint = () => {
    if (isPrinting || downloadingFormat !== null) return;
    setIsPrinting(true);
    setErrorMessage(null);

    // Remove existing frame if any
    const existingFrame = document.getElementById("material-proposal-print-frame");
    if (existingFrame) {
      existingFrame.remove();
    }

    const iframe = document.createElement("iframe");
    iframe.id = "material-proposal-print-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    iframe.src = `/proposal-export/${proposalId}`;

    let isHandled = false;

    const cleanup = () => {
      setIsPrinting(false);
      const frameToClean = document.getElementById("material-proposal-print-frame");
      if (frameToClean && frameToClean.parentNode) {
        frameToClean.parentNode.removeChild(frameToClean);
      }
    };

    const timeoutId = setTimeout(() => {
      if (!isHandled) {
        isHandled = true;
        cleanup();
        setErrorMessage("Không thể chuẩn bị bản in. Vui lòng thử lại.");
      }
    }, 10000);

    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        if (!win) throw new Error("Could not access iframe window");

        setTimeout(() => {
          if (isHandled) return;
          isHandled = true;
          clearTimeout(timeoutId);

          win.focus();
          win.print();

          // Reset button and cleanup after print dialog opens
          setTimeout(() => {
            cleanup();
          }, 1000);
        }, 300);
      } catch (err) {
        console.error("[Material Proposal Print Error]", err);
        if (!isHandled) {
          isHandled = true;
          clearTimeout(timeoutId);
          cleanup();
          setErrorMessage("Không thể chuẩn bị bản in. Vui lòng thử lại.");
        }
      }
    };

    iframe.onerror = () => {
      if (!isHandled) {
        isHandled = true;
        clearTimeout(timeoutId);
        cleanup();
        setErrorMessage("Không thể chuẩn bị bản in. Vui lòng thử lại.");
      }
    };

    document.body.appendChild(iframe);
  };

  return (
    <div
      className="sticky top-4 z-30 mb-5 w-full rounded-xl border border-slate-200/80 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur-md print:hidden"
      data-preview-toolbar="true"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Navigation & Header Left */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            aria-label="Quay lại chỉnh sửa"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
            <span>Quay lại chỉnh sửa</span>
          </Link>

          <span className="hidden sm:inline-block h-4 w-px bg-slate-200" />

          <h1 className="font-semibold text-slate-800 text-sm sm:text-base tracking-normal">
            Xem trước đề xuất vật tư
          </h1>

          {proposalNo && (
            <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200/80">
              Mã: {proposalNo}
            </span>
          )}
        </div>

        {/* Action Export Buttons Right */}
        <div className="flex items-center gap-2">
          {/* Tải Excel */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleExport("excel")}
            disabled={downloadingFormat !== null || isPrinting}
            aria-label="Tải tệp Excel"
            className="h-8.5 px-3 text-xs font-semibold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs gap-1.5 transition-colors"
          >
            {downloadingFormat === "excel" ? (
              <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            )}
            <span>{downloadingFormat === "excel" ? "Đang tạo..." : "Tải Excel"}</span>
          </Button>

          {/* Tải PDF */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handleExport("pdf")}
            disabled={downloadingFormat !== null || isPrinting}
            aria-label="Tải tệp PDF"
            className="h-8.5 px-3 text-xs font-semibold border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-lg shadow-2xs gap-1.5 transition-colors"
          >
            {downloadingFormat === "pdf" ? (
              <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
            ) : (
              <Download className="h-4 w-4 text-rose-600" />
            )}
            <span>{downloadingFormat === "pdf" ? "Đang tạo..." : "Tải PDF"}</span>
          </Button>

          {/* In */}
          <Button
            type="button"
            size="sm"
            variant="default"
            onClick={handlePrint}
            disabled={downloadingFormat !== null || isPrinting}
            aria-label="In đề xuất vật tư"
            className="h-8.5 px-3.5 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg shadow-2xs gap-1.5 transition-colors disabled:opacity-50"
          >
            {isPrinting ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Printer className="h-4 w-4 text-white" />
            )}
            <span>{isPrinting ? "Đang chuẩn bị..." : "In"}</span>
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mt-2.5 flex items-center justify-between gap-2 rounded-lg bg-rose-50 p-2.5 text-xs text-rose-800 border border-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900 font-bold"
          >
            Đóng
          </button>
        </div>
      )}
    </div>
  );
}
