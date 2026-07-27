import { NextRequest, NextResponse } from "next/server";
import { chromium, type Browser, type BrowserContext } from "playwright";
import { getSession } from "@/lib/auth";
import { getSupervisionWeeklyPrintData } from "@/app/(dashboard)/supervision/weekly/actions";
import { exportSupervisionWeeklyDocx } from "@/lib/supervision-weekly/export-docx";

export const runtime = "nodejs";

function getPdfRenderOrigin() {
  const rawOrigin = process.env.SUPERVISION_PDF_RENDER_ORIGIN?.trim();
  if (!rawOrigin) throw new Error("PDF_RENDER_ORIGIN_NOT_CONFIGURED");
  const origin = new URL(rawOrigin);
  if (!/^https?:$/.test(origin.protocol) || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("PDF_RENDER_ORIGIN_INVALID");
  }
  return origin.origin;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let dossierId: string | undefined;
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    dossierId = id;
    const url = new URL(req.url);
    const documentParam = url.searchParams.get("document") || "RESULT";
    if (documentParam !== "RESULT" && documentParam !== "NEXT_WEEK_PLAN") {
      return NextResponse.json({ error: "Unsupported document type" }, { status: 400 });
    }
    const documentType = documentParam;
    const format = url.searchParams.get("format") || "pdf";
    const filename = url.searchParams.get("filename") || `export.${format}`;
    const dossier = await getSupervisionWeeklyPrintData(id, "EXPORT");

    if (format === "docx") {
      const buffer = await exportSupervisionWeeklyDocx(dossier, documentType);
      return new NextResponse(buffer as any, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      });
    }

    if (format !== "pdf") {
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }

    let renderOrigin: string;
    try {
      renderOrigin = getPdfRenderOrigin();
    } catch {
      return NextResponse.json({ error: "PDF export is not configured on this server." }, { status: 503 });
    }

    let browser: Browser | undefined;
    let context: BrowserContext | undefined;
    try {
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext();
      const page = await context.newPage();
      const authCookie = req.cookies.get("auth_session");
      if (authCookie) {
        await context.addCookies([{
          name: "auth_session",
          value: authCookie.value,
          domain: new URL(renderOrigin).hostname,
          path: "/",
          httpOnly: true,
        }]);
      }
      const targetUrl = new URL(`/supervision-export/${encodeURIComponent(id)}`, renderOrigin);
      targetUrl.searchParams.set("document", documentType);
      const response = await page.goto(targetUrl.toString(), { waitUntil: "networkidle" });
      if (!response?.ok()) throw new Error(`PDF_RENDER_HTTP_${response?.status() ?? "UNKNOWN"}`);
      await page.evaluate(() => document.fonts.ready);
      await page.emulateMedia({ media: "print" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        landscape: true,
        margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
        printBackground: true,
      });
      return new NextResponse(pdfBuffer as any, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      });
    } catch (error) {
      console.error("[supervision-weekly] PDF export failed", {
        dossierId: id,
        operation: "export-pdf",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return NextResponse.json({ error: "Không thể tạo PDF trên server. Vui lòng thử lại hoặc dùng nút In để lưu PDF." }, { status: 501 });
    } finally {
      await context?.close().catch(() => undefined);
      await browser?.close().catch(() => undefined);
    }
  } catch (error) {
    console.error("[supervision-weekly] Export failed", {
      dossierId,
      operation: "export",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    const denied = error instanceof Error && error.message.includes("không có quyền");
    return NextResponse.json({ error: denied ? "Forbidden" : "Lỗi hệ thống khi xuất file" }, { status: denied ? 403 : 500 });
  }
}
