import { redirect } from "next/navigation";

export default async function SupervisionWeeklyEditRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/reports/weekly-inspection/${id}/edit`);
}
