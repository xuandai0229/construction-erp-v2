import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canViewNavigationItem } from "@/lib/navigation-permissions";
import prisma from "@/lib/prisma";
import { SupervisionDashboard } from "@/components/supervision/supervision-dashboard";

export default async function SupervisionOverviewPage() {
  const session = await getSession();
  if (!session || !canViewNavigationItem(session.role as any, "/supervision")) {
    redirect("/dashboard");
  }

  // Fetch true stats
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const todayEnd = new Date();
  todayEnd.setHours(23,59,59,999);

  const visitsToday = await prisma.supervisionVisit.findMany({
    where: { visitDate: { gte: todayStart, lte: todayEnd }, createdById: session.id },
    include: { project: true },
    orderBy: { createdAt: "desc" }
  });

  const activeReports = await prisma.supervisionWeeklyPackage.findMany({
    where: { createdById: session.id, status: { in: ["DRAFT", "REVISION_REQUIRED"] }, deletedAt: null },
    orderBy: { weekStart: "desc" }
  });

  const unresolvedFindings = await prisma.supervisionFinding.findMany({
    where: { status: { in: ["OPEN", "IN_PROGRESS", "OVERDUE"] }, createdById: session.id },
    include: { project: true },
    take: 5
  });

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <SupervisionDashboard 
          visitsToday={visitsToday} 
          activeReports={activeReports} 
          unresolvedFindings={unresolvedFindings}
          actorId={session.id} 
        />
      </div>
    </div>
  );
}
