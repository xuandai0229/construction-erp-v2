import { WeeklyPrintButton } from "./weekly-print-button";
import { formatSupervisionInspectionSource } from "@/lib/supervision-weekly/source-formatter";
import { formatSupervisionQuantity } from "@/lib/supervision-weekly/quantity";

type SourceFields = {
  projectNameSnapshot: string | null;
  locationNameSnapshot: string | null;
  workItemNameSnapshot: string | null;
  manualLocation: string | null;
  manualText: string | null;
  manualProjectName: string | null;
  manualWorkItemName: string | null;
  categoryItemId: string | null;
  categoryNameSnapshot: string | null;
  manualCategoryName: string | null;
  displayText: string;
};

type Entry = SourceFields & {
  id: string;
  documentType: "RESULT" | "NEXT_WEEK_PLAN";
  entryDate: Date;
  shift: "MORNING" | "AFTERNOON" | "EVENING";
  sortOrder: number;
  inspectionContent: string | null;
  result: string | null;
  commanderProposal: string | null;
};

type SourceRow = SourceFields & { id: string; sortOrder: number };
type Transition = SourceRow & {
  reportedQuantity: unknown;
  reportedText: string | null;
  reportedUnit: string | null;
  verifiedQuantity: unknown;
  verifiedText: string | null;
  verifiedUnit: string | null;
  varianceQuantity: unknown;
  plannedProgress: string | null;
};
type Quantity = SourceRow & { unit: string | null; reportedUnit: string | null; reportedText: string | null; reportedQuantity: unknown; verifiedUnit: string | null; verifiedText: string | null; verifiedQuantity: unknown; varianceQuantity: unknown };
type Progress = SourceRow & { plannedProgress: string | null; actualProgress: string | null; delayValue: unknown; delayType: "DAY" | "PERCENT" | null; delayReason: string | null };
type Observation = { id: string; documentType: "RESULT" | "NEXT_WEEK_PLAN"; category: string; content: string };

type PrintDossier = {
  reportNumber: string | null;
  weekStart: Date;
  weekEnd: Date;
  nextWeekStart: Date;
  nextWeekEnd: Date;
  place: string | null;
  recipientName: string | null;
  recipientTitle: string | null;
  createdBy: { name: string };
  entries: Entry[];
  transitions: Transition[];
  quantities: Quantity[];
  progressRows: Progress[];
  observations: Observation[];
};

const SHIFT_LABEL = { MORNING: "Sáng", AFTERNOON: "Chiều", EVENING: "Tối" } as const;
const SHIFT_ORDER = ["MORNING", "AFTERNOON", "EVENING"] as const;

function viDate(date: Date) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }).format(date);
}

function dayLabel(index: number) {
  return index === 6 ? "Chủ nhật" : `Thứ ${index + 2}`;
}

function value(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function valueWithUnit(quantity: unknown, text: string | null, unit: string | null) {
  return formatSupervisionQuantity(quantity === null || quantity === undefined ? null : Number(quantity), text, unit);
}

function ReportHeader({ dossier, title, start, end }: { dossier: PrintDossier; title: string; start: Date; end: Date }) {
  const issued = new Date();
  return <>
    <div className="official-header">
      <div><b>CÔNG TY CỔ PHẦN XÂY DỰNG<br />VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI</b><br />Số: {dossier.reportNumber || "…/……"}</div>
      <div><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br /><u>Độc lập - Tự do - Hạnh phúc</u><br />{dossier.place || "Hà Nội"}, ngày {issued.getDate()} tháng {issued.getMonth() + 1} năm {issued.getFullYear()}</div>
    </div>
    <h1>{title}</h1>
    <div className="common-info">
      <p><b>Kính gửi:</b> {dossier.recipientName || ""}</p>
      <p><b>Chức vụ:</b> {dossier.recipientTitle || ""}</p>
      <p><b>Thời gian báo cáo:</b> Từ ngày {viDate(start)} đến ngày {viDate(end)}</p>
    </div>
  </>;
}

function ScheduleTable({ dossier, documentType }: { dossier: PrintDossier; documentType: Entry["documentType"] }) {
  const weekStart = documentType === "RESULT" ? dossier.weekStart : dossier.nextWeekStart;
  const days = Array.from({ length: 7 }, (_, dayIndex) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    const dayEntries = dossier.entries.filter((entry) => entry.documentType === documentType && viDate(entry.entryDate) === viDate(date));
    const rowCount = SHIFT_ORDER.reduce((total, shift) => total + Math.max(1, dayEntries.filter((entry) => entry.shift === shift).length), 0);
    return { dayIndex, dayEntries, rowCount };
  });
  const chunks: typeof days[] = [];
  const maxRowsPerTable = documentType === "RESULT" ? 8 : 9;
  for (const day of days) {
    const current = chunks.at(-1);
    const currentRows = current?.reduce((total, item) => total + item.rowCount, 0) || 0;
    if (!current || currentRows + day.rowCount > maxRowsPerTable) chunks.push([day]);
    else current.push(day);
  }

  return <>{chunks.map((chunk, chunkIndex) => <table className={`schedule-table ${documentType === "RESULT" && chunkIndex === chunks.length - 1 ? "schedule-final-result" : ""}`} key={chunkIndex}>
    <colgroup><col className="time-col" /><col className="source-col" /><col className="detail-col" /><col className="result-col" /></colgroup>
    <tbody><tr className="schedule-header">
      <th>Thời gian kiểm tra</th>
      <th>Công trình và hạng mục kiểm tra</th>
      <th>{documentType === "RESULT" ? "Nội dung kiểm tra" : "Phát sinh do chỉ huy công trình đề xuất"}</th>
      <th>{documentType === "RESULT" ? "Kết quả" : "Nội dung (có phụ lục kèm theo)"}</th>
    </tr>{chunk.flatMap(({ dayIndex, dayEntries }) => SHIFT_ORDER.flatMap((shift, shiftIndex) => {
          const rows = dayEntries.filter((entry) => entry.shift === shift).sort((a, b) => a.sortOrder - b.sortOrder);
          const rowCount = Math.max(1, rows.length);
          return Array.from({ length: rowCount }, (_, rowIndex) => {
            const entry = rows[rowIndex];
            return <tr key={`${dayIndex}-${shift}-${entry?.id || rowIndex}`} className={shiftIndex === 0 && rowIndex === 0 ? "day-start" : undefined}>
              <td className="time-cell">{rowIndex === 0 && <>{shiftIndex === 0 && <><b>{dayLabel(dayIndex)}:</b><br /></>}{SHIFT_LABEL[shift]}:</>}</td>
              <td>{entry ? formatSupervisionInspectionSource(entry) : ""}</td>
              <td>{documentType === "RESULT" ? entry?.inspectionContent || "" : entry?.commanderProposal || ""}</td>
              <td>{documentType === "RESULT" ? entry?.result || "" : entry?.inspectionContent || entry?.result || ""}</td>
            </tr>;
          });
      }))}</tbody>
  </table>)}</>;
}

