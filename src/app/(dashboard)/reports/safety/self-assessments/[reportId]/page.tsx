import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SafetyAssessmentService } from "@/lib/safety-reporting/assessment-service";
import { getSafetyProjectsAction, getSafetyPlansListAction } from "../../actions";
import { SafetyAssessmentEditor } from "@/components/safety/safety-assessment-editor";

export const metadata = {
  title: "Soạn Báo cáo tự đánh giá (Mẫu 01) | Hồ sơ ATLĐ",
};

export default async function SafetyReportEditPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  const { reportId } = await params;
  redirect(`/reports/safety/weekly-files/${reportId}?tab=assessment`);
}
