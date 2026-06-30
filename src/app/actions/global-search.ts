"use server";

import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getAccessibleProjectIds } from "@/lib/rbac";
import type { UserRole } from "@prisma/client";

export async function searchSystem(query: string, globalProjectId: string | null) {
  const session = await getSession();
  if (!session) return { projects: [], notifications: [], reports: [] };

  const q = query.trim();
  if (!q) return { projects: [], notifications: [], reports: [] };

  const user = { id: session.id, role: session.role as UserRole };
  const accessibleProjectIds = await getAccessibleProjectIds(user);

  // 1. Projects Search
  const projects = await prisma.project.findMany({
    where: {
      deletedAt: null,
      ...(accessibleProjectIds !== null ? { id: { in: accessibleProjectIds } } : {}),
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { code: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 5,
    select: { id: true, name: true, code: true }
  });

  // 2. Notifications (Approvals) Search
  const approvals = await prisma.approvalRequest.findMany({
    where: {
      deletedAt: null,
      status: "PENDING",
      ...(globalProjectId ? { projectId: globalProjectId } : (accessibleProjectIds === null ? {} : { projectId: { in: accessibleProjectIds } })),
      OR: [
        { title: { contains: q, mode: "insensitive" } },
      ]
    },
    take: 5,
    select: { id: true, title: true, projectId: true, project: { select: { name: true } }, priority: true, createdAt: true }
  });

  const approvalNotifications = approvals.map(app => ({
    id: `app-${app.id}`,
    type: 'APPROVAL',
    severity: app.priority === 'HIGH' || app.priority === 'URGENT' ? 'HIGH' : 'MEDIUM',
    title: app.title,
    projectName: app.project.name,
    href: `/approvals?projectId=${app.projectId}&requestId=${app.id}`,
  }));

  // 3. Reports Search
  const reports = await prisma.siteReport.findMany({
    where: {
      deletedAt: null,
      ...(globalProjectId ? { projectId: globalProjectId } : (accessibleProjectIds === null ? {} : { projectId: { in: accessibleProjectIds } })),
      OR: [
        { reportNo: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { summary: { contains: q, mode: "insensitive" } },
      ]
    },
    take: 5,
    select: { id: true, reportNo: true, title: true, projectId: true, project: { select: { name: true } } }
  });

  const reportResults = reports.map(r => ({
    id: r.id,
    title: r.title || `Báo cáo ${r.reportNo}`,
    reportNo: r.reportNo,
    projectName: r.project.name,
    href: `/reports?projectId=${r.projectId}&reportId=${r.id}`
  }));

  return {
    projects,
    notifications: approvalNotifications,
    reports: reportResults
  };
}
