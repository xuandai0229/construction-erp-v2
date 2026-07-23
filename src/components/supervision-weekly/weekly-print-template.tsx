import { WeeklyPrintButton } from "./weekly-print-button";
import type { SupervisionWeeklyPrintDto } from "@/lib/supervision-weekly/print-types";
import { buildWeeklyDocumentModel, WeeklyDocumentModel, NEXT_WEEK_PLAN_GROUP_2_CATEGORIES } from "@/lib/supervision-weekly/document-model";
import { formatReportNumber } from "@/lib/supervision-weekly/report-number";

function renderPreservedLines(text?: string | null) {
  if (!text) return null;
  return text.split("\n").map((line, idx) => (
    <span key={idx}>
      {line}
      {idx < text.split("\n").length - 1 && <br />}
    </span>
  ));
}

function ReportHeader({ model }: { model: WeeklyDocumentModel }) {
  return <>
    <div className="official-header">
      <div><b>{model.metadata.companyName}<br />{model.metadata.companySubName}</b><br />{formatReportNumber(model.metadata.reportNumber)}</div>
      <div><b>{model.metadata.nationalMottoLine1}</b><br /><u>{model.metadata.nationalMottoLine2}</u><br />{model.metadata.place}, ngày {model.metadata.issueDate.split("/")[0]} tháng {model.metadata.issueDate.split("/")[1]} năm {model.metadata.issueDate.split("/")[2]}</div>
    </div>
    <h1>{model.metadata.title}</h1>
    <div className="common-info">
      <p><b>Kính gửi:</b> {model.metadata.recipientName}</p>
      <p><b>Chức vụ:</b> {model.metadata.recipientTitle}</p>
      <p><b>Thời gian báo cáo:</b> Từ ngày {model.metadata.weekStart} đến ngày {model.metadata.weekEnd}</p>
    </div>
  </>;
}

function ScheduleTable({ model, isResult }: { model: WeeklyDocumentModel; isResult: boolean }) {
  const shiftLabels = ["Sáng:", "Chiều:", "Tối:"];
  const shiftKeys = ["MORNING", "AFTERNOON", "EVENING"] as const;

  return (
    <table className="schedule-table">
      <colgroup><col className="time-col" /><col className="source-col" /><col className="detail-col" /><col className="result-col" /></colgroup>
      <thead>
        <tr className="schedule-header">
          <th>{isResult ? "Thời gian kiểm tra" : "Ngày/thứ"}</th>
          <th>{isResult ? "Công trình và hạng mục kiểm tra" : "Công trình"}</th>
          <th>{isResult ? "Nội dung kiểm tra" : "Phát sinh do chỉ huy công trình đề xuất"}</th>
          <th>{isResult ? "Kết quả" : "Nội dung (có phụ lục kèm theo)"}</th>
        </tr>
      </thead>
      <tbody>
        {model.schedule.map((day, dayIndex) => {
          return shiftKeys.map((shiftKey, sIdx) => {
            const shiftRows = day.shifts[shiftKey];
            const count = Math.max(1, shiftRows.length);
            return Array.from({ length: count }).map((_, rIdx) => {
              const rowData = shiftRows[rIdx];
              return (
                <tr key={`${dayIndex}-${shiftKey}-${rIdx}`} className={sIdx === 0 && rIdx === 0 ? "day-start" : ""}>
                  <td className="time-cell">
                    {rIdx === 0 ? (
                      <>
                        {sIdx === 0 && <><b>{day.weekdayLabel}:</b><br /></>}
                        {shiftLabels[sIdx]}
                      </>
                    ) : null}
                  </td>
                  {rowData ? (
                    <>
                      <td className="multi-line">{rowData.sourceText}</td>
                      <td className="multi-line">{rowData.content}</td>
                      <td className="multi-line">{rowData.result}</td>
                    </>
                  ) : (
                    <>
                      <td></td>
                      <td></td>
                      <td></td>
                    </>
                  )}
                </tr>
              );
            });
          });
        })}
      </tbody>
    </table>
  );
}

