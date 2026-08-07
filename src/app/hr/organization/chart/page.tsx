import { redirect } from "next/navigation";

export default function OrganizationChartRedirectPage() {
  redirect("/hr/organization?tab=chart");
}
