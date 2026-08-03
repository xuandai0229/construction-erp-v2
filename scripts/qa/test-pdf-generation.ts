import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import React from "react";
import { WeeklyPrintTemplate } from "@/components/supervision-weekly/weekly-print-template";

async function main() {
  const dummyDossier: any = {
    id: "test-dossier-001",
    reportNumber: "BCGS-2026-W33",
    weekStart: "2026-08-10",
    weekEnd: "2026-08-16",
    status: "APPROVED",
    version: 1,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    creator: { id: "user-1", name: "Nguyễn Văn A", role: "SUPERVISOR" },
    projects: [{ id: "proj-1", name: "Dự án Tòa nhà Sunrise Tower" }],
    scheduleItems: [],
    transitionRows: [],
    quantityRows: [],
    progressRows: [],
    recommendations: [],
    followUps: [],
  };

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Báo cáo Giám sát công trình</title>
</head>
<body style="margin: 0; padding: 0; background: #fff;">
  ${renderToStaticMarkup(React.createElement(WeeklyPrintTemplate, { dossier: dummyDossier, activeDocument: "RESULT", hidePrintButton: true }))}
</body>
</html>`;

  console.log("HTML length:", html.length);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready).catch(() => undefined);
  await page.emulateMedia({ media: "print" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    landscape: true,
    printBackground: true,
    displayHeaderFooter: false,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  await browser.close();

  console.log("PDF Buffer length:", pdfBuffer.length);
  const pdfHeader = pdfBuffer.slice(0, 4).toString("ascii");
  console.log("PDF Header:", pdfHeader);

  // Check text content inside PDF raw
  const rawPdfStr = pdfBuffer.toString("binary");
  console.log("Contains localhost?", rawPdfStr.includes("localhost"));
  console.log("Contains /edit?", rawPdfStr.includes("/edit"));
  console.log("Contains ERP Công trình?", rawPdfStr.includes("ERP Công trình"));
}

main().catch(console.error);
