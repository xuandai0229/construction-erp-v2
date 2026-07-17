import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  Header,
  PageOrientation,
  VerticalAlign,
  TableLayoutType,
} from "docx";
import { SupervisionPackageStatus, SupervisionShift } from "@prisma/client";
import { format } from "date-fns";

// Reusable styling constants
const FONT_FAMILY = "Times New Roman";
const BORDER_SINGLE = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
const TABLE_BORDERS = {
  top: BORDER_SINGLE,
  bottom: BORDER_SINGLE,
  left: BORDER_SINGLE,
  right: BORDER_SINGLE,
  insideHorizontal: BORDER_SINGLE,
  insideVertical: BORDER_SINGLE,
};

function createHeaderTable() {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
    },
    layout: TableLayoutType.FIXED,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 40, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "CÔNG TY CỔ PHẦN XÂY DỰNG", font: FONT_FAMILY, size: 26, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI", font: FONT_FAMILY, size: 26, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Số: ......./.........", font: FONT_FAMILY, size: 26 })],
              }),
            ],
          }),
          new TableCell({
            width: { size: 60, type: WidthType.PERCENTAGE },
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", font: FONT_FAMILY, size: 26, bold: true })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: "Độc lập - Tự do - Hạnh phúc", font: FONT_FAMILY, size: 28, bold: true, underline: {} })],
              }),
              new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 120 },
                children: [new TextRun({ text: "Hà Nội, ngày......tháng......năm......", font: FONT_FAMILY, size: 26, italics: true })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function createReportInfo(title: string, recipient: string, titleOfRecipient: string, fromDate: string, toDate: string, hideDates: boolean = false) {
  const p = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 240 },
      children: [new TextRun({ text: title, font: FONT_FAMILY, size: 28, bold: true })],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [new TextRun({ text: `Kính gửi: \t\t${recipient || "......................................................................"}`, font: FONT_FAMILY, size: 26 })],
    }),
    new Paragraph({
      spacing: { before: 60, after: 60 },
      children: [new TextRun({ text: `Chức vụ: \t\t${titleOfRecipient || "......................................................................"}`, font: FONT_FAMILY, size: 26 })],
    }),
  ];

  if (!hideDates) {
    p.push(
      new Paragraph({
        spacing: { before: 60, after: 120 },
        children: [
          new TextRun({ text: `Thời gian báo cáo: Từ ngày `, font: FONT_FAMILY, size: 26 }),
          new TextRun({ text: fromDate || "...................", font: FONT_FAMILY, size: 26, italics: true }),
          new TextRun({ text: ` Đến ngày `, font: FONT_FAMILY, size: 26 }),
          new TextRun({ text: toDate || "...................", font: FONT_FAMILY, size: 26, italics: true }),
        ],
      })
    );
  }
  return p;
}

export async function exportWeeklyReportDocx(data: any): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 }, // 2cm, 2cm, 2cm, 3cm
          },
        },
        children: [
          createHeaderTable(),
          ...createReportInfo(
            "BÁO CÁO KẾT QUẢ TUẦN",
            data.recipientName || "",
            data.recipientTitle || "",
            format(new Date(data.weekStart), "dd/MM/yyyy"),
            format(new Date(data.weekEnd), "dd/MM/yyyy")
          ),
          
          new Paragraph({ spacing: { before: 120, after: 120 }, children: [new TextRun({ text: "I. Kết quả thực hiện trong tuần", font: FONT_FAMILY, size: 26, bold: true })] }),
          createVisitsTable(data.visits || []),

          new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "II. Công tác kiểm tra điều kiện chuyển bước thi công", font: FONT_FAMILY, size: 26, bold: true })] }),
          createTransitionsTable(data.transitions || []),

          new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "III. Công tác đo, kiểm tra khối lượng đã thi công", font: FONT_FAMILY, size: 26, bold: true })] }),
          createQuantitiesTable(data.quantities || []),

          new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "V. Tiến độ tổng và thực tế", font: FONT_FAMILY, size: 26, bold: true })] }),
          createProgressTable(data.progressAssessments || []),

          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 480 }, children: [new TextRun({ text: "NGƯỜI LẬP BÁO CÁO", font: FONT_FAMILY, size: 26, bold: true })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "(Ký, ghi rõ họ tên)", font: FONT_FAMILY, size: 26, italics: true })] }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

