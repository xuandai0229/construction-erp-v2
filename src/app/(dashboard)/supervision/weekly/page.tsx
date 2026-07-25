import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canUseSupervisionWeekly } from "@/lib/supervision-weekly/permissions";
import { getSupervisionWeeklyDossiers, getSupervisionWeeklyProjects } from "./actions";
import { WeeklyListClient } from "@/components/supervision-weekly/weekly-list-client";
import { getSupervisionDatabaseReadiness } from "@/lib/supervision-weekly/database-readiness";

export const metadata = { title: "Báo cáo tuần Giám sát | ERP Công trình" };

export default async function SupervisionWeeklyPage({
  searchParams,
}: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }> | { [key: string]: string | string[] | undefined };
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");
  if (!canUseSupervisionWeekly(session.role)) redirect("/dashboard");
  const readiness = await getSupervisionDatabaseReadiness();
  if (!readiness.ready) return <WeeklyListClient rows={[]} projects={[]} readiness={readiness} />;

  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {};
  const initialSearch = typeof resolvedParams.q === "string" ? resolvedParams.q : "";
  const initialStatus = typeof resolvedParams.status === "string" ? resolvedParams.status : "ALL";
  const initialProjectId = typeof resolvedParams.projectId === "string" ? resolvedParams.projectId : "ALL";
  const initialSort = typeof resolvedParams.sort === "string" ? (resolvedParams.sort as any) : "updated_desc";

  const [rows, projects] = await Promise.all([
    getSupervisionWeeklyDossiers(),
    getSupervisionWeeklyProjects(),
  ]);

  return (
    <WeeklyListClient
      rows={rows}
      projects={projects}
      currentUserId={session.id}
      currentUserRole={session.role}
      initialSearch={initialSearch}
      initialStatus={initialStatus}
      initialProjectId={initialProjectId}
      initialSort={initialSort}
    />
  );
}
