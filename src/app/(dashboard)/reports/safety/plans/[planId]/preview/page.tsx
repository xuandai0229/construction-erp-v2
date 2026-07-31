import { notFound } from "next/navigation";
import { SafetyPlanService } from "@/lib/safety-reporting/plan-service";
import { buildSafetyPlanPreviewModel } from "@/lib/safety-reporting/plan-view-model";
import { SAFETY_PLAN_OFFICIAL_CONTENT } from "@/lib/safety-reporting/safety-plan-official-content";
import { formatVnLongDate, SAFETY_DOCUMENT_TYPOGRAPHY } from "@/lib/safety-reporting/date-utils";
import { SafetyDocumentPreviewShell } from "@/components/safety/safety-document-preview-shell";
import { paginateSafetyPlanTableRows } from "@/lib/safety-reporting/table-paginator";

interface SafetyPlanPreviewPageProps {
  params: Promise<{ planId: string }>;
}

function renderPreviewItemText(item: string, idx: number) {
  const trimmed = item.trim();
  if (trimmed.startsWith("+")) {
    return <div key={idx} className="pl-6">{trimmed}</div>;
  }
  if (trimmed.startsWith("-") || /^[a-z]\./i.test(trimmed)) {
    return <div key={idx} className="pl-4">{trimmed}</div>;
  }
  return <div key={idx}>• {trimmed}</div>;
}

