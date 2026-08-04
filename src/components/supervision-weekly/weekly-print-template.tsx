"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Download, Printer, X, Loader2, AlertCircle } from "lucide-react";
import type { SupervisionWeeklyPrintDto } from "@/lib/supervision-weekly/print-types";
import { buildWeeklyDocumentModel, type WeeklyDocumentModel } from "@/lib/supervision-weekly/document-model";
import { formatReportNumber } from "@/lib/supervision-weekly/report-number";
import { printPdfFromUrl } from "@/lib/supervision-weekly/print-pdf-helper";


function ReportHeader({ model, isResult }: { model: WeeklyDocumentModel; isResult: boolean }) {
  return (
    <header className="document-header mb-6">
      <div className="official-header-grid grid gap-4 text-center mb-6" style={{ gridTemplateColumns: "45% 55%" }}>
        <div className="header-col-left">
          <div className="font-bold uppercase tracking-tight text-[13pt] leading-tight">
            {model.metadata.companyName}
          </div>
          {model.metadata.companySubName && (
            <div className="font-bold uppercase tracking-tight text-[13pt] leading-tight">
              {model.metadata.companySubName}
            </div>
          )}
          <div className="mt-2 text-[12pt]">
            {formatReportNumber(model.metadata.reportNumber)}
          </div>
        </div>
        <div className="header-col-right">
          <div className="font-bold uppercase tracking-tight text-[13pt] leading-tight">
            {model.metadata.nationalMottoLine1}
          </div>
          <div className="font-bold text-[12.5pt] leading-tight underline underline-offset-4 decoration-1">
            {model.metadata.nationalMottoLine2}
          </div>
          <div className="mt-2 italic text-[12pt]">
            {model.metadata.documentDateLine}
          </div>
        </div>
      </div>

      <h1 className="document-main-title text-center font-bold text-[16pt] uppercase tracking-wide my-4">
        {model.metadata.title}
      </h1>

      <div className="document-meta-info text-[13pt] leading-relaxed space-y-1 my-4">
        <p>
          <b>Kính gửi:</b> {model.metadata.recipientName || "Ban Giám đốc Công ty"}
        </p>
        <p>
          <b>Chức vụ:</b> {model.metadata.recipientTitle || "Phòng kỹ thuật, Các BCH công trường"}
        </p>
        <p>
          <b>Thời gian báo cáo:</b> {isResult ? model.metadata.currentWeekRange : model.metadata.nextWeekRange}
        </p>
      </div>
    </header>
  );
}

function ScheduleTable({ model, isResult }: { model: WeeklyDocumentModel; isResult: boolean }) {
  const shiftKeys = ["MORNING", "AFTERNOON", "EVENING"] as const;
  const shiftLabels = ["Sáng:", "Chiều:", "Tối:"];

  const hasPopulatedData = model.schedule.some((day) =>
    shiftKeys.some((sk) => day.shifts[sk].length > 0)
  );

  const activeDays = hasPopulatedData
    ? model.schedule.filter((day) => shiftKeys.some((sk) => day.shifts[sk].length > 0))
    : model.schedule;

  return (
    <table className="document-table schedule-table">
      <thead>
        <tr>
          <th style={{ width: "18%" }}>{isResult ? "Thời gian kiểm tra" : "Ngày/thứ"}</th>
          <th style={{ width: "32%" }}>{isResult ? "Công trình và hạng mục kiểm tra" : "Công trình"}</th>
          <th style={{ width: "30%" }}>{isResult ? "Nội dung kiểm tra" : "Phát sinh do chỉ huy công trình đề xuất"}</th>
          <th style={{ width: "20%" }}>{isResult ? "Kết quả" : "Nội dung (có phụ lục kèm theo)"}</th>
        </tr>
      </thead>
      <tbody>
        {activeDays.map((day) => {
          const activeShiftKeys = hasPopulatedData
            ? shiftKeys.filter((sk) => day.shifts[sk].length > 0)
            : shiftKeys;

          let renderedDayLabel = false;

          return activeShiftKeys.map((shiftKey) => {
            const sIdx = shiftKeys.indexOf(shiftKey);
            const shiftRows = day.shifts[shiftKey];
            const rowCount = hasPopulatedData ? shiftRows.length : Math.max(1, shiftRows.length);

            return Array.from({ length: rowCount }).map((_, rIdx) => {
              const rowData = shiftRows[rIdx];
              const isFirstRowOfDay = !renderedDayLabel;
              if (isFirstRowOfDay) renderedDayLabel = true;

              return (
                <tr key={`${day.date}-${shiftKey}-${rIdx}`} className={isFirstRowOfDay ? "day-start-row" : ""}>
                  <td className="time-cell">
                    {rIdx === 0 && (
                      <div>
                        {isFirstRowOfDay && <b>{day.weekdayLabel}:</b>}
                        <div>{shiftLabels[sIdx]}</div>
                      </div>
                    )}
                  </td>
                  <td className="cell-prewrap">{rowData?.sourceText || ""}</td>
                  <td className="cell-prewrap">{rowData?.content || ""}</td>
                  <td className="cell-prewrap">{rowData?.result || ""}</td>
                </tr>
              );
            });
          });
        })}
      </tbody>
    </table>
  );
}