export async function exportNextWeekPlanDocx(data: any): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.PORTRAIT },
            margin: { top: 1134, right: 1134, bottom: 1134, left: 1701 },
          },
        },
        children: [
          createHeaderTable(),
          ...createReportInfo(
            "KẾ HOẠCH TUẦN TIẾP THEO",
            data.recipientName || "",
            data.recipientTitle || "",
            "",
            "",
            true
          ),
          
          new Paragraph({ spacing: { before: 120, after: 120 }, children: [new TextRun({ text: "I. Công việc kiểm tra kỹ thuật dự kiến tuần sau", font: FONT_FAMILY, size: 26, bold: true })] }),
          createPlanTable(data.planItems || []),

          new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "II. Đánh giá kết quả, xử lý tồn tại của tuần trước", font: FONT_FAMILY, size: 26, bold: true })] }),
          new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "1. Theo dõi khắc phục các yêu cầu của tuần trước còn tồn đọng", font: FONT_FAMILY, size: 26 })] }),
          ...createFindingsList(data.findings?.filter((f: any) => ["OPEN", "IN_PROGRESS", "OVERDUE"].includes(f.status)) || []),
          
          new Paragraph({ spacing: { before: 120, after: 60 }, children: [new TextRun({ text: "2. Kiểm tra lại sau khắc phục và xác nhận đã hoàn thành", font: FONT_FAMILY, size: 26 })] }),
          ...createFindingsList(data.findings?.filter((f: any) => ["PENDING_VERIFICATION", "RESOLVED"].includes(f.status)) || []),

          new Paragraph({ spacing: { before: 240, after: 120 }, children: [new TextRun({ text: "III. Kiến nghị, đề xuất Ban Giám đốc về kết quả tuần", font: FONT_FAMILY, size: 26, bold: true })] }),
          new Paragraph({ spacing: { before: 60, after: 60 }, children: [new TextRun({ text: "1. Bổ sung nhân lực, thiết bị; thay thế đội ngũ yếu kém, không đạt yêu cầu về kỹ thuật, mỹ thuật", font: FONT_FAMILY, size: 26 })] }),
          ...createRecommendationsList(data.recommendations?.filter((r: any) => ["STAFFING", "EQUIPMENT", "WEAK_TEAM_REPLACEMENT"].includes(r.group)) || []),
          
          new Paragraph({ spacing: { before: 120, after: 60 }, children: [new TextRun({ text: "2. Chỉ đạo tiến độ các đội chưa đạt yêu cầu, chậm tiến độ, thi công chưa đạt chất lượng", font: FONT_FAMILY, size: 26 })] }),
          ...createRecommendationsList(data.recommendations?.filter((r: any) => ["PROGRESS_DIRECTION", "QUALITY_ISSUE"].includes(r.group)) || []),
          
          new Paragraph({ spacing: { before: 120, after: 60 }, children: [new TextRun({ text: "3. Xử lý phát sinh kỹ thuật, phát sinh vật liệu", font: FONT_FAMILY, size: 26 })] }),
          ...createRecommendationsList(data.recommendations?.filter((r: any) => ["TECHNICAL_VARIATION", "MATERIAL_VARIATION"].includes(r.group)) || []),
          
          new Paragraph({ spacing: { before: 120, after: 60 }, children: [new TextRun({ text: "4. Ý kiến khác", font: FONT_FAMILY, size: 26 })] }),
          ...createRecommendationsList(data.recommendations?.filter((r: any) => r.group === "OTHER") || []),

          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 480 }, children: [new TextRun({ text: "NGƯỜI LẬP BÁO CÁO", font: FONT_FAMILY, size: 26, bold: true })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "(Ký, ghi rõ họ tên)", font: FONT_FAMILY, size: 26, italics: true })] }),
        ],
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

// Helper to create Table Cells
function textCell(text: string, bold: boolean = false, align: any = AlignmentType.LEFT, italics: boolean = false) {
  return new TableCell({
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 100, right: 100 },
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text: text || "", font: FONT_FAMILY, size: 26, bold, italics })] })],
  });
}

const SHIFT_MAP: Record<string, string> = { MORNING: "Sáng", AFTERNOON: "Chiều", EVENING: "Tối" };
const DAY_MAP = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];

