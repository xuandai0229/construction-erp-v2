import { buildSafetyAssessmentOutputModel, SafetyAssessmentOutputModel, NarrativeSectionValue } from './assessment-view-model';
import {
  SAFETY_ASSESSMENT_OFFICIAL_CONTENT,
  SAFETY_SELF_ASSESSMENT_INSPECTION_TITLE,
  SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT,
} from './safety-assessment-official-content';

const HANDWRITING_DOTS = "................................................................................................................................................................................................................................";

function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMultilines(text: string | null | undefined): string {
  if (!text) return '';
  return escapeHtml(text).replace(/\n/g, '<br/>');
}

function renderSectionContentHtml(section: NarrativeSectionValue): string {
  if (section.isEmpty) {
    const linesHtml = Array.from({ length: 4 }, () =>
      `<div class="assessment-handwriting-text-line" aria-hidden="true">${HANDWRITING_DOTS}</div>`
    ).join('');

    return `<div class="assessment-handwriting-lines" aria-label="Vùng để viết bổ sung">${linesHtml}</div>`;
  }
  return `<div class="assessment-narrative-value">${formatMultilines(section.text)}</div>`;
}

export function renderSafetyAssessmentHtml(reportInput: any): string {
  const model: SafetyAssessmentOutputModel = reportInput && Array.isArray(reportInput.tableRows)
    ? reportInput
    : buildSafetyAssessmentOutputModel(reportInput);

  const docNo = model.officialDocumentNumber ? escapeHtml(model.officialDocumentNumber) : '……/……';
  const placeDateStr = `${escapeHtml(model.documentPlace)}, ${model.documentDateFormatted}`;
  const periodUpper = escapeHtml(model.periodLabel).toUpperCase();

  const recipientsHtml = model.recipientsList.length > 0
    ? model.recipientsList.map(r => `<div>- ${escapeHtml(r)}</div>`).join('')
    : '<div>- Ban Giám đốc Công ty;</div><div>- Phòng kỹ thuật</div>';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(model.internalCode)} - Báo cáo tự đánh giá ATLĐ, PCCC, VSMT</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 16mm 18mm 20mm;
    }
    *, *:before, *:after {
      box-sizing: border-box;
    }
    body {
      font-family: "Times New Roman", Times, serif;
      font-size: 13pt;
      line-height: 1.4;
      color: #000000;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .a4-container {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
      padding: 0;
    }
    
    /* Header table (2 columns) */
    .header-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .header-table td {
      vertical-align: top;
      padding: 0;
    }
    .header-left {
      width: 45%;
      text-align: center;
    }
    .header-right {
      width: 55%;
      text-align: center;
    }
    .company-title {
      font-weight: bold;
      font-size: 11.5pt;
      text-transform: uppercase;
    }
    .doc-no {
      font-size: 12pt;
      margin-top: 4px;
    }
    .motto-country {
      font-weight: bold;
      font-size: 11.5pt;
      text-transform: uppercase;
    }
    .motto-sub {
      font-weight: bold;
      font-size: 12pt;
      margin-top: 2px;
    }
    .motto-line {
      width: 120px;
      height: 1px;
      background: #000;
      margin: 4px auto 6px auto;
    }
    .doc-place-date {
      font-style: italic;
      font-size: 12pt;
      margin-top: 4px;
    }

    /* Document Title */
    .doc-main-title {
      text-align: center;
      font-weight: bold;
      font-size: 14pt;
      text-transform: uppercase;
      margin-top: 15px;
      margin-bottom: 4px;
    }
    .doc-sub-title {
      text-align: center;
      font-weight: bold;
      font-size: 12.5pt;
      text-transform: uppercase;
      margin-bottom: 20px;
    }

    /* Opening section */
    .opening-section {
      margin-bottom: 15px;
      font-size: 13pt;
    }
    .opening-kinh-gui {
      font-weight: bold;
      font-style: italic;
      margin-bottom: 4px;
    }
    .opening-recipients {
      padding-left: 20px;
      margin-bottom: 10px;
    }
    .opening-legal {
      margin-bottom: 10px;
      line-height: 1.45;
    }
    .opening-reporter {
      margin-bottom: 15px;
      line-height: 1.45;
      text-align: justify;
    }

    /* Inspection Results Table - 5 Columns */
    .inspection-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 12px;
      page-break-inside: auto;
    }
    .inspection-table th,
    .inspection-table td {
      border: 1px solid #000000;
      padding: 3px 5px;
      font-size: 10pt;
      line-height: 1.25;
      vertical-align: middle;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }
    .inspection-table th {
      background-color: #f2f2f2;
      font-weight: bold;
      text-align: center;
      vertical-align: middle;
      text-transform: uppercase;
      font-size: 9.5pt;
      padding: 4px 4px;
    }
    .inspection-table tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    .col-date { width: 15%; text-align: center; }
    .col-content { width: 27%; }
    .col-assessment { width: 20%; }
    .col-recommendation { width: 20%; }
    .col-result { width: 18%; }

    .day-shift-title {
      font-weight: bold;
      font-size: 11pt;
    }

    /* Column 2 Project & Inspection Content Cell */
    .assessment-project-content-cell {
      white-space: normal;
      overflow-wrap: anywhere;
      word-break: normal;
      line-height: 1.3;
      text-align: left;
    }
    .assessment-cell-label {
      font-weight: 700;
      font-size: 9pt;
      margin-bottom: 1px;
      color: #000000;
    }
    .assessment-project-name {
      font-weight: 600;
      font-size: 9.5pt;
      color: #111111;
    }
    .assessment-inspection-content {
      font-weight: 400;
      font-size: 9.5pt;
      color: #111111;
      white-space: pre-wrap;
    }

    /* Section I & II */
    .report-section {
      margin-top: 15px;
      margin-bottom: 15px;
      page-break-inside: auto;
    }
    .section-header {
      font-weight: bold;
      font-size: 13pt;
      text-transform: uppercase;
      margin-top: 5mm;
      margin-bottom: 3mm;
      page-break-after: avoid;
      break-after: avoid;
    }

    /* Subsection & Real Text Dot Handwriting Lines */
    .assessment-narrative-subsection {
      margin-top: 2mm;
      margin-bottom: 3mm;
    }
    .assessment-narrative-label {
      font-weight: bold;
      font-size: 12.5pt;
      margin-top: 3mm;
      margin-bottom: 2mm;
      page-break-after: avoid;
      break-after: avoid;
    }
    .assessment-handwriting-lines {
      width: 100%;
      margin: 3mm 0 4mm;
      padding-left: 5mm;
      padding-right: 1mm;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .assessment-handwriting-text-line {
      width: 100%;
      height: 6mm;
      overflow: hidden;
      white-space: nowrap;
      font-family: "Times New Roman", Times, serif;
      font-size: 12pt;
      font-weight: 400;
      font-style: normal;
      line-height: 6mm;
      letter-spacing: 0.7pt;
      color: #000000;
      text-rendering: geometricPrecision;
      -webkit-font-smoothing: auto;
    }
    .assessment-narrative-value {
      font-size: 12pt;
      margin-left: 5mm;
      min-height: 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    /* Signature Block */
    .assessment-signature-block {
      margin-top: 8mm;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* Footer Table */
    .footer-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .footer-table td {
      vertical-align: top;
      padding: 0;
    }
    .footer-left {
      width: 50%;
      text-align: left;
      font-size: 11.5pt;
    }
    .footer-right {
      width: 50%;
      text-align: center;
      font-size: 12pt;
    }
    .footer-left-title {
      font-weight: bold;
      margin-bottom: 4px;
    }
    .footer-left-item {
      margin-bottom: 2px;
    }
    .reporter-role {
      font-weight: bold;
      text-transform: uppercase;
      font-size: 12pt;
    }
    .reporter-sign {
      font-style: italic;
      margin-top: 2px;
      margin-bottom: 60px;
    }
    .reporter-name {
      font-weight: bold;
      font-size: 12.5pt;
    }

    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .a4-container {
        width: 100%;
        max-width: none;
        box-shadow: none;
      }
      thead { display: table-header-group; }
      tr { page-break-inside: avoid; }
      .section-header,
      .assessment-narrative-label {
        break-after: avoid;
        page-break-after: avoid;
      }
      .assessment-handwriting-lines,
      .assessment-signature-block {
        break-inside: avoid;
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="a4-container">
    <!-- Header Table -->
    <table class="header-table">
      <tr>
        <td class="header-left">
          <div class="company-title">CÔNG TY CỔ PHẦN XÂY DỰNG</div>
          <div class="company-title">VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI</div>
          <div class="doc-no">Số: ${docNo}</div>
        </td>
        <td class="header-right">
          <div class="motto-country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div class="motto-sub">Độc lập - Tự do - Hạnh phúc</div>
          <div class="motto-line"></div>
          <div class="doc-place-date">${placeDateStr}</div>
        </td>
      </tr>
    </table>

    <!-- Title -->
    <div class="doc-main-title">BÁO CÁO TỰ ĐÁNH GIÁ KẾT QUẢ KIỂM TRA ATLĐ, PCCC, VSMT</div>
    <div class="doc-sub-title">(${periodUpper})</div>

    <!-- Opening Section -->
    <div class="opening-section">
      <div class="opening-kinh-gui">Kính gửi:</div>
      <div class="opening-recipients">
        ${recipientsHtml}
      </div>

      <div class="opening-legal">
        ${SAFETY_ASSESSMENT_OFFICIAL_CONTENT.legalBases.map(l => `<div>- ${escapeHtml(l)}</div>`).join('')}
      </div>

      <div class="opening-reporter">
        Tôi <strong>${escapeHtml(model.reporterName)}</strong> – ${escapeHtml(model.reporterTitle)} – ${escapeHtml(model.reporterDepartment)} Công ty CP xây dựng và thương mại số 2 Hà Nội báo cáo kết quả kiểm tra như sau:
      </div>

      <div style="margin-top: 12px; margin-bottom: 15px; page-break-inside: auto;">
        <div style="font-weight: bold; font-size: 13pt; margin-bottom: 6px;">${escapeHtml(SAFETY_SELF_ASSESSMENT_INSPECTION_TITLE)}</div>
        <div style="padding-left: 4px; line-height: 1.45; font-size: 12.5pt;">
          ${SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT.map(item => `
            <div style="margin-bottom: 3px; text-align: justify;">
              <strong>${item.number}.</strong> ${escapeHtml(item.content)}
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Official 5-Column Table -->
    <table class="inspection-table">
      <thead>
        <tr>
          <th class="col-date">NGÀY KIỂM TRA</th>
          <th class="col-content">CÔNG TRÌNH/NỘI DUNG KIỂM TRA</th>
          <th class="col-assessment">ĐÁNH GIÁ CÔNG TRÌNH</th>
          <th class="col-recommendation">KIẾN NGHỊ YÊU CẦU</th>
          <th class="col-result">KẾT QUẢ THỰC HIỆN</th>
        </tr>
      </thead>
      <tbody>
        ${model.tableRows.map(row => {
          const dateCellHtml = row.dayName
            ? `<div class="day-shift-title">${escapeHtml(row.dayName)}</div><div>${escapeHtml(row.dateFormatted || '')}</div><div style="font-weight:bold;margin-top:2px;">Buổi ${escapeHtml(row.shiftLabel || '')}</div>`
            : row.shiftLabel
            ? `<div style="font-weight:bold;">Buổi ${escapeHtml(row.shiftLabel)}</div>`
            : '';

          const hasProject = Boolean(row.projectName && row.projectName.trim());
          const hasContent = Boolean(row.inspectionContent && row.inspectionContent.trim());

          let colContentHtml = '';
          if (hasProject || hasContent) {
            colContentHtml = `<div class="assessment-project-content-cell">`;
            if (hasProject) {
              colContentHtml += `
                <div class="assessment-project-block">
                  <div class="assessment-cell-label">Công trình:</div>
                  <div class="assessment-project-name">${escapeHtml(row.projectName)}</div>
                </div>
              `;
            }
            if (hasContent) {
              const borderStyle = hasProject ? 'margin-top: 2.5mm; padding-top: 2mm; border-top: 0.35pt solid #777777;' : '';
              colContentHtml += `
                <div class="assessment-inspection-block" style="${borderStyle}">
                  <div class="assessment-cell-label">Nội dung kiểm tra:</div>
                  <div class="assessment-inspection-content">${formatMultilines(row.inspectionContent)}</div>
                </div>
              `;
            }
            colContentHtml += `</div>`;
          }

          return `
            <tr>
              <td class="col-date">${dateCellHtml}</td>
              <td class="col-content">${colContentHtml}</td>
              <td class="col-assessment">${formatMultilines(row.assessment)}</td>
              <td class="col-recommendation">${formatMultilines(row.recommendation)}</td>
              <td class="col-result">${formatMultilines(row.implementationResult)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    <!-- Section I -->
    <div class="report-section">
      <div class="section-header">${escapeHtml(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionITitle)}</div>
      
      <section class="assessment-narrative-subsection">
        <div class="assessment-narrative-label">${escapeHtml(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionISub1)}</div>
        ${renderSectionContentHtml(model.previousWeekRemediationSection)}
      </section>

      <section class="assessment-narrative-subsection">
        <div class="assessment-narrative-label">${escapeHtml(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionISub2)}</div>
        ${renderSectionContentHtml(model.reinspectionConfirmationSection)}
      </section>
    </div>

    <!-- Section II -->
    <div class="report-section">
      <div class="section-header">${escapeHtml(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionIITitle)}</div>
      
      <section class="assessment-narrative-subsection">
        <div class="assessment-narrative-label">${escapeHtml(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionIISub1)}</div>
        ${renderSectionContentHtml(model.managementRecommendationSection)}
      </section>

      <section class="assessment-narrative-subsection">
        <div class="assessment-narrative-label">${escapeHtml(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionIISub2)}</div>
        ${renderSectionContentHtml(model.otherOpinionSection)}
      </section>
    </div>

    <!-- Footer Table Signature Block -->
    <div class="assessment-signature-block">
      <table class="footer-table">
        <tr>
          <td class="footer-left">
            <div class="footer-left-title">Nơi nhận:</div>
            <div class="footer-left-item">- Như kính gửi;</div>
            <div class="footer-left-item">- Lưu KT.</div>
          </td>
          <td class="footer-right">
            <div class="reporter-role">${escapeHtml(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.reporterRoleTitleUpper)}</div>
            <div class="reporter-sign">(Ký, ghi rõ họ tên)</div>
            <div class="reporter-name">${escapeHtml(model.reporterName)}</div>
          </td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>`;
}
