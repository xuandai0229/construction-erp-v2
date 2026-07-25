import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canUseSupervisionWeekly } from "@/lib/supervision-weekly/permissions";
import { getSupervisionWeeklyPrintData } from "@/app/(dashboard)/supervision/weekly/actions";
import { WeeklyPrintTemplate } from "@/components/supervision-weekly/weekly-print-template";

export const metadata = { title: "Xem trước báo cáo tuần | ERP Công trình" };

export default async function WeeklyInspectionPreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ document?: string; print?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const activeDocument = (sp.document || "RESULT") as "RESULT" | "NEXT_WEEK_PLAN";
  const hidePrintButton = sp.print === "1";

  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");
  if (!canUseSupervisionWeekly(session.role)) redirect("/reports");
  const dossier = await getSupervisionWeeklyPrintData(id);
  if (!dossier) notFound();

  return (
    <div className="p-8 bg-slate-200 min-h-screen print:p-0 print:bg-white">
      <div className="mx-auto max-w-[297mm] bg-white shadow-2xl print:max-w-none print:shadow-none">
        <WeeklyPrintTemplate dossier={dossier} activeDocument={activeDocument} hidePrintButton={hidePrintButton} />
      </div>
    </div>
  );
}
