import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SafetyPlanService } from "@/lib/safety-reporting/plan-service";
import { getSafetyProjectsAction } from "../../actions";
import { SafetyPlanEditor } from "@/components/safety/safety-plan-editor";

export const metadata = {
  title: "Soạn Kế hoạch kiểm tra tuần (Mẫu 02) | Hồ sơ ATLĐ",
};

export default async function SafetyPlanEditPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  const { planId } = await params;
  const [plan, projects] = await Promise.all([
    SafetyPlanService.getPlanById(planId),
    getSafetyProjectsAction(),
  ]);

  if (!plan) redirect("/reports/safety");

  return (
    <SafetyPlanEditor
      plan={plan}
      projects={projects}
      currentUser={{
        id: session.id,
        role: session.role,
        name: session.name,
      }}
    />
  );
}
