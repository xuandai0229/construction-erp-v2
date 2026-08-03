import * as docx from "docx";
import { buildSafetyAssessmentOutputModel, SafetyAssessmentOutputModel, NarrativeSectionValue } from "./assessment-view-model";
import {
  SAFETY_ASSESSMENT_OFFICIAL_CONTENT,
  SAFETY_SELF_ASSESSMENT_INSPECTION_TITLE,
  SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT,
} from "./safety-assessment-official-content";
import { normalizeVietnameseText, SAFETY_DOCUMENT_TYPOGRAPHY } from "./date-utils";

const PAGE_PORTRAIT = {
  width: 11906, // A4 width DXA (210mm)
  height: 16838, // A4 height DXA (297mm)
  marginTop: 1020, // 18mm
  marginBottom: 1020,
  marginLeft: 1134, // 20mm
  marginRight: 850, // 15mm
};

const USABLE_WIDTH = PAGE_PORTRAIT.width - PAGE_PORTRAIT.marginLeft - PAGE_PORTRAIT.marginRight; // 9922 DXA
const FONT_TIMES = SAFETY_DOCUMENT_TYPOGRAPHY.fontName;
const LANG_VI = { value: SAFETY_DOCUMENT_TYPOGRAPHY.language };

function createParagraph(text: string, options?: { bold?: boolean; italics?: boolean; size?: number; align?: (typeof docx.AlignmentType)[keyof typeof docx.AlignmentType]; spaceAfter?: number; spaceBefore?: number; keepNext?: boolean }) {
  return new docx.Paragraph({
    keepNext: options?.keepNext ?? false,
    keepLines: true,
    children: [
      new docx.TextRun({
        text: normalizeVietnameseText(text),
        bold: options?.bold ?? false,
        italics: options?.italics ?? false,
        font: FONT_TIMES,
        size: options?.size ?? 26, // 13pt
        language: LANG_VI,
      }),
    ],
    alignment: options?.align ?? docx.AlignmentType.LEFT,
    spacing: {
      before: options?.spaceBefore ?? 0,
      after: options?.spaceAfter ?? 40,
      line: 240,
    },
  });
}

function createCellParagraphs(text: string, options?: { bold?: boolean; italics?: boolean; size?: number; align?: (typeof docx.AlignmentType)[keyof typeof docx.AlignmentType] }) {
  if (!text || !text.trim()) {
    return [new docx.Paragraph({ text: "", spacing: { before: 0, after: 40 } })];
  }
  return text.split("\n").map((line) =>
    new docx.Paragraph({
      keepLines: true,
      children: [
        new docx.TextRun({
          text: normalizeVietnameseText(line),
          bold: options?.bold ?? false,
          italics: options?.italics ?? false,
          font: FONT_TIMES,
          size: options?.size ?? 24, // 12pt in table
          language: LANG_VI,
        }),
      ],
      alignment: options?.align ?? docx.AlignmentType.LEFT,
      spacing: { before: 0, after: 40, line: 240 },
    })
  );
}

function createSubsectionTitleParagraph(text: string): docx.Paragraph {
  return new docx.Paragraph({
    keepNext: true,
    keepLines: true,
    children: [
      new docx.TextRun({
        text: normalizeVietnameseText(text),
        bold: true,
        font: FONT_TIMES,
        size: 25,
        language: LANG_VI,
      }),
    ],
    spacing: { before: 120, after: 40, line: 240 },
  });
}

import { createWordHandwritingLines, HANDWRITING_LINE_CONFIG } from "@/lib/docx/handwriting-lines";

function renderDocxSectionParagraphs(section: NarrativeSectionValue): docx.Paragraph[] {
  if (section.isEmpty) {
    return createWordHandwritingLines({ count: HANDWRITING_LINE_CONFIG.defaultNarrative, leftIndent: 360, rightPosition: USABLE_WIDTH });
  }
  return createCellParagraphs(section.text, { size: 25 });
}

