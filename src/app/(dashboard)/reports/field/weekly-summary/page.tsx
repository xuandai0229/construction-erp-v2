import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import {
  assertWeeklyCompanySummaryPermission,
  getWeeklyCompanySummary,
} from "@/lib/reports/weekly-company-summary";
import { getVietnamIsoWeekInfo } from "@/lib/reports/report-timezone";
import { WeeklySummaryClientView } from "@/components/reports/weekly-summary-client-view";

export const metadata = {
  title: "Tổng hợp báo cáo tuần | ERP Xây Dựng",
  description: "Bản tổng hợp báo cáo tuần toàn bộ công trình",
};

export default async function WeeklyCompanySummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ weekStart?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");
  assertWeeklyCompanySummaryPermission(session.role);

  const params = await searchParams;
  const rawWeekStart = params.weekStart;

  const weekStart = rawWeekStart
    ? getVietnamIsoWeekInfo(rawWeekStart).weekStartDate
    : getVietnamIsoWeekInfo(new Date()).weekStartDate;

  const summary = await getWeeklyCompanySummary(weekStart);

  return (
    <div className="min-w-0 max-w-full">
      <WeeklySummaryClientView summary={summary} />
    </div>
  );
}
