import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupervisionWeeklyPrintData } from "@/app/(dashboard)/supervision/weekly/actions";
import { exportSupervisionWeeklyDocx } from "@/lib/supervision-weekly/export-docx";
import { buildSupervisionExportFilename } from "@/lib/supervision-weekly/export-filename";
import { executeInPdfPage } from "@/lib/pdf/browser-singleton";
import { buildPdfCacheKey, getCachedPdf, setCachedPdf } from "@/lib/pdf/pdf-cache";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });
    }

    const tModelStart = Date.now();
    const dossier = await getSupervisionWeeklyPrintData(id, "EXPORT");
    const tModelDuration = Date.now() - tModelStart;

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
      weekEnd: dossier.weekEnd,
      nextWeekStart: dossier.nextWeekStart,
      nextWeekEnd: dossier.nextWeekEnd,
      documentType,
      extension: format,
    });
    const encodedFilename = encodeURIComponent(filename);
    const contentDispositionHeader = `${disposition}; filename="${filename}"; filename*=UTF-8''${encodedFilename}`;

    if (format === "docx") {
      const docxBuffer = await exportSupervisionWeeklyDocx(dossier, documentType);

      console.log(`[Export Timing] DOCX generated in ${Date.now() - startTime}ms (db=${tModelDuration}ms)`);
      return new NextResponse(new Uint8Array(docxBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": contentDispositionHeader,
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    // Check PDF Cache with versioned cache key (never relying on createdAt)
    const cacheKey = buildPdfCacheKey({
      reportId: id,
      documentType,
      updatedAt: (dossier as any).updatedAt || dossier.createdAt,
    });

    const cachedBuffer = getCachedPdf(cacheKey);
    if (cachedBuffer) {
      console.log(`[Export Timing] PDF Served from Cache in ${Date.now() - startTime}ms (key=${cacheKey})`);
      return new NextResponse(new Uint8Array(cachedBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": contentDispositionHeader,
          "Cache-Control": "no-store, max-age=0",
        },
      });
    }

    // PDF generation via Headless Playwright page navigation using Browser Singleton Queue
    const pdfBuffer = await executeInPdfPage(async (page, context) => {
      const tAcquireDuration = Date.now() - startTime - tModelDuration;

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

      const origin = new URL(request.url).origin;
      const exportUrl = `${origin}/supervision-export/${id}?document=${documentType}`;

      const tGotoStart = Date.now();
      await page.goto(exportUrl, { waitUntil: "networkidle" });
      await page.waitForSelector('[data-document-ready="true"]', { timeout: 10000 });
      await page.evaluate(() => document.fonts.ready).catch(() => undefined);
      const tGotoDuration = Date.now() - tGotoStart;

      // Sanity Assertion: Verify NO App Shell elements exist
      const leakedAppShellElement = await page.evaluate(() => {
        const appSelectors = [
          "[data-app-shell]",
          "[data-mobile-navigation]",
          "[data-mobile-bottom-nav]",
          "[data-project-scope-selector]",
          "[data-weekly-preview-toolbar]",
        ];
        for (const sel of appSelectors) {
          if (document.querySelector(sel)) return sel;
        }
        const text = document.body.innerText || "";
        const bannedPhrases = ["PHẠM VI DỮ LIỆU", "Quay lại chỉnh sửa"];
        for (const phrase of bannedPhrases) {
          if (text.includes(phrase)) return phrase;
        }
        return null;
      });

      if (leakedAppShellElement) {
        throw new Error(`PDF Generation Aborted: Leaked App Shell indicator "${leakedAppShellElement}" detected in DOM.`);
      }

      await page.emulateMedia({ media: "print" });

      const tPdfStart = Date.now();
      const buffer = await page.pdf({
        format: "A4",
        landscape: false,
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        margin: { top: "0", right: "0", bottom: "0", left: "0" },
      });
      const tPdfDuration = Date.now() - tPdfStart;

      const totalTime = Date.now() - startTime;
      console.log(`[PDF Export Timing] total=${totalTime}ms (db=${tModelDuration}ms, acquire=${tAcquireDuration}ms, goto=${tGotoDuration}ms, pdf=${tPdfDuration}ms)`);

      return buffer;
    });

    // Store in PDF cache
    setCachedPdf(cacheKey, pdfBuffer, (dossier as any).updatedAt || dossier.createdAt);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": contentDispositionHeader,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    console.error("[Export API] General error:", error?.message);
    return NextResponse.json({ error: error?.message || "Lỗi máy chủ nội bộ." }, { status: 500 });
  }
}
