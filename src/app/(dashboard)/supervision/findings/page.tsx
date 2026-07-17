import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canViewNavigationItem } from "@/lib/navigation-permissions";
import prisma from "@/lib/prisma";
import { FindingsWorkspace } from "@/components/supervision/findings-workspace";

export default async function SupervisionFindingsPage() {
  const session = await getSession();
  if (!session || !canViewNavigationItem(session.role as any, "/supervision/findings")) {
    redirect("/dashboard");
  }

  const findings = await prisma.supervisionFinding.findMany({
    where: { createdById: session.id },
    orderBy: { detectedAt: "desc" },
    include: { project: true }
  });

  const scope = await prisma.supervisionScope.findUnique({
    where: { userId: session.id },
    include: { projects: { include: { project: true } } }
  });

  let projects: any[] = [];
  if (scope?.scopeType === "ALL_PROJECTS") {
    projects = await prisma.project.findMany({
      where: { deletedAt: null },
      select: { id: true, code: true, name: true }
    });
  } else if (scope?.scopeType === "SELECTED_PROJECTS" && scope.projects.length > 0) {
    projects = scope.projects.map((p) => p.project);
  }

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <FindingsWorkspace initialFindings={findings} projects={projects} actorId={session.id} />
      </div>
    </div>
  );
}
