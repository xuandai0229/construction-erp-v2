import { redirect } from "next/navigation";

export default async function SupervisionWeeklyPreviewRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ document?: string; print?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const query = new URLSearchParams();
  if (sp.document) query.set("document", sp.document);
  if (sp.print) query.set("print", sp.print);
  const qStr = query.toString() ? `?${query.toString()}` : "";

  redirect(`/reports/weekly-inspection/${id}/preview${qStr}`);
}
