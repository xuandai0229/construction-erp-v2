import { redirect } from "next/navigation";

export default function OrganizationPositionsRedirectPage() {
  redirect("/hr/organization?tab=positions");
}
