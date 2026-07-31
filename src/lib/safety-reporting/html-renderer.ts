import { SafetyPlanPreviewViewModel } from "./plan-view-model";
import { SAFETY_PLAN_OFFICIAL_CONTENT } from "./safety-plan-official-content";
import { paginateSafetyPlanTableRows } from "./table-paginator";
import { normalizeVietnameseText, SAFETY_DOCUMENT_TYPOGRAPHY } from "./date-utils";

/**
 * Clean helper to render official text line without adding duplicate '• +' or '• -' bullets.
 */
function renderItemText(item: string): string {
  const trimmed = normalizeVietnameseText(item.trim());
  if (trimmed.startsWith("+") || trimmed.startsWith("-") || /^[a-z]\./i.test(trimmed)) {
    return `<div style="padding-left: ${trimmed.startsWith("+") ? "16pt" : "0"}; margin-bottom: 3pt;">${escapeHtml(trimmed)}</div>`;
  }
  return `<div style="margin-bottom: 3pt;">• ${escapeHtml(trimmed)}</div>`;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  const normalized = normalizeVietnameseText(str);
  return normalized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Renders a self-contained, standalone A4 HTML document string for PDF conversion and offline printing.
 * Guarantees BOLD UPRIGHT day/date (e.g. "Thứ Hai, 20/07/2026") and BOLD UPRIGHT shift labels (Sáng:, Chiều:, Tối:).
 */
export function renderSafetyPlanStandaloneHtml(viewModel: SafetyPlanPreviewViewModel): string {
  const recipientsList = viewModel.recipientName
    ? viewModel.recipientName.split(",").map((r) => `- ${normalizeVietnameseText(r.trim())}`)
    : SAFETY_PLAN_OFFICIAL_CONTENT.recipientsDefault.map((r) => `- ${normalizeVietnameseText(r)}`);

  const physicalRows = paginateSafetyPlanTableRows(viewModel);

  const tableRowsHtml = physicalRows
    .map((row) => {
      let timeCellHtml = "";
      if (row.dayName) {
        timeCellHtml = `<strong>${escapeHtml(row.dayName)}</strong><br/><strong>${escapeHtml(row.shiftLabel)}</strong>`;
      } else if (row.shiftLabel) {
        timeCellHtml = `<strong>${escapeHtml(row.shiftLabel)}</strong>`;
      }

      return `
        <tr class="${row.isDayStart ? "day-start-row" : ""}">
          <td class="time-cell">${timeCellHtml}</td>
          <td class="data-cell">${escapeHtml(row.projectName)}</td>
          <td class="data-cell">${escapeHtml(row.inspectionContent)}</td>
          <td class="data-cell">${escapeHtml(row.note)}</td>
        </tr>
      `;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Kế hoạch ATLĐ (Mẫu 02) - ${escapeHtml(viewModel.displayDocumentNumber)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 15mm 18mm 20mm;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: ${SAFETY_DOCUMENT_TYPOGRAPHY.fontFamily};
      font-size: 13pt;
      line-height: 1.3;
      font-synthesis: none;
    }
    /* Force all elements to inherit the document font */
    * {
      box-sizing: border-box;
      font-family: inherit;
    }
    .page-container {
      width: 100%;
      max-width: 100%;
      margin: 0 auto;
      padding: 0;
    }
    /* Header Table 44% / 56% */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12pt;
      table-layout: fixed;
    }
    .header-table td {
      vertical-align: top;
      text-align: center;
      padding: 0;
    }
    .header-left {
      width: 44%;
    }
    .header-right {
      width: 56%;
    }
    /* National Motto MUST BE ON EXACTLY ONE LINE */
    .motto-national {
      font-size: 12pt;
      font-weight: bold;
      white-space: nowrap !important;
      overflow: hidden;
      text-overflow: clip;
      display: block;
      margin: 0 auto;
    }
    .doc-title {
      text-align: center;
      margin: 14pt 0 6pt 0;
    }
    .doc-title h1 {
      font-size: 15pt;
      font-weight: bold;
      margin: 0;
      text-transform: uppercase;
    }
    .doc-title h2 {
      font-size: 13pt;
      font-weight: bold;
      margin: 4pt 0 0 0;
      text-transform: uppercase;
    }
    .recipients {
      margin: 12pt 0;
    }
    .legal-bases {
      margin: 10pt 0;
    }
    .section-title {
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 12pt 0 6pt 0;
      break-after: avoid;
      page-break-after: avoid;
    }
    .content-block {
      margin: 4pt 0 10pt 0;
    }
    /* 4-Column Table with Explicit Cell Borders on Every Cell */
    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      border-spacing: 0;
      margin: 12pt 0;
      table-layout: fixed;
    }
    .schedule-table th, .schedule-table td {
      border: 0.75pt solid #000000;
      padding: 5pt 6pt;
      vertical-align: top;
      word-wrap: break-word;
      overflow-wrap: anywhere;
      box-sizing: border-box;
    }
    .schedule-table th {
      background-color: #f2f2f2;
      font-weight: bold;
      text-align: center;
      font-size: 12pt;
    }
    .schedule-table thead {
      display: table-header-group;
    }
    .schedule-table tfoot {
      display: table-footer-group;
    }
    .schedule-table tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    .day-start-row td {
      border-top: 1.25pt solid #000000;
    }
    .time-cell {
      width: 17%;
      font-size: 11pt;
      line-height: 1.25;
      font-weight: bold;
      font-style: normal;
      color: #000000;
      font-family: ${SAFETY_DOCUMENT_TYPOGRAPHY.fontFamily};
      font-synthesis: none;
      letter-spacing: normal;
      word-spacing: normal;
      white-space: nowrap;
    }
    .time-cell strong, .time-cell b {
      font-weight: bold;
      font-style: normal;
      color: #000000;
    }
    .data-cell {
      white-space: pre-wrap;
      font-size: 12pt;
      min-height: 20pt;
    }
    .signature-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 16pt;
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .signature-table td {
      vertical-align: top;
      border: none;
      padding: 0;
    }
  </style>
</head>
<body>
  <div class="page-container">
    <!-- Header Table (44% / 56%) -->
    <table class="header-table">
      <tr>
        <td class="header-left">
          <strong>${escapeHtml(SAFETY_PLAN_OFFICIAL_CONTENT.companyNameUpper.split(" VÀ ")[0])}</strong><br>
          <strong>VÀ ${escapeHtml(SAFETY_PLAN_OFFICIAL_CONTENT.companyNameUpper.split(" VÀ ")[1])}</strong><br>
          <span>Số: <strong>${escapeHtml(viewModel.displayDocumentNumber)}</strong></span>
        </td>
        <td class="header-right">
          <div class="motto-national">${escapeHtml(SAFETY_PLAN_OFFICIAL_CONTENT.countryTitleUpper)}</div>
          <strong>${escapeHtml(SAFETY_PLAN_OFFICIAL_CONTENT.motto)}</strong><br>
          <div style="width: 120pt; border-bottom: 0.75pt solid #000; margin: 2pt auto 4pt auto;"></div>
          <em>${escapeHtml(viewModel.place || "Hà Nội")}, ${escapeHtml(viewModel.createdDateFormatted)}</em>
        </td>
      </tr>
    </table>

    <!-- Document Title -->
    <div class="doc-title">
      <h1>${escapeHtml(SAFETY_PLAN_OFFICIAL_CONTENT.documentTitleUpper)}</h1>
      <h2>(${escapeHtml(viewModel.periodLabel)})</h2>
    </div>

    <!-- Recipients -->
    <div class="recipients">
      <strong><em>Kính gửi:</em></strong>
      <div style="padding-left: 16pt;">
        ${recipientsList.map((r) => `<div>${escapeHtml(r)}</div>`).join("\n")}
      </div>
    </div>

    <!-- Legal Bases -->
    <div class="legal-bases">
      ${SAFETY_PLAN_OFFICIAL_CONTENT.legalBases.map((b) => `<div>${escapeHtml(b)}</div>`).join("\n")}
    </div>

    <!-- Section I -->
    <div class="section-title">${escapeHtml(SAFETY_PLAN_OFFICIAL_CONTENT.sectionI.title)}</div>
    <div>${escapeHtml(SAFETY_PLAN_OFFICIAL_CONTENT.sectionI.content)}</div>

    <!-- Section II -->
    <div class="section-title">${escapeHtml(SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.title)}</div>
    <div style="font-weight: bold; margin-top: 4pt;">${escapeHtml(SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part1.title)}</div>
    <div class="content-block">
      ${SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part1.items.map(renderItemText).join("\n")}
    </div>
    <div style="font-weight: bold; margin-top: 6pt;">${escapeHtml(SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part2.title)}</div>
    <div class="content-block">
      ${SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part2.items.map(renderItemText).join("\n")}
    </div>

    <!-- Section III -->
    <div class="section-title">${escapeHtml(SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.title)}</div>
    <div style="font-weight: bold; margin-top: 4pt;">${escapeHtml(SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part1.title)}</div>
    <div class="content-block">
      ${SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part1.items.map(renderItemText).join("\n")}
    </div>
    <div style="font-weight: bold; margin-top: 6pt;">${escapeHtml(SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part2.title)}</div>
    <div class="content-block">
      ${SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part2.items.map(renderItemText).join("\n")}
    </div>
    <div style="font-weight: bold; margin-top: 6pt;">${escapeHtml(SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part3.title)}</div>
    <div class="content-block">
      ${SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part3.items.map(renderItemText).join("\n")}
    </div>
    <div style="font-weight: bold; margin-top: 6pt;">${escapeHtml(SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part4.title)}</div>
    <div class="content-block">
      ${SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part4.items.map(renderItemText).join("\n")}
    </div>

    <!-- Section IV / Schedule Table -->
    <div class="section-title">IV. BÁO CÁO KẾ HOẠCH KIỂM TRA CHI TIẾT</div>
    <table class="schedule-table">
      <thead>
        <tr>
          <th style="width: 17%;">NGÀY KIỂM TRA</th>
          <th style="width: 27%;">CÔNG TRÌNH KIỂM TRA</th>
          <th style="width: 34%;">NỘI DUNG KIỂM TRA, HUẤN LUYỆN</th>
          <th style="width: 22%;">PHÁT SINH THAY ĐỔI</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>

    <!-- Conclusion & Signatures -->
    <div style="margin-top: 12pt;">
      <p>Trên đây là kế hoạch kiểm tra công trình tuần (${escapeHtml(viewModel.periodLabel)}). Đề nghị Ban chỉ huy công trình phối hợp thực hiện.</p>
      <p>Kế hoạch huấn luyện cho công nhân trên công trường Ban chỉ huy, chỉ huy trưởng phối hợp tổ chức huấn luyện tại công trình.</p>
    </div>

    <table class="signature-table">
      <tr>
        <td style="width: 50%;">
          <strong>Nơi nhận:</strong><br>
          <div style="padding-left: 12pt;">
            - Như kính gửi;<br>
            + Phòng KT;<br>
            + Đơn vị (BCH);<br>
            - Lưu KT.
          </div>
        </td>
        <td style="width: 50%; text-align: center;">
          <strong>${escapeHtml(viewModel.recipientTitle ? viewModel.recipientTitle.split(",")[0].trim().toUpperCase() : "PHÒNG KĨ THUẬT")}</strong><br>
          <em>Người lập</em><br><br><br><br>
          <strong>${escapeHtml(viewModel.authorName)}</strong>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}
