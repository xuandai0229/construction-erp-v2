import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getActiveProjects } from "../../actions";
import { FieldEditor } from "@/components/reports/field-editor";
import { canViewNavigationItem } from "@/lib/navigation-permissions";

export const metadata = {
  title: "Tạo Báo cáo Hiện trường mới | ERP Công trình",
  description: "Soạn mới nhật ký thi công ngày và báo cáo tổng hợp tuần",
};

export default async function NewFieldReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  if (!canViewNavigationItem(session.role, "/reports")) {
    redirect("/reports");
  }

  const resolvedParams = await searchParams;
  const initialType =
    resolvedParams.type === "WEEKLY" ? ("WEEKLY" as const) : ("DAILY" as const);
  const activeProjects = await getActiveProjects();

  return (
    <FieldEditor
      activeProjects={activeProjects}
      currentUser={{
        id: session.id,
        name: session.name || session.email || "Người dùng",
        role: session.role,
      }}
      mode="create"
      initialType={initialType}
    />
  );
}
