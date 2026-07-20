import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function SupervisionWeeklyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");
  redirect(`/supervision/weekly/${id}/edit`);
}
