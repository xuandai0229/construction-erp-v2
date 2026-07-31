import { redirect } from "next/navigation";

export default function NewSafetyAssessmentRedirectPage() {
  redirect("/reports/safety?tab=ASSESSMENT");
}