function createVisitsTable(visits: any[]) {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        textCell("Thời gian kiểm tra", true, AlignmentType.CENTER),
        textCell("Công trình và hạng mục kiểm tra", true, AlignmentType.CENTER),
        textCell("Nội dung kiểm tra", true, AlignmentType.CENTER),
        textCell("Kết quả", true, AlignmentType.CENTER),
      ],
    }),
  ];

  // Group visits by Day -> Shift
  const grouped: Record<number, Record<string, any[]>> = {};
  for (let i = 1; i <= 7; i++) grouped[i === 7 ? 0 : i + 1] = { MORNING: [], AFTERNOON: [], EVENING: [] }; // 2->7, 0(Sun)
  
  for (const v of visits) {
    const day = new Date(v.visitDate).getDay();
    if (!grouped[day]) grouped[day] = { MORNING: [], AFTERNOON: [], EVENING: [] };
    grouped[day][v.shift].push(v);
  }

  // Iterate exactly as the form requires
  const renderOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun
  for (const day of renderOrder) {
    rows.push(
      new TableRow({
        children: [textCell(`${DAY_MAP[day]}:`, true), textCell(""), textCell(""), textCell("")]
      })
    );
    for (const shift of ["MORNING", "AFTERNOON", "EVENING"]) {
      const shiftVisits = grouped[day][shift];
      if (shiftVisits.length === 0) {
        rows.push(new TableRow({ children: [textCell(`${SHIFT_MAP[shift]}:`, true), textCell(""), textCell(""), textCell("")] }));
      } else {
        shiftVisits.forEach((v, index) => {
          rows.push(new TableRow({
            children: [
              textCell(index === 0 ? `${SHIFT_MAP[shift]}:` : "", true),
              textCell(`${v.project?.name || "N/A"}\n${v.workItem || ""}`),
              textCell(v.inspectionContent || ""),
              textCell(v.result || ""),
            ]
          }));
        });
      }
    }
  }

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: TABLE_BORDERS, rows });
}

function createTransitionsTable(items: any[]) {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        textCell("STT", true, AlignmentType.CENTER),
        textCell("Công trình và hạng mục kiểm tra", true, AlignmentType.CENTER),
        textCell("Khối lượng báo cáo", true, AlignmentType.CENTER),
        textCell("Khối lượng kiểm tra", true, AlignmentType.CENTER),
        textCell("Chênh lệch", true, AlignmentType.CENTER),
        textCell("Tiến độ đề ra", true, AlignmentType.CENTER),
      ],
    }),
  ];
  
  if (items.length === 0) {
    rows.push(new TableRow({ children: [textCell(""), textCell(""), textCell(""), textCell(""), textCell(""), textCell("")] }));
    rows.push(new TableRow({ children: [textCell(""), textCell(""), textCell(""), textCell(""), textCell(""), textCell("")] }));
  } else {
    items.forEach((item, index) => {
      rows.push(new TableRow({
        children: [
          textCell((index + 1).toString(), false, AlignmentType.CENTER),
          textCell(`${item.project?.name || "N/A"}\n${item.workItem || ""}`),
          textCell(item.reportedQuantity ? `${item.reportedQuantity} ${item.unit || ""}` : ""),
          textCell(item.verifiedQuantity ? `${item.verifiedQuantity} ${item.unit || ""}` : ""),
          textCell(item.varianceQuantity ? `${item.varianceQuantity} ${item.unit || ""}` : ""),
          textCell(item.plannedProgress || ""),
        ]
      }));
    });
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: TABLE_BORDERS, rows });
}

function createQuantitiesTable(items: any[]) {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        textCell("STT", true, AlignmentType.CENTER),
        textCell("Công trình, hạng mục", true, AlignmentType.CENTER),
        textCell("Khối lượng báo cáo", true, AlignmentType.CENTER),
        textCell("Khối lượng kiểm tra", true, AlignmentType.CENTER),
        textCell("Chênh lệch so với thực tế", true, AlignmentType.CENTER),
      ],
    }),
  ];

  if (items.length === 0) {
    for(let i=1; i<=3; i++) rows.push(new TableRow({ children: [textCell(i.toString(), false, AlignmentType.CENTER), textCell(""), textCell(""), textCell(""), textCell("")] }));
  } else {
    items.forEach((item, index) => {
      rows.push(new TableRow({
        children: [
          textCell((index + 1).toString(), false, AlignmentType.CENTER),
          textCell(`${item.project?.name || "N/A"}\n${item.workItem || ""}`),
          textCell(`${item.reportedQuantity} ${item.unit}`),
          textCell(`${item.verifiedQuantity} ${item.unit}`),
          textCell(`${item.varianceQuantity} ${item.unit}`),
        ]
      }));
    });
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: TABLE_BORDERS, rows });
}

