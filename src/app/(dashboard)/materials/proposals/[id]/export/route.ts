import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getMaterialProposal } from "@/lib/material-proposals/actions";
import { renderMaterialProposalExcel, safeProposalFilename } from "@/lib/material-proposals/exporter";
import { executeInPdfPage } from "@/lib/pdf/browser-singleton";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return new NextResponse("Chưa đăng nhập.", { status: 401 });

  try {
    const { id } = await params;
    const proposal = await getMaterialProposal(id);
    if (!proposal) return new NextResponse("Không tìm thấy đề xuất vật tư.", { status: 404 });

    const { searchParams } = new URL(request.url);
    const format = (searchParams.get("format") || "excel").toLowerCase();

    if (format === "pdf") {
      try {
        const pdfBuffer = await executeInPdfPage(async (page, context) => {
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
          const printUrl = `${origin}/proposal-export/${id}`;

          await page.goto(printUrl, { waitUntil: "networkidle" });
          await page.waitForSelector('[data-document-ready="true"]', { timeout: 10000 });
          await page.evaluate(() => document.fonts.ready).catch(() => undefined);
          await page.emulateMedia({ media: "print" });

          // Measure document height to determine if multi-page
          const isMultiPage = await page.evaluate(() => {
            const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
            return docHeight > 750;
          });

          return await page.pdf({
            format: "A4",
            landscape: true,
            printBackground: true,
            preferCSSPageSize: true,
            displayHeaderFooter: isMultiPage,
            headerTemplate: "<span></span>",
            footerTemplate: isMultiPage
              ? '<div style="font-size: 9pt; font-family: \'Times New Roman\', serif; width: 100%; text-align: right; padding-right: 15mm; color: #475569; margin-bottom: 5mm;">Trang <span class="pageNumber"></span>/<span class="totalPages"></span></div>'
              : "<span></span>",
            margin: isMultiPage
              ? { top: "10mm", right: "0", bottom: "12mm", left: "0" }
              : { top: "0", right: "0", bottom: "0", left: "0" },
          });
        });

        const pdfFilename = safeProposalFilename(proposal.proposalNo).replace(/\.xlsx$/i, ".pdf");
        const encodedFilename = encodeURIComponent(pdfFilename);

        return new NextResponse(new Uint8Array(pdfBuffer), {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${pdfFilename}"; filename*=UTF-8''${encodedFilename}`,
            "Cache-Control": "no-store, max-age=0",
          },
        });
      } catch (pdfErr) {
        console.warn("[MaterialProposalExport] Headless Playwright PDF fallback triggered:", pdfErr);
        const origin = new URL(request.url).origin;
        return NextResponse.redirect(`${origin}/proposal-export/${id}?autoPrint=true`, 307);
      }
    }

    // Default: Excel Export
    const buffer = await renderMaterialProposalExcel({
      proposalNo: proposal.proposalNo,
      projectNameSnapshot: proposal.projectNameSnapshot,
      projectLocationSnapshot: proposal.projectLocationSnapshot,
      requesterNameSnapshot: proposal.requesterNameSnapshot,
      requesterRoleSnapshot: proposal.requesterRoleSnapshot,
      proposalDate: proposal.proposalDate,
      purchaseReason: proposal.purchaseReason,
      requiredDeliveryDate: proposal.requiredDeliveryDate,
      items: proposal.items.map((item) => ({ ...item, actualQuantity: Number(item.actualQuantity) })),
    });

    return new NextResponse(buffer as BodyInit, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${safeProposalFilename(proposal.proposalNo)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return new NextResponse(error instanceof Error ? error.message : "Không thể tải file.", { status: 403 });
  }
}
