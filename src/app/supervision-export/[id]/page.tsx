import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getSupervisionWeeklyPrintData } from "@/app/(dashboard)/supervision/weekly/actions";
import { WeeklyPrintTemplate } from "@/components/supervision-weekly/weekly-print-template";
import { getCompanyProfile } from "@/lib/settings/company-profile";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function SupervisionWeeklyExportViewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ document?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const activeDocument = (sp.document || "RESULT") as "RESULT" | "NEXT_WEEK_PLAN";

  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");
  
  const [dossier, company] = await Promise.all([getSupervisionWeeklyPrintData(id, "EXPORT"), getCompanyProfile()]);
  if (!dossier) notFound();
  
  return (
    <div className="print-export-container">
      <WeeklyPrintTemplate dossier={dossier} activeDocument={activeDocument} hidePrintButton={true} companyName={company.companyName} />
    </div>
  );
}
