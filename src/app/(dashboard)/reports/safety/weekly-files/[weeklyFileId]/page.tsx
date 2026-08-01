import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getSafetyWeeklyFileDetailAction,
  getSafetyProjectsAction,
} from "../../actions";
import { SafetyWeeklyFileWorkspace } from "@/components/safety/safety-weekly-file-workspace";

export const metadata = {
  title: "Hồ sơ An toàn lao động | ERP Công trình",
};

export default async function SafetyWeeklyFileEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ weeklyFileId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  const { weeklyFileId } = await params;
  const sParams = await searchParams;

  const [weeklyFileDetail, projects] = await Promise.all([
    getSafetyWeeklyFileDetailAction(weeklyFileId),
    getSafetyProjectsAction(),
  ]);

  if (!weeklyFileDetail) {
    redirect("/reports/safety");
  }

  const initialTab = sParams.tab?.toUpperCase() === "ASSESSMENT" ? "ASSESSMENT" : "PLAN";

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 md:p-8">
      <SafetyWeeklyFileWorkspace
        weeklyFileDetail={weeklyFileDetail}
        projects={projects}
        currentUser={{
          id: session.id,
          role: session.role,
          name: session.name,
        }}
        initialTab={initialTab}
      />
    </div>
  );
}
