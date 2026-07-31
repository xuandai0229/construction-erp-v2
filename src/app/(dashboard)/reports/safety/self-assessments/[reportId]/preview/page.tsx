import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SafetyAssessmentService } from "@/lib/safety-reporting/assessment-service";
import { buildSafetyAssessmentOutputModel, NarrativeSectionValue } from "@/lib/safety-reporting/assessment-view-model";
import {
  SAFETY_ASSESSMENT_OFFICIAL_CONTENT,
  SAFETY_SELF_ASSESSMENT_INSPECTION_TITLE,
  SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT,
} from "@/lib/safety-reporting/safety-assessment-official-content";
import { formatVnLongDate, SAFETY_DOCUMENT_TYPOGRAPHY } from "@/lib/safety-reporting/date-utils";
import { SafetyDocumentPreviewShell } from "@/components/safety/safety-document-preview-shell";

export const metadata = {
  title: "Xem trước Báo cáo tự đánh giá | ATLĐ • PCCC • VSMT",
};

interface SafetyReportPreviewPageProps {
  params: Promise<{ reportId: string }>;
}

const HANDWRITING_DOTS =
  "................................................................................................................................................................................................................................";

export function HandwritingLines({ count = 4, className = "" }: { count?: number; className?: string }) {
  return (
    <div
      className={`assessment-handwriting-lines ${className}`}
      aria-label="Vùng để viết bổ sung"
      style={{ width: "100%", margin: "3mm 0 4mm", paddingLeft: "5mm", paddingRight: "1mm", breakInside: "avoid" }}
    >
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="assessment-handwriting-text-line"
          aria-hidden="true"
          style={{
            width: "100%",
            height: "6mm",
            overflow: "hidden",
            whiteSpace: "nowrap",
            fontFamily: '"Times New Roman", Times, serif',
            fontSize: "12pt",
            fontWeight: 400,
            fontStyle: "normal",
            lineHeight: "6mm",
            letterSpacing: "0.7pt",
            color: "#000000",
            WebkitFontSmoothing: "auto",
          }}
        >
          {HANDWRITING_DOTS}
        </div>
      ))}
    </div>
  );
}

function renderPreviewNarrativeSection(section: NarrativeSectionValue) {
  if (section.isEmpty) {
    return <HandwritingLines count={4} />;
  }

  return (
    <div className="pl-4 text-slate-800 text-[15px] sm:text-[16px] leading-relaxed" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
      {section.text}
    </div>
  );
}