function createProgressTable(items: any[]) {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        textCell("STT", true, AlignmentType.CENTER),
        textCell("Công trình/ hạng mục", true, AlignmentType.CENTER),
        textCell("Tiến độ theo kế hoạch", true, AlignmentType.CENTER),
        textCell("Chậm tiến độ\n(Tiến độ thực tế đạt được)", true, AlignmentType.CENTER),
        textCell("Lý do chậm tiến độ", true, AlignmentType.CENTER),
      ],
    }),
  ];

  if (items.length === 0) {
    for(let i=1; i<=3; i++) rows.push(new TableRow({ children: [textCell(i.toString(), false, AlignmentType.CENTER), textCell(""), textCell(""), textCell(""), textCell("")] }));
  } else {
    items.forEach((item, index) => {
      rows.push(new TableRow({
        children: [
          textCell((index + 1).toString(), false, AlignmentType.CENTER),
          textCell(`${item.project?.name || "N/A"}\n${item.workItem || ""}`),
          textCell(item.plannedProgress ? `${item.plannedProgress}%` : ""),
          textCell(item.actualProgress ? `${item.actualProgress}% (${item.delayedDays || 0} ngày)` : ""),
          textCell(item.delayReason || ""),
        ]
      }));
    });
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: TABLE_BORDERS, rows });
}

function createPlanTable(items: any[]) {
  const rows = [
    new TableRow({
      tableHeader: true,
      children: [
        textCell("Ngày/thứ", true, AlignmentType.CENTER),
        textCell("Công trình", true, AlignmentType.CENTER),
        textCell("Phát sinh do chỉ huy công trình đề xuất", true, AlignmentType.CENTER),
        textCell("Nội dung\n(có phụ lục kèm theo)", true, AlignmentType.CENTER),
      ],
    }),
  ];

  const grouped: Record<number, Record<string, any[]>> = {};
  for (let i = 1; i <= 7; i++) grouped[i === 7 ? 0 : i + 1] = { MORNING: [], AFTERNOON: [], EVENING: [] };
  
  for (const v of items) {
    const day = new Date(v.plannedDate).getDay();
    if (!grouped[day]) grouped[day] = { MORNING: [], AFTERNOON: [], EVENING: [] };
    grouped[day][v.shift].push(v);
  }

  const renderOrder = [1, 2, 3, 4, 5, 6, 0];
  for (const day of renderOrder) {
    rows.push(new TableRow({ children: [textCell(`${DAY_MAP[day]}:`, true), textCell(""), textCell(""), textCell("")] }));
    for (const shift of ["MORNING", "AFTERNOON", "EVENING"]) {
      const shiftItems = grouped[day][shift];
      if (shiftItems.length === 0) {
        rows.push(new TableRow({ children: [textCell(`${SHIFT_MAP[shift]}:`, true), textCell(""), textCell(""), textCell("")] }));
      } else {
        shiftItems.forEach((v, index) => {
          rows.push(new TableRow({
            children: [
              textCell(index === 0 ? `${SHIFT_MAP[shift]}:` : "", true),
              textCell(`${v.project?.name || "N/A"}`),
              textCell(v.source === "SITE_COMMANDER" ? "Có" : ""),
              textCell(v.inspectionContent || ""),
            ]
          }));
        });
      }
    }
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: TABLE_BORDERS, rows });
}

function createFindingsList(items: any[]) {
  if (items.length === 0) {
    return [new Paragraph({ children: [new TextRun({ text: "\t(Không có)", font: FONT_FAMILY, size: 26, italics: true })] })];
  }
  return items.map(item => new Paragraph({ children: [new TextRun({ text: `\t- ${item.project?.name || ""}: ${item.description}`, font: FONT_FAMILY, size: 26 })] }));
}

function createRecommendationsList(items: any[]) {
  if (items.length === 0) {
    return [new Paragraph({ children: [new TextRun({ text: "\t(Không có)", font: FONT_FAMILY, size: 26, italics: true })] })];
  }
  return items.map(item => new Paragraph({ children: [new TextRun({ text: `\t- ${item.content} (${item.project?.name || "Chung"})`, font: FONT_FAMILY, size: 26 })] }));
}
