import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { getSession } from "@/lib/auth";
import { getSupervisionWeeklyPrintData } from "@/app/(dashboard)/supervision/weekly/actions";
import { exportSupervisionWeeklyDocx } from "@/lib/supervision-weekly/export-docx";
import { buildSupervisionExportFilename } from "@/lib/supervision-weekly/export-filename";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const dossier = await getSupervisionWeeklyPrintData(id, "EXPORT");
    if (!dossier) {
      return NextResponse.json({ error: "Không tìm thấy hồ sơ báo cáo." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "pdf").toLowerCase() as "pdf" | "docx";
    const documentType = (searchParams.get("document") || "RESULT") as "RESULT" | "NEXT_WEEK_PLAN";
    const requestedDisposition = searchParams.get("disposition")?.toLowerCase();
    const disposition = requestedDisposition === "inline" ? "inline" : "attachment";

    const filename = buildSupervisionExportFilename({
      reportNumber: dossier.reportNumber,
      weekStart: dossier.weekStart,
      documentType,
      extension: format,
    });
    const encodedFilename = encodeURIComponent(filename);
    const contentDispositionHeader = `${disposition}; filename="${filename}"; filename*=UTF-8''${encodedFilename}`;

    if (format === "docx") {
      const docxBuffer = await exportSupervisionWeeklyDocx(dossier, documentType);

      return new NextResponse(new Uint8Array(docxBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": contentDispositionHeader,
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    // PDF generation via Headless Playwright page navigation
    let browser;
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({ viewport: { width: 1600, height: 1200 } });

      // Forward request cookies for authentication
      const reqCookie = request.headers.get("cookie") || "";
      const parsedCookies = reqCookie
        .split(";")
        .map((c) => {
          const [name, ...val] = c.trim().split("=");
          return { name, value: val.join("="), domain: "localhost", path: "/" };
        })
        .filter((c) => c.name && c.value);

      if (parsedCookies.length > 0) {
        await context.addCookies(parsedCookies);
      }

      const page = await context.newPage();
      const origin = new URL(request.url).origin;
      const previewUrl = `${origin}/reports/weekly-inspection/${id}/preview?exportMode=pdf&document=${documentType}`;

      console.log(`[Export PDF] Navigating to preview URL: ${previewUrl}`);
      await page.goto(previewUrl, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready).catch(() => undefined);
      await page.emulateMedia({ media: "print" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });

      await browser.close();

      return new NextResponse(new Uint8Array(pdfBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": contentDispositionHeader,
          "Cache-Control": "no-store, max-age=0",
        },
      });
    } catch (pwError: any) {
      if (browser) await browser.close().catch(() => undefined);
      console.error("[Export API] Playwright PDF generation error:", pwError?.message);
      return NextResponse.json({ error: "Lỗi tạo tập tin PDF. Vui lòng thử lại sau." }, { status: 500 });
    }
  } catch (error: any) {
    console.error("[Export API] General error:", error?.message);
    return NextResponse.json({ error: error?.message || "Lỗi máy chủ nội bộ." }, { status: 500 });
  }
}
