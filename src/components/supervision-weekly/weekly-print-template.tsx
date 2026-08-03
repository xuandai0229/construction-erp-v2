"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, FileText, Loader2 } from "lucide-react";
import type { SupervisionWeeklyPrintDto } from "@/lib/supervision-weekly/print-types";
import { buildWeeklyDocumentModel, type WeeklyDocumentModel } from "@/lib/supervision-weekly/document-model";
import { formatReportNumber } from "@/lib/supervision-weekly/report-number";
import { buildSupervisionExportFilename } from "@/lib/supervision-weekly/export-filename";
import { InAppPdfViewer } from "@/components/ui/in-app-pdf-viewer";

function ReportHeader({ model }: { model: WeeklyDocumentModel }) {
  return (
    <>
      <div className="official-header">
        <div>
          <b>
            {model.metadata.companyName}
            <br />
            {model.metadata.companySubName}
          </b>
          <br />
          {formatReportNumber(model.metadata.reportNumber)}
        </div>
        <div>
          <b>{model.metadata.nationalMottoLine1}</b>
          <br />
          <u>{model.metadata.nationalMottoLine2}</u>
          <br />
          {model.metadata.documentDateLine}
        </div>
      </div>
      <h1>{model.metadata.title}</h1>
      <div className="common-info">
        <p>
          <b>Kính gửi:</b> {model.metadata.recipientName}
        </p>
        <p>
          <b>Chức vụ:</b> {model.metadata.recipientTitle}
        </p>
        <p>
          <b>Thời gian báo cáo:</b> Từ ngày {model.metadata.weekStart} đến ngày {model.metadata.weekEnd}
        </p>
      </div>
    </>
  );
}

function ScheduleTable({ model, isResult }: { model: WeeklyDocumentModel; isResult: boolean }) {
  const shiftKeys = ["MORNING", "AFTERNOON", "EVENING"] as const;
  const shiftLabels = ["Sáng:", "Chiều:", "Tối:"];

  // Check if report has any populated data rows
  const hasPopulatedData = model.schedule.some((day) =>
    shiftKeys.some((sk) => day.shifts[sk].length > 0)
  );

  // If populated, render only days/shifts that contain data. If blank form, render full template.
  const activeDays = hasPopulatedData
    ? model.schedule.filter((day) => shiftKeys.some((sk) => day.shifts[sk].length > 0))
    : model.schedule;

  return (
    <table className="schedule-table">
      <thead>
        <tr className="schedule-header">
          <th className="time-col">{isResult ? "Thời gian kiểm tra" : "Ngày/thứ"}</th>
          <th className="source-col">{isResult ? "Công trình và hạng mục kiểm tra" : "Công trình"}</th>
          <th className="detail-col">{isResult ? "Nội dung kiểm tra" : "Phát sinh do chỉ huy công trình đề xuất"}</th>
          <th className="result-col">{isResult ? "Kết quả" : "Nội dung (có phụ lục kèm theo)"}</th>
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
                <tr
                  key={`${day.date}-${shiftKey}-${rIdx}`}
                  className={`${isFirstRowOfDay ? "day-start" : ""} ${!rowData ? "empty-row" : ""}`}
                >
                  <td className="time-cell">
                    {rIdx === 0 && (
                      <div>
                        {isFirstRowOfDay && <b>{day.weekdayLabel}:</b>}
                        <div>{shiftLabels[sIdx]}</div>
                      </div>
                    )}
                  </td>
                  <td className="multi-line">{rowData?.sourceText || ""}</td>
                  <td className="multi-line">{rowData?.content || ""}</td>
                  <td className="multi-line">{rowData?.result || ""}</td>
                </tr>
              );
            });
          });
        })}
      </tbody>
    </table>
  );
}

function FixedRecommendationItem({
  order,
  title,
  content,
}: {
  order: number;
  title: string;
  content: string;
}) {
  const isEmpty = !content.trim();

  return (
    <div className="recommendation-item">
      <div className="recommendation-heading">
        <span className="font-semibold">{order}.</span>
        <span className="font-semibold">{title}</span>
      </div>
      {isEmpty ? (
        <div className="recommendation-empty-lines">
          <div className="dotted-line" />
          <div className="dotted-line" />
          <div className="dotted-line" />
        </div>
      ) : (
        <div className="recommendation-content">{content}</div>
      )}
    </div>
  );
}