export class SafetyAssessmentDocxGenerator {
  static async generateAssessmentDocx(report: any): Promise<Buffer> {
    const model: SafetyAssessmentOutputModel = buildSafetyAssessmentOutputModel(report);

    const docNoStr = model.officialDocumentNumber ? model.officialDocumentNumber : "……/……";
    const dateStr = model.documentDateFormatted;

    // Administrative Header Table (45% / 55%)
    const colLeftWidth = Math.floor(USABLE_WIDTH * 0.45); // 4465 DXA
    const colRightWidth = USABLE_WIDTH - colLeftWidth; // 5457 DXA

    const headerTable = new docx.Table({
      width: { size: USABLE_WIDTH, type: docx.WidthType.DXA },
      layout: docx.TableLayoutType.FIXED,
      columnWidths: [colLeftWidth, colRightWidth],
      borders: docx.TableBorders.NONE,
      rows: [
        new docx.TableRow({
          cantSplit: true,
          children: [
            new docx.TableCell({
              width: { size: colLeftWidth, type: docx.WidthType.DXA },
              children: [
                createParagraph("CÔNG TY CỔ PHẦN XÂY DỰNG", { bold: true, size: 23, align: docx.AlignmentType.CENTER, spaceAfter: 20 }),
                createParagraph("VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI", { bold: true, size: 23, align: docx.AlignmentType.CENTER, spaceAfter: 40 }),
                createParagraph(`Số: ${docNoStr}`, { size: 24, align: docx.AlignmentType.CENTER, spaceBefore: 20, spaceAfter: 0 }),
              ],
            }),
            new docx.TableCell({
              width: { size: colRightWidth, type: docx.WidthType.DXA },
              children: [
                createParagraph(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.countryTitleUpper, { bold: true, size: 23, align: docx.AlignmentType.CENTER, spaceAfter: 20 }),
                createParagraph(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.motto, { bold: true, size: 24, align: docx.AlignmentType.CENTER, spaceAfter: 40 }),
                createParagraph(`${model.documentPlace}, ${dateStr}`, { italics: true, size: 24, align: docx.AlignmentType.CENTER, spaceBefore: 20, spaceAfter: 0 }),
              ],
            }),
          ],
        }),
      ],
    });

    // Title Section
    const titleParagraphs = [
      new docx.Paragraph({ text: "", spacing: { after: 160 } }),
      createParagraph(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.documentTitleUpper, { bold: true, size: 28, align: docx.AlignmentType.CENTER, spaceAfter: 60 }),
      createParagraph(`(${model.periodLabel.toUpperCase()})`, { bold: true, size: 24, align: docx.AlignmentType.CENTER, spaceAfter: 200 }),
    ];

    // Recipients Paragraphs
    const recipientList = model.recipientsList.length > 0
      ? model.recipientsList.map((r) => `- ${r}`)
      : ["- Ban Giám đốc Công ty;", "- Phòng kỹ thuật"];

    const recipientParagraphs = [
      createParagraph("Kính gửi:", { bold: true, italics: true, size: 26, spaceAfter: 60, keepNext: true }),
      ...recipientList.map((r, idx) =>
        new docx.Paragraph({
          keepNext: idx < recipientList.length - 1,
          children: [
            new docx.TextRun({
              text: normalizeVietnameseText(r),
              font: FONT_TIMES,
              size: 26,
              language: LANG_VI,
            }),
          ],
          indent: { left: 360 },
          spacing: { after: 40 },
        })
      ),
      new docx.Paragraph({ text: "", spacing: { after: 120 } }),
    ];

    // Legal Bases & Opening Reporter Statement
    const legalParagraphs = SAFETY_ASSESSMENT_OFFICIAL_CONTENT.legalBases.map((line) =>
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: normalizeVietnameseText(line),
            font: FONT_TIMES,
            size: 26,
            language: LANG_VI,
          }),
        ],
        spacing: { after: 40 },
      })
    );

    const reporterIntroParagraph = new docx.Paragraph({
      children: [
        new docx.TextRun({ text: normalizeVietnameseText("Tôi "), font: FONT_TIMES, size: 26, language: LANG_VI }),
        new docx.TextRun({ text: normalizeVietnameseText(model.reporterName), bold: true, font: FONT_TIMES, size: 26, language: LANG_VI }),
        new docx.TextRun({ text: normalizeVietnameseText(` – ${model.reporterTitle} – ${model.reporterDepartment} Công ty CP xây dựng và thương mại số 2 Hà Nội báo cáo kết quả kiểm tra như sau:`), font: FONT_TIMES, size: 26, language: LANG_VI }),
      ],
      spacing: { before: 100, after: 160 },
    });

    // 5-Column Table Setup
    const colWidths = [1488, 2678, 1984, 1984, 1788];

    const cellBorders = {
      top: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
      bottom: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
      left: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
      right: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
    };

    const cellMargin = { top: 80, bottom: 80, left: 100, right: 100 };

    const tableHeaderRow = new docx.TableRow({
      tableHeader: true,
      cantSplit: true,
      children: [
        new docx.TableCell({
          width: { size: colWidths[0], type: docx.WidthType.DXA },
          margins: cellMargin,
          shading: { fill: "F2F2F2" },
          borders: cellBorders,
          verticalAlign: docx.VerticalAlign.CENTER,
          children: [createParagraph("NGÀY KIỂM TRA", { bold: true, size: 22, align: docx.AlignmentType.CENTER, spaceAfter: 20 })],
        }),
        new docx.TableCell({
          width: { size: colWidths[1], type: docx.WidthType.DXA },
          margins: cellMargin,
          shading: { fill: "F2F2F2" },
          borders: cellBorders,
          verticalAlign: docx.VerticalAlign.CENTER,
          children: [createParagraph("CÔNG TRÌNH/NỘI DUNG KIỂM TRA", { bold: true, size: 22, align: docx.AlignmentType.CENTER, spaceAfter: 20 })],
        }),
        new docx.TableCell({
          width: { size: colWidths[2], type: docx.WidthType.DXA },
          margins: cellMargin,
          shading: { fill: "F2F2F2" },
          borders: cellBorders,
          verticalAlign: docx.VerticalAlign.CENTER,
          children: [createParagraph("ĐÁNH GIÁ CÔNG TRÌNH", { bold: true, size: 22, align: docx.AlignmentType.CENTER, spaceAfter: 20 })],
        }),
        new docx.TableCell({
          width: { size: colWidths[3], type: docx.WidthType.DXA },
          margins: cellMargin,
          shading: { fill: "F2F2F2" },
          borders: cellBorders,
          verticalAlign: docx.VerticalAlign.CENTER,
          children: [createParagraph("KIẾN NGHỊ YÊU CẦU", { bold: true, size: 22, align: docx.AlignmentType.CENTER, spaceAfter: 20 })],
        }),
        new docx.TableCell({
          width: { size: colWidths[4], type: docx.WidthType.DXA },
          margins: cellMargin,
          shading: { fill: "F2F2F2" },
          borders: cellBorders,
          verticalAlign: docx.VerticalAlign.CENTER,
          children: [createParagraph("KẾT QUẢ THỰC HIỆN", { bold: true, size: 22, align: docx.AlignmentType.CENTER, spaceAfter: 20 })],
        }),
      ],
    });

    const matrixRows = model.tableRows.map((row) => {
      const dateParagraphs: docx.Paragraph[] = [];

      if (row.dayName) {
        dateParagraphs.push(createParagraph(row.dayName, { bold: true, size: 22, spaceAfter: 20 }));
        if (row.dateFormatted) {
          dateParagraphs.push(createParagraph(row.dateFormatted, { size: 20, spaceAfter: 20 }));
        }
      }
      if (row.shiftLabel) {
        dateParagraphs.push(createParagraph(`Buổi ${row.shiftLabel}`, { bold: true, size: 21, spaceAfter: 20 }));
      }
      if (dateParagraphs.length === 0) {
        dateParagraphs.push(new docx.Paragraph({ text: "", spacing: { before: 0, after: 40 } }));
      }

      const contentParagraphs: docx.Paragraph[] = [];
      if (row.projectName && row.projectName.trim()) {
        contentParagraphs.push(createParagraph("Công trình:", { bold: true, size: 21, spaceAfter: 20 }));
        contentParagraphs.push(createParagraph(row.projectName, { bold: true, size: 22, spaceAfter: row.inspectionContent ? 60 : 40 }));
      }
      if (row.inspectionContent && row.inspectionContent.trim()) {
        contentParagraphs.push(createParagraph("Nội dung kiểm tra:", { bold: true, size: 21, spaceAfter: 20 }));
        contentParagraphs.push(...createCellParagraphs(row.inspectionContent, { size: 22 }));
      }
      if (contentParagraphs.length === 0) {
        contentParagraphs.push(new docx.Paragraph({ text: "", spacing: { before: 0, after: 40 } }));
      }

      return new docx.TableRow({
        cantSplit: false,
        children: [
          new docx.TableCell({
            width: { size: colWidths[0], type: docx.WidthType.DXA },
            margins: cellMargin,
            borders: cellBorders,
            verticalAlign: docx.VerticalAlign.TOP,
            children: dateParagraphs,
          }),
          new docx.TableCell({
            width: { size: colWidths[1], type: docx.WidthType.DXA },
            margins: cellMargin,
            borders: cellBorders,
            verticalAlign: docx.VerticalAlign.TOP,
            children: contentParagraphs,
          }),
          new docx.TableCell({
            width: { size: colWidths[2], type: docx.WidthType.DXA },
            margins: cellMargin,
            borders: cellBorders,
            verticalAlign: docx.VerticalAlign.TOP,
            children: createCellParagraphs(row.assessment, { size: 23 }),
          }),
          new docx.TableCell({
            width: { size: colWidths[3], type: docx.WidthType.DXA },
            margins: cellMargin,
            borders: cellBorders,
            verticalAlign: docx.VerticalAlign.TOP,
            children: createCellParagraphs(row.recommendation, { size: 23 }),
          }),
          new docx.TableCell({
            width: { size: colWidths[4], type: docx.WidthType.DXA },
            margins: cellMargin,
            borders: cellBorders,
            verticalAlign: docx.VerticalAlign.TOP,
            children: createCellParagraphs(row.implementationResult, { size: 23 }),
          }),
        ],
      });
    });

    const reportTable = new docx.Table({
      rows: [tableHeaderRow, ...matrixRows],
      width: { size: USABLE_WIDTH, type: docx.WidthType.DXA },
      layout: docx.TableLayoutType.FIXED,
      columnWidths: colWidths,
      borders: cellBorders,
    });

    // Section I Paragraphs (keepNext ensures titles and handwriting lines stay together)
    const sectionIParagraphs = [
      new docx.Paragraph({ text: "", spacing: { before: 160, after: 0 } }),
      createParagraph(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionITitle, { bold: true, size: 26, spaceBefore: 120, spaceAfter: 80, keepNext: true }),
      createSubsectionTitleParagraph(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionISub1),
      ...renderDocxSectionParagraphs(model.previousWeekRemediationSection),
      createSubsectionTitleParagraph(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionISub2),
      ...renderDocxSectionParagraphs(model.reinspectionConfirmationSection),
    ];

    // Section II Paragraphs
    const sectionIIParagraphs = [
      createParagraph(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionIITitle, { bold: true, size: 26, spaceBefore: 160, spaceAfter: 80, keepNext: true }),
      createSubsectionTitleParagraph(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionIISub1),
      ...renderDocxSectionParagraphs(model.managementRecommendationSection),
      createSubsectionTitleParagraph(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.sectionIISub2),
      ...renderDocxSectionParagraphs(model.otherOpinionSection),
    ];

    // Footer Signature Table
    const signatureTable = new docx.Table({
      width: { size: USABLE_WIDTH, type: docx.WidthType.DXA },
      layout: docx.TableLayoutType.FIXED,
      columnWidths: [Math.floor(USABLE_WIDTH * 0.5), Math.ceil(USABLE_WIDTH * 0.5)],
      borders: docx.TableBorders.NONE,
      rows: [
        new docx.TableRow({
          cantSplit: true,
          children: [
            new docx.TableCell({
              children: [
                createParagraph("Nơi nhận:", { bold: true, size: 24, spaceAfter: 20, keepNext: true }),
                createParagraph("- Như kính gửi;", { size: 24, spaceAfter: 20, keepNext: true }),
                createParagraph("- Lưu KT.", { size: 24, spaceAfter: 0 }),
              ],
            }),
            new docx.TableCell({
              children: [
                createParagraph(SAFETY_ASSESSMENT_OFFICIAL_CONTENT.reporterRoleTitleUpper, { bold: true, size: 24, align: docx.AlignmentType.CENTER, spaceAfter: 20, keepNext: true }),
                createParagraph("(Ký, ghi rõ họ tên)", { italics: true, size: 24, align: docx.AlignmentType.CENTER, spaceAfter: 600, keepNext: true }),
                createParagraph(model.reporterName, { bold: true, size: 25, align: docx.AlignmentType.CENTER, spaceAfter: 0 }),
              ],
            }),
          ],
        }),
      ],
    });

    // 20 Inspection Items Section Paragraphs
    const inspectionContentParagraphs = [
      createParagraph(SAFETY_SELF_ASSESSMENT_INSPECTION_TITLE, { bold: true, size: 26, spaceBefore: 120, spaceAfter: 80 }),
      ...SAFETY_SELF_ASSESSMENT_INSPECTION_CONTENT.map(
        (item) =>
          new docx.Paragraph({
            children: [
              new docx.TextRun({ text: `${item.number}. `, bold: true, font: FONT_TIMES, size: 25, language: LANG_VI }),
              new docx.TextRun({ text: normalizeVietnameseText(item.content), font: FONT_TIMES, size: 25, language: LANG_VI }),
            ],
            spacing: { before: 0, after: 40, line: 240 },
          })
      ),
      new docx.Paragraph({ text: "", spacing: { after: 120 } }),
    ];

    const doc = new docx.Document({
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            basedOn: "Normal",
            next: "Normal",
            run: { font: FONT_TIMES, size: 26 },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              size: { width: PAGE_PORTRAIT.width, height: PAGE_PORTRAIT.height },
              margin: { top: PAGE_PORTRAIT.marginTop, bottom: PAGE_PORTRAIT.marginBottom, left: PAGE_PORTRAIT.marginLeft, right: PAGE_PORTRAIT.marginRight },
            },
          },
          children: [
            headerTable,
            ...titleParagraphs,
            ...recipientParagraphs,
            ...legalParagraphs,
            reporterIntroParagraph,
            ...inspectionContentParagraphs,
            reportTable,
            ...sectionIParagraphs,
            ...sectionIIParagraphs,
            new docx.Paragraph({ text: "", spacing: { after: 200 } }),
            signatureTable,
          ],
        },
      ],
    });

    return await docx.Packer.toBuffer(doc);
  }
}
