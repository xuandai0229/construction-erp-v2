import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canViewNavigationItem } from "@/lib/navigation-permissions";
import prisma from "@/lib/prisma";
import { JournalWorkspace } from "@/components/supervision/journal-workspace";

export default async function SupervisionJournalPage() {
  const session = await getSession();
  if (!session || !canViewNavigationItem(session.role as any, "/supervision/journal")) {
    redirect("/dashboard");
  }

  // Lấy danh sách dự án mà user được phép giám sát
  const scope = await prisma.supervisionScope.findUnique({
    where: { userId: session.id },
    include: { projects: { include: { project: true } } }
  });

  let projects: any[] = [];
  if (scope?.scopeType === "ALL_PROJECTS") {
    projects = await prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true, location: true },
      orderBy: { code: "asc" }
    });
  } else if (scope?.scopeType === "SELECTED_PROJECTS" && scope.projects.length > 0) {
    projects = scope.projects.map((p) => p.project).sort((a, b) => a.code.localeCompare(b.code));
  }

  // Lấy nhật ký của user trong tuần hiện tại (tạm thời load 50 visits gần nhất)
  // Thực tế nên lọc theo tuần hiện tại hoặc phân trang
  const visits = await prisma.supervisionVisit.findMany({
    where: { createdById: session.id },
    orderBy: { visitDate: "desc" },
    take: 100,
    include: { project: true }
  });

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <JournalWorkspace projects={projects} initialVisits={visits} actorId={session.id} />
      </div>
    </div>
  );
}
