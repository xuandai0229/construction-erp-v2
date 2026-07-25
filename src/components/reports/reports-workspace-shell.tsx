"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, CalendarCheck2 } from "lucide-react";
import { PageHeader, PageHeading } from "@/components/ui/enterprise";
import { cn } from "@/lib/utils";

export function ReportsWorkspaceShell({
  showFieldTab = true,
  showWeeklyTab = true,
  children,
}: {
  showFieldTab?: boolean;
  showWeeklyTab?: boolean;
  userRole?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isSelectionRoute = pathname === "/reports";
  const isWeeklyRoute =
    pathname.startsWith("/reports/weekly-inspection") ||
    pathname.startsWith("/supervision/weekly");
  const isFieldRoute =
    pathname.startsWith("/reports/field") ||
    (pathname.startsWith("/reports") && !isWeeklyRoute && !isSelectionRoute);

  return (
    <div className="space-y-6">
      {/* 1. Shared Page Header */}
      <PageHeader>
        <PageHeading
          title={
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
                <ClipboardList className="h-5 w-5" />
              </div>
              <span>Trung tâm Báo cáo Công trình</span>
            </div>
          }
          description={
            isSelectionRoute
              ? "Chọn loại báo cáo cần quản lý."
              : "Quản lý báo cáo hiện trường, kết quả kiểm tra và kế hoạch công tác theo tuần."
          }
        />

        {/* 2. Top-Level Workspace Tabs - Hidden on selection screen */}
        {!isSelectionRoute && (showFieldTab || showWeeklyTab) && (
          <div className="mt-4 flex items-center gap-2 border-b border-slate-200 text-sm font-semibold overflow-x-auto scrollbar-hide">
            {showFieldTab && (
              <Link
                href="/reports/field"
                role="tab"
                aria-selected={isFieldRoute}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-t-lg whitespace-nowrap",
                  isFieldRoute
                    ? "border-blue-600 text-blue-600 bg-blue-50/50"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <ClipboardList className="h-4 w-4" />
                <span>Hiện trường</span>
              </Link>
            )}

            {showWeeklyTab && (
              <Link
                href="/reports/weekly-inspection"
                role="tab"
                aria-selected={isWeeklyRoute}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 border-b-2 font-bold transition-all outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-t-lg whitespace-nowrap",
                  isWeeklyRoute
                    ? "border-blue-600 text-blue-600 bg-blue-50/50"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                )}
              >
                <CalendarCheck2 className="h-4 w-4" />
                <span>Kiểm tra & kế hoạch tuần</span>
              </Link>
            )}
          </div>
        )}
      </PageHeader>

      {/* 3. Active Workspace Content */}
      <div>{children}</div>
    </div>
  );
}
