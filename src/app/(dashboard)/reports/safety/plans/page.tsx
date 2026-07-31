import { redirect } from "next/navigation";

export default function SafetyPlansRedirectPage() {
  redirect("/reports/safety?tab=PLAN");
}