export default async function SafetyPlanPreviewPage({ params }: SafetyPlanPreviewPageProps) {
  const { planId } = await params;
  const plan = await SafetyPlanService.getPlanById(planId);

  if (!plan) {
    notFound();
  }

  const viewModel = buildSafetyPlanPreviewModel(plan);
  const backToEditUrl = `/reports/safety/plans/${plan.id}`;
  const exportDocxUrl = `/api/reports/safety/plans/${plan.id}/export?format=docx`;
  const exportPdfUrl = `/api/reports/safety/plans/${plan.id}/export?format=pdf`;

  const physicalRows = paginateSafetyPlanTableRows(viewModel);

  return (
    <SafetyDocumentPreviewShell
      documentCode={viewModel.displayDocumentNumber}
      backHref={backToEditUrl}
      wordExportUrl={exportDocxUrl}
      pdfExportUrl={exportPdfUrl}
      documentTitle="Kế hoạch kiểm tra ATLĐ, PCCC, VSMT"
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
            margin: 18mm 15mm 18mm 20mm;
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
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            background: #ffffff !important;
          }
        }
      `}</style>

      {/* Main Preview Container */}
      <article
        data-safety-official-document="true"
        className="w-[210mm] min-h-[297mm] bg-white shadow-xl border border-slate-300 p-[18mm_15mm_18mm_20mm] text-slate-900 leading-relaxed print:shadow-none print:border-none print:w-full print:p-0 print:m-0"
        style={{
          fontFamily: SAFETY_DOCUMENT_TYPOGRAPHY.fontFamily,
          letterSpacing: "normal",
          wordSpacing: "normal",
          fontKerning: "normal",
          fontSynthesis: "none",
          textRendering: "optimizeLegibility",
        }}
      >
        {/* Document Administrative Header (44% / 56%) */}
        <div className="flex border-b border-slate-200 pb-6 mb-6">
          <div className="w-[44%] text-center space-y-1 pr-2 border-r border-slate-100">
            <div className="font-bold text-[15px] sm:text-[16px] uppercase">{SAFETY_PLAN_OFFICIAL_CONTENT.companyNameUpper.split(" VÀ ")[0]}</div>
            <div className="font-bold text-[15px] sm:text-[16px] uppercase">VÀ {SAFETY_PLAN_OFFICIAL_CONTENT.companyNameUpper.split(" VÀ ")[1]}</div>
            <div className="text-[14px] sm:text-[15px] pt-1">
              Số: <span className="font-bold">{viewModel.displayDocumentNumber}</span>
            </div>
          </div>

          <div className="w-[56%] text-center space-y-1 pl-2">
            <div className="font-bold text-[15px] sm:text-[16px] uppercase">
              {SAFETY_PLAN_OFFICIAL_CONTENT.countryTitleUpper}
            </div>
            <div className="font-bold text-[15px] sm:text-[16px] underline decoration-slate-400 underline-offset-4">
              {SAFETY_PLAN_OFFICIAL_CONTENT.motto}
            </div>
            <div className="italic text-[14px] sm:text-[15px] pt-1">
              {viewModel.place}, {viewModel.createdDateFormatted}
            </div>
          </div>
        </div>

        {/* Title Section */}
        <div className="text-center my-6 space-y-1">
          <h1 className="text-[18px] sm:text-[20px] font-bold uppercase tracking-wide text-slate-900">
            {SAFETY_PLAN_OFFICIAL_CONTENT.documentTitleUpper}
          </h1>
          <div className="text-[15px] sm:text-[16px] font-bold text-slate-800 uppercase">
            ({viewModel.periodLabel})
          </div>
        </div>

        {/* Recipients Block */}
        <div className="mb-6 text-[15px] sm:text-[16px] space-y-1">
          <div className="font-bold">Kính gửi:</div>
          {[viewModel.recipientName, viewModel.recipientTitle].filter(Boolean).map((recipient: string, idx: number) => (
            <div key={idx} className="pl-4">
              - {recipient}
            </div>
          ))}
        </div>

        {/* Standard Safety Purpose & Content Sections */}
        <div className="space-y-4 mb-6 text-[15px] sm:text-[16px]">
          <div className="space-y-1">
            <div className="font-bold uppercase text-[15px] sm:text-[16px]">
              {SAFETY_PLAN_OFFICIAL_CONTENT.sectionI.title}
            </div>
            <div className="pl-4 text-justify text-slate-800 leading-relaxed">
              {SAFETY_PLAN_OFFICIAL_CONTENT.sectionI.content}
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-bold uppercase text-[15px] sm:text-[16px]">
              {SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.title}
            </div>
            <div className="pl-4 space-y-2">
              <div>
                <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part1.title}</div>
                <div className="pl-4 space-y-1 text-slate-800">
                  {SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part1.items.map((item, idx) => renderPreviewItemText(item, idx))}
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part2.title}</div>
                <div className="pl-4 space-y-1 text-slate-800">
                  {SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part2.items.map((item, idx) => renderPreviewItemText(item, idx))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-bold uppercase text-[15px] sm:text-[16px]">
              {SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.title}
            </div>
            <div className="pl-4 space-y-2">
              <div>
                <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part1.title}</div>
                <div className="pl-4 space-y-1 text-slate-800">
                  {SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part1.items.map((item, idx) => renderPreviewItemText(item, idx))}
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part2.title}</div>
                <div className="pl-4 space-y-1 text-slate-800">
                  {SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part2.items.map((item, idx) => renderPreviewItemText(item, idx))}
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part3.title}</div>
                <div className="pl-4 space-y-1 text-slate-800">
                  {SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part3.items.map((item, idx) => renderPreviewItemText(item, idx))}
                </div>
              </div>
              <div>
                <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part4.title}</div>
                <div className="pl-4 space-y-1 text-slate-800">
                  {SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part4.items.map((item, idx) => renderPreviewItemText(item, idx))}
                </div>
              </div>
            </div>
          </div>

          <div className="font-bold uppercase text-[15px] sm:text-[16px] pt-2">
            IV. {SAFETY_PLAN_OFFICIAL_CONTENT.scheduleTitleUpper}
          </div>
        </div>

        {/* Weekly Inspection Table */}
        <div className="mb-6">
          <table className="w-full border-collapse border border-slate-900 text-[13px] sm:text-[14px] text-slate-900">
            <thead>
              <tr className="bg-slate-100 font-bold text-center uppercase border-b border-slate-900">
                <th className="border border-slate-900 p-2.5 w-[22%]">NGÀY KIỂM TRA</th>
                <th className="border border-slate-900 p-2.5 w-[28%]">CÔNG TRÌNH KIỂM TRA</th>
                <th className="border border-slate-900 p-2.5 w-[28%]">NỘI DUNG KIỂM TRA</th>
                <th className="border border-slate-900 p-2.5 w-[22%]">GHI CHÚ</th>
              </tr>
            </thead>
            <tbody>
              {physicalRows.map((row) => (
                <tr
                  key={row.rowId}
                  className={row.isDayStart ? "border-t-2 border-slate-900" : "border-t border-slate-300"}
                  style={{ breakInside: "avoid" }}
                >
                  <td className="border border-slate-900 p-2 align-top text-xs font-bold text-slate-900">
                    {row.dayName ? (
                      <>
                        <span className="safety-day-label">{row.dayName}</span>
                        {row.shiftLabel && (
                          <>
                            <br />
                            <span className="safety-shift-label">Buổi {row.shiftLabel}</span>
                          </>
                        )}
                      </>
                    ) : row.shiftLabel ? (
                      <span className="safety-shift-label">Buổi {row.shiftLabel}</span>
                    ) : null}
                  </td>
                  <td
                    className="border border-slate-900 p-2.5 align-top font-semibold text-slate-900 leading-snug"
                    style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "normal" }}
                  >
                    {row.projectName}
                  </td>
                  <td
                    className="border border-slate-900 p-2.5 align-top text-slate-800 leading-snug"
                    style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "normal" }}
                  >
                    {row.inspectionContent}
                  </td>
                  <td
                    className="border border-slate-900 p-2.5 align-top text-slate-700 leading-snug"
                    style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "normal" }}
                  >
                    {row.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Conclusion & Signing */}
        <div className="space-y-4 pt-4 text-[15px] sm:text-[16px]">
          <p>
            Trên đây là kế hoạch kiểm tra công trình tuần ({viewModel.periodLabel}). Đề nghị Ban chỉ huy công trình phối hợp thực hiện.
          </p>
          <p>
            Kế hoạch huấn luyện cho công nhân trên công trường Ban chỉ huy, chỉ huy trưởng phối hợp tổ chức huấn luyện tại công trình.
          </p>
        </div>

        {/* Signature Grid */}
        <div className="grid grid-cols-2 gap-4 pt-8 text-[15px] sm:text-[16px] break-inside-avoid">
          <div className="space-y-1">
            <div className="font-bold">Nơi nhận:</div>
            <div className="text-[14px] pl-3 space-y-0.5 text-slate-800">
              <div>- Như kính gửi;</div>
              <div>+ Phòng KT;</div>
              <div>+ Đơn vị (BCH);</div>
              <div>- Lưu KT.</div>
            </div>
          </div>

          <div className="text-center space-y-1">
            <div className="font-bold uppercase">
              {viewModel.recipientTitle ? viewModel.recipientTitle.split(",")[0].trim() : "PHÒNG KĨ THUẬT"}
            </div>
            <div className="italic text-slate-700">Người lập</div>
            <div className="pt-20 font-bold text-slate-900">{viewModel.authorName}</div>
          </div>
        </div>
      </article>
    </SafetyDocumentPreviewShell>
  );
}
