import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSiteReportAuditLogs } from "@/app/(dashboard)/reports/actions";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const resolvedParams = await params;
    const history = await getSiteReportAuditLogs(resolvedParams.reportId);

    // Map to the format expected by the frontend
    const mappedHistory = history.map(h => ({
      id: h.id,
      action: h.action.replace("SITE_REPORT_", ""), // SUBMITTED, APPROVED, REJECTED
      actor: h.actorName,
      role: "User", // Mock role, we don't query role in getSiteReportAuditLogs currently
      timestamp: new Date(h.createdAt).toLocaleString('vi-VN'),
      detail: h.detail
    }));

    return NextResponse.json({ history: mappedHistory });
  } catch (error) {
    console.error("Fetch history error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