function WritingLines({ count = 3 }: { count?: number }) {
  return (
    <div className="pl-6 space-y-2.5 my-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-full border-b border-dashed border-slate-400 h-[7mm]" />
      ))}
    </div>
  );
}

function FixedRecommendationItem({
  order,
  title,
  content,
  lineCount,
}: {
  order: number;
  title: string;
  content: string;
  lineCount?: number;
}) {
  const isEmpty = !content.trim();
  const defaultLines = title.toLowerCase().includes("ý kiến khác") || order >= 3 ? 4 : 3;

  return (
    <div className="recommendation-item my-3">
      <div className="font-bold text-[13pt] mb-1">
        {order}. {title}
      </div>
      {isEmpty ? (
        <WritingLines count={lineCount ?? defaultLines} />
      ) : (
        <div className="pl-6 cell-prewrap text-[13pt] leading-relaxed">{content}</div>
      )}
    </div>
  );
}

function ResultSections({ model }: { model: WeeklyDocumentModel }) {
  return (
    <>
      <ReportHeader model={model} isResult={true} />

      <section className="document-section my-4">
        <h2 className="section-title">I. Kết quả thực hiện trong tuần</h2>
        <ScheduleTable model={model} isResult={true} />
      </section>

      <section className="document-section my-4">
        <h2 className="section-title">II. Công tác kiểm tra điều kiện chuyển bước thi công</h2>
        <table className="document-table">
          <thead>
            <tr>
              <th style={{ width: "5%" }}>STT</th>
              <th style={{ width: "30%" }}>Công trình và hạng mục kiểm tra</th>
              <th style={{ width: "16%" }}>Khối lượng báo cáo</th>
              <th style={{ width: "16%" }}>Khối lượng kiểm tra</th>
              <th style={{ width: "15%" }}>Chênh lệch</th>
              <th style={{ width: "18%" }}>Tiến độ đề ra</th>
            </tr>
          </thead>
          <tbody>
            {model.transitionRows.length === 0 ? (
              <tr className="empty-row">
                <td className="text-center">1</td>
                <td />
                <td />
                <td />
                <td />
                <td />
              </tr>
            ) : (
              model.transitionRows.map((r, i) => (
                <tr key={r.id}>
                  <td className="text-center">{i + 1}</td>
                  <td className="cell-prewrap">{r.sourceText}</td>
                  <td>{r.reportedText}</td>
                  <td>{r.verifiedText}</td>
                  <td>{r.varianceText}</td>
                  <td className="cell-prewrap">{r.plannedProgress}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="document-section my-4">
        <h2 className="section-title">III. Công tác đo, kiểm tra khối lượng đã thi công</h2>
        <table className="document-table">
          <thead>
            <tr>
              <th style={{ width: "6%" }}>STT</th>
              <th style={{ width: "34%" }}>Công trình, hạng mục</th>
              <th style={{ width: "20%" }}>Khối lượng báo cáo</th>
              <th style={{ width: "20%" }}>Khối lượng kiểm tra</th>
              <th style={{ width: "20%" }}>Chênh lệch so với thực tế</th>
            </tr>
          </thead>
          <tbody>
            {model.quantityRows.length === 0 ? (
              <tr className="empty-row">
                <td className="text-center">1</td>
                <td />
                <td />
                <td />
                <td />
              </tr>
            ) : (
              model.quantityRows.map((r, i) => (
                <tr key={r.id}>
                  <td className="text-center">{i + 1}</td>
                  <td className="cell-prewrap">{r.sourceText}</td>
                  <td>{r.reportedText}</td>
                  <td>{r.verifiedText}</td>
                  <td>{r.varianceText}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="document-section my-4">
        <h2 className="section-title">IV. Tiến độ tổng và thực tế</h2>
        <table className="document-table">
          <thead>
            <tr>
              <th style={{ width: "6%" }}>STT</th>
              <th style={{ width: "28%" }}>Công trình/hạng mục</th>
              <th style={{ width: "20%" }}>Tiến độ theo kế hoạch</th>
              <th style={{ width: "23%" }}>Chậm tiến độ (Tiến độ thực tế đạt được)</th>
              <th style={{ width: "23%" }}>Lý do chậm tiến độ</th>
            </tr>
          </thead>
          <tbody>
            {model.progressRows.length === 0 ? (
              <tr className="empty-row">
                <td className="text-center">1</td>
                <td />
                <td />
                <td />
                <td />
              </tr>
            ) : (
              model.progressRows.map((r, i) => (
                <tr key={r.id}>
                  <td className="text-center">{i + 1}</td>
                  <td className="cell-prewrap">{r.sourceText}</td>
                  <td className="cell-prewrap">{r.plannedProgress}</td>
                  <td className="cell-prewrap">{r.actualProgress}</td>
                  <td className="cell-prewrap">{r.delayReason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <div className="signature-grid grid grid-cols-2 gap-4 mt-8 pt-4">
        <div />
        <div className="signature-block text-center">
          <div className="font-bold uppercase text-[13pt]">NGƯỜI LẬP BÁO CÁO</div>
          <div className="italic text-[12pt] text-slate-700">(Ký, ghi rõ họ tên)</div>
          <div className="signature-space h-20" />
          <div className="font-bold text-[13pt]">{model.metadata.creatorName}</div>
        </div>
      </div>
    </>
  );
}

function NextWeekPlan({ model }: { model: WeeklyDocumentModel }) {
  return (
    <>
      <ReportHeader model={model} isResult={false} />

      <section className="document-section my-4">
        <h2 className="section-title">I. Công việc kiểm tra kỹ thuật dự kiến tuần sau</h2>
        <ScheduleTable model={model} isResult={false} />
      </section>

      <section className="document-section my-4">
        <h2 className="section-title">II. Đánh giá kết quả, xử lý tồn tại của tuần trước</h2>
        {model.followUps.map((r) => (
          <FixedRecommendationItem key={r.key} order={r.order} title={r.title} content={r.content} />
        ))}
      </section>

      <section className="document-section my-4">
        <h2 className="section-title">III. Kiến nghị, đề xuất Ban Giám đốc về kết quả tuần</h2>
        {model.recommendations.map((r) => (
          <FixedRecommendationItem key={r.key} order={r.order} title={r.title} content={r.content} />
        ))}
      </section>

      <div className="signature-grid grid grid-cols-2 gap-4 mt-8 pt-4">
        <div />
        <div className="signature-block text-center">
          <div className="font-bold uppercase text-[13pt]">NGƯỜI LẬP BÁO CÁO</div>
          <div className="italic text-[12pt] text-slate-700">(Ký, ghi rõ họ tên)</div>
          <div className="signature-space h-20" />
          <div className="font-bold text-[13pt]">{model.metadata.creatorName}</div>
        </div>
      </div>
    </>
  );
}

export function WeeklyPrintTemplate({
  dossier,
  activeDocument: initialActiveDocument = "RESULT",
  hidePrintButton = false,
  onDocumentTypeChange,
  companyName,
}: {
  dossier: SupervisionWeeklyPrintDto;
  activeDocument?: "RESULT" | "NEXT_WEEK_PLAN";
  hidePrintButton?: boolean;
  onDocumentTypeChange?: (type: "RESULT" | "NEXT_WEEK_PLAN") => void;
  companyName?: string | null;
}) {
  const router = useRouter();
  const [docType, setDocType] = useState<"RESULT" | "NEXT_WEEK_PLAN">(initialActiveDocument);
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setDocType(initialActiveDocument);
  }, [initialActiveDocument]);

  const handleSelectDocType = (type: "RESULT" | "NEXT_WEEK_PLAN") => {
    setDocType(type);
    setErrorMessage(null);
    onDocumentTypeChange?.(type);
  };

  const model = buildWeeklyDocumentModel(dossier, docType, { companyName });

  const handleExportAction = async (type: "download_pdf" | "download_docx" | "print") => {
    if (exportingType !== null) return;
    setExportingType(type);
    setErrorMessage(null);

    try {
      if (type === "print") {
        const printUrl = `/api/supervision/weekly/${dossier.id}/export?format=pdf&document=${docType}&disposition=inline`;
        await printPdfFromUrl(printUrl);
      } else {
        const format = type === "download_docx" ? "docx" : "pdf";
        const url = `/api/supervision/weekly/${dossier.id}/export?format=${format}&document=${docType}`;
        const res = await fetch(url);
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Tải file thất bại (Mã lỗi ${res.status}).`);
        }

        const blob = await res.blob();
        if (blob.size === 0) {
          throw new Error("Tập tin tải về có kích thước 0 KB. Vui lòng thử lại.");
        }

        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        
        const dispositionHeader = res.headers.get("content-disposition") || "";
        let filename = "";
        const filenameMatch = dispositionHeader.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1] || filenameMatch[2] || "");
        }
        if (!filename) {
          const prefix = docType === "RESULT" ? "Bao-cao-ket-qua-tuan" : "Ke-hoach-kiem-tra-tuan-sau";
          filename = `${prefix}.${format}`;
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (err: any) {
      console.error("[Export Error]", err);
      setErrorMessage(err.message || "Đã xảy ra lỗi khi tạo tập tin. Vui lòng thử lại.");
    } finally {
      setExportingType(null);
    }
  };

  return (
    <div className="w-full max-w-full" data-weekly-preview-version="v2-runtime-fix">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 20mm 15mm 20mm 20mm;
        }

        .document-paper {
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 20mm 15mm 20mm 20mm;
          background: #ffffff;
          color: #0f172a;
          font-family: "Times New Roman", Times, serif;
          font-size: 13pt;
          line-height: 1.35;
          box-sizing: border-box;
        }

        .document-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          margin-top: 4px;
          margin-bottom: 12px;
          font-family: "Times New Roman", Times, serif;
          font-size: 12pt;
        }

        .document-table th,
        .document-table td {
          border: 1px solid #000000;
          padding: 5px 6px;
          vertical-align: top;
          word-break: break-word;
          overflow-wrap: anywhere;
        }

        .document-table th {
          background-color: #f1f5f9;
          font-weight: bold;
          text-align: center;
          vertical-align: middle;
          font-size: 11pt;
          text-transform: uppercase;
        }

        .document-table tbody tr {
          min-height: 8mm;
        }

        .document-table tr.empty-row td {
          height: 10mm;
        }

        .document-table tr.day-start-row td {
          border-top-width: 1.5px;
        }

        .section-title {
          font-family: "Times New Roman", Times, serif;
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
          margin-top: 14px;
          margin-bottom: 6px;
          break-after: avoid;
          page-break-after: avoid;
        }

        .cell-prewrap {
          white-space: pre-wrap;
        }

        .time-cell {
          padding: 6px 8px;
        }

        .dotted-line {
          height: 22px;
          border-bottom: 1px dotted #475569;
        }

        thead {
          display: table-header-group;
        }

        tr {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .signature-grid {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        /* Print media overrides */
        @media print {
          html, body,
          [data-app-shell],
          [data-app-frame],
          [data-app-main],
          [data-app-content],
          [data-app-page] {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
            position: static !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }

          .document-paper {
            width: 100% !important;
            min-height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }

          .preview-toolbar,
          [data-app-sidebar],
          [data-app-header],
          [aria-label="Breadcrumb"] {
            display: none !important;
          }
        }
      `}</style>

      {/* Standardized Document Toolbar */}
      {!hidePrintButton && (
        <div className="preview-toolbar sticky top-4 z-40 mb-6 w-full rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-md print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Toolbar Left */}
            <div className="flex items-center gap-3">
              <Link
                href={`/reports/weekly-inspection/${dossier.id}/edit`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Quay lại chỉnh sửa</span>
              </Link>

              {dossier.reportNumber && (
                <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                  {formatReportNumber(dossier.reportNumber)}
                </span>
              )}

              {/* Document Switcher Tabs */}
              <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600 ml-2">
                <button
                  type="button"
                  onClick={() => handleSelectDocType("RESULT")}
                  className={`rounded-lg px-3 py-1.5 transition-all ${
                    docType === "RESULT"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "hover:text-slate-900"
                  }`}
                >
                  1. Kết quả kiểm tra
                </button>
                <button
                  type="button"
                  onClick={() => handleSelectDocType("NEXT_WEEK_PLAN")}
                  className={`rounded-lg px-3 py-1.5 transition-all ${
                    docType === "NEXT_WEEK_PLAN"
                      ? "bg-white text-blue-700 shadow-sm"
                      : "hover:text-slate-900"
                  }`}
                >
                  2. Kế hoạch tuần sau
                </button>
              </div>
            </div>

            {/* Toolbar Right */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={exportingType !== null}
                onClick={() => handleExportAction("download_docx")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                {exportingType === "download_docx" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-blue-600" />
                )}
                <span>{exportingType === "download_docx" ? "Đang tạo Word..." : "Tải Word (.docx)"}</span>
              </button>

              <button
                type="button"
                disabled={exportingType !== null}
                onClick={() => handleExportAction("download_pdf")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors disabled:opacity-50"
              >
                {exportingType === "download_pdf" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-rose-600" />
                )}
                <span>{exportingType === "download_pdf" ? "Đang tạo PDF..." : "Tải PDF"}</span>
              </button>

              <button
                type="button"
                disabled={exportingType !== null}
                onClick={() => handleExportAction("print")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <Printer className="h-3.5 w-3.5 text-slate-600" />
                <span>In</span>
              </button>

              <button
                type="button"
                onClick={() => router.push("/reports/weekly-inspection")}
                className="inline-flex items-center justify-center rounded-xl p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title="Đóng xem trước"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mt-2 flex items-center justify-between gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-800 border border-rose-200">
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
      )}

      {/* Canvas Area with Centered White A4 Sheet */}
      <div className="canvas-container w-full overflow-x-auto rounded-2xl bg-slate-200/70 p-4 sm:p-8 print:p-0 print:bg-white print:overflow-visible">
        <main className="document-paper shadow-xl border border-slate-300 rounded-sm print:shadow-none print:border-none">
          {docType === "RESULT" ? <ResultSections model={model} /> : <NextWeekPlan model={model} />}
        </main>
      </div>
    </div>
  );
}
