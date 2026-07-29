import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { assertCanAccessExecutiveDashboard } from "@/lib/roles/role-workspace-policy";
import { resolveExecutiveDashboardScope } from "@/lib/dashboard/dashboard-scope";
import { getExecutiveActionItems } from "@/lib/dashboard/executive-action-service";
import { getDashboardData } from "@/lib/dashboard/dashboard-queries";
import { ActionsCenterClientView } from "./actions-center-client-view";

export const metadata = {
  title: "Trung tâm việc cần xử lý | ERP Xây Dựng",
  description: "Tổng hợp các phát sinh, vướng mắc và công việc chưa được xử lý",
};

export default async function DashboardActionsPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; filter?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  assertCanAccessExecutiveDashboard(session.role);

  const params = await searchParams;
  const selectedProjectId = params.projectId || null;

  const executiveScope = await resolveExecutiveDashboardScope(session, selectedProjectId ?? undefined);
  const actionResult = await getExecutiveActionItems(executiveScope, 1000); // Fetch all items for scope
  const dashboardData = await getDashboardData(session, "7d", selectedProjectId ?? undefined);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <ActionsCenterClientView
        allItems={actionResult.allItems}
        totalCount={actionResult.total}
        highPriorityCount={actionResult.highPriority}
        criticalCount={actionResult.criticalCount}
        overdueCount={actionResult.overdue}
        selectedProjectId={selectedProjectId}
        accessibleProjects={dashboardData.accessibleProjects}
      />
    </div>
  );
}
