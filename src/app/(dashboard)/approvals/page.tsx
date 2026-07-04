import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getApprovalsData } from "./actions";
import { ApprovalCenterClient } from "./components/approval-center-client";
import { getGlobalProjectContext } from "@/lib/project-context";

export const metadata = {
  title: "Phê duyệt | ERP Công trình",
  description: "Trung tâm phê duyệt yêu cầu theo công trình.",
};

export default async function ApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  const resolvedParams = await searchParams;
  const urlProjectId = typeof resolvedParams.projectId === "string" ? resolvedParams.projectId : undefined;
  const globalContext = await getGlobalProjectContext(session, urlProjectId);
  const data = await getApprovalsData();

  return (
    <ApprovalCenterClient
      approvals={data.approvals}
      projects={data.projects}
      summary={data.summary}
      canCreate={data.canCreate}
      initialProjectId={globalContext.selectedProjectId || undefined}
    />
  );
}
