import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function SupervisionWeeklyRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {};
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(resolvedParams)) {
    if (typeof value === "string") query.set(key, value);
    else if (Array.isArray(value) && value[0]) query.set(key, value[0]);
  }
  const queryString = query.toString() ? `?${query.toString()}` : "";

  redirect(`/reports/weekly-inspection${queryString}`);
}
