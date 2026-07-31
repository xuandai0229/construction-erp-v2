import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getSafetyPlansListAction,
  getSafetyAssessmentsListAction,
  getSafetyProjectsAction,
} from "./actions";
import { SafetyListClient, SafetyTabType } from "@/components/safety/safety-list-client";

export const metadata = {
  title: "Hồ sơ ATLĐ • PCCC • VSMT | Hệ thống ERP",
};

export default async function SafetyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    status?: string;
    search?: string;
    sort?: string;
    projectId?: string;
    page?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  const params = await searchParams;
  const activeTab: SafetyTabType = params.tab === "ASSESSMENT" ? "ASSESSMENT" : "PLAN";
  const page = Number(params.page) || 1;

  const [plansData, assessmentsData, projects] = await Promise.all([
    getSafetyPlansListAction({
      status: activeTab === "PLAN" ? params.status : undefined,
      search: activeTab === "PLAN" ? params.search : undefined,
      sort: activeTab === "PLAN" ? params.sort : undefined,
      projectId: activeTab === "PLAN" ? params.projectId : undefined,
      page: activeTab === "PLAN" ? page : 1,
      pageSize: 15,
    }),
    getSafetyAssessmentsListAction({
      status: activeTab === "ASSESSMENT" ? params.status : undefined,
      search: activeTab === "ASSESSMENT" ? params.search : undefined,
      sort: activeTab === "ASSESSMENT" ? params.sort : undefined,
      projectId: activeTab === "ASSESSMENT" ? params.projectId : undefined,
      page: activeTab === "ASSESSMENT" ? page : 1,
      pageSize: 15,
    }),
    getSafetyProjectsAction(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 md:p-8">
      <SafetyListClient
        tab={activeTab}
        plansData={plansData}
        assessmentsData={assessmentsData}
        projects={projects}
      />
    </div>
  );
}
