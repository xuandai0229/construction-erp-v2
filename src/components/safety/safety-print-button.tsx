"use client";

import React, { useState } from "react";
import { Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SafetyPrintButton({
  pdfUrl,
  className = "",
}: {
  planId?: string;
  reportId?: string;
  pdfUrl?: string;
  className?: string;
}) {
  const [printing, setPrinting] = useState(false);

  const handlePrint = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (printing || !pdfUrl) return;

    try {
      setPrinting(true);
      const response = await fetch(pdfUrl, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Không thể tải PDF để in.");

      const contentType = response.headers.get("content-type");
      if (contentType && (contentType.includes("text/html") || contentType.includes("application/json"))) {
        throw new Error("Không thể tải PDF để in.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const iframe = document.createElement("iframe");

      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "1px";
      iframe.style.height = "1px";
      iframe.style.opacity = "0";
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
            // ignore
          }
          setPrinting(false);
        }, 1000);
      };

      iframe.onload = () => {
        window.setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (err) {
            console.error("Iframe print error:", err);
          } finally {
            cleanup();
          }
        }, 400);
      };
    } catch (err) {
      console.error("[SafetyPrintButton] Error:", err);
      setPrinting(false);
    }
  };

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handlePrint}
      disabled={printing || !pdfUrl}
      className={`h-8 text-xs font-bold rounded-lg gap-1.5 border-slate-300 hover:bg-slate-50 text-slate-700 ${className}`}
    >
      {printing ? (
        <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
      ) : (
        <Printer className="h-4 w-4 text-emerald-600" />
      )}
      <span>{printing ? "Đang xử lý..." : "In PDF"}</span>
    </Button>
  );
}
