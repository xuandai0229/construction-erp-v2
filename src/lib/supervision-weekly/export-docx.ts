import * as docx from "docx";
import type { SupervisionWeeklyPrintDto } from "./print-types";
import { buildWeeklyDocumentModel, NEXT_WEEK_PLAN_GROUP_2_CATEGORIES } from "./document-model";

const PAGE = {
  width: 16838,
  height: 11906,
  marginTop: 850, // 15mm
  marginBottom: 850,
  marginLeft: 850,
  marginRight: 850,
};
const USABLE_WIDTH = PAGE.width - PAGE.marginLeft - PAGE.marginRight;

export async function exportSupervisionWeeklyDocx(dossier: SupervisionWeeklyPrintDto, documentType: "RESULT" | "NEXT_WEEK_PLAN"): Promise<any> {
  const model = buildWeeklyDocumentModel(dossier, documentType);
  const isResult = documentType === "RESULT";
  
  const headerTable = new docx.Table({
    width: { size: USABLE_WIDTH, type: docx.WidthType.DXA },
    layout: docx.TableLayoutType.FIXED,
    columnWidths: [Math.floor(USABLE_WIDTH * 0.4), Math.ceil(USABLE_WIDTH * 0.6)],
    borders: docx.TableBorders.NONE,
    rows: [
      new docx.TableRow({
        cantSplit: true,
        children: [
          new docx.TableCell({
            children: [
              new docx.Paragraph({ children: [new docx.TextRun({ text: model.metadata.companyName, bold: true })], alignment: docx.AlignmentType.CENTER }),
              new docx.Paragraph({ children: [new docx.TextRun({ text: model.metadata.companySubName, bold: true })], alignment: docx.AlignmentType.CENTER }),
              new docx.Paragraph({ text: `Số: ${model.metadata.reportNumber}`, alignment: docx.AlignmentType.CENTER }),
            ],
          }),
          new docx.TableCell({
            children: [
              new docx.Paragraph({ children: [new docx.TextRun({ text: model.metadata.nationalMottoLine1, bold: true })], alignment: docx.AlignmentType.CENTER }),
              new docx.Paragraph({ children: [new docx.TextRun({ text: model.metadata.nationalMottoLine2, bold: true })], alignment: docx.AlignmentType.CENTER }),
              new docx.Paragraph({ text: `${model.metadata.place}, ngày ${model.metadata.issueDate.split("/")[0]} tháng ${model.metadata.issueDate.split("/")[1]} năm ${model.metadata.issueDate.split("/")[2]}`, alignment: docx.AlignmentType.CENTER }),
            ],
          }),
        ]
      })
    ]
  });

  const titleSection = [
    new docx.Paragraph({ text: "", spacing: { after: 300 } }),
    new docx.Paragraph({
      children: [new docx.TextRun({ text: model.metadata.title, bold: true, size: 28 })],
      alignment: docx.AlignmentType.CENTER,
      spacing: { after: 100 },
      keepNext: true,
    }),
    new docx.Paragraph({
      text: `Thời gian báo cáo: Từ ngày ${model.metadata.weekStart} đến ngày ${model.metadata.weekEnd}`,
      alignment: docx.AlignmentType.CENTER,
      spacing: { after: 300 },
      keepNext: true,
    }),
    new docx.Paragraph({
      children: [
        new docx.TextRun({ text: "Kính gửi: ", italics: true }),
        new docx.TextRun({ text: model.metadata.recipientName, bold: true })
      ],
      alignment: docx.AlignmentType.LEFT,
      keepNext: true,
    }),
    new docx.Paragraph({
      children: [
        new docx.TextRun({ text: "Chức vụ: ", italics: true }),
        new docx.TextRun({ text: model.metadata.recipientTitle, bold: true })
      ],
      alignment: docx.AlignmentType.LEFT,
      spacing: { after: 300 },
      keepNext: true,
    }),
  ];

  const tableBorders = {
    top: { style: docx.BorderStyle.SINGLE, size: 1 },
    bottom: { style: docx.BorderStyle.SINGLE, size: 1 },
    left: { style: docx.BorderStyle.SINGLE, size: 1 },
    right: { style: docx.BorderStyle.SINGLE, size: 1 },
    insideHorizontal: { style: docx.BorderStyle.SINGLE, size: 1 },
    insideVertical: { style: docx.BorderStyle.SINGLE, size: 1 },
  };

  const scheduleHeaderRow = new docx.TableRow({
    tableHeader: true,
    cantSplit: true,
    children: [
      new docx.TableCell({ children: [new docx.Paragraph({ text: isResult ? "Thời gian kiểm tra" : "Ngày/thứ", style: "TableHeader" })], shading: { fill: "EEEEEE" } }),
      new docx.TableCell({ children: [new docx.Paragraph({ text: isResult ? "Công trình và hạng mục kiểm tra" : "Công trình", style: "TableHeader" })], shading: { fill: "EEEEEE" } }),
      new docx.TableCell({ children: [new docx.Paragraph({ text: isResult ? "Nội dung kiểm tra" : "Phát sinh do chỉ huy công trình đề xuất", style: "TableHeader" })], shading: { fill: "EEEEEE" } }),
      new docx.TableCell({ children: [new docx.Paragraph({ text: isResult ? "Kết quả" : "Nội dung (có phụ lục kèm theo)", style: "TableHeader" })], shading: { fill: "EEEEEE" } }),
    ],
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
        const cells: docx.TableCell[] = [];
        
        const timeText = i === 0 ? (sIdx === 0 ? `${day.weekdayLabel}:\n${shiftLabels[sIdx]}` : shiftLabels[sIdx]) : "";
        cells.push(new docx.TableCell({
          children: timeText ? timeText.split("\n").map(t => new docx.Paragraph({ children: [new docx.TextRun({ text: t, bold: true })] })) : [new docx.Paragraph("")],
          verticalAlign: docx.VerticalAlign.CENTER,
        }));

        // Render Data Cells
        if (rowData) {
          cells.push(
            new docx.TableCell({ children: rowData.sourceText.split("\n").map(t => new docx.Paragraph(t)) }),
            new docx.TableCell({ children: rowData.content.split("\n").map(t => new docx.Paragraph(t)) }),
            new docx.TableCell({ children: rowData.result.split("\n").map(t => new docx.Paragraph(t)) })
          );
        } else {
          cells.push(
            new docx.TableCell({ children: [new docx.Paragraph("")] }),
            new docx.TableCell({ children: [new docx.Paragraph("")] }),
            new docx.TableCell({ children: [new docx.Paragraph("")] })
          );
        }

        scheduleRows.push(new docx.TableRow({ cantSplit: true, children: cells }));
      }
    });
  }

  const scheduleTable = new docx.Table({
    rows: [scheduleHeaderRow, ...scheduleRows],
    width: { size: USABLE_WIDTH, type: docx.WidthType.DXA },
    layout: docx.TableLayoutType.FIXED,
    columnWidths: [2270, 4541, 4087, 4240],
    borders: tableBorders,
  });

  function createSectionHeaderDocx(text: string) {
    return new docx.Paragraph({
      children: [
        new docx.TextRun({
          text,
          bold: true,
          font: "Times New Roman",
          size: 24,
        }),
      ],
      spacing: {
        before: 160,
        after: 80,
      },
      keepNext: true,
    });
  }

  const sectionsList: (docx.Paragraph | docx.Table)[] = [
    createSectionHeaderDocx(isResult ? "I. Kết quả thực hiện trong tuần" : "I. Công việc kiểm tra kỹ thuật dự kiến tuần sau"),
    scheduleTable
  ];

  if (isResult) {
    // II. Công tác kiểm tra điều kiện chuyển bước thi công
    const transitionHeader = new docx.TableRow({
      tableHeader: true, cantSplit: true,
      children: ["STT", "Công trình và hạng mục kiểm tra", "Khối lượng báo cáo", "Khối lượng kiểm tra", "Chênh lệch", "Tiến độ đề ra"].map((t: string) => 
        new docx.TableCell({ children: [new docx.Paragraph({ text: t, style: "TableHeader" })], shading: { fill: "EEEEEE" } })
      )
    });
    const transitionRowsList = model.transitionRows.map((row, idx) => {
      return new docx.TableRow({
        cantSplit: true,
        children: [
          new docx.TableCell({ children: [new docx.Paragraph((idx + 1).toString())] }),
          new docx.TableCell({ children: row.sourceText.split("\n").map(t => new docx.Paragraph(t)) }),
          new docx.TableCell({ children: [new docx.Paragraph(row.reportedText)] }),
          new docx.TableCell({ children: [new docx.Paragraph(row.verifiedText)] }),
          new docx.TableCell({ children: [new docx.Paragraph(row.varianceText)] }),
          new docx.TableCell({ children: row.plannedProgress.split("\n").map(t => new docx.Paragraph(t)) }),
        ]
      });
    });
    if (transitionRowsList.length === 0) {
      transitionRowsList.push(new docx.TableRow({ cantSplit: true, children: Array(6).fill(new docx.TableCell({ children: [new docx.Paragraph("")] })) }));
    }
    sectionsList.push(
      createSectionHeaderDocx("II. Công tác kiểm tra điều kiện chuyển bước thi công"),
      new docx.Table({ 
        rows: [transitionHeader, ...transitionRowsList], 
        width: { size: USABLE_WIDTH, type: docx.WidthType.DXA }, 
        layout: docx.TableLayoutType.FIXED,
        columnWidths: [757, 4541, 2271, 2271, 2271, 3027],
        borders: tableBorders 
      })
    );

    // III. Công tác đo, kiểm tra khối lượng đã thi công
    const quantityHeader = new docx.TableRow({
      tableHeader: true, cantSplit: true,
      children: ["STT", "Công trình, hạng mục", "Khối lượng báo cáo", "Khối lượng kiểm tra", "Chênh lệch so với thực tế"].map((t: string) => 
        new docx.TableCell({ children: [new docx.Paragraph({ text: t, style: "TableHeader" })], shading: { fill: "EEEEEE" } })
      )
    });
    const quantityRowsList = model.quantityRows.map((row, idx) => {
      return new docx.TableRow({
        cantSplit: true,
        children: [
          new docx.TableCell({ children: [new docx.Paragraph((idx + 1).toString())] }),
          new docx.TableCell({ children: row.sourceText.split("\n").map(t => new docx.Paragraph(t)) }),
          new docx.TableCell({ children: [new docx.Paragraph(row.reportedText)] }),
          new docx.TableCell({ children: [new docx.Paragraph(row.verifiedText)] }),
          new docx.TableCell({ children: [new docx.Paragraph(row.varianceText)] }),
        ]
      });
    });
    if (quantityRowsList.length === 0) {
      quantityRowsList.push(new docx.TableRow({ cantSplit: true, children: Array(5).fill(new docx.TableCell({ children: [new docx.Paragraph("")] })) }));
    }
    sectionsList.push(
      createSectionHeaderDocx("III. Công tác đo, kiểm tra khối lượng đã thi công"),
      new docx.Table({ 
        rows: [quantityHeader, ...quantityRowsList], 
        width: { size: USABLE_WIDTH, type: docx.WidthType.DXA }, 
        layout: docx.TableLayoutType.FIXED,
        columnWidths: [757, 5298, 3027, 3027, 3028],
        borders: tableBorders 
      })
    );

    // IV. Tiến độ tổng và thực tế
    const progressHeader = new docx.TableRow({
      tableHeader: true, cantSplit: true,
      children: ["STT", "Công trình/hạng mục", "Tiến độ theo kế hoạch", "Chậm tiến độ\n(Tiến độ thực tế đạt được)", "Lý do chậm tiến độ"].map((t: string) => 
        new docx.TableCell({ children: t.split("\n").map(line => new docx.Paragraph({ text: line, style: "TableHeader" })), shading: { fill: "EEEEEE" } })
      )
    });
    const progressRowsList = model.progressRows.map((row, idx) => {
      return new docx.TableRow({
        cantSplit: true,
        children: [
          new docx.TableCell({ children: [new docx.Paragraph((idx + 1).toString())] }),
          new docx.TableCell({ children: row.sourceText.split("\n").map(t => new docx.Paragraph(t)) }),
          new docx.TableCell({ children: [new docx.Paragraph(row.plannedProgress)] }),
          new docx.TableCell({ children: [new docx.Paragraph(row.actualProgress)] }),
          new docx.TableCell({ children: [new docx.Paragraph(row.delayReason)] }),
        ]
      });
    });
    if (progressRowsList.length === 0) {
      progressRowsList.push(new docx.TableRow({ cantSplit: true, children: Array(5).fill(new docx.TableCell({ children: [new docx.Paragraph("")] })) }));
    }
    sectionsList.push(
      createSectionHeaderDocx("IV. Tiến độ tổng và thực tế"),
      new docx.Table({ 
        rows: [progressHeader, ...progressRowsList], 
        width: { size: USABLE_WIDTH, type: docx.WidthType.DXA }, 
        layout: docx.TableLayoutType.FIXED,
        columnWidths: [757, 3784, 3028, 3784, 3785],
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
            new docx.TextRun({ text: `${r.order}. `, font: "Times New Roman" }),
            new docx.TextRun({ text: r.title, font: "Times New Roman" })
          ], 
          spacing: { before: 120, after: 60 },
          keepNext: true
        })
      );

      if (r.isEmpty) {
        const CONTENT_INDENT = 567;
        for (let j = 0; j < 3; j++) {
          sectionsList.push(
            new docx.Paragraph({
              children: [new docx.TextRun({ text: "" })],
              spacing: { before: 200, after: 120 },
              indent: { left: CONTENT_INDENT },
              border: { bottom: { color: "000000", space: 1, style: docx.BorderStyle.DOTTED, size: 18 } }
            })
          );
        }
      } else {
        sectionsList.push(
          new docx.Paragraph({
            children: r.content.split("\n").map((t, idx) => new docx.TextRun({ text: t, break: idx > 0 ? 1 : undefined, font: "Times New Roman" })),
            indent: { left: 567 },
            spacing: { before: 60, after: 120 }
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
            new docx.TextRun({ text: `${r.order}. ` }),
            new docx.TextRun({ text: r.title })
          ], 
          spacing: { before: 120, after: 60 },
          keepNext: true
        })
      );

      if (r.isEmpty) {
        // Render dotted lines using paragraph bottom border for thicker dots
        const CONTENT_INDENT = 567; // 1cm
        for (let j = 0; j < 3; j++) {
          sectionsList.push(
            new docx.Paragraph({
              children: [new docx.TextRun({ text: "" })],
              indent: {
                left: CONTENT_INDENT,
              },
              spacing: { before: 180, after: 0 },
              border: {
                bottom: {
                  color: "000000",
                  space: 1,
                  style: docx.BorderStyle.DOTTED,
                  size: 18,
                },
              },
            })
          );
        }
      } else {
        sectionsList.push(
          new docx.Paragraph({ 
            children: r.content.split("\n").map((t, idx) => new docx.TextRun({ text: t, break: idx > 0 ? 1 : undefined })), 
            indent: { left: 567 },
            spacing: { before: 40, after: 60 }
          })
        );
      }
    });
  }

  // Signature
  const signatureTable = new docx.Table({
    width: { size: USABLE_WIDTH, type: docx.WidthType.DXA },
    layout: docx.TableLayoutType.FIXED,
    columnWidths: [Math.floor(USABLE_WIDTH / 2), Math.ceil(USABLE_WIDTH / 2)],
    borders: docx.TableBorders.NONE,
    rows: [
      new docx.TableRow({
        cantSplit: true,
        children: [
          new docx.TableCell({ children: [new docx.Paragraph("")] }),
          new docx.TableCell({
            children: [
              new docx.Paragraph({ children: [new docx.TextRun({ text: "NGƯỜI LẬP BÁO CÁO", bold: true })], alignment: docx.AlignmentType.CENTER }),
              new docx.Paragraph({ children: [new docx.TextRun({ text: "(Ký, ghi rõ họ tên)", italics: true })], alignment: docx.AlignmentType.CENTER, spacing: { after: 800 } }),
              new docx.Paragraph({ children: [new docx.TextRun({ text: model.metadata.creatorName, bold: true })], alignment: docx.AlignmentType.CENTER }),
            ],
          }),
        ]
      })
    ]
  });

  sectionsList.push(
    new docx.Paragraph({ text: "", spacing: { before: 400 }, keepNext: true }),
    signatureTable
  );

  const doc = new docx.Document({
    styles: {
      paragraphStyles: [
        {
          id: "Normal",
          name: "Normal",
          basedOn: "Normal",
          next: "Normal",
          run: { font: "Times New Roman", size: 26 }, // 13pt
        },
        {
          id: "TableHeader",
          name: "Table Header",
          basedOn: "Normal",
          run: { font: "Times New Roman", size: 26, bold: true },
          paragraph: { alignment: docx.AlignmentType.CENTER }
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
              orientation: docx.PageOrientation.LANDSCAPE,
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
