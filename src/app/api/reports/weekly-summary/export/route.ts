import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getWeeklyCompanySummary,
  canAggregateWeeklyCompanySummary,
} from "@/lib/reports/weekly-company-summary";
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
  PageOrientation,
  BorderStyle,
  Footer,
  PageNumber,
} from "docx";

function formatDateShortVN(ymd: string): string {
  if (!ymd) return "";
  const parts = ymd.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return ymd;
}

function formatDateFullVN(isoString: string): string {
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `Hà Nội, ngày ${day} tháng ${month} năm ${year}`;
  } catch {
    return "Hà Nội, ngày ... tháng ... năm ...";
  }
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
  }

  if (!canAggregateWeeklyCompanySummary(session.role)) {
    return NextResponse.json({ error: "Không có quyền xuất file." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("weekStart");

  if (!weekStart) {
    return NextResponse.json({ error: "Thiếu tham số weekStart." }, { status: 400 });
  }

  try {
    const summary = await getWeeklyCompanySummary(weekStart);
    const { week, generatedAt, projects } = summary;

    const docFont = "Times New Roman";
    const cellMarginStandard = { top: 100, bottom: 100, left: 120, right: 120 };

    const thinBorder = {
      top: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "000000" },
    };

    // ─── Header Table (Corporate Header) ─────────────────────
    const headerTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE },
        bottom: { style: BorderStyle.NONE },
        left: { style: BorderStyle.NONE },
        right: { style: BorderStyle.NONE },
        insideHorizontal: { style: BorderStyle.NONE },
        insideVertical: { style: BorderStyle.NONE },
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 48, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "CÔNG TY CỔ PHẦN XÂY DỰNG", bold: true, size: 22, font: docFont })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI", bold: true, size: 22, font: docFont })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "Số: ................", size: 20, font: docFont })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 52, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", bold: true, size: 22, font: docFont })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: "Độc lập - Tự do - Hạnh phúc", bold: true, size: 22, font: docFont })],
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: formatDateFullVN(generatedAt), italics: true, size: 21, font: docFont })],
                }),
              ],
            }),
          ],
        }),
      ],
    });

    // ─── Summary Table (5 Content Columns, NO STATUS) ───────
    const summaryTableRows: TableRow[] = [
      new TableRow({
        tableHeader: true,
        children: [
          { text: "STT", w: 5 },
          { text: "Công trình", w: 22 },
          { text: "Kết quả chính trong tuần", w: 28 },
          { text: "Vướng mắc / Khó khăn", w: 15 },
          { text: "Kế hoạch tuần tới", w: 15 },
          { text: "Cần BĐH/BGĐ xử lý", w: 15 },
        ].map(
          (col) =>
            new TableCell({
              width: { size: col.w, type: WidthType.PERCENTAGE },
              shading: { fill: "F1F5F9" },
              margins: cellMarginStandard,
              children: [
                new Paragraph({
                  alignment: col.text === "STT" ? AlignmentType.CENTER : AlignmentType.LEFT,
                  children: [new TextRun({ text: col.text, bold: true, size: 19, font: docFont })],
                }),
              ],
            }),
        ),
      }),
    ];

    projects.forEach((p, idx) => {
      summaryTableRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 5, type: WidthType.PERCENTAGE },
              margins: cellMarginStandard,
              children: [
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  children: [new TextRun({ text: String(idx + 1), size: 19, font: docFont })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 22, type: WidthType.PERCENTAGE },
              margins: cellMarginStandard,
              children: [
                new Paragraph({ children: [new TextRun({ text: p.name, bold: true, size: 19, font: docFont })] }),
                new Paragraph({ children: [new TextRun({ text: `Mã: ${p.code}`, size: 17, color: "475569", font: docFont })] }),
                ...(p.reporter
                  ? [new Paragraph({ children: [new TextRun({ text: `PT: ${p.reporter}`, italics: true, size: 17, color: "475569", font: docFont })] })]
                  : []),
              ],
            }),
            new TableCell({
              width: { size: 28, type: WidthType.PERCENTAGE },
              margins: cellMarginStandard,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: p.hasReport ? p.result || "Đã cập nhật kết quả." : "Chưa có báo cáo tuần.",
                      italics: !p.hasReport,
                      size: 19,
                      font: docFont,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 15, type: WidthType.PERCENTAGE },
              margins: cellMarginStandard,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: p.hasReport ? p.issues || "Không có" : "-", size: 19, font: docFont })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 15, type: WidthType.PERCENTAGE },
              margins: cellMarginStandard,
              children: [
                new Paragraph({
                  children: [new TextRun({ text: p.hasReport ? p.nextWeekPlan || "Chưa cập nhật" : "-", size: 19, font: docFont })],
                }),
              ],
            }),
            new TableCell({
              width: { size: 15, type: WidthType.PERCENTAGE },
              margins: cellMarginStandard,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: p.hasReport ? p.supportNeeded || "Không có" : "-",
                      bold: p.hasReport && !!p.supportNeeded,
                      size: 19,
                      font: docFont,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      );
    });

    const summaryTable = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: thinBorder,
      rows: summaryTableRows,
    });

    // ─── Section 2: Project Detail Paragraphs ─────────────────
    const projectDetailParagraphs: Paragraph[] = [
      new Paragraph({
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: "2. NỘI DUNG CHI TIẾT TỪNG CÔNG TRÌNH",
            bold: true,
            size: 25,
            font: docFont,
          }),
        ],
      }),
    ];

    projects.forEach((p, idx) => {
      projectDetailParagraphs.push(
        new Paragraph({
          spacing: { before: 180, after: 60 },
          children: [
            new TextRun({
              text: `2.${idx + 1}. ${p.name} (${p.code})`,
              bold: true,
              size: 23,
              font: docFont,
            }),
          ],
        }),
      );

      if (!p.hasReport) {
        projectDetailParagraphs.push(
          new Paragraph({
            spacing: { after: 140 },
            children: [
              new TextRun({
                text: "   Chưa có báo cáo tuần.",
                italics: true,
                size: 22,
                color: "64748B",
                font: docFont,
              }),
            ],
          }),
        );
      } else {
        projectDetailParagraphs.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [
              new TextRun({ text: "   • Kết quả thực hiện trong tuần: ", bold: true, size: 22, font: docFont }),
              new TextRun({ text: p.result || "Chưa cập nhật.", size: 22, font: docFont }),
            ],
          }),
        );

        if (p.issues) {
          projectDetailParagraphs.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: "   • Vướng mắc / Khó khăn: ", bold: true, size: 22, color: "991B1B", font: docFont }),
                new TextRun({ text: p.issues, size: 22, font: docFont }),
              ],
            }),
          );
        }

        if (p.nextWeekPlan) {
          projectDetailParagraphs.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: "   • Kế hoạch tuần tiếp theo: ", bold: true, size: 22, font: docFont }),
                new TextRun({ text: p.nextWeekPlan, size: 22, font: docFont }),
              ],
            }),
          );
        }

        if (p.quality) {
          projectDetailParagraphs.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: "   • Chất lượng & An toàn: ", bold: true, size: 22, font: docFont }),
                new TextRun({ text: p.quality, size: 22, font: docFont }),
              ],
            }),
          );
        }

        if (p.materials || p.labor) {
          projectDetailParagraphs.push(
            new Paragraph({
              spacing: { after: 40 },
              children: [
                new TextRun({ text: "   • Nhân lực & Vật tư: ", bold: true, size: 22, font: docFont }),
                new TextRun({
                  text: [p.materials && `Vật tư: ${p.materials}`, p.labor && `Nhân lực: ${p.labor}`]
                    .filter(Boolean)
                    .join(" | "),
                  size: 22,
                  font: docFont,
                }),
              ],
            }),
          );
        }

        if (p.supportNeeded) {
          projectDetailParagraphs.push(
            new Paragraph({
              spacing: { after: 140 },
              children: [
                new TextRun({ text: "   • Nội dung cần xử lý: ", bold: true, size: 22, color: "92400E", font: docFont }),
                new TextRun({ text: p.supportNeeded, bold: true, size: 22, color: "78350F", font: docFont }),
              ],
            }),
          );
        }
      }
    });

    // ─── Footer ───────────────────────────────────────────────
    const docFooter = new Footer({
      children: [
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: "Tổng hợp báo cáo tuần · Trang ", size: 18, color: "64748B", font: docFont }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "64748B", font: docFont }),
            new TextRun({ text: " / ", size: 18, color: "64748B", font: docFont }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: "64748B", font: docFont }),
          ],
        }),
      ],
    });

    // ─── Build Document ───────────────────────────────────────
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: { orientation: PageOrientation.PORTRAIT },
              margin: { top: 1134, bottom: 1134, left: 1417, right: 1134 },
            },
          },
          footers: { default: docFooter },
          children: [
            headerTable,
            new Paragraph({ spacing: { before: 200 }, children: [] }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 100 },
              children: [
                new TextRun({
                  text: "TỔNG HỢP BÁO CÁO TUẦN",
                  bold: true,
                  size: 32,
                  font: docFont,
                }),
              ],
            }),
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: { after: 240 },
              children: [
                new TextRun({
                  text: `Tuần ${week.weekNumber} – Từ ngày ${formatDateShortVN(week.weekStartDate)} đến ngày ${formatDateShortVN(week.weekEndDate)}`,
                  bold: true,
                  size: 23,
                  font: docFont,
                }),
              ],
            }),
            new Paragraph({
              spacing: { after: 120 },
              children: [
                new TextRun({
                  text: "1. BẢNG TỔNG HỢP KẾT QUẢ CÁC CÔNG TRÌNH",
                  bold: true,
                  size: 25,
                  font: docFont,
                }),
              ],
            }),
            summaryTable,
            ...projectDetailParagraphs,
            // NO SIGNATURES BLOCK - Clean document termination
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    const filename = `tong-hop-bao-cao-tuan-${week.weekStartDate}_den_${week.weekEndDate}.docx`;

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("[ExportWeeklySummaryDocx] Error:", error);
    return NextResponse.json(
      { error: "Lỗi xuất file Word: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    );
  }
}
