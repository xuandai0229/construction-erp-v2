import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSupervisionProjectWhere, isSupervisionActor } from "@/lib/supervision/access";
import { SupervisionWorkspace } from "@/components/supervision/supervision-workspace";

type Params = { params: { id: string } };

export default async function SupervisionWeeklyReportDetailPage({ params }: Params) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");
  if (!isSupervisionActor(session.role as any) && !["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"].includes(session.role)) redirect("/dashboard");

  const projectWhere = await getSupervisionProjectWhere({ id: session.id, role: session.role as any });
  const isActor = isSupervisionActor(session.role as any);

  const [projects, packages, findings] = await Promise.all([
    prisma.project.findMany({
      where: { deletedAt: null, ...projectWhere },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
    prisma.supervisionWeeklyPackage.findUnique({
      where: { id: params.id, deletedAt: null, ...(isActor && !["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR"].includes(session.role) ? { createdById: session.id } : {}) },
      include: {
        visits: { include: { project: { select: { id: true, code: true, name: true } } }, orderBy: [{ visitDate: "asc" }, { shift: "asc" }] },
        transitions: { include: { project: { select: { id: true, code: true, name: true } } }, orderBy: { createdAt: "asc" } },
        quantities: { include: { project: { select: { id: true, code: true, name: true } } }, orderBy: { checkedAt: "asc" } },
        progressAssessments: { include: { project: { select: { id: true, code: true, name: true } } }, orderBy: { createdAt: "asc" } },
        findings: { include: { project: { select: { id: true, code: true, name: true } } }, orderBy: { detectedAt: "asc" } },
        planItems: true,
        recommendations: true,
        workflowHistory: { include: { actor: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 10 },
      }
    }),
    prisma.supervisionFinding.findMany({
      where: {
        project: { ...projectWhere },
        status: { in: ["OPEN", "IN_PROGRESS", "OVERDUE", "PENDING_VERIFICATION", "REMEDIATION_FAILED"] },
      },
      include: { project: { select: { code: true, name: true } } },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 40,
    }),
  ]);

  return (
    <SupervisionWorkspace
      actor={{ id: session.id, role: session.role as any, name: session.name }}
      projects={JSON.parse(JSON.stringify(projects))}
      packages={packages ? [JSON.parse(JSON.stringify(packages))] : []}
      findings={JSON.parse(JSON.stringify(findings))}
      isReadOnly={!isActor}
    />
  );
}
