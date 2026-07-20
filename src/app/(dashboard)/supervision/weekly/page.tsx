import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canUseSupervisionWeekly } from "@/lib/supervision-weekly/permissions";
import { getSupervisionWeeklyDossiers } from "./actions";
import { WeeklyListClient } from "@/components/supervision-weekly/weekly-list-client";
import { getSupervisionDatabaseReadiness } from "@/lib/supervision-weekly/database-readiness";

export const metadata = { title: "Báo cáo tuần Giám sát | ERP Công trình" };

export default async function SupervisionWeeklyPage() {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");
  if (!canUseSupervisionWeekly(session.role)) redirect("/dashboard");
  const readiness = await getSupervisionDatabaseReadiness();
  if (!readiness.ready) return <WeeklyListClient rows={[]} readiness={readiness} />;
  const rows = await getSupervisionWeeklyDossiers();
  return <WeeklyListClient rows={rows.map((row) => ({ ...row, weekStart: row.weekStart.toISOString(), weekEnd: row.weekEnd.toISOString(), updatedAt: row.updatedAt.toISOString() }))} />;
}