function ResultSections({ model }: { model: WeeklyDocumentModel }) {
  return <section className="result-sections print-page-break">
    <ReportHeader model={model} />
    <h2 className="document-section-heading">I. Kết quả thực hiện trong tuần</h2>
    <ScheduleTable model={model} isResult={true} />

    <section className="report-section">
      <h2 className="document-section-heading">II. Công tác kiểm tra điều kiện chuyển bước thi công</h2>
      <table>
        <colgroup><col className="number-col" /><col className="source-wide" /><col /><col /><col /><col /></colgroup>
        <thead>
          <tr>
            <th>STT</th><th>Công trình và hạng mục kiểm tra</th><th>Khối lượng báo cáo</th><th>Khối lượng kiểm tra</th><th>Chênh lệch</th><th>Tiến độ đề ra</th>
          </tr>
        </thead>
        <tbody>
          {model.transitionRows.length ? model.transitionRows.map((row, index) => (
            <tr key={row.id}>
              <td className="center">{index + 1}</td>
              <td className="multi-line">{row.sourceText}</td>
              <td className="multi-line">{row.reportedText}</td>
              <td className="multi-line">{row.verifiedText}</td>
              <td className="multi-line">{row.varianceText}</td>
              <td className="multi-line">{row.plannedProgress}</td>
            </tr>
          )) : <tr className="empty-row"><td>1</td><td /><td /><td /><td /><td /></tr>}
        </tbody>
      </table>
    </section>

    <section className="report-section">
      <h2 className="document-section-heading">III. Công tác đo, kiểm tra khối lượng đã thi công</h2>
      <table>
        <colgroup><col className="number-col" /><col className="source-wide" /><col /><col /><col /></colgroup>
        <thead>
          <tr>
            <th>STT</th><th>Công trình, hạng mục</th><th>Khối lượng báo cáo</th><th>Khối lượng kiểm tra</th><th>Chênh lệch so với thực tế</th>
          </tr>
        </thead>
        <tbody>
          {model.quantityRows.length ? model.quantityRows.map((row, index) => (
            <tr key={row.id}>
              <td className="center">{index + 1}</td>
              <td className="multi-line">{row.sourceText}</td>
              <td className="multi-line">{row.reportedText}</td>
              <td className="multi-line">{row.verifiedText}</td>
              <td className="multi-line">{row.varianceText}</td>
            </tr>
          )) : <tr className="empty-row"><td>1</td><td /><td /><td /><td /></tr>}
        </tbody>
      </table>
    </section>

    <section className="report-section">
      <h2 className="document-section-heading">IV. Tiến độ tổng và thực tế</h2>
      <table>
        <colgroup><col className="number-col" /><col className="source-wide" /><col /><col /><col /></colgroup>
        <thead>
          <tr>
            <th>STT</th><th>Công trình/hạng mục</th><th>Tiến độ theo kế hoạch</th><th>Chậm tiến độ<br />(Tiến độ thực tế đạt được)</th><th>Lý do chậm tiến độ</th>
          </tr>
        </thead>
        <tbody>
          {model.progressRows.length ? model.progressRows.map((row, index) => (
            <tr key={row.id}>
              <td className="center">{index + 1}</td>
              <td className="multi-line">{row.sourceText}</td>
              <td className="multi-line">{row.plannedProgress}</td>
              <td className="multi-line">{row.actualProgress}</td>
              <td className="multi-line">{row.delayReason}</td>
            </tr>
          )) : <tr className="empty-row"><td>1</td><td /><td /><td /><td /></tr>}
        </tbody>
      </table>
    </section>

    <div className="signature">
      <div />
      <div>
        <b>NGƯỜI LẬP BÁO CÁO</b><br />
        <i>(Ký, ghi rõ họ tên)</i>
        <div className="signature-name">{model.metadata.creatorName}</div>
      </div>
    </div>
  </section>;
}

