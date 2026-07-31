import * as docx from "docx";
import { buildSafetyPlanPreviewModel, SafetyPlanPreviewViewModel } from "./plan-view-model";
import { SAFETY_PLAN_OFFICIAL_CONTENT } from "./safety-plan-official-content";
import { paginateSafetyPlanTableRows } from "./table-paginator";
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

function formatDateVN(d: Date): string {
  if (!d || Number.isNaN(d.getTime())) return "…";
  return normalizeVietnameseText(`ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`);
}

/**
 * Clean paragraph helper that prevents duplicate "• +" or "• -" symbols and ensures exact NFC Vietnamese runs.
 */
function createOfficialItemParagraph(item: string): docx.Paragraph {
  const trimmed = normalizeVietnameseText(item.trim());
  if (trimmed.startsWith("+")) {
    return new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: trimmed,
          font: FONT_TIMES,
          size: 26,
          language: LANG_VI,
        }),
      ],
      indent: { left: 720 },
      spacing: { after: 40 },
    });
  }
  if (trimmed.startsWith("-") || /^[a-z]\./i.test(trimmed)) {
    return new docx.Paragraph({
      children: [
        new docx.TextRun({
          text: trimmed,
          font: FONT_TIMES,
          size: 26,
          language: LANG_VI,
        }),
      ],
      indent: { left: 360 },
      spacing: { after: 40 },
    });
  }
  return new docx.Paragraph({
    children: [
      new docx.TextRun({
        text: `• ${trimmed}`,
        font: FONT_TIMES,
        size: 26,
        language: LANG_VI,
      }),
    ],
    indent: { left: 360 },
    spacing: { after: 40 },
  });
}

