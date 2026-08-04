"use client";

import React, { useEffect, useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, Download, Printer, X, Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { WeeklyCompanySummary } from "@/lib/reports/weekly-company-summary";
import { printDocument, downloadDocument } from "@/lib/document-export/document-export-client";

function formatDateShortVN(ymd: string): string {
  if (!ymd) return "";
  const parts = ymd.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return ymd;
}

function formatDateFullVN(isoString: string): string {
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `Hà Nội, ngày ${day} tháng ${month} năm ${year}`;
  } catch {
    return "Hà Nội, ngày ... tháng ... năm ...";
  }
}

interface WeeklySummaryInlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: WeeklyCompanySummary;
}

export function WeeklySummaryInlineModal({
  isOpen,
  onClose,
  data,
}: WeeklySummaryInlineModalProps) {
  const { week, generatedAt, projects } = data;
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Esc key listener & body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen, onClose]);

  const [isPrinting, setIsPrinting] = useState(false);

  const handleDownloadDocx = useCallback(async () => {
    const url = `/api/reports/weekly-summary/export?weekStart=${week.weekStartDate}`;
    const filename = `Tong-hop-bao-cao-tuan-${week.weekNumber}.docx`;
    try {
      await downloadDocument({ url, filename });
    } catch (err: any) {
      alert(err?.message || "Không thể tải file Word.");
    }
  }, [week.weekStartDate, week.weekNumber]);

  const handleDownloadPdf = useCallback(async () => {
    const url = `/api/reports/weekly-summary/export-pdf?weekStart=${week.weekStartDate}`;
    const filename = `Tong-hop-bao-cao-tuan-${week.weekNumber}.pdf`;
    try {
      await downloadDocument({ url, filename });
    } catch (err: any) {
      alert(err?.message || "Không thể tải file PDF.");
    }
  }, [week.weekStartDate, week.weekNumber]);

  const executePrint = useCallback(async () => {
    if (isPrinting) return;
    setIsPrinting(true);

    try {
      const url = `/api/reports/weekly-summary/export-pdf?weekStart=${week.weekStartDate}&inline=1`;
      await printDocument({
        url,
        title: `Tổng hợp báo cáo tuần ${week.weekNumber}`,
        preferredMode: "same-tab",
      });
    } catch (err: any) {
      if (err?.code !== "ABORTED") {
        alert(err?.message || "Không thể in PDF tổng hợp.");
      }
    } finally {
      setIsPrinting(false);
    }
  }, [week.weekStartDate, week.weekNumber, isPrinting]);

  if (!isOpen) return null;

  // Filter projects with support needed for Section 3
  const projectsNeedingSupport = projects.filter((p) => p.hasReport && !!p.supportNeeded);

  const modalContent = (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-xs transition-opacity">
      {/* Top Fixed Toolbar */}
      <div className="flex items-center justify-between border-b border-slate-700 bg-slate-900 px-6 py-3 text-white shadow-md shrink-0">
        <div className="flex items-center gap-3">
          <Building2 className="h-5 w-5 text-blue-400" />
          <div>
            <h2 className="text-base font-bold text-slate-100">Bản xem trước văn bản</h2>
            <p className="text-xs text-slate-400">
              Tổng hợp báo cáo tuần · Tuần {week.weekNumber} ({formatDateShortVN(week.weekStartDate)} – {formatDateShortVN(week.weekEndDate)})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadDocx}
            className="gap-1.5 border-emerald-500 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 font-semibold"
          >
            <FileText className="h-4 w-4" />
            Tải Word (.docx)
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            className="gap-1.5 border-blue-500 bg-blue-950/40 text-blue-300 hover:bg-blue-900/60 font-semibold"
          >
            <Download className="h-4 w-4" />
            Tải PDF
          </Button>

          <Button
            size="sm"
            onClick={executePrint}
            disabled={isPrinting}
            className="gap-1.5 bg-blue-600 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {isPrinting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            <span>{isPrinting ? "Đang chuẩn bị..." : "In"}</span>
          </Button>

          <div className="h-5 w-[1px] bg-slate-700 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gap-1 text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
            Đóng (Esc)
          </Button>
        </div>
      </div>

      {/* Main Scrollable Document Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-800/60 flex justify-center">
        {/* Hidden printing iframe */}
        <iframe ref={printIframeRef} className="hidden" title="print-frame" />

        {/* Paper A4 Sheet */}
        <div
          className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black font-serif text-[13px] leading-relaxed p-8 sm:p-12 shadow-2xl rounded-xs my-auto"
          style={{
            fontFamily: '"Times New Roman", Times, serif',
            textRendering: "optimizeLegibility",
          }}
        >
          {/* Header Hành Chính */}
          <div className="flex justify-between items-start mb-6 text-[12.5px]">
            <div className="text-center font-bold uppercase leading-tight">
              <p>CÔNG TY CỔ PHẦN XÂY DỰNG</p>
              <p>VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI</p>
              <div className="w-24 h-[1px] bg-black mx-auto my-1"></div>
              <p className="font-normal text-[11px] normal-case mt-1">
                Số: ................
              </p>
            </div>
            <div className="text-center font-bold leading-tight">
              <p className="uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
              <p className="font-bold normal-case">Độc lập - Tự do - Hạnh phúc</p>
              <div className="w-32 h-[1px] bg-black mx-auto my-1"></div>
              <p className="font-normal italic text-[11.5px] mt-1 normal-case">
                {formatDateFullVN(generatedAt)}
              </p>
            </div>
          </div>

          {/* Title Block */}
          <div className="text-center mb-6">
            <h1 className="text-[18px] font-bold uppercase tracking-wide mb-1">
              TỔNG HỢP BÁO CÁO TUẦN
            </h1>
            <p className="font-semibold text-[13px]">
              Tuần {week.weekNumber} – Từ ngày {formatDateShortVN(week.weekStartDate)}{" "}
              đến ngày {formatDateShortVN(week.weekEndDate)}
            </p>
          </div>

          {/* Section 1: Bảng tổng hợp công trình */}
          <div className="mb-6">
            <p className="font-bold text-[14px] mb-2 uppercase">
              1. Bảng tổng hợp kết quả các công trình
            </p>
            <table className="w-full border border-black text-[11.5px] border-collapse">
              <thead>
                <tr className="bg-gray-100 font-bold text-center">
                  <th className="border border-black p-1.5 w-[32px]">STT</th>
                  <th className="border border-black p-1.5 text-left w-[160px]">Công trình</th>
                  <th className="border border-black p-1.5 text-left">Kết quả chính trong tuần</th>
                  <th className="border border-black p-1.5 text-left w-[130px]">Công việc chưa xong / vướng mắc</th>
                  <th className="border border-black p-1.5 text-left w-[130px]">Kế hoạch tuần tiếp theo</th>
                  <th className="border border-black p-1.5 text-left w-[130px]">Nội dung cần xử lý</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, idx) => (
                  <tr key={p.id} className="align-top">
                    <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                    <td className="border border-black p-1.5">
                      <div className="font-bold">{p.name}</div>
                      <div className="text-[10px] text-gray-600">Mã: {p.code}</div>
                      {p.reporter && (
                        <div className="text-[10px] italic text-gray-600">Phụ trách: {p.reporter}</div>
                      )}
                    </td>
                    <td className="border border-black p-1.5">
                      {p.hasReport ? p.result : <span className="italic text-gray-500">Chưa có báo cáo tuần.</span>}
                    </td>
                    <td className="border border-black p-1.5">
                      {p.hasReport ? p.issues || "Không có" : "-"}
                    </td>
                    <td className="border border-black p-1.5">
                      {p.hasReport ? p.nextWeekPlan || "Chưa cập nhật" : "-"}
                    </td>
                    <td className="border border-black p-1.5 font-semibold">
                      {p.hasReport ? p.supportNeeded || "Không có" : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Section 2: Chi tiết từng công trình */}
          <div className="mb-6">
            <p className="font-bold text-[14px] mb-3 uppercase">
              2. Nội dung chi tiết từng công trình
            </p>

            {projects.map((p, idx) => (
              <div key={p.id} className="mb-5 pb-3 border-b border-gray-200">
                <h3 className="font-bold text-[13.5px] mb-1">
                  2.{idx + 1}. {p.name} ({p.code})
                </h3>
                {p.reporter && (
                  <p className="text-[11.5px] italic mb-1 text-gray-700">
                    Người báo cáo phụ trách: {p.reporter}
                  </p>
                )}

                {!p.hasReport ? (
                  <p className="italic text-gray-600 pl-3">
                    Chưa có báo cáo tuần.
                  </p>
                ) : (
                  <div className="space-y-1 pl-3 text-[12px]">
                    <div>
                      <span className="font-bold">• Kết quả thực hiện trong tuần: </span>
                      <span>{p.result}</span>
                    </div>

                    {p.issues && (
                      <div>
                        <span className="font-bold text-red-900">• Vướng mắc / Khó khăn: </span>
                        <span>{p.issues}</span>
                      </div>
                    )}

                    {p.nextWeekPlan && (
                      <div>
                        <span className="font-bold">• Kế hoạch tuần tiếp theo: </span>
                        <span>{p.nextWeekPlan}</span>
                      </div>
                    )}

                    {p.quality && (
                      <div>
                        <span className="font-bold">• Chất lượng & An toàn: </span>
                        <span>{p.quality}</span>
                      </div>
                    )}

                    {(p.materials || p.labor) && (
                      <div>
                        <span className="font-bold">• Nhân lực & Vật tư: </span>
                        <span>
                          {[p.materials && `Vật tư: ${p.materials}`, p.labor && `Nhân lực: ${p.labor}`]
                            .filter(Boolean)
                            .join(" | ")}
                        </span>
                      </div>
                    )}

                    {p.supportNeeded && (
                      <div className="bg-amber-50 p-2 border-l-2 border-amber-500 my-1">
                        <span className="font-bold text-amber-900">• Nội dung cần xử lý: </span>
                        <span className="font-semibold text-amber-950">{p.supportNeeded}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Section 3: Các vấn đề cần xử lý */}
          {projectsNeedingSupport.length > 0 && (
            <div className="mb-6">
              <p className="font-bold text-[14px] mb-2 uppercase">
                3. Tổng hợp các nội dung cần Ban Giám đốc & Phòng ban xử lý
              </p>
              <table className="w-full border border-black text-[12px] border-collapse">
                <thead>
                  <tr className="bg-gray-100 font-bold text-center">
                    <th className="border border-black p-1.5 w-[32px]">STT</th>
                    <th className="border border-black p-1.5 w-[160px] text-left">Công trình</th>
                    <th className="border border-black p-1.5 text-left">Nội dung đề xuất / cần xử lý</th>
                  </tr>
                </thead>
                <tbody>
                  {projectsNeedingSupport.map((p, idx) => (
                    <tr key={p.id}>
                      <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                      <td className="border border-black p-1.5 font-bold">{p.name}</td>
                      <td className="border border-black p-1.5 font-semibold text-amber-950">
                        {p.supportNeeded}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* NO SIGNATURES BLOCK AT ALL - Document ends cleanly */}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
