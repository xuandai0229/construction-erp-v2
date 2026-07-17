import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAccessibleProjectIds } from "@/lib/rbac";
import { TaskWorkspace } from "./task-workspace";

export const dynamic = "force-dynamic";

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ projectId?: string; mine?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");
  const params = await searchParams;
  const accessible = await getAccessibleProjectIds(session);
  const projectId = params.projectId && (accessible === null || accessible.includes(params.projectId)) ? params.projectId : undefined;
  const projects = await prisma.project.findMany({
    where: accessible === null ? { deletedAt: null } : { deletedAt: null, id: { in: accessible } },
    select: { id: true, code: true, name: true }, orderBy: { updatedAt: "desc" }, take: 50,
  });
  const taskRows = await prisma.workTask.findMany({
    where: { ...(projectId ? { projectId } : accessible === null ? {} : { projectId: { in: accessible } }), ...(params.mine === "1" ? { primaryAssigneeId: session.id } : {}) },
    orderBy: { updatedAt: "desc" },
    select: { id: true, projectId: true, title: true, description: true, priority: true, lifecycle: true, acceptance: true, execution: true, review: true, deadlineAt: true, progressPercent: true, version: true, primaryAssigneeId: true, reviewerId: true, approverId: true, creatorId: true, updatedAt: true, snapshot: true, primaryAssignee: { select: { id: true, name: true } }, project: { select: { code: true, name: true } }, actions: { orderBy: { occurredAt: "desc" }, take: 20, select: { id: true, action: true, actorId: true, occurredAt: true, version: true } } },
  });
  const tasks = taskRows.map(({ snapshot, ...task }) => ({
    ...task,
    currentSubmissionId: typeof snapshot === "object" && snapshot !== null && !Array.isArray(snapshot) && typeof snapshot.currentSubmissionId === "string" ? snapshot.currentSubmissionId : null,
  }));
  return <TaskWorkspace projects={projects} tasks={tasks} actorId={session.id} initialProjectId={projectId ?? null} initialMine={params.mine === "1"} />;
}
