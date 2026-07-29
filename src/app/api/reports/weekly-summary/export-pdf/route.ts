import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getWeeklyCompanySummary,
  canAggregateWeeklyCompanySummary,
} from "@/lib/reports/weekly-company-summary";
import { chromium } from "playwright";

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
    return NextResponse.json({ error: "Không có quyền xuất file PDF." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("weekStart");
  const isInline = searchParams.get("inline") === "1";

  if (!weekStart) {
    return NextResponse.json({ error: "Thiếu tham số weekStart." }, { status: 400 });
  }

  try {
    const summary = await getWeeklyCompanySummary(weekStart);
    const { week, generatedAt, projects } = summary;

    const projectsNeedingSupport = projects.filter((p) => p.hasReport && !!p.supportNeeded);

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Tổng hợp báo cáo tuần - ${week.weekStartDate}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm 15mm 15mm 15mm;
        }
        body {
          font-family: "Times New Roman", Times, serif;
          font-size: 13pt;
          line-height: 1.4;
          color: #000000;
          background: #ffffff;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact;
        }
        .header-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        .header-table td {
          border: none;
          vertical-align: top;
          text-align: center;
          font-size: 12.5pt;
        }
        .bold { font-weight: bold; }
        .uppercase { text-transform: uppercase; }
        .italic { font-style: italic; }
        .divider {
          width: 80px;
          height: 1px;
          background-color: #000000;
          margin: 4px auto;
        }
        .title-block {
          text-align: center;
          margin-bottom: 24px;
        }
        .title-block h1 {
          font-size: 18pt;
          font-weight: bold;
          text-transform: uppercase;
          margin: 0 0 6px 0;
        }
        .title-block p {
          font-size: 13pt;
          font-weight: bold;
          margin: 0;
        }
        .section-title {
          font-size: 14pt;
          font-weight: bold;
          text-transform: uppercase;
          margin: 18px 0 8px 0;
        }
        table.data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 16px;
          font-size: 11.5pt;
        }
        table.data-table th, table.data-table td {
          border: 1px solid #000000;
          padding: 6px 8px;
          vertical-align: top;
        }
        table.data-table th {
          background-color: #F1F5F9;
          font-weight: bold;
          text-align: center;
        }
        .project-detail-box {
          margin-bottom: 16px;
          padding-bottom: 12px;
          border-bottom: 1px solid #CBD5E1;
          page-break-inside: avoid;
        }
        .project-detail-box h3 {
          font-size: 13.5pt;
          font-weight: bold;
          margin: 0 0 4px 0;
        }
        .detail-item {
          margin-left: 12px;
          margin-bottom: 4px;
          font-size: 12pt;
        }
        .missing-text {
          font-style: italic;
          color: #475569;
          margin-left: 12px;
        }
      </style>
    </head>
    <body>
      <!-- Corporate Header -->
      <table class="header-table">
        <tr>
          <td style="width: 48%;">
            <div class="bold uppercase">CÔNG TY CỔ PHẦN XÂY DỰNG</div>
            <div class="bold uppercase">VÀ THƯƠNG MẠI SỐ 2 HÀ NỘI</div>
            <div class="divider"></div>
            <div style="font-size: 11pt; margin-top: 4px;">Số: ................</div>
          </td>
          <td style="width: 52%;">
            <div class="bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div class="bold">Độc lập - Tự do - Hạnh phúc</div>
            <div class="divider" style="width: 120px;"></div>
            <div class="italic" style="font-size: 11.5pt; margin-top: 4px;">${formatDateFullVN(generatedAt)}</div>
          </td>
        </tr>
      </table>

      <!-- Title Block -->
      <div class="title-block">
        <h1>TỔNG HỢP BÁO CÁO TUẦN</h1>
        <p>Tuần ${week.weekNumber} – Từ ngày ${formatDateShortVN(week.weekStartDate)} đến ngày ${formatDateShortVN(week.weekEndDate)}</p>
      </div>

      <!-- Section 1: Summary Table -->
      <div class="section-title">1. Bảng tổng hợp kết quả các công trình</div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 35px;">STT</th>
            <th style="width: 160px; text-align: left;">Công trình</th>
            <th style="text-align: left;">Kết quả chính trong tuần</th>
            <th style="width: 140px; text-align: left;">Công việc chưa xong / vướng mắc</th>
            <th style="width: 140px; text-align: left;">Kế hoạch tuần tiếp theo</th>
            <th style="width: 130px; text-align: left;">Nội dung cần xử lý</th>
          </tr>
        </thead>
        <tbody>
          ${projects
            .map(
              (p, idx) => `
            <tr>
              <td style="text-align: center;">${idx + 1}</td>
              <td>
                <div class="bold">${p.name}</div>
                <div style="font-size: 10pt; color: #475569;">Mã: ${p.code}</div>
                ${p.reporter ? `<div style="font-size: 10pt; font-style: italic; color: #475569;">Phụ trách: ${p.reporter}</div>` : ""}
              </td>
              <td>${p.hasReport ? p.result || "Đã cập nhật kết quả." : '<span class="missing-text">Chưa có báo cáo tuần.</span>'}</td>
              <td>${p.hasReport ? p.issues || "Không có" : "-"}</td>
              <td>${p.hasReport ? p.nextWeekPlan || "Chưa cập nhật" : "-"}</td>
              <td class="bold">${p.hasReport ? p.supportNeeded || "Không có" : "-"}</td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <!-- Section 2: Detailed Project Breakdown -->
      <div class="section-title">2. Nội dung chi tiết từng công trình</div>
      ${projects
        .map(
          (p, idx) => `
        <div class="project-detail-box">
          <h3>2.${idx + 1}. ${p.name} (${p.code})</h3>
          ${p.reporter ? `<div class="italic" style="margin-bottom: 4px; font-size: 11.5pt;">Người báo cáo phụ trách: ${p.reporter}</div>` : ""}
          ${
            !p.hasReport
              ? `<div class="missing-text">Chưa có báo cáo tuần.</div>`
              : `
              <div class="detail-item"><span class="bold">• Kết quả thực hiện trong tuần: </span>${p.result || "Chưa cập nhật."}</div>
              ${p.issues ? `<div class="detail-item"><span class="bold" style="color: #991B1B;">• Vướng mắc / Khó khăn: </span>${p.issues}</div>` : ""}
              ${p.nextWeekPlan ? `<div class="detail-item"><span class="bold">• Kế hoạch tuần tiếp theo: </span>${p.nextWeekPlan}</div>` : ""}
              ${p.quality ? `<div class="detail-item"><span class="bold">• Chất lượng & An toàn: </span>${p.quality}</div>` : ""}
              ${p.materials || p.labor ? `<div class="detail-item"><span class="bold">• Nhân lực & Vật tư: </span>${[p.materials && `Vật tư: ${p.materials}`, p.labor && `Nhân lực: ${p.labor}`].filter(Boolean).join(" | ")}</div>` : ""}
              ${p.supportNeeded ? `<div class="detail-item" style="background-color: #FEF3C7; padding: 4px 6px; border-left: 3px solid #F59E0B; margin-top: 4px;"><span class="bold" style="color: #92400E;">• Nội dung cần xử lý: </span><span class="bold">${p.supportNeeded}</span></div>` : ""}
            `
          }
        </div>
      `,
        )
        .join("")}

      <!-- Section 3: Action Items -->
      ${
        projectsNeedingSupport.length > 0
          ? `
        <div class="section-title">3. Tổng hợp các nội dung cần Ban Giám đốc & Phòng ban xử lý</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 35px;">STT</th>
              <th style="width: 160px; text-align: left;">Công trình</th>
              <th style="text-align: left;">Nội dung đề xuất / cần xử lý</th>
            </tr>
          </thead>
          <tbody>
            ${projectsNeedingSupport
              .map(
                (p, idx) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td class="bold">${p.name}</td>
                <td class="bold" style="color: #78350F;">${p.supportNeeded}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      `
          : ""
      }
    </body>
    </html>
    `;

    // Launch Playwright Chromium server-side to produce pixel-perfect, clean PDF with NO Chrome headers/footers
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: { top: "15mm", bottom: "15mm", left: "15mm", right: "15mm" },
      printBackground: true,
      displayHeaderFooter: false, // NO BROWSER HEADER / FOOTER
    });

    await browser.close();

    const filename = `tong-hop-bao-cao-tuan-${week.weekStartDate}_den_${week.weekEndDate}.pdf`;
    const disposition = isInline ? "inline" : `attachment; filename="${filename}"`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("[ExportWeeklySummaryPdf] Error:", error);
    return NextResponse.json(
      { error: "Lỗi xuất file PDF: " + (error instanceof Error ? error.message : String(error)) },
      { status: 500 },
    );
  }
}
