import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { canViewNavigationItem } from "@/lib/navigation-permissions";
import { canReadSupervisionWeekly } from "@/lib/supervision-weekly/permissions";
import { ReportWorkspacePicker } from "@/components/reports/report-workspace-picker";
import { PageHeader, PageHeading } from "@/components/ui/enterprise";
import { ClipboardList } from "lucide-react";
import { getDefaultRouteForRole } from "@/lib/roles/role-workspace-policy";

export const metadata = {
  title: "Chọn loại báo cáo | ERP Công trình",
  description: "Trung tâm lựa chọn loại báo cáo công trình",
};

export default async function ReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  // Check RBAC permissions for report workspaces
  const canViewField = canViewNavigationItem(session.role, "/reports/field");
  const canViewWeekly = canReadSupervisionWeekly(session.role);

  if (!canViewField && !canViewWeekly) {
    redirect(getDefaultRouteForRole(session.role));
  }

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageHeading
          title={
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100/80 shadow-2xs">
                <ClipboardList className="h-4.5 w-4.5" />
              </div>
              <span>Báo cáo</span>
            </div>
          }
          description="Chọn nội dung cần xem và quản lý."
        />
      </PageHeader>

      <ReportWorkspacePicker
        canViewField={canViewField}
        canViewWeekly={canViewWeekly}
      />
    </div>
  );
}
