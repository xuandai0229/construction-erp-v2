import { redirect } from "next/navigation";

export default function NewSafetyPlanRedirectPage() {
  redirect("/reports/safety?tab=PLAN");
}
