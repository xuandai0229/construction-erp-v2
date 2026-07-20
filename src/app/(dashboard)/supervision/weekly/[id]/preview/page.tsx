import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canUseSupervisionWeekly } from "@/lib/supervision-weekly/permissions";
import { getSupervisionWeeklyDossier } from "../../actions";
import { WeeklyPrintTemplate } from "@/components/supervision-weekly/weekly-print-template";

export default async function SupervisionWeeklyPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");
  if (!canUseSupervisionWeekly(session.role)) redirect("/dashboard");
  const dossier = await getSupervisionWeeklyDossier(id);
  if (!dossier) notFound();
  return <WeeklyPrintTemplate dossier={dossier} />;
}
