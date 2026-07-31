import { redirect } from "next/navigation";

export default function SafetyAssessmentsRedirectPage() {
  redirect("/reports/safety?tab=ASSESSMENT");
}