function ResultSections({ dossier }: { dossier: PrintDossier }) {
  return <>
    <section className="report-section"><h2>I. Kết quả thực hiện trong tuần</h2>
    <ScheduleTable dossier={dossier} documentType="RESULT" /></section>

    <section className="report-section"><h2>II. Công tác kiểm tra điều kiện chuyển bước thi công</h2>
    <table><colgroup><col className="number-col" /><col className="source-wide" /><col /><col /><col /><col /></colgroup><thead><tr>
      <th>STT</th><th>Công trình và hạng mục kiểm tra</th><th>Khối lượng báo cáo</th><th>Khối lượng kiểm tra</th><th>Chênh lệch</th><th>Tiến độ đề ra</th>
    </tr></thead><tbody>{dossier.transitions.length ? dossier.transitions.sort((a, b) => a.sortOrder - b.sortOrder).map((row, index) => <tr key={row.id}>
      <td className="center">{index + 1}</td><td>{formatSupervisionInspectionSource(row)}</td><td>{valueWithUnit(row.reportedQuantity, row.reportedText, row.reportedUnit)}</td><td>{valueWithUnit(row.verifiedQuantity, row.verifiedText, row.verifiedUnit)}</td><td>{row.varianceQuantity === null ? "" : valueWithUnit(row.varianceQuantity, null, row.reportedUnit)}</td><td>{row.plannedProgress || ""}</td>
    </tr>) : <tr className="empty-row"><td>1</td><td /><td /><td /><td /><td /></tr>}</tbody></table></section>

    <section className="report-section"><h2>III. Công tác đo, kiểm tra khối lượng đã thi công</h2>
    <table><colgroup><col className="number-col" /><col className="source-wide" /><col /><col /><col /></colgroup><thead><tr>
      <th>STT</th><th>Công trình, hạng mục</th><th>Khối lượng báo cáo</th><th>Khối lượng kiểm tra</th><th>Chênh lệch so với thực tế</th>
    </tr></thead><tbody>{dossier.quantities.length ? dossier.quantities.sort((a, b) => a.sortOrder - b.sortOrder).map((row, index) => <tr key={row.id}>
      <td className="center">{index + 1}</td><td>{formatSupervisionInspectionSource(row)}</td><td>{valueWithUnit(row.reportedQuantity, row.reportedText, row.reportedUnit || row.unit)}</td><td>{valueWithUnit(row.verifiedQuantity, row.verifiedText, row.verifiedUnit || row.unit)}</td><td>{valueWithUnit(row.varianceQuantity, null, row.reportedUnit || row.unit)}</td>
    </tr>) : <tr className="empty-row"><td>1</td><td /><td /><td /><td /></tr>}</tbody></table></section>

    <section className="report-section"><h2>IV. Tiến độ tổng và thực tế</h2>
    <table><colgroup><col className="number-col" /><col className="source-wide" /><col /><col /><col /></colgroup><thead><tr>
      <th>STT</th><th>Công trình/hạng mục</th><th>Tiến độ theo kế hoạch</th><th>Chậm tiến độ<br />(Tiến độ thực tế đạt được)</th><th>Lý do chậm tiến độ</th>
    </tr></thead><tbody>{dossier.progressRows.length ? dossier.progressRows.sort((a, b) => a.sortOrder - b.sortOrder).map((row, index) => {
      const delay = row.delayValue === null ? "" : `Chậm ${value(row.delayValue)}${row.delayType === "PERCENT" ? "%" : " ngày"}`;
      return <tr key={row.id}><td className="center">{index + 1}</td><td>{formatSupervisionInspectionSource(row)}</td><td>{row.plannedProgress || ""}</td><td>{[row.actualProgress, delay].filter(Boolean).join("; ")}</td><td>{row.delayReason || ""}</td></tr>;
    }) : <tr className="empty-row"><td>1</td><td /><td /><td /><td /></tr>}</tbody></table></section>

    <div className="signature"><div /><div><b>NGƯỜI LẬP BÁO CÁO</b><br /><i>(Ký, ghi rõ họ tên)</i><div className="signature-name">{dossier.createdBy.name}</div></div></div>
  </>;
}

