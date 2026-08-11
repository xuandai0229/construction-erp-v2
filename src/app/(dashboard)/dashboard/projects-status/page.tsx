import React from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { assertCanAccessExecutiveDashboard } from "@/lib/roles/role-workspace-policy";
import { getDashboardData } from "@/lib/dashboard/dashboard-queries";
import { ProjectsStatusClientView } from "./projects-status-client-view";

export const metadata = {
  title: "Tình trạng tiến độ toàn bộ công trình | ERP Xây Dựng",
  description: "Bảng theo dõi tổng quan tiến độ, chênh lệch kế hoạch và rủi ro của tất cả công trình",
};

export default async function ProjectsStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  assertCanAccessExecutiveDashboard(session.role);

  const params = await searchParams;
  const dashboardData = await getDashboardData(session, "7d", params.projectId);

  return (
    <div className="w-full max-w-full space-y-6">
      <ProjectsStatusClientView
        projects={dashboardData.projectOverview}
        selectedProjectId={params.projectId || null}
      />
    </div>
  );
}
