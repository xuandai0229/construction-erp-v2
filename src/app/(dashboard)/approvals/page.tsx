import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getApprovalsData } from "./actions";
import { ApprovalCenterClient } from "./components/approval-center-client";

export const metadata = {
  title: "Phê duyệt | ERP Công trình",
  description: "Trung tâm phê duyệt yêu cầu theo công trình.",
};

export default async function ApprovalsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const data = await getApprovalsData();

  return (
    <ApprovalCenterClient
      approvals={data.approvals}
      projects={data.projects}
      summary={data.summary}
      canCreate={data.canCreate}
    />
  );
}
