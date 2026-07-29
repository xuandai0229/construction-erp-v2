import { redirect } from "next/navigation";

interface PrintReportPageProps {
  searchParams: Promise<{
    weekStart?: string;
  }>;
}

export default async function PrintReportPage({ searchParams }: PrintReportPageProps) {
  const { weekStart } = await searchParams;
  const targetWeek = weekStart || "2026-07-20";

  // Legacy print route redirect to main inline summary view
  redirect(`/reports/field/weekly-summary?weekStart=${targetWeek}`);
}
