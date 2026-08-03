"use client";

import React, { useEffect, useState } from "react";
import { Download, Printer, X, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface InAppPdfViewerProps {
  title?: string;
  pdfUrl: string;
  fileName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InAppPdfViewer({
  title = "Xem trước tài liệu PDF",
  pdfUrl,
  fileName = "document.pdf",
  isOpen,
  onClose,
}: InAppPdfViewerProps) {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      const res = await fetch(pdfUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Không thể tải PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error("[InAppPdfViewer] Download error:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    if (printing) return;
    try {
      setPrinting(true);
      const res = await fetch(pdfUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Không thể tải PDF để in");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "1px";
      iframe.style.height = "1px";
      iframe.style.opacity = "0";
      iframe.style.border = "0";
      iframe.style.pointerEvents = "none";
      iframe.src = url;

      document.body.appendChild(iframe);

      const cleanup = () => {
        setTimeout(() => {
          try {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            URL.revokeObjectURL(url);
          } catch {
            // ignore
          }
        }, 1000);
      };

      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (err) {
            console.error("[InAppPdfViewer] Iframe print error:", err);
          } finally {
            cleanup();
            setPrinting(false);
          }
        }, 300);
      };
    } catch (err) {
      console.error("[InAppPdfViewer] Print error:", err);
      setPrinting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Header Toolbar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-4 text-white shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">{title}</h2>
            <p className="text-[11px] text-slate-400 truncate max-w-md">{fileName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleDownload}
            disabled={downloading}
            className="h-8 gap-1.5 border-slate-700 bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-400" />
            ) : (
              <Download className="h-3.5 w-3.5 text-rose-400" />
            )}
            <span>{downloading ? "Đang tải..." : "Tải xuống"}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={handlePrint}
            disabled={printing}
            className="h-8 gap-1.5 border-slate-700 bg-slate-800 text-xs font-medium text-slate-200 hover:bg-slate-700 hover:text-white"
          >
            {printing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
            ) : (
              <Printer className="h-3.5 w-3.5 text-emerald-400" />
            )}
            <span>{printing ? "Đang xử lý..." : "In"}</span>
          </Button>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg"
            title="Đóng (ESC)"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Body with Embedded PDF */}
      <div className="relative flex-1 bg-slate-900 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 text-slate-300 z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
              <span className="text-xs font-medium">Đang tải bản xem trước PDF...</span>
            </div>
          </div>
        )}

        <iframe
          src={pdfUrl}
          title={title}
          className="h-full w-full border-0 bg-white"
          onLoad={() => setLoading(false)}
        />
      </div>
    </div>
  );
}
