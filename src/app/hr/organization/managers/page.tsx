import { redirect } from "next/navigation";

export default function OrganizationManagersRedirectPage() {
  redirect("/hr/organization?tab=units");
}
