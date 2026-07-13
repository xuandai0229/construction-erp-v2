import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getSiteReportAuditLogs } from "@/app/(dashboard)/reports/actions";
import prisma from "@/lib/prisma";
import { canAccessProject } from "@/lib/rbac";
import { resolvePermission } from "@/lib/permissions/permission-resolver";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: Promise<{ reportId: string }> }) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse("Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn.", { status: 401 });

    const resolvedParams = await params;
    const reportId = resolvedParams.reportId;

    const report = await prisma.siteReport.findUnique({
      where: { id: reportId },
      select: { createdById: true, projectId: true }
    });

    if (!report) return new NextResponse("Không tìm thấy báo cáo.", { status: 404 });
    
    const hasAccess = await canAccessProject(
      { id: session.id, role: session.role as any },
      report.projectId
    );

    const permission = await resolvePermission(session, "reports.view", { projectId: report.projectId, ownerId: report.createdById });
    if (!hasAccess || !permission.allowed) {
      return new NextResponse("Bạn không có quyền xem lịch sử báo cáo này.", { status: 403 });
    }

    const history = await getSiteReportAuditLogs(reportId);

    // Map to the format expected by the frontend
    const mappedHistory = history.map(h => ({
      id: h.id,
      action: h.action.replace("SITE_REPORT_", ""), // SUBMITTED, APPROVED, REJECTED
      actor: h.actorName,
      role: h.actorRole,
      timestamp: h.createdAt ? new Date(h.createdAt).toLocaleString('vi-VN') : "",
      detail: h.detail
    }));

    return NextResponse.json({ history: mappedHistory });
  } catch (error) {
    console.error("Fetch history error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
