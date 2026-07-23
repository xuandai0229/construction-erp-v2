import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSupervisionWeeklyPrintData } from "@/app/(dashboard)/supervision/weekly/actions";
import { exportSupervisionWeeklyDocx } from "@/lib/supervision-weekly/export-docx";
import { chromium } from "playwright";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const resolvedParams = await params;
    const { id } = resolvedParams;
    const url = new URL(req.url);
    const documentType = (url.searchParams.get("document") || "RESULT") as "RESULT" | "NEXT_WEEK_PLAN";
    const format = url.searchParams.get("format") || "pdf";
    const filename = url.searchParams.get("filename") || `export.${format}`;

    // 1. Fetch Canonical DTO
    const dossier = await getSupervisionWeeklyPrintData(id);

    // 2. Export based on format
    if (format === "docx") {
      const buffer = await exportSupervisionWeeklyDocx(dossier, documentType);
      return new NextResponse(buffer as any, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      });
    }

    if (format === "xlsx" || format === "excel") {
      return NextResponse.json({
        error: "Định dạng Excel không còn được hỗ trợ cho Báo cáo tuần Giám sát."
      }, { status: 410 });
    }

    if (format === "pdf") {
      try {
        // Since there is no PDF server-side library other than the playwright dev dependency,
        // we use Playwright to render the page if it's available in the environment.
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext();
        
        // Inject auth cookie so the browser can bypass login
        const authCookie = req.cookies.get("auth_session");
        const host = req.headers.get("host") || "localhost:3000";
        const protocol = host.includes("localhost") ? "http" : "https";
        if (authCookie) {
          await context.addCookies([{
            name: "auth_session",
            value: authCookie.value,
            domain: host.split(":")[0],
            path: "/",
            httpOnly: true,
          }]);
        }
        
        const page = await context.newPage();
        
        const targetUrl = `${protocol}://${host}/supervision-export/${id}?document=${documentType}`;
        
        await page.goto(targetUrl, { waitUntil: "networkidle" });
        
        // Wait for fonts to load
        await page.evaluate(() => document.fonts.ready);
        
        // Log basic metrics to verify it loaded correctly
        const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        console.log(`[PDF Export] Target URL: ${targetUrl}`);
        console.log(`[PDF Export] Scroll height: ${scrollHeight}px`);
        
        // Force media type print
        await page.emulateMedia({ media: "print" });
        
        const pdfBuffer = await page.pdf({
          format: "A4",
          landscape: true,
          margin: { top: "15mm", right: "15mm", bottom: "15mm", left: "15mm" },
          printBackground: true,
        });
        
        await browser.close();
        
        return new NextResponse(pdfBuffer as any, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
          },
        });
      } catch (pdfError) {
        console.error("PDF generation failed via Playwright:", pdfError);
        return NextResponse.json({ 
          error: "Không thể tạo PDF trên server (thiếu module browser). Vui lòng dùng nút In trên giao diện và chọn Lưu thành PDF." 
        }, { status: 501 });
      }
    }

    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi xuất file" }, { status: 500 });
  }
}
