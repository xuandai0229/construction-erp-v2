import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canViewNavigationItem } from "@/lib/navigation-permissions";
import prisma from "@/lib/prisma";
import { WeeklyReportsWorkspace } from "@/components/supervision/weekly-reports-workspace";
import { isSupervisionActor, canReviewSupervision } from "@/lib/supervision/access";

export default async function SupervisionWeeklyReportsPage() {
  const session = await getSession();
  if (!session || !canViewNavigationItem(session.role as any, "/supervision/weekly-reports")) {
    redirect("/dashboard");
  }

  const role = session.role as any;
  let where = { deletedAt: null };
  if (isSupervisionActor(role) && !canReviewSupervision(role)) {
    // Only see own reports
    (where as any).createdById = session.id;
  } else if (canReviewSupervision(role)) {
    // Can see all reports
  }

  const reports = await prisma.supervisionWeeklyPackage.findMany({
    where,
    orderBy: { weekStart: "desc" },
    include: {
      createdBy: { select: { id: true, name: true, role: true } },
      _count: { select: { visits: true, transitions: true, quantities: true, progressAssessments: true, workflowHistory: true } }
    }
  });

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <WeeklyReportsWorkspace initialReports={reports} actorId={session.id} />
      </div>
    </div>
  );
}
