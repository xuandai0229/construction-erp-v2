import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAccessibleProjectIds } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Bạn cần đăng nhập để xem nhiệm vụ." }, { status: 401 });
  const selectedProjectId = request.nextUrl.searchParams.get("projectId");
  const mine = request.nextUrl.searchParams.get("mine") === "1";
  const accessible = await getAccessibleProjectIds(session);
  if (selectedProjectId && accessible !== null && !accessible.includes(selectedProjectId)) {
    return NextResponse.json({ error: "Nhiệm vụ không thuộc công trình bạn được phép truy cập." }, { status: 403 });
  }
  const tasks = await prisma.workTask.findMany({
    where: {
      ...(selectedProjectId ? { projectId: selectedProjectId } : accessible === null ? {} : { projectId: { in: accessible } }),
      ...(mine ? { primaryAssigneeId: session.id } : {}),
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true, projectId: true, title: true, description: true, priority: true, lifecycle: true,
      acceptance: true, execution: true, review: true, deadlineAt: true, progressPercent: true,
      version: true, primaryAssigneeId: true, reviewerId: true, approverId: true, creatorId: true,
      updatedAt: true,
      primaryAssignee: { select: { id: true, name: true } },
      project: { select: { id: true, code: true, name: true } },
    },
  });
  return NextResponse.json({ tasks });
}