function ResultSections({ model }: { model: WeeklyDocumentModel }) {
  return (
    <>
      <ReportHeader model={model} />

      <section className="report-section">
        <h2 className="document-section-heading">I. Kết quả thực hiện trong tuần</h2>
        <ScheduleTable model={model} isResult />
      </section>

      <section className="report-section">
        <h2 className="document-section-heading">II. Công tác kiểm tra điều kiện chuyển bước thi công</h2>
        <table>
          <thead>
            <tr>
              <th className="number-col">STT</th>
              <th className="source-wide">Công trình và hạng mục kiểm tra</th>
              <th>Khối lượng báo cáo</th>
              <th>Khối lượng kiểm tra</th>
              <th>Chênh lệch</th>
              <th>Tiến độ đề ra</th>
            </tr>
          </thead>
          <tbody>
            {model.transitionRows.length === 0 ? (
              <tr className="empty-row">
                <td className="center">1</td>
                <td />
                <td />
                <td />
                <td />
                <td />
              </tr>
            ) : (
              model.transitionRows.map((r, i) => (
                <tr key={r.id}>
                  <td className="center">{i + 1}</td>
                  <td className="multi-line">{r.sourceText}</td>
                  <td>{r.reportedText}</td>
                  <td>{r.verifiedText}</td>
                  <td>{r.varianceText}</td>
                  <td className="multi-line">{r.plannedProgress}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2 className="document-section-heading">III. Công tác đo, kiểm tra khối lượng đã thi công</h2>
        <table>
          <thead>
            <tr>
              <th className="number-col">STT</th>
              <th className="source-wide">Công trình, hạng mục</th>
              <th>Khối lượng báo cáo</th>
              <th>Khối lượng kiểm tra</th>
              <th>Chênh lệch so với thực tế</th>
            </tr>
          </thead>
          <tbody>
            {model.quantityRows.length === 0 ? (
              <tr className="empty-row">
                <td className="center">1</td>
                <td />
                <td />
                <td />
                <td />
              </tr>
            ) : (
              model.quantityRows.map((r, i) => (
                <tr key={r.id}>
                  <td className="center">{i + 1}</td>
                  <td className="multi-line">{r.sourceText}</td>
                  <td>{r.reportedText}</td>
                  <td>{r.verifiedText}</td>
                  <td>{r.varianceText}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="report-section">
        <h2 className="document-section-heading">IV. Tiến độ tổng và thực tế</h2>
        <table>
          <thead>
            <tr>
              <th className="number-col">STT</th>
              <th className="source-col">Công trình/hạng mục</th>
              <th>Tiến độ theo kế hoạch</th>
              <th>Chậm tiến độ (Tiến độ thực tế đạt được)</th>
              <th>Lý do chậm tiến độ</th>
            </tr>
          </thead>
          <tbody>
            {model.progressRows.length === 0 ? (
              <tr className="empty-row">
                <td className="center">1</td>
                <td />
                <td />
                <td />
                <td />
              </tr>
            ) : (
              model.progressRows.map((r, i) => (
                <tr key={r.id}>
                  <td className="center">{i + 1}</td>
                  <td className="multi-line">{r.sourceText}</td>
                  <td className="multi-line">{r.plannedProgress}</td>
                  <td className="multi-line">{r.actualProgress}</td>
                  <td className="multi-line">{r.delayReason}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <div className="signature">
        <div />
        <div>
          <b>NGƯỜI LẬP BÁO CÁO</b>
          <br />
          <i>(Ký, ghi rõ họ tên)</i>
          <div className="signature-name">{model.metadata.creatorName}</div>
        </div>
      </div>
    </>
  );
}

function NextWeekPlan({ model }: { model: WeeklyDocumentModel }) {
  return (
    <section className="next-plan">
      <ReportHeader model={model} />
      <h2 className="document-section-heading">I. Công việc kiểm tra kỹ thuật dự kiến tuần sau</h2>
      <ScheduleTable model={model} isResult={false} />
      <section className="report-section" style={{ marginTop: "4mm" }}>
        <h2 className="document-section-heading">II. Đánh giá kết quả, xử lý tồn tại của tuần trước</h2>
        {model.followUps.map((r) => (
          <FixedRecommendationItem key={r.key} order={r.order} title={r.title} content={r.content} />
        ))}
      </section>
      <section className="report-section" style={{ marginTop: "4mm" }}>
        <h2 className="document-section-heading">III. Kiến nghị, đề xuất Ban Giám đốc về kết quả tuần</h2>
        {model.recommendations.map((r) => (
          <FixedRecommendationItem key={r.key} order={r.order} title={r.title} content={r.content} />
        ))}
      </section>
      <div className="signature">
        <div />
        <div>
          <b>NGƯỜI LẬP BÁO CÁO</b>
          <br />
          <i>(Ký, ghi rõ họ tên)</i>
          <div className="signature-name">{model.metadata.creatorName}</div>
        </div>
      </div>
    </section>
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
  const [docType, setDocType] = useState<"RESULT" | "NEXT_WEEK_PLAN">(initialActiveDocument);
  const [exportingType, setExportingType] = useState<string | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  useEffect(() => {
    setDocType(initialActiveDocument);
  }, [initialActiveDocument]);

  const handleSelectDocType = (type: "RESULT" | "NEXT_WEEK_PLAN") => {
    setDocType(type);
    onDocumentTypeChange?.(type);
  };

  const model = buildWeeklyDocumentModel(dossier, docType, { companyName });

  const pdfDownloadUrl = `/api/supervision/weekly/${dossier.id}/export?format=pdf&disposition=attachment&document=${docType}`;
  const pdfViewUrl = `/api/supervision/weekly/${dossier.id}/export?format=pdf&disposition=inline&document=${docType}`;
  const docxUrl = `/api/supervision/weekly/${dossier.id}/export?format=docx&document=${docType}`;

  const handleExportAction = (type: "view_pdf" | "download_pdf" | "download_docx" | "print") => {
    if (exportingType !== null) return; // Prevent concurrent / double-click export requests
    setExportingType(type);

    try {
      if (type === "view_pdf") {
        window.open(pdfViewUrl, "_blank");
      } else if (type === "download_pdf") {
        const link = document.createElement("a");
        link.href = pdfDownloadUrl;
        link.download = "";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (type === "download_docx") {
        const link = document.createElement("a");
        link.href = docxUrl;
        link.download = "";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (type === "print") {
        // Section B: Clean PDF Printing (Opens clean PDF stream in tab/viewer, preventing HTML browser headers/footers)
        window.open(pdfViewUrl, "_blank");
      }
    } finally {
      setTimeout(() => setExportingType(null), 1500);
    }
  };

  return (
    <main className="print-sheet" data-print-document>
      <style>{`
        /* Continuous Clean Page Layout & Print Overrides */
        @page {
          size: A4 landscape;
          margin: 0; /* Eliminates Chrome default header/footer margin space */
        }

        .print-sheet, .print-sheet * { box-sizing: border-box; }
        .print-sheet {
          width: 297mm;
          min-height: 210mm;
          margin: 12px auto;
          padding: 15mm;
          background: white;
          color: #000;
          font-family: "Times New Roman", serif;
          font-size: 13pt;
          line-height: 1.2;
        }

        .official-header { display: grid; grid-template-columns: 1fr 1.15fr; gap: 12mm; text-align: center; margin-bottom: 8mm; }
        .common-info p { margin: 2mm 0; }
        h1 { margin: 3mm 0 6mm; text-align: center; font-size: 16pt; }
        .document-section-heading { margin: 4mm 0 1mm; font-family: "Times New Roman", serif; font-size: 13pt; font-weight: 700; line-height: 1.3; text-align: left; break-after: avoid; page-break-after: avoid; }
        .print-sheet table { width: 100%; max-width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0 0 2mm; break-inside: auto; box-sizing: border-box; }
        .print-sheet th, .print-sheet td { border: 0.75pt solid #000; padding: 1.1mm; vertical-align: top; overflow-wrap: anywhere; box-sizing: border-box; }
        .print-sheet th:last-child, .print-sheet td:last-child { border-right: 0.75pt solid #000 !important; }
        .print-sheet th { text-align: center; font-weight: 700; background-color: #EEEEEE; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        thead { display: table-header-group; }
        tr { break-inside: avoid; break-after: auto; }
        .number-col { width: 8%; } .source-wide { width: 30%; }
        .time-col { width: 15%; } .source-col { width: 31%; } .detail-col { width: 31%; } .result-col { width: 23%; }
        .center { text-align: center; }
        .time-cell { padding: 1.4mm 1.8mm; }
        .time-cell b { font-weight: 700; }
        .multi-line { white-space: pre-wrap; }
        .schedule-table { break-inside: auto; page-break-inside: auto; }
        .schedule-table tr { break-inside: avoid; page-break-inside: avoid; }
        .schedule-header { break-after: avoid; page-break-after: avoid; }
        .schedule-table tbody tr { min-height: 7mm; }
        .schedule-table .day-start td { border-top-width: 0.5mm; }
        .empty-row { height: 16mm; }
        .signature { display: grid; grid-template-columns: 1fr 1fr; margin-top: 5mm; min-height: 15mm; text-align: center; line-height: 1.1; break-inside: avoid; page-break-inside: avoid; }
        .signature-name { margin-top: 15mm; font-weight: 700; }
        .note { white-space: pre-wrap; }
        .print-page-break { break-before: page; page-break-before: always; }

        .recommendation-item { break-inside: avoid; page-break-inside: avoid; margin-top: 10px; }
        .recommendation-heading { display: grid; grid-template-columns: 24px minmax(0, 1fr); column-gap: 4px; line-height: 1.35; }
        .recommendation-content { margin-left: 28px; white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.45; }
        .recommendation-empty-lines { margin-left: 28px; margin-top: 5px; }
        .dotted-line { height: 24px; border-bottom: 1.5pt dotted #000; }

        /* Print Media Styles: Hides Chrome metadata & App Shell, Unclips App Shell Containers */
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
            background: #fff !important;
          }
          [data-print-document] {
            position: static !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            transform: none !important;
            margin: 0 !important;
            padding: 12mm 15mm !important;
            box-shadow: none !important;
          }
          [data-app-sidebar],
          [data-app-header],
          [data-app-mobile-context],
          [data-app-bottom-nav],
          [aria-label="Breadcrumb"],
          .preview-toolbar {
            display: none !important;
          }
        }
      `}</style>

      {/* Interactive Floating Preview Toolbar (Hidden when printed) */}
      {!hidePrintButton && (
        <div className="preview-toolbar sticky top-4 z-40 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur-md print:hidden">
          <div className="flex items-center gap-2">
            <Link
              href="/reports/weekly-inspection"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại</span>
            </Link>
            <div className="h-4 w-px bg-slate-200 mx-1" />
            {/* Document Switcher Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
              <button
                type="button"
                onClick={() => handleSelectDocType("RESULT")}
                className={`rounded-lg px-3 py-1.5 transition-all ${
                  docType === "RESULT"
                    ? "bg-white text-blue-700 shadow-2xs"
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
                    ? "bg-white text-blue-700 shadow-2xs"
                    : "hover:text-slate-900"
                }`}
              >
                2. Kế hoạch tuần sau
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Action 1: Download Word */}
            <button
              type="button"
              disabled={exportingType !== null}
              onClick={() => handleExportAction("download_docx")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {exportingType === "download_docx" ? (
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              ) : (
                <FileText className="h-4 w-4 text-blue-600" />
              )}
              <span>{exportingType === "download_docx" ? "Đang tạo Word..." : "Tải Word (.docx)"}</span>
            </button>

            {/* Action 2: View / Print PDF in App */}
            <button
              type="button"
              onClick={() => setShowPdfViewer(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
            >
              <Eye className="h-4 w-4 text-rose-600" />
              <span>Xem / In PDF</span>
            </button>
          </div>
        </div>
      )}

      {docType === "RESULT" ? <ResultSections model={model} /> : <NextWeekPlan model={model} />}

      <InAppPdfViewer
        isOpen={showPdfViewer}
        onClose={() => setShowPdfViewer(false)}
        pdfUrl={pdfViewUrl}
        title={docType === "RESULT" ? "Báo cáo Kết quả Tuần (PDF)" : "Kế hoạch Kiểm tra Tuần sau (PDF)"}
        fileName={buildSupervisionExportFilename({ reportNumber: dossier.reportNumber, weekStart: dossier.weekStart, documentType: docType, extension: "pdf" })}
      />
    </main>
  );
}