function NextWeekPlan({ dossier }: { dossier: PrintDossier }) {
  const notes = dossier.observations.filter((item) => item.documentType === "NEXT_WEEK_PLAN" && item.content.trim());
  return <section className="next-plan print-page-break">
    <ReportHeader dossier={dossier} title="KẾ HOẠCH TUẦN TIẾP THEO" start={dossier.nextWeekStart} end={dossier.nextWeekEnd} />
    <h2>I. Công việc kiểm tra kỹ thuật dự kiến tuần sau</h2>
    <ScheduleTable dossier={dossier} documentType="NEXT_WEEK_PLAN" />
    {notes.map((item) => <section key={item.id}><h2>{item.category}</h2><p className="note">{item.content}</p></section>)}
  </section>;
}

export function WeeklyPrintTemplate({ dossier }: { dossier: PrintDossier }) {
  return <main className="print-sheet">
    <style>{`
      @page { size: A4 landscape; margin: 15mm; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #e5e7eb; }
      .print-sheet { width: 297mm; min-height: 210mm; margin: 12px auto; padding: 15mm; background: white; color: #000; font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.2; }
      .official-header { display: grid; grid-template-columns: 1fr 1.15fr; gap: 12mm; text-align: center; margin-bottom: 8mm; }
      .common-info p { margin: 2mm 0; }
      h1 { margin: 3mm 0 6mm; text-align: center; font-size: 16pt; }
      h2 { margin: 2mm 0 1mm; font-size: 12pt; break-after: avoid; page-break-after: avoid; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0 0 2mm; break-inside: auto; }
      th, td { border: 0.25mm solid #000; padding: 1.1mm; vertical-align: top; overflow-wrap: anywhere; }
      th { text-align: center; font-weight: 700; }
      thead { display: table-header-group; }
      tr { break-inside: avoid; break-after: auto; }
      .number-col { width: 8%; } .source-wide { width: 30%; }
      .time-col { width: 15%; } .source-col { width: 31%; } .detail-col { width: 31%; } .result-col { width: 23%; }
      .center { text-align: center; }
      .time-cell { padding: 1.4mm 1.8mm; }
      .time-cell b { font-weight: 700; }
      .schedule-table { break-inside: auto; page-break-inside: auto; }
      .schedule-table tr { break-inside: auto; page-break-inside: auto; }
      .schedule-header { break-after: avoid; page-break-after: avoid; }
      .schedule-table tbody tr { min-height: 7mm; }
      .schedule-table .day-start td { border-top-width: 0.5mm; }
      .empty-row { height: 16mm; }
      .signature { display: block; width: 50%; margin: 1mm 0 0 50%; min-height: 13mm; text-align: center; line-height: 1.1; break-inside: auto; page-break-inside: auto; }
      .signature > div:first-child { display: none; }
      .signature-name { margin-top: 2mm; font-weight: 700; }
      .note { white-space: pre-wrap; }
      .print-page-break { break-before: page; page-break-before: always; }
      .print-actions { position: fixed; z-index: 20; top: 16px; right: 20px; border: 1px solid #94a3b8; border-radius: 8px; padding: 9px 14px; background: #fff; color: #0f172a; font: 600 14px system-ui, sans-serif; cursor: pointer; box-shadow: 0 2px 8px #0002; }
      @media print {
        body { background: #fff; }
        [data-app-sidebar], [data-app-header], [data-app-mobile-context], [data-app-bottom-nav] { display: none !important; }
        [data-app-shell], [data-app-frame], [data-app-main], [data-app-content] { display: block !important; width: 100% !important; min-width: 0 !important; min-height: 0 !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
        .print-sheet { width: auto; min-height: auto; margin: 0; padding: 0; }
        .schedule-final-result { break-before: auto; page-break-before: auto; }
        .print-actions { display: none; }
      }
      @media screen and (max-width: 1100px) { .print-sheet { transform-origin: top left; } }
    `}</style>
    <WeeklyPrintButton />
    <ReportHeader dossier={dossier} title="BÁO CÁO KẾT QUẢ TUẦN" start={dossier.weekStart} end={dossier.weekEnd} />
    <ResultSections dossier={dossier} />
    <NextWeekPlan dossier={dossier} />
  </main>;
}
