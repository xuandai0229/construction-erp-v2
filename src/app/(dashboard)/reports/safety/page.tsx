import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSafetyWeeklyFilesListAction } from "./actions";
import { SafetyListClient } from "@/components/safety/safety-list-client";

export const metadata = {
  title: "Hồ sơ ATLĐ theo tuần | Hệ thống ERP",
};

export default async function SafetyReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    year?: string;
    sort?: string;
    completionStatus?: string;
    page?: string;
  }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const year = params.year ? Number(params.year) : undefined;
  const sort = (params.sort as any) || "updated_desc";
  const completionStatus = (params.completionStatus as any) || "ALL";

  const weeklyFilesData = await getSafetyWeeklyFilesListAction({
    search: params.search,
    year,
    sort,
    completionStatus,
    page,
    pageSize: 15,
  });

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 md:p-8">
      <SafetyListClient weeklyFilesData={weeklyFilesData} />
    </div>
  );
}