export default async function SafetyReportPreviewPage({ params }: SafetyReportPreviewPageProps) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  const { reportId } = await params;
  const report = await SafetyAssessmentService.getReportById(reportId);

  if (!report) {
    notFound();
  }

  const viewModel = buildSafetyAssessmentOutputModel(report);
  const backToEditUrl = `/reports/safety/self-assessments/${report.id}`;
  const exportDocxUrl = `/api/reports/safety/self-assessments/${report.id}/export?format=docx`;
  const exportPdfUrl = `/api/reports/safety/self-assessments/${report.id}/export?format=pdf`;

  return (
    <SafetyDocumentPreviewShell
      documentCode={viewModel.officialDocumentNumber || viewModel.internalCode}
      backHref={backToEditUrl}
      wordExportUrl={exportDocxUrl}
      pdfExportUrl={exportPdfUrl}
      documentTitle="Báo cáo tự đánh giá kết quả kiểm tra ATLĐ, PCCC, VSMT"
    >
      <style>{`
        /* ===== SAFETY OFFICIAL DOCUMENT TYPOGRAPHY RESET ===== */
        [data-safety-official-document],
        [data-safety-official-document] * {
          font-family: ${SAFETY_DOCUMENT_TYPOGRAPHY.fontFamily} !important;
          font-synthesis: none;
          letter-spacing: normal;
          word-spacing: normal;
          font-kerning: normal;
          text-rendering: optimizeLegibility;
        }
        .safety-shift-label {
          font-weight: 700;
          font-style: normal;
          white-space: nowrap;
        }
        .safety-day-label {
          font-weight: 700;
          font-style: normal;
        }

        @media print {
          @page {
            size: A4 portrait;
            margin: 18mm 16mm 18mm 20mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            width: auto !important;
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          main, [data-app-shell], [data-app-frame], [data-app-main], [data-app-content], [data-print-document] {
            position: static !important;
            width: auto !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            transform: none !important;
            contain: none !important;
          }
          [data-app-sidebar], [data-app-header], [data-preview-toolbar], .no-print {
            display: none !important;
          }
          [data-safety-official-document] {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            background: #ffffff !important;
          }
        }
      `}</style>

      {/* Clean A4 Printable Page Container */}
      <article
        data-safety-official-document="true"
        className="w-[210mm] min-h-[297mm] bg-white shadow-xl border border-slate-300 p-[18mm_16mm_18mm_20mm] text-slate-900 text-[14px] leading-snug print:shadow-none print:border-none print:w-full print:p-0 print:m-0"
      >
        {/* Header Table (45% / 55%) */}
        <div className="grid grid-cols-12 gap-2 text-center text-[13px] sm:text-[14px] leading-tight mb-4">
          <div className="col-span-5 space-y-1">
            <div className="font-bold uppercase text-[12px] sm:text-[13px]">
              CÔNG TY CỔ PHẦN XÂY DỰNG
              <br />
              VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI
            </div>
            <div className="pt-1 text-[13px] font-normal text-slate-800">
              Số: {viewModel.officialDocumentNumber || "……/……"}
            </div>
          </div>

          <div className="col-span-7 space-y-1">
            <div className="font-bold uppercase text-[12px] sm:text-[13px]">
              {SAFETY_ASSESSMENT_OFFICIAL_CONTENT.countryTitleUpper}
            </div>
            <div className="font-bold text-[13px] underline decoration-slate-400 underline-offset-4">
              {SAFETY_ASSESSMENT_OFFICIAL_CONTENT.motto}
            </div>
            <div className="italic pt-1 text-[13px] text-slate-700">
              {viewModel.documentPlace}, {formatVnLongDate(viewModel.documentDate)}
            </div>
          </div>
        </div>

        {/* Document Main Title */}
        <div className="text-center my-6 space-y-1">
          <h1 className="text-[18px] sm:text-[20px] font-bold uppercase tracking-wide text-slate-900">
            {SAFETY_ASSESSMENT_OFFICIAL_CONTENT.documentTitleUpper}
          </h1>
          <div className="text-[14px] sm:text-[15px] font-bold text-slate-800 uppercase">
            ({viewModel.periodLabel})
          </div>
        </div>

        {/* Recipients Block */}
        <div className="mb-4 text-[14px] sm:text-[15px] space-y-1">
          <div className="font-bold">Kính gửi:</div>
          {viewModel.recipientsList.map((recipient, idx) => (
            <div key={idx} className="pl-4 font-normal text-slate-800">
              - {recipient}
            </div>
          ))}
        </div>

        {/* Reporter Info */}
        <div className="mb-5 text-[14px] sm:text-[15px] leading-relaxed text-justify text-slate-800">
          Tôi <span className="font-bold">{viewModel.reporterName}</span> – {viewModel.reporterTitle} –{" "}
          {viewModel.reporterDepartment} Công ty CP xây dựng và thương mại số 2 Hà Nội báo cáo kết quả kiểm tra như
          sau:
        </div>

        {/* Official Scope Statement */}
        <div className="mb-5 space-y-2">
          <h2 className="font-bold text-[15px] sm:text-[16px]">
            {SAFETY_SELF_ASSESSMENT_INSPECTION_TITLE}
          </h2>
          <div className="pl-3 space-y-1.5 text-[14px] sm:text-[15px] text-slate-800 leading-relaxed">
            {SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT.map((item) => (
              <div key={item.number} className="text-justify">
                <span className="font-bold">{item.number}.</span> {item.content}
              </div>
            ))}
          </div>
        </div>

        {/* Official 5-Column Table */}
        <div className="mb-6">
          <table className="w-full border-collapse border border-slate-900 text-[13px] sm:text-[14px] text-slate-900">
            <thead>
              <tr className="bg-slate-100 font-bold text-center uppercase border-b border-slate-900">
                <th className="border border-slate-900 p-2 w-[16%]">NGÀY KIỂM TRA</th>
                <th className="border border-slate-900 p-2 w-[28%]">CÔNG TRÌNH/NỘI DUNG KIỂM TRA</th>
                <th className="border border-slate-900 p-2 w-[19%]">ĐÁNH GIÁ CÔNG TRÌNH</th>
                <th className="border border-slate-900 p-2 w-[19%]">KIẾN NGHỊ YÊU CẦU</th>
                <th className="border border-slate-900 p-2 w-[18%]">KẾT QUẢ THỰC HIỆN</th>
              </tr>
            </thead>
            <tbody>
              {viewModel.tableRows.map((row) => (
                <tr
                  key={row.id}
                  className={row.isFirstRowOfDay ? "border-t-2 border-slate-900" : "border-t border-slate-300"}
                  style={{ breakInside: "avoid" }}
                >
                  <td className="border border-slate-900 p-2 align-top text-xs font-bold text-slate-900 text-center">
                    {row.dayName ? (
                      <>
                        <span className="safety-day-label text-[13px]">{row.dayName}</span>
                        <br />
                        <span className="text-[11px] font-normal text-slate-600">({row.dateFormatted})</span>
                        <br />
                        <span className="safety-shift-label">Buổi {row.shiftLabel}</span>
                      </>
                    ) : row.shiftLabel ? (
                      <span className="safety-shift-label">Buổi {row.shiftLabel}</span>
                    ) : null}
                  </td>
                  <td
                    className="border border-slate-900 p-2 align-top leading-snug"
                    style={{ whiteSpace: "normal", overflowWrap: "anywhere", wordBreak: "normal" }}
                  >
                    {row.projectName ? (
                      <div className="assessment-project-block">
                        <div className="text-[12px] font-bold text-slate-900">Công trình:</div>
                        <div className="text-[13px] font-semibold text-slate-800 pb-0.5">{row.projectName}</div>
                      </div>
                    ) : null}

                    {row.inspectionContent ? (
                      <div className={`assessment-inspection-block ${row.projectName ? "pt-1.5 border-t border-slate-300 mt-1" : ""}`}>
                        <div className="text-[12px] font-bold text-slate-900">Nội dung kiểm tra:</div>
                        <div className="text-[13px] text-slate-800 whitespace-pre-wrap">{row.inspectionContent}</div>
                      </div>
                    ) : null}
                  </td>
                  <td
                    className="border border-slate-900 p-2 align-top leading-snug text-slate-800"
                    style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "normal" }}
                  >
                    {row.assessment}
                  </td>
                  <td
                    className="border border-slate-900 p-2 align-top leading-snug text-slate-800"
                    style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "normal" }}
                  >
                    {row.recommendation}
                  </td>
                  <td
                    className="border border-slate-900 p-2 align-top leading-snug text-slate-800"
                    style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "normal" }}
                  >
                    {row.implementationResult}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Section I */}
        <div className="space-y-3 mb-4">
          <h3 className="section-header font-bold text-[16px] sm:text-[17px] uppercase border-b border-slate-300 pb-1" style={{ breakAfter: "avoid" }}>
            {SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionITitle}
          </h3>

          <section className="assessment-narrative-subsection space-y-1">
            <div className="assessment-narrative-label font-bold text-slate-900 text-[15px] sm:text-[16px]" style={{ breakAfter: "avoid" }}>
              {SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionISub1}
            </div>
            {renderPreviewNarrativeSection(viewModel.previousWeekRemediationSection)}
          </section>

          <section className="assessment-narrative-subsection space-y-1">
            <div className="assessment-narrative-label font-bold text-slate-900 text-[15px] sm:text-[16px]" style={{ breakAfter: "avoid" }}>
              {SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionISub2}
            </div>
            {renderPreviewNarrativeSection(viewModel.reinspectionConfirmationSection)}
          </section>
        </div>

        {/* Section II */}
        <div className="space-y-3 mb-4">
          <h3 className="section-header font-bold text-[16px] sm:text-[17px] uppercase border-b border-slate-300 pb-1" style={{ breakAfter: "avoid" }}>
            {SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionIITitle}
          </h3>

          <section className="assessment-narrative-subsection space-y-1">
            <div className="assessment-narrative-label font-bold text-slate-900 text-[15px] sm:text-[16px]" style={{ breakAfter: "avoid" }}>
              {SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionIISub1}
            </div>
            {renderPreviewNarrativeSection(viewModel.managementRecommendationSection)}
          </section>

          <section className="assessment-narrative-subsection space-y-1">
            <div className="assessment-narrative-label font-bold text-slate-900 text-[15px] sm:text-[16px]" style={{ breakAfter: "avoid" }}>
              {SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionIISub2}
            </div>
            {renderPreviewNarrativeSection(viewModel.otherOpinionSection)}
          </section>
        </div>

        {/* Footer Signature & Recipients */}
        <div className="assessment-signature-block grid grid-cols-2 gap-4 pt-6 text-[15px] sm:text-[16px]" style={{ breakInside: "avoid" }}>
          <div className="space-y-1">
            <div className="font-bold">Nơi nhận:</div>
            <div className="text-[14px] pl-3 space-y-0.5 text-slate-800">
              <div>- Như kính gửi;</div>
              <div>- Lưu KT.</div>
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="font-bold uppercase">{SAFETY_ASSESSMENT_OFFICIAL_CONTENT.reporterRoleTitleUpper}</div>
            <div className="italic text-slate-600 text-[14px]">(Ký, ghi rõ họ tên)</div>
            <div className="h-16" />
            <div className="font-bold text-slate-900 text-[16px]">{viewModel.reporterName}</div>
          </div>
        </div>
      </article>
    </SafetyDocumentPreviewShell>
  );
}