function FixedRecommendationItem({ order, title, content }: { order: number; title: string; content?: string | null; }) {
  const normalized = content?.trim() ?? "";
  return (
    <section className="recommendation-item">
      <div className="recommendation-heading">
        <span>{order}.</span>
        <span>{title}</span>
      </div>
      {normalized ? (
        <div className="recommendation-content">
          {renderPreservedLines(normalized)}
        </div>
      ) : (
        <div className="recommendation-empty-lines" aria-label="Nội dung để trống">
          <div className="dotted-line" />
          <div className="dotted-line" />
          <div className="dotted-line" />
        </div>
      )}
    </section>
  );
}

function NextWeekPlan({ model }: { model: WeeklyDocumentModel }) {
  return <section className="next-plan print-page-break">
    <ReportHeader model={model} />
    <h2 className="document-section-heading">I. Công việc kiểm tra kỹ thuật dự kiến tuần sau</h2>
    <ScheduleTable model={model} isResult={false} />
    <section className="report-section" style={{ marginTop: "4mm" }}>
      <h2 className="document-section-heading">II. Đánh giá kết quả, xử lý tồn tại của tuần trước</h2>
      {model.followUps.map(r => (
        <FixedRecommendationItem key={r.key} order={r.order} title={r.title} content={r.content} />
      ))}
    </section>
    <section className="report-section" style={{ marginTop: "4mm" }}>
      <h2 className="document-section-heading">III. Kiến nghị, đề xuất Ban Giám đốc về kết quả tuần</h2>
      {model.recommendations.map(r => (
        <FixedRecommendationItem key={r.key} order={r.order} title={r.title} content={r.content} />
      ))}
    </section>
    <div className="signature">
      <div />
      <div>
        <b>NGƯỜI LẬP BÁO CÁO</b><br />
        <i>(Ký, ghi rõ họ tên)</i>
        <div className="signature-name">{model.metadata.creatorName}</div>
      </div>
    </div>
  </section>;
}

export function WeeklyPrintTemplate({ dossier, activeDocument, hidePrintButton }: { dossier: SupervisionWeeklyPrintDto; activeDocument?: "RESULT" | "NEXT_WEEK_PLAN"; hidePrintButton?: boolean }) {
  const docType = activeDocument || "RESULT";
  const model = buildWeeklyDocumentModel(dossier, docType);
  
  return <main className="print-sheet" data-print-document>
    <style>{`
      @page { size: A4 landscape; margin: 15mm; }
      .print-sheet, .print-sheet * { box-sizing: border-box; }
      .print-sheet { width: 297mm; min-height: 210mm; margin: 12px auto; padding: 15mm; background: white; color: #000; font-family: "Times New Roman", serif; font-size: 13pt; line-height: 1.2; }
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
      
      .print-actions { position: fixed; z-index: 20; top: 16px; right: 20px; border: 1px solid #94a3b8; border-radius: 8px; padding: 9px 14px; background: #fff; color: #0f172a; font: 600 14px system-ui, sans-serif; cursor: pointer; box-shadow: 0 2px 8px #0002; }
      @media print {
        html, body { width: auto !important; height: auto !important; min-height: 0 !important; overflow: visible !important; background: #fff; }
        [data-print-document] { position: static !important; width: 100% !important; height: auto !important; max-height: none !important; overflow: visible !important; transform: none !important; margin: 0; padding: 0; }
        [data-app-sidebar], [data-app-header], [data-app-mobile-context], [data-app-bottom-nav] { display: none !important; }
        [data-app-shell], [data-app-frame], [data-app-main], [data-app-content] { display: block !important; width: 100% !important; min-width: 0 !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
        .print-actions { display: none; }
      }
      @media screen and (max-width: 1100px) { .print-sheet { transform-origin: top left; } }
    `}</style>
    {!hidePrintButton && <WeeklyPrintButton />}
    {docType === "RESULT" ? <ResultSections model={model} /> : <NextWeekPlan model={model} />}
  </main>;
}
