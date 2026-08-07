import { redirect } from "next/navigation";

export default function OrganizationUnitsRedirectPage() {
  redirect("/hr/organization?tab=units");
}
