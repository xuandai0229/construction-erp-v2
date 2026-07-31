import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, FileText, X } from "lucide-react";
import { SafetyPlanService } from "@/lib/safety-reporting/plan-service";
import { buildSafetyPlanPreviewModel } from "@/lib/safety-reporting/plan-view-model";
import { SAFETY_PLAN_OFFICIAL_CONTENT } from "@/lib/safety-reporting/safety-plan-official-content";
import { formatVnLongDate, SAFETY_DOCUMENT_TYPOGRAPHY } from "@/lib/safety-reporting/date-utils";
import { Button } from "@/components/ui/button";
import { SafetyPrintButton } from "@/components/safety/safety-print-button";
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
    <div className="min-h-screen bg-slate-200/90 font-sans print:bg-white print:p-0 flex flex-col items-center pb-12">
      <style>{`
        /* ===== SAFETY OFFICIAL DOCUMENT TYPOGRAPHY RESET =====
         * Forces ALL text inside [data-safety-official-document] to use
         * "Times New Roman" directly, bypassing Tailwind's font-serif
         * stack which includes ui-serif/Georgia/Cambria — fonts that
         * render Vietnamese bold diacritics incorrectly on many systems.
         */
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
          main, [data-app-shell], [data-app-frame], [data-app-main], [data-app-content], [data-print-scroll-container], [data-safety-official-document] {
            position: static !important;
            width: auto !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            transform: none !important;
            contain: none !important;
          }
          [data-app-sidebar], [data-app-header], [data-app-mobile-context], [data-app-bottom-nav], [data-app-mobile-nav], .sticky.top-0, .no-print {
            display: none !important;
          }
          [data-safety-official-document] {
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: 0 !important;
          }
        }
      `}</style>

      {/* Clean Official Toolbar matching Supervision Standard */}
      <div className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 shadow-sm print:hidden">
        <div className="max-w-[297mm] mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left Metadata & Back Link */}
          <div className="flex items-center gap-3">
            <Link
              href={backToEditUrl}
              className="inline-flex items-center gap-1.5 font-bold text-slate-700 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại chỉnh sửa</span>
            </Link>
          </div>

          {/* Right Action Toolbar */}
          <div className="flex items-center gap-2">
            <a href={exportDocxUrl} download={`Ke-Hoach-ATLD-${plan.id}.docx`}>
              <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50">
                <Download className="h-3.5 w-3.5 text-blue-600" />
                <span>Tải Word (.docx)</span>
              </Button>
            </a>

            <a href={exportPdfUrl} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline" className="h-8 text-xs font-bold gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50">
                <FileText className="h-3.5 w-3.5 text-rose-600" />
                <span>Tải PDF</span>
              </Button>
            </a>

            <SafetyPrintButton planId={plan.id} />

            <Link href={backToEditUrl}>
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:bg-slate-100 rounded-lg" title="Đóng">
                <X className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Preview Container with Responsive Width (max-w-[297mm]) */}
      <div className="w-full max-w-[297mm] px-4 pt-6 print:p-0 print:max-w-none">
        <div
          data-safety-official-document
          className="w-full bg-white p-8 sm:p-14 shadow-2xl print:shadow-none print:p-0 print:max-w-none text-slate-900 leading-relaxed rounded-xl print:rounded-none border border-slate-200/80 print:border-none"
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
              {/* National Motto MUST BE ON EXACTLY ONE LINE */}
              <div className="font-bold text-[14px] sm:text-[15px] uppercase whitespace-nowrap overflow-hidden text-ellipsis">
                {SAFETY_PLAN_OFFICIAL_CONTENT.countryTitleUpper}
              </div>
              <div className="font-bold text-[14px] sm:text-[15px]">{SAFETY_PLAN_OFFICIAL_CONTENT.motto}</div>
              <div className="w-32 border-b border-slate-900 mx-auto my-1"></div>
              <div className="text-[14px] sm:text-[15px] pt-1 italic">
                {viewModel.place || "Hà Nội"}, {formatVnLongDate(plan.createdDate)}
              </div>
            </div>
          </div>

          {/* Title */}
          <div className="text-center space-y-1 py-3 mb-6">
            <h1 className="font-bold text-[20px] sm:text-[22px] uppercase text-slate-900">
              {SAFETY_PLAN_OFFICIAL_CONTENT.documentTitleUpper}
            </h1>
            <div className="font-bold text-[15px] sm:text-[16px] uppercase text-slate-800">
              ({viewModel.periodLabel})
            </div>
          </div>

          {/* Kính gửi */}
          <div className="space-y-1 text-[15px] sm:text-[16px] mb-6">
            <div className="font-bold italic">Kính gửi:</div>
            <div className="pl-6 space-y-0.5">
              {viewModel.recipientName
                ? viewModel.recipientName.split(",").map((r, i) => <div key={i}>- {r.trim()}</div>)
                : SAFETY_PLAN_OFFICIAL_CONTENT.recipientsDefault.map((r, i) => <div key={i}>- {r}</div>)
              }
            </div>
          </div>

          {/* Căn cứ & Intro */}
          <div className="space-y-2 text-[15px] sm:text-[16px] leading-relaxed mb-6">
            {SAFETY_PLAN_OFFICIAL_CONTENT.legalBases.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>

          {/* Section I */}
          <div className="space-y-2 mb-6">
            <h3 className="font-bold text-[16px] sm:text-[17px] uppercase border-b border-slate-200 pb-1">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionI.title}</h3>
            <p className="text-[15px] sm:text-[16px]">
              {SAFETY_PLAN_OFFICIAL_CONTENT.sectionI.content}
            </p>
          </div>

          {/* Section II */}
          <div className="space-y-3 mb-6">
            <h3 className="font-bold text-[16px] sm:text-[17px] uppercase border-b border-slate-200 pb-1">
              {SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.title}
            </h3>

            <div className="space-y-1 text-[15px] sm:text-[16px]">
              <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part1.title}</div>
              <div className="space-y-0.5 text-slate-800">
                {SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part1.items.map(renderPreviewItemText)}
              </div>
            </div>

            <div className="space-y-1 text-[15px] sm:text-[16px] pt-2">
              <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part2.title}</div>
              <div className="space-y-0.5 text-slate-800">
                {SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part2.items.map(renderPreviewItemText)}
              </div>
            </div>
          </div>

          {/* Section III */}
          <div className="space-y-3 mb-6">
            <h3 className="font-bold text-[16px] sm:text-[17px] uppercase border-b border-slate-200 pb-1">
              {SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.title}
            </h3>

            <div className="space-y-1 text-[15px] sm:text-[16px]">
              <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part1.title}</div>
              <div className="space-y-0.5 text-slate-800">
                {SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part1.items.map(renderPreviewItemText)}
              </div>
            </div>

            <div className="space-y-1 text-[15px] sm:text-[16px] pt-2">
              <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part2.title}</div>
              <div className="space-y-0.5 text-slate-800">
                {SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part2.items.map(renderPreviewItemText)}
              </div>
            </div>

            <div className="space-y-1 text-[15px] sm:text-[16px] pt-2">
              <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part3.title}</div>
              <div className="space-y-0.5 text-slate-800">
                {SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part3.items.map(renderPreviewItemText)}
              </div>
            </div>

            <div className="space-y-1 text-[15px] sm:text-[16px] pt-2">
              <div className="font-bold text-slate-900">{SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part4.title}</div>
              <div className="space-y-0.5 text-slate-800">
                {SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part4.items.map(renderPreviewItemText)}
              </div>
            </div>
          </div>

          {/* Section IV: Pre-paginated A4-Safe Table Matrix */}
          <div className="space-y-3 mb-6 overflow-x-auto">
            <h3 className="font-bold text-[16px] sm:text-[17px] uppercase border-b border-slate-200 pb-1">
              IV. BÁO CÁO KẾ HOẠCH KIỂM TRA CHI TIẾT
            </h3>
            <table
              className="w-full border-collapse border border-slate-900 text-left text-[14px]"
              style={{ tableLayout: "fixed", width: "100%" }}
            >
              <thead>
                <tr className="bg-slate-100 font-bold border-b border-slate-900 text-center">
                  <th className="border border-slate-900 p-2.5 w-[17%]">NGÀY KIỂM TRA</th>
                  <th className="border border-slate-900 p-2.5 w-[27%]">CÔNG TRÌNH KIỂM TRA</th>
                  <th className="border border-slate-900 p-2.5 w-[34%]">NỘI DUNG KIỂM TRA, HUẤN LUYỆN</th>
                  <th className="border border-slate-900 p-2.5 w-[22%]">PHÁT SINH THAY ĐỔI</th>
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
                          <br />
                          <span className="safety-shift-label">{row.shiftLabel}</span>
                        </>
                      ) : row.shiftLabel ? (
                        <span className="safety-shift-label">{row.shiftLabel}</span>
                      ) : null}
                    </td>
                    <td
                      className="border border-slate-900 p-2.5 align-top leading-snug"
                      style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "normal" }}
                    >
                      {row.projectName}
                    </td>
                    <td
                      className="border border-slate-900 p-2.5 align-top leading-snug"
                      style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", wordBreak: "normal" }}
                    >
                      {row.inspectionContent}
                    </td>
                    <td
                      className="border border-slate-900 p-2.5 align-top leading-snug text-slate-800"
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
        </div>
      </div>
    </div>
  );
}
