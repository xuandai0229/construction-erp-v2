import * as docx from "docx";
import type { SupervisionWeeklyPrintDto } from "./print-types";
import { buildWeeklyDocumentModel } from "./document-model";
import { formatReportNumber } from "./report-number";
import { createWordWritingLinesTable, HANDWRITING_LINE_CONFIG } from "@/lib/docx/handwriting-lines";
import { getCompanyProfile } from "@/lib/settings/company-profile";

const PAGE = {
  width: 11906, // A4 width: 210mm (11,906 dxa)
  height: 16838, // A4 height: 297mm (16,838 dxa)
  marginTop: 1134, // 20mm
  marginBottom: 1134, // 20mm
  marginLeft: 1134, // 20mm
  marginRight: 850, // 15mm
};
const USABLE_WIDTH = PAGE.width - PAGE.marginLeft - PAGE.marginRight; // 9922 dxa

const CELL_MARGIN = { top: 80, bottom: 80, left: 100, right: 100 };
const STT_CELL_MARGIN = { top: 80, bottom: 80, left: 40, right: 40 };

const VI_LANG = { value: "vi-VN" };

export async function exportSupervisionWeeklyDocx(
  dossier: SupervisionWeeklyPrintDto,
  documentType: "RESULT" | "NEXT_WEEK_PLAN",
): Promise<Buffer> {
  const company = await getCompanyProfile();
  const model = buildWeeklyDocumentModel(dossier, documentType, company);
  const isResult = documentType === "RESULT";
  
  const headerTable = new docx.Table({
    width: { size: USABLE_WIDTH, type: docx.WidthType.DXA },
    layout: docx.TableLayoutType.FIXED,
    columnWidths: [Math.floor(USABLE_WIDTH * 0.45), Math.ceil(USABLE_WIDTH * 0.55)],
    borders: docx.TableBorders.NONE,
    rows: [
      new docx.TableRow({
        cantSplit: true,
        children: [
          new docx.TableCell({
            width: { size: Math.floor(USABLE_WIDTH * 0.45), type: docx.WidthType.DXA },
            margins: CELL_MARGIN,
            children: [
              new docx.Paragraph({ children: [new docx.TextRun({ text: model.metadata.companyName, bold: true, size: 24, font: "Times New Roman", language: VI_LANG })], alignment: docx.AlignmentType.CENTER, spacing: { line: 240, before: 0, after: 0 } }),
              ...(model.metadata.companySubName ? [new docx.Paragraph({ children: [new docx.TextRun({ text: model.metadata.companySubName, bold: true, size: 24, font: "Times New Roman", language: VI_LANG })], alignment: docx.AlignmentType.CENTER, spacing: { line: 240, before: 0, after: 0 } })] : []),
              new docx.Paragraph({ children: [new docx.TextRun({ text: formatReportNumber(model.metadata.reportNumber), font: "Times New Roman", size: 22, language: VI_LANG })], alignment: docx.AlignmentType.CENTER, spacing: { line: 240, before: 80, after: 0 } }),
            ],
          }),
          new docx.TableCell({
            width: { size: Math.ceil(USABLE_WIDTH * 0.55), type: docx.WidthType.DXA },
            margins: CELL_MARGIN,
            children: [
              new docx.Paragraph({ children: [new docx.TextRun({ text: model.metadata.nationalMottoLine1, bold: true, size: 24, font: "Times New Roman", language: VI_LANG })], alignment: docx.AlignmentType.CENTER, spacing: { line: 240, before: 0, after: 0 } }),
              new docx.Paragraph({ children: [new docx.TextRun({ text: model.metadata.nationalMottoLine2, bold: true, size: 24, font: "Times New Roman", language: VI_LANG })], alignment: docx.AlignmentType.CENTER, spacing: { line: 240, before: 0, after: 0 } }),
              new docx.Paragraph({ children: [new docx.TextRun({ text: model.metadata.documentDateLine, italics: true, font: "Times New Roman", size: 22, language: VI_LANG })], alignment: docx.AlignmentType.CENTER, spacing: { line: 240, before: 80, after: 0 } }),
            ],
          }),
        ]
      })
    ]
  });

  const weekRangeText = isResult ? model.metadata.currentWeekRange : model.metadata.nextWeekRange;

  const titleSection = [
    new docx.Paragraph({ text: "", spacing: { before: 0, after: 180, line: 240 } }),
    new docx.Paragraph({
      children: [new docx.TextRun({ text: model.metadata.title, bold: true, size: 30, font: "Times New Roman", language: VI_LANG })],
      alignment: docx.AlignmentType.CENTER,
      spacing: { before: 0, after: 100, line: 240 },
      keepNext: true,
    }),
    new docx.Paragraph({
      children: [new docx.TextRun({ text: `Thời gian báo cáo: ${weekRangeText}`, italics: true, size: 24, font: "Times New Roman", language: VI_LANG })],
      alignment: docx.AlignmentType.CENTER,
      spacing: { before: 0, after: 200, line: 240 },
      keepNext: true,
    }),
    new docx.Paragraph({
      children: [
        new docx.TextRun({ text: "Kính gửi: ", bold: true, size: 24, font: "Times New Roman", language: VI_LANG }),
        new docx.TextRun({ text: model.metadata.recipientName || "Ban Giám đốc Công ty", size: 24, font: "Times New Roman", language: VI_LANG })
      ],
      alignment: docx.AlignmentType.LEFT,
      spacing: { before: 0, after: 60, line: 240 },
      keepNext: true,
    }),
    new docx.Paragraph({
      children: [
        new docx.TextRun({ text: "Chức vụ: ", bold: true, size: 24, font: "Times New Roman", language: VI_LANG }),
        new docx.TextRun({ text: model.metadata.recipientTitle || "Phòng kỹ thuật, Các BCH công trường", size: 24, font: "Times New Roman", language: VI_LANG })
      ],
      alignment: docx.AlignmentType.LEFT,
      spacing: { before: 0, after: 200, line: 240 },
      keepNext: true,
    }),
  ];

  const tableBorders = {
    top: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
    bottom: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
    left: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
    right: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
    insideHorizontal: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
    insideVertical: { style: docx.BorderStyle.SINGLE, size: 4, color: "000000" },
  };

  // Schedule Table (I)
  const scheduleColWidths = [1700, 3122, 3100, 2000]; // sum = 9922 dxa
  const scheduleHeaderTitles = [
    isResult ? "Thời gian kiểm tra" : "Ngày/thứ",
    isResult ? "Công trình và hạng mục kiểm tra" : "Công trình",
    isResult ? "Nội dung kiểm tra" : "Phát sinh do chỉ huy công trình đề xuất",
    isResult ? "Kết quả" : "Nội dung (có phụ lục kèm theo)"
  ];
  const scheduleHeaderRow = new docx.TableRow({
    tableHeader: true,
    cantSplit: true,
    children: scheduleHeaderTitles.map((t, idx) => 
      new docx.TableCell({
        width: { size: scheduleColWidths[idx], type: docx.WidthType.DXA },
        margins: CELL_MARGIN,
        children: [new docx.Paragraph({ children: [new docx.TextRun({ text: t, bold: true, size: 20, font: "Times New Roman", language: VI_LANG })], alignment: docx.AlignmentType.CENTER, spacing: { line: 240, before: 0, after: 0 } })],
        shading: { fill: "EEEEEE" },
        verticalAlign: docx.VerticalAlign.CENTER,
      })
    ),
  });

  const scheduleRows: docx.TableRow[] = [];
  const shiftKeys = ["MORNING", "AFTERNOON", "EVENING"] as const;
  const shiftLabels = ["Sáng:", "Chiều:", "Tối:"];

  for (const day of model.schedule) {
    shiftKeys.forEach((shiftKey, sIdx) => {
      const shiftRows = day.shifts[shiftKey];
      const count = Math.max(1, shiftRows.length);
      
      for (let i = 0; i < count; i++) {
        const rowData = shiftRows[i]; 
        const timeText = i === 0 ? (sIdx === 0 ? `${day.weekdayLabel}:\n${shiftLabels[sIdx]}` : shiftLabels[sIdx]) : "";
        
        const createCell = (
          width: number,
          text: string,
          bold = false,
          align: any = docx.AlignmentType.LEFT,
          vAlign: any = docx.VerticalAlign.TOP
        ) => {
          const lines = text ? text.split("\n") : [""];
          return new docx.TableCell({
            width: { size: width, type: docx.WidthType.DXA },
            margins: CELL_MARGIN,
            children: lines.map(line => 
              new docx.Paragraph({
                children: [new docx.TextRun({ text: line, bold, size: 21, font: "Times New Roman", language: VI_LANG })],
                alignment: align,
                spacing: { line: 240, before: 0, after: 0 }
              })
            ),
            verticalAlign: vAlign,
          });
        };

        const timeCell = createCell(scheduleColWidths[0], timeText, true, docx.AlignmentType.CENTER, docx.VerticalAlign.CENTER);

        const cells = [
          timeCell,
          createCell(scheduleColWidths[1], rowData?.sourceText || ""),
          createCell(scheduleColWidths[2], rowData?.content || ""),
          createCell(scheduleColWidths[3], rowData?.result || ""),
        ];

        scheduleRows.push(new docx.TableRow({ cantSplit: true, children: cells }));
      }
    });
  }

  const scheduleTable = new docx.Table({
    rows: [scheduleHeaderRow, ...scheduleRows],
    width: { size: USABLE_WIDTH, type: docx.WidthType.DXA },
    layout: docx.TableLayoutType.FIXED,
    columnWidths: scheduleColWidths,
    borders: tableBorders,
  });

  function createSectionHeaderDocx(text: string) {
    return new docx.Paragraph({
      children: [
        new docx.TextRun({
          text,
          bold: true,
          font: "Times New Roman",
          size: 26,
          language: VI_LANG,
        }),
      ],
      spacing: {
        before: 200,
        after: 100,
        line: 240,
      },
      keepNext: true,
    });
  }

  // Helper to build STT TableCell
  const createSttCell = (sttText: string, isHeader = false) => {
    return new docx.TableCell({
      width: { size: 850, type: docx.WidthType.DXA },
      margins: STT_CELL_MARGIN,
      children: [
        new docx.Paragraph({
          children: [
            new docx.TextRun({
              text: sttText,
              bold: isHeader,
              size: isHeader ? 19 : 20, // 9.5pt for header, 10pt for body
              font: "Times New Roman",
              language: VI_LANG,
            }),
          ],
          alignment: docx.AlignmentType.CENTER,
          spacing: { line: 240, before: 0, after: 0 },
        }),
      ],
      shading: isHeader ? { fill: "EEEEEE" } : undefined,
      verticalAlign: docx.VerticalAlign.CENTER,
    });
  };

  const createBodyCell = (width: number, text: string, align = docx.AlignmentType.LEFT) => {
    const lines = text ? text.split("\n") : [""];
    return new docx.TableCell({
      width: { size: width, type: docx.WidthType.DXA },
      margins: CELL_MARGIN,
      children: lines.map(line =>
        new docx.Paragraph({
          children: [new docx.TextRun({ text: line, size: 21, font: "Times New Roman", language: VI_LANG })],
          alignment: align,
          spacing: { line: 240, before: 0, after: 0 },
        })
      ),
      verticalAlign: docx.VerticalAlign.TOP,
    });
  };

  const createHeaderCell = (width: number, text: string) => {
    const lines = text.split("\n");
    return new docx.TableCell({
      width: { size: width, type: docx.WidthType.DXA },
      margins: CELL_MARGIN,
      children: lines.map(line =>
        new docx.Paragraph({
          children: [new docx.TextRun({ text: line, bold: true, size: 20, font: "Times New Roman", language: VI_LANG })],
          alignment: docx.AlignmentType.CENTER,
          spacing: { line: 240, before: 0, after: 0 },
        })
      ),
      shading: { fill: "EEEEEE" },
      verticalAlign: docx.VerticalAlign.CENTER,
    });
  };

  const sectionsList: (docx.Paragraph | docx.Table)[] = [
    createSectionHeaderDocx(isResult ? "I. Kết quả thực hiện trong tuần" : "I. Công việc kiểm tra kỹ thuật dự kiến tuần sau"),
    scheduleTable
  ];

  if (isResult) {
    // II. Công tác kiểm tra điều kiện chuyển bước thi công
    // Column widths: [850, 2900, 1550, 1550, 1400, 1672] = 9922 dxa
    const transWidths = [850, 2900, 1550, 1550, 1400, 1672];
    const transitionHeader = new docx.TableRow({
      tableHeader: true, cantSplit: true,
      children: [
        createSttCell("STT", true),
        createHeaderCell(transWidths[1], "Công trình và hạng mục kiểm tra"),
        createHeaderCell(transWidths[2], "Khối lượng báo cáo"),
        createHeaderCell(transWidths[3], "Khối lượng kiểm tra"),
        createHeaderCell(transWidths[4], "Chênh lệch"),
        createHeaderCell(transWidths[5], "Tiến độ đề ra"),
      ]
    });
    const transitionRowsList = model.transitionRows.map((row, idx) => {
      return new docx.TableRow({
        cantSplit: true,
        children: [
          createSttCell((idx + 1).toString(), false),
          createBodyCell(transWidths[1], row.sourceText),
          createBodyCell(transWidths[2], row.reportedText),
          createBodyCell(transWidths[3], row.verifiedText),
          createBodyCell(transWidths[4], row.varianceText),
          createBodyCell(transWidths[5], row.plannedProgress),
        ]
      });
    });
    if (transitionRowsList.length === 0) {
      transitionRowsList.push(new docx.TableRow({ cantSplit: true, children: [createSttCell("1", false), ...transWidths.slice(1).map(w => createBodyCell(w, ""))] }));
    }
    sectionsList.push(
      createSectionHeaderDocx("II. Công tác kiểm tra điều kiện chuyển bước thi công"),
      new docx.Table({ 
        rows: [transitionHeader, ...transitionRowsList], 
        width: { size: USABLE_WIDTH, type: docx.WidthType.DXA }, 
        layout: docx.TableLayoutType.FIXED,
        columnWidths: transWidths,
        borders: tableBorders 
      })
    );

    // III. Công tác đo, kiểm tra khối lượng đã thi công
    // Column widths: [850, 3372, 1900, 1900, 1900] = 9922 dxa
    const quantWidths = [850, 3372, 1900, 1900, 1900];
    const quantityHeader = new docx.TableRow({
      tableHeader: true, cantSplit: true,
      children: [
        createSttCell("STT", true),
        createHeaderCell(quantWidths[1], "Công trình, hạng mục"),
        createHeaderCell(quantWidths[2], "Khối lượng báo cáo"),
        createHeaderCell(quantWidths[3], "Khối lượng kiểm tra"),
        createHeaderCell(quantWidths[4], "Chênh lệch so với thực tế"),
      ]
    });
    const quantityRowsList = model.quantityRows.map((row, idx) => {
      return new docx.TableRow({
        cantSplit: true,
        children: [
          createSttCell((idx + 1).toString(), false),
          createBodyCell(quantWidths[1], row.sourceText),
          createBodyCell(quantWidths[2], row.reportedText),
          createBodyCell(quantWidths[3], row.verifiedText),
          createBodyCell(quantWidths[4], row.varianceText),
        ]
      });
    });
    if (quantityRowsList.length === 0) {
      quantityRowsList.push(new docx.TableRow({ cantSplit: true, children: [createSttCell("1", false), ...quantWidths.slice(1).map(w => createBodyCell(w, ""))] }));
    }
    sectionsList.push(
      createSectionHeaderDocx("III. Công tác đo, kiểm tra khối lượng đã thi công"),
      new docx.Table({ 
        rows: [quantityHeader, ...quantityRowsList], 
        width: { size: USABLE_WIDTH, type: docx.WidthType.DXA }, 
        layout: docx.TableLayoutType.FIXED,
        columnWidths: quantWidths,
        borders: tableBorders 
      })
    );

    // IV. Tiến độ tổng và thực tế
    // Column widths: [850, 2800, 2000, 2136, 2136] = 9922 dxa
    const progWidths = [850, 2800, 2000, 2136, 2136];
    const progressHeader = new docx.TableRow({
      tableHeader: true, cantSplit: true,
      children: [
        createSttCell("STT", true),
        createHeaderCell(progWidths[1], "Công trình/hạng mục"),
        createHeaderCell(progWidths[2], "Tiến độ theo kế hoạch"),
        createHeaderCell(progWidths[3], "Chậm tiến độ\n(Tiến độ thực tế đạt được)"),
        createHeaderCell(progWidths[4], "Lý do chậm tiến độ"),
      ]
    });
    const progressRowsList = model.progressRows.map((row, idx) => {
      return new docx.TableRow({
        cantSplit: true,
        children: [
          createSttCell((idx + 1).toString(), false),
          createBodyCell(progWidths[1], row.sourceText),
          createBodyCell(progWidths[2], row.plannedProgress),
          createBodyCell(progWidths[3], row.actualProgress),
          createBodyCell(progWidths[4], row.delayReason),
        ]
      });
    });
    if (progressRowsList.length === 0) {
      progressRowsList.push(new docx.TableRow({ cantSplit: true, children: [createSttCell("1", false), ...progWidths.slice(1).map(w => createBodyCell(w, ""))] }));
    }
    sectionsList.push(
      createSectionHeaderDocx("IV. Tiến độ tổng và thực tế"),
      new docx.Table({ 
        rows: [progressHeader, ...progressRowsList], 
        width: { size: USABLE_WIDTH, type: docx.WidthType.DXA }, 
        layout: docx.TableLayoutType.FIXED,
        columnWidths: progWidths,
        borders: tableBorders 
      })
    );
  } else {
    sectionsList.push(
      createSectionHeaderDocx("II. Đánh giá kết quả, xử lý tồn tại của tuần trước")
    );

    model.followUps.forEach((r) => {
      sectionsList.push(
        new docx.Paragraph({ 
          children: [
            new docx.TextRun({ text: `${r.order}. `, font: "Times New Roman", bold: true, size: 24, language: VI_LANG }),
            new docx.TextRun({ text: r.title, font: "Times New Roman", bold: true, size: 24, language: VI_LANG })
          ], 
          spacing: { before: 120, after: 40, line: 240 },
          keepNext: true
        })
      );

      if (r.isEmpty) {
        const lineCount = r.order === 1
          ? HANDWRITING_LINE_CONFIG.previousWeekFollowUp
          : HANDWRITING_LINE_CONFIG.verificationAfterCorrection;

        sectionsList.push(createWordWritingLinesTable({ count: lineCount, width: USABLE_WIDTH }));
      } else {
        sectionsList.push(
          new docx.Paragraph({
            children: r.content.split("\n").map((t, idx) => new docx.TextRun({ text: t, break: idx > 0 ? 1 : undefined, font: "Times New Roman", size: 22, language: VI_LANG })),
            indent: { left: 567 },
            spacing: { before: 40, after: 80, line: 240 }
          })
        );
      }
    });

    sectionsList.push(
      createSectionHeaderDocx("III. Kiến nghị, đề xuất Ban Giám đốc về kết quả tuần")
    );

    model.recommendations.forEach((r) => {
      sectionsList.push(
        new docx.Paragraph({ 
          children: [
            new docx.TextRun({ text: `${r.order}. `, font: "Times New Roman", bold: true, size: 24, language: VI_LANG }),
            new docx.TextRun({ text: r.title, font: "Times New Roman", bold: true, size: 24, language: VI_LANG })
          ], 
          spacing: { before: 120, after: 40, line: 240 },
          keepNext: true
        })
      );

      if (r.isEmpty) {
        let lineCount = HANDWRITING_LINE_CONFIG.defaultNarrative;
        if (r.order === 1) lineCount = HANDWRITING_LINE_CONFIG.manpowerAndEquipment;
        else if (r.order === 2) lineCount = HANDWRITING_LINE_CONFIG.progressDirection;
        else if (r.order === 3) lineCount = HANDWRITING_LINE_CONFIG.technicalMaterialIssues;
        else if (r.order === 4) lineCount = HANDWRITING_LINE_CONFIG.otherComments;

        sectionsList.push(createWordWritingLinesTable({ count: lineCount, width: USABLE_WIDTH }));
      } else {
        sectionsList.push(
          new docx.Paragraph({
            children: r.content.split("\n").map((t, idx) => new docx.TextRun({ text: t, break: idx > 0 ? 1 : undefined, font: "Times New Roman", size: 22, language: VI_LANG })),
            indent: { left: 567 },
            spacing: { before: 40, after: 80, line: 240 }
          })
        );
      }
    });
  }

  // Signature Block
  const sigColWidth = Math.floor(USABLE_WIDTH / 2);
  const signatureTable = new docx.Table({
    width: { size: USABLE_WIDTH, type: docx.WidthType.DXA },
    layout: docx.TableLayoutType.FIXED,
    columnWidths: [sigColWidth, sigColWidth],
    borders: docx.TableBorders.NONE,
    rows: [
      new docx.TableRow({
        cantSplit: true,
        children: [
          new docx.TableCell({ width: { size: sigColWidth, type: docx.WidthType.DXA }, margins: CELL_MARGIN, children: [new docx.Paragraph({ text: "", spacing: { line: 240, before: 0, after: 0 } })] }),
          new docx.TableCell({
            width: { size: sigColWidth, type: docx.WidthType.DXA },
            margins: CELL_MARGIN,
            children: [
              new docx.Paragraph({ children: [new docx.TextRun({ text: "NGƯỜI LẬP BÁO CÁO", bold: true, size: 24, font: "Times New Roman", language: VI_LANG })], alignment: docx.AlignmentType.CENTER, spacing: { line: 240, before: 0, after: 0 }, keepNext: true }),
              new docx.Paragraph({ children: [new docx.TextRun({ text: "(Ký, ghi rõ họ tên)", italics: true, size: 22, font: "Times New Roman", language: VI_LANG })], alignment: docx.AlignmentType.CENTER, spacing: { line: 240, before: 0, after: 800 }, keepNext: true }),
              new docx.Paragraph({ children: [new docx.TextRun({ text: model.metadata.creatorName, bold: true, size: 24, font: "Times New Roman", language: VI_LANG })], alignment: docx.AlignmentType.CENTER, spacing: { line: 240, before: 0, after: 0 } }),
            ],
          }),
        ]
      })
    ]
  });

  sectionsList.push(
    new docx.Paragraph({ text: "", spacing: { before: 200, after: 0, line: 240 }, keepNext: true }),
    signatureTable
  );

  const doc = new docx.Document({
    styles: {
      default: {
        document: {
          run: {
            font: "Times New Roman",
            size: 22,
            language: VI_LANG,
          },
          paragraph: {
            spacing: { line: 240, before: 0, after: 0 },
          },
        },
      },
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          basedOn: "Normal",
          next: "Normal",
          run: { font: "Times New Roman", size: 22, language: VI_LANG },
          paragraph: { spacing: { line: 240, before: 0, after: 0 } },
        },
        {
          id: "TableHeader",
          name: "Table Header",
          basedOn: "Normal",
          run: { font: "Times New Roman", size: 20, bold: true, language: VI_LANG },
          paragraph: { alignment: docx.AlignmentType.CENTER, spacing: { line: 240, before: 0, after: 0 } }
        }
      ]
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: PAGE.width,
              height: PAGE.height,
              orientation: docx.PageOrientation.PORTRAIT,
            },
            margin: {
              top: PAGE.marginTop,
              right: PAGE.marginRight,
              bottom: PAGE.marginBottom,
              left: PAGE.marginLeft,
            },
          },
        },
        children: [headerTable, ...titleSection, ...sectionsList],
      },
    ],
  });

  return await docx.Packer.toBuffer(doc);
}
