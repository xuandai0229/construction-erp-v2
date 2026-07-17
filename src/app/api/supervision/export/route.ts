import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { isSupervisionActor, canReviewSupervision, assertSupervisionProjectAccess } from "@/lib/supervision/access";
import { exportWeeklyReportDocx, exportNextWeekPlanDocx } from "@/lib/supervision/docx-export";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(request.url);
    const packageId = searchParams.get("packageId");
    const type = searchParams.get("type"); // "report" or "plan"

    if (!packageId || !["report", "plan"].includes(type || "")) {
      return new NextResponse("Invalid request", { status: 400 });
    }

    const packageRecord = await prisma.supervisionWeeklyPackage.findUnique({
      where: { id: packageId, deletedAt: null },
      include: {
        visits: { include: { project: { select: { code: true, name: true } } }, orderBy: { visitDate: 'asc' } },
        transitions: { include: { project: { select: { code: true, name: true } } }, orderBy: { createdAt: 'asc' } },
        quantities: { include: { project: { select: { code: true, name: true } } }, orderBy: { checkedAt: 'asc' } },
        progressAssessments: { include: { project: { select: { code: true, name: true } } }, orderBy: { createdAt: 'asc' } },
        planItems: { include: { project: { select: { code: true, name: true } } }, orderBy: { plannedDate: 'asc' } },
        findings: { include: { project: { select: { code: true, name: true } } }, orderBy: { detectedAt: 'asc' } },
        recommendations: { include: { project: { select: { code: true, name: true } } } },
      }
    });

    if (!packageRecord) return new NextResponse("Not found", { status: 404 });

    // Authorization: Actor must be the creator if they are SUPERVISION_HEAD, OR they must be a reviewer
    if (session.role === "SUPERVISION_HEAD") {
      if (packageRecord.createdById !== session.id) return new NextResponse("Forbidden", { status: 403 });
    } else if (!canReviewSupervision(session.role) && session.role !== "ADMIN") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    let buffer: Buffer;
    let filename = "";

    if (type === "report") {
      buffer = await exportWeeklyReportDocx(packageRecord);
      filename = `Bao_cao_giam_sat_tuan_${packageRecord.weekStart.toISOString().slice(0, 10)}.docx`;
    } else {
      buffer = await exportNextWeekPlanDocx(packageRecord);
      filename = `Ke_hoach_giam_sat_tuan_tiep_theo_${packageRecord.weekStart.toISOString().slice(0, 10)}.docx`;
    }

    return new NextResponse(buffer as any, {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    });
  } catch (error) {
    console.error("Docx export error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