export class SafetyDocxGenerator {
  /**
   * Sinh file DOCX chuẩn A4 cho Kế hoạch kiểm tra (Mẫu 02)
   */
  static async generatePlanDocx(plan: any): Promise<Buffer> {
    const viewModel = buildSafetyPlanPreviewModel(plan);
    const createdDate = plan.createdDate ? new Date(plan.createdDate) : new Date();
    const dateStr = formatDateVN(createdDate);

    // Section VI: Administrative Header Table (44% / 56%)
    const colLeftWidth = Math.floor(USABLE_WIDTH * 0.44); // 4365 DXA
    const colRightWidth = USABLE_WIDTH - colLeftWidth; // 5557 DXA

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
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: normalizeVietnameseText(SAFETY_PLAN_OFFICIAL_CONTENT.companyNameUpper.split(" VÀ ")[0]),
                      bold: true,
                      font: FONT_TIMES,
                      size: 24, // 12pt
                      language: LANG_VI,
                    }),
                  ],
                  alignment: docx.AlignmentType.CENTER,
                  spacing: { before: 0, after: 40 },
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: normalizeVietnameseText("VÀ " + SAFETY_PLAN_OFFICIAL_CONTENT.companyNameUpper.split(" VÀ ")[1]),
                      bold: true,
                      font: FONT_TIMES,
                      size: 24,
                      language: LANG_VI,
                    }),
                  ],
                  alignment: docx.AlignmentType.CENTER,
                  spacing: { before: 0, after: 40 },
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: normalizeVietnameseText(`Số: ${viewModel.displayDocumentNumber}`),
                      font: FONT_TIMES,
                      size: 24,
                      language: LANG_VI,
                    }),
                  ],
                  alignment: docx.AlignmentType.CENTER,
                  spacing: { before: 40, after: 0 },
                }),
              ],
            }),
            new docx.TableCell({
              width: { size: colRightWidth, type: docx.WidthType.DXA },
              children: [
                // National Motto on EXACTLY ONE LINE
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: normalizeVietnameseText(SAFETY_PLAN_OFFICIAL_CONTENT.countryTitleUpper),
                      bold: true,
                      font: FONT_TIMES,
                      size: 24, // 12pt
                      language: LANG_VI,
                    }),
                  ],
                  alignment: docx.AlignmentType.CENTER,
                  spacing: { before: 0, after: 40 },
                  keepNext: true,
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: normalizeVietnameseText(SAFETY_PLAN_OFFICIAL_CONTENT.motto),
                      bold: true,
                      font: FONT_TIMES,
                      size: 24,
                      language: LANG_VI,
                    }),
                  ],
                  alignment: docx.AlignmentType.CENTER,
                  spacing: { before: 0, after: 40 },
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: normalizeVietnameseText(`${viewModel.place || "Hà Nội"}, ${dateStr}`),
                      italics: true,
                      font: FONT_TIMES,
                      size: 24,
                      language: LANG_VI,
                    }),
                  ],
                  alignment: docx.AlignmentType.CENTER,
                  spacing: { before: 40, after: 0 },
                }),
              ],
            }),
          ],
        }),
      ],
    });

    // Title Section
    const titleParagraphs = [
      new docx.Paragraph({ text: "", spacing: { after: 160 } }),
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: normalizeVietnameseText(SAFETY_PLAN_OFFICIAL_CONTENT.documentTitleUpper),
            bold: true,
            font: FONT_TIMES,
            size: 28,
            language: LANG_VI,
          }),
        ],
        alignment: docx.AlignmentType.CENTER,
        spacing: { after: 80 },
        keepNext: true,
      }),
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: normalizeVietnameseText(`(${viewModel.periodLabel.toUpperCase()})`),
            bold: true,
            font: FONT_TIMES,
            size: 24,
            language: LANG_VI,
          }),
        ],
        alignment: docx.AlignmentType.CENTER,
        spacing: { after: 200 },
        keepNext: true,
      }),
    ];

    // Recipients
    const recipientsList = viewModel.recipientName
      ? viewModel.recipientName.split(",").map((r) => `- ${normalizeVietnameseText(r.trim())}`)
      : SAFETY_PLAN_OFFICIAL_CONTENT.recipientsDefault.map((r) => `- ${normalizeVietnameseText(r)}`);

    const recipientParagraphs = [
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: normalizeVietnameseText("Kính gửi: "),
            italics: true,
            bold: true,
            font: FONT_TIMES,
            size: 26,
            language: LANG_VI,
          }),
        ],
        spacing: { after: 60 },
        keepNext: true,
      }),
      ...recipientsList.map(
        (r) =>
          new docx.Paragraph({
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
            keepNext: true,
          })
      ),
      new docx.Paragraph({ text: "", spacing: { after: 140 } }),
    ];

    // Legal bases
    const legalParagraphs = SAFETY_PLAN_OFFICIAL_CONTENT.legalBases.map(
      (line) =>
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: normalizeVietnameseText(line),
              font: FONT_TIMES,
              size: 26,
              language: LANG_VI,
            }),
          ],
          spacing: { after: 60 },
        })
    );

    const createSectionHeader = (title: string) =>
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: normalizeVietnameseText(title),
            bold: true,
            font: FONT_TIMES,
            size: 26,
            language: LANG_VI,
          }),
        ],
        spacing: { before: 180, after: 80 },
        keepNext: true,
      });

    // Content Blocks using createOfficialItemParagraph
    const sectionI = [
      createSectionHeader(SAFETY_PLAN_OFFICIAL_CONTENT.sectionI.title),
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: normalizeVietnameseText(SAFETY_PLAN_OFFICIAL_CONTENT.sectionI.content),
            font: FONT_TIMES,
            size: 26,
            language: LANG_VI,
          }),
        ],
        spacing: { after: 100 },
      }),
    ];

    const sectionII = [
      createSectionHeader(SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.title),
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: normalizeVietnameseText(SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part1.title),
            bold: true,
            font: FONT_TIMES,
            size: 26,
            language: LANG_VI,
          }),
        ],
        spacing: { after: 40 },
        keepNext: true,
      }),
      ...SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part1.items.map(createOfficialItemParagraph),
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: normalizeVietnameseText(SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part2.title),
            bold: true,
            font: FONT_TIMES,
            size: 26,
            language: LANG_VI,
          }),
        ],
        spacing: { before: 80, after: 40 },
        keepNext: true,
      }),
      ...SAFETY_PLAN_OFFICIAL_CONTENT.sectionII.part2.items.map(createOfficialItemParagraph),
    ];

    const sectionIII = [
      createSectionHeader(SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.title),
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: normalizeVietnameseText(SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part1.title),
            bold: true,
            font: FONT_TIMES,
            size: 26,
            language: LANG_VI,
          }),
        ],
        spacing: { after: 40 },
        keepNext: true,
      }),
      ...SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part1.items.map(createOfficialItemParagraph),
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: normalizeVietnameseText(SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part2.title),
            bold: true,
            font: FONT_TIMES,
            size: 26,
            language: LANG_VI,
          }),
        ],
        spacing: { before: 80, after: 40 },
        keepNext: true,
      }),
      ...SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part2.items.map(createOfficialItemParagraph),
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: normalizeVietnameseText(SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part3.title),
            bold: true,
            font: FONT_TIMES,
            size: 26,
            language: LANG_VI,
          }),
        ],
        spacing: { before: 80, after: 40 },
        keepNext: true,
      }),
      ...SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part3.items.map(createOfficialItemParagraph),
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: normalizeVietnameseText(SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part4.title),
            bold: true,
            font: FONT_TIMES,
            size: 26,
            language: LANG_VI,
          }),
        ],
        spacing: { before: 80, after: 40 },
        keepNext: true,
      }),
      ...SAFETY_PLAN_OFFICIAL_CONTENT.sectionIII.part4.items.map(createOfficialItemParagraph),
    ];

    // Section IV & VII: 4-Column Table Setup (Pre-paginated A4-Safe Physical Rows)
    // Ratios: Col 1: 17% (1686 DXA), Col 2: 27% (2678 DXA), Col 3: 34% (3373 DXA), Col 4: 22% (2183 DXA)
    const colWidths = [1686, 2678, 3373, 2183];

    const cellBorders = {
      top: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
      bottom: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
      left: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
      right: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
    };

    const cellMargin = { top: 80, bottom: 80, left: 120, right: 120 }; // twips

    // Header Row with tableHeader: true & cantSplit: true
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
          children: [
            new docx.Paragraph({
              children: [
                new docx.TextRun({
                  text: normalizeVietnameseText("NGÀY KIỂM TRA"),
                  bold: true,
                  font: FONT_TIMES,
                  size: 24,
                  language: LANG_VI,
                }),
              ],
              alignment: docx.AlignmentType.CENTER,
              spacing: { before: 40, after: 40 },
            }),
          ],
        }),
        new docx.TableCell({
          width: { size: colWidths[1], type: docx.WidthType.DXA },
          margins: cellMargin,
          shading: { fill: "F2F2F2" },
          borders: cellBorders,
          verticalAlign: docx.VerticalAlign.CENTER,
          children: [
            new docx.Paragraph({
              children: [
                new docx.TextRun({
                  text: normalizeVietnameseText("CÔNG TRÌNH KIỂM TRA"),
                  bold: true,
                  font: FONT_TIMES,
                  size: 24,
                  language: LANG_VI,
                }),
              ],
              alignment: docx.AlignmentType.CENTER,
              spacing: { before: 40, after: 40 },
            }),
          ],
        }),
        new docx.TableCell({
          width: { size: colWidths[2], type: docx.WidthType.DXA },
          margins: cellMargin,
          shading: { fill: "F2F2F2" },
          borders: cellBorders,
          verticalAlign: docx.VerticalAlign.CENTER,
          children: [
            new docx.Paragraph({
              children: [
                new docx.TextRun({
                  text: normalizeVietnameseText("NỘI DUNG KIỂM TRA, HUẤN LUYỆN"),
                  bold: true,
                  font: FONT_TIMES,
                  size: 24,
                  language: LANG_VI,
                }),
              ],
              alignment: docx.AlignmentType.CENTER,
              spacing: { before: 40, after: 40 },
            }),
          ],
        }),
        new docx.TableCell({
          width: { size: colWidths[3], type: docx.WidthType.DXA },
          margins: cellMargin,
          shading: { fill: "F2F2F2" },
          borders: cellBorders,
          verticalAlign: docx.VerticalAlign.CENTER,
          children: [
            new docx.Paragraph({
              children: [
                new docx.TextRun({
                  text: normalizeVietnameseText("PHÁT SINH THAY ĐỔI"),
                  bold: true,
                  font: FONT_TIMES,
                  size: 24,
                  language: LANG_VI,
                }),
              ],
              alignment: docx.AlignmentType.CENTER,
              spacing: { before: 40, after: 40 },
            }),
          ],
        }),
      ],
    });

    const physicalRows = paginateSafetyPlanTableRows(viewModel);

    const matrixRows = physicalRows.map((row) => {
      const timeParagraphs: docx.Paragraph[] = [];

      if (row.dayName) {
        timeParagraphs.push(
          new docx.Paragraph({
            children: [
              new docx.TextRun({
                text: normalizeVietnameseText(row.dayName),
                bold: true,
                italics: false,
                font: FONT_TIMES,
                size: 22,
                language: LANG_VI,
              }),
            ],
            spacing: { before: 0, after: 20, line: 240 },
          }),
          new docx.Paragraph({
            children: [
              new docx.TextRun({
                text: normalizeVietnameseText(row.shiftLabel),
                bold: true,
                italics: false,
                font: FONT_TIMES,
                size: 22,
                language: LANG_VI,
              }),
            ],
            spacing: { before: 0, after: 40, line: 240 },
          })
        );
      } else if (row.shiftLabel) {
        timeParagraphs.push(
          new docx.Paragraph({
            children: [
              new docx.TextRun({
                text: normalizeVietnameseText(row.shiftLabel),
                bold: true,
                italics: false,
                font: FONT_TIMES,
                size: 22,
                language: LANG_VI,
              }),
            ],
            spacing: { before: 0, after: 40, line: 240 },
          })
        );
      } else {
        timeParagraphs.push(new docx.Paragraph({ text: "", spacing: { before: 0, after: 40 } }));
      }

      return new docx.TableRow({
        cantSplit: true,
        children: [
          new docx.TableCell({
            width: { size: colWidths[0], type: docx.WidthType.DXA },
            margins: cellMargin,
            borders: cellBorders,
            verticalAlign: docx.VerticalAlign.TOP,
            children: timeParagraphs,
          }),
          new docx.TableCell({
            width: { size: colWidths[1], type: docx.WidthType.DXA },
            margins: cellMargin,
            borders: cellBorders,
            verticalAlign: docx.VerticalAlign.TOP,
            children: normalizeVietnameseText(row.projectName || "").split("\n").map(
              (t) =>
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: t,
                      font: FONT_TIMES,
                      size: 24,
                      language: LANG_VI,
                    }),
                  ],
                  spacing: { before: 0, after: 40, line: 240 },
                })
            ),
          }),
          new docx.TableCell({
            width: { size: colWidths[2], type: docx.WidthType.DXA },
            margins: cellMargin,
            borders: cellBorders,
            verticalAlign: docx.VerticalAlign.TOP,
            children: normalizeVietnameseText(row.inspectionContent || "").split("\n").map(
              (t) =>
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: t,
                      font: FONT_TIMES,
                      size: 24,
                      language: LANG_VI,
                    }),
                  ],
                  spacing: { before: 0, after: 40, line: 240 },
                })
            ),
          }),
          new docx.TableCell({
            width: { size: colWidths[3], type: docx.WidthType.DXA },
            margins: cellMargin,
            borders: cellBorders,
            verticalAlign: docx.VerticalAlign.TOP,
            children: normalizeVietnameseText(row.note || "").split("\n").map(
              (t) =>
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: t,
                      font: FONT_TIMES,
                      size: 24,
                      language: LANG_VI,
                    }),
                  ],
                  spacing: { before: 0, after: 40, line: 240 },
                })
            ),
          }),
        ],
      });
    });

    const planTable = new docx.Table({
      rows: [tableHeaderRow, ...matrixRows],
      width: { size: USABLE_WIDTH, type: docx.WidthType.DXA },
      layout: docx.TableLayoutType.FIXED,
      columnWidths: colWidths,
      borders: cellBorders,
    });

    // Conclusion & Signature Table
    const conclusionParagraphs = [
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: normalizeVietnameseText(`Trên đây là kế hoạch kiểm tra công trình tuần (${viewModel.periodLabel}). Đề nghị Ban chỉ huy công trình phối hợp thực hiện.`),
            font: FONT_TIMES,
            size: 26,
            language: LANG_VI,
          }),
        ],
        spacing: { before: 180, after: 80 },
      }),
      new docx.Paragraph({
        children: [
          new docx.TextRun({
            text: normalizeVietnameseText("Kế hoạch huấn luyện cho công nhân trên công trường Ban chỉ huy, chỉ huy trưởng phối hợp tổ chức huấn luyện tại công trình."),
            font: FONT_TIMES,
            size: 26,
            language: LANG_VI,
          }),
        ],
        spacing: { after: 200 },
      }),
    ];

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
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: normalizeVietnameseText("Nơi nhận:"),
                      bold: true,
                      font: FONT_TIMES,
                      size: 24,
                      language: LANG_VI,
                    }),
                  ],
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: normalizeVietnameseText("- Như kính gửi;"),
                      font: FONT_TIMES,
                      size: 24,
                      language: LANG_VI,
                    }),
                  ],
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: normalizeVietnameseText("+ Phòng KT;"),
                      font: FONT_TIMES,
                      size: 24,
                      language: LANG_VI,
                    }),
                  ],
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: normalizeVietnameseText("+ Đơn vị (BCH);"),
                      font: FONT_TIMES,
                      size: 24,
                      language: LANG_VI,
                    }),
                  ],
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: normalizeVietnameseText("- Lưu KT."),
                      font: FONT_TIMES,
                      size: 24,
                      language: LANG_VI,
                    }),
                  ],
                }),
              ],
            }),
            new docx.TableCell({
              children: [
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: normalizeVietnameseText(viewModel.recipientTitle ? viewModel.recipientTitle.split(",")[0].trim().toUpperCase() : "PHÒNG KĨ THUẬT"),
                      bold: true,
                      font: FONT_TIMES,
                      size: 24,
                      language: LANG_VI,
                    }),
                  ],
                  alignment: docx.AlignmentType.CENTER,
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: normalizeVietnameseText("Người lập"),
                      italics: true,
                      font: FONT_TIMES,
                      size: 24,
                      language: LANG_VI,
                    }),
                  ],
                  alignment: docx.AlignmentType.CENTER,
                  spacing: { after: 600 },
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({
                      text: normalizeVietnameseText(viewModel.authorName),
                      bold: true,
                      font: FONT_TIMES,
                      size: 24,
                      language: LANG_VI,
                    }),
                  ],
                  alignment: docx.AlignmentType.CENTER,
                }),
              ],
            }),
          ],
        }),
      ],
    });

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
              size: {
                width: PAGE_PORTRAIT.width,
                height: PAGE_PORTRAIT.height,
              },
              margin: {
                top: PAGE_PORTRAIT.marginTop,
                right: PAGE_PORTRAIT.marginRight,
                bottom: PAGE_PORTRAIT.marginBottom,
                left: PAGE_PORTRAIT.marginLeft,
              },
            },
          },
          children: [
            headerTable,
            ...titleParagraphs,
            ...recipientParagraphs,
            ...legalParagraphs,
            ...sectionI,
            ...sectionII,
            ...sectionIII,
            planTable,
            ...conclusionParagraphs,
            signatureTable,
          ],
        },
      ],
    });

    return await docx.Packer.toBuffer(doc);
  }

  /**
   * Sinh file DOCX cho Báo cáo tự đánh giá (Mẫu 01)
   */
  static async generateAssessmentDocx(report: any): Promise<Buffer> {
    const docNo = report.officialDocumentNumber || report.documentNumber ? `Số: ${report.officialDocumentNumber || report.documentNumber}` : "Số: …………….";
    const createdDate = report.createdDate ? new Date(report.createdDate) : new Date();
    const dateStr = formatDateVN(createdDate);
    const authorName = report.createdBy?.name || "Cán bộ Safety";

    const doc = new docx.Document({
      sections: [
        {
          children: [
            new docx.Paragraph({
              children: [
                new docx.TextRun({ text: normalizeVietnameseText("CÔNG TY CỔ PHẦN XÂY DỰNG VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI"), bold: true, font: FONT_TIMES, size: 24, language: LANG_VI }),
              ],
              alignment: docx.AlignmentType.CENTER,
            }),
            new docx.Paragraph({
              children: [new docx.TextRun({ text: normalizeVietnameseText(docNo), font: FONT_TIMES, size: 24, language: LANG_VI })],
              alignment: docx.AlignmentType.CENTER,
            }),
            new docx.Paragraph({
              children: [new docx.TextRun({ text: normalizeVietnameseText("BÁO CÁO TỰ ĐÁNH GIÁ KẾT QUẢ KIỂM TRA ATLĐ • PCCC • VSMT"), bold: true, font: FONT_TIMES, size: 28, language: LANG_VI })],
              alignment: docx.AlignmentType.CENTER,
              spacing: { before: 200, after: 100 },
            }),
            new docx.Paragraph({
              children: [new docx.TextRun({ text: normalizeVietnameseText(`Hà Nội, ${dateStr}`), italics: true, font: FONT_TIMES, size: 24, language: LANG_VI })],
              alignment: docx.AlignmentType.RIGHT,
              spacing: { after: 300 },
            }),
            new docx.Paragraph({
              children: [new docx.TextRun({ text: normalizeVietnameseText(`Người lập: ${authorName}`), bold: true, font: FONT_TIMES, size: 24, language: LANG_VI })],
              spacing: { before: 400 },
            }),
          ],
        },
      ],
    });

    return await docx.Packer.toBuffer(doc);
  }
}
