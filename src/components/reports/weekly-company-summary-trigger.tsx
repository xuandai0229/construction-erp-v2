"use client";

import { FileStack, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getVietnamIsoWeekInfo } from "@/lib/reports/report-timezone";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";

function shiftWeek(value: string, days: number) {
  const date = new Date(`${value}T00:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return getVietnamIsoWeekInfo(date).weekStartDate;
}

function formatDateVN(ymd: string): string {
  const [year, month, day] = ymd.split("-");
  return `${day}/${month}/${year}`;
}

export function WeeklyCompanySummaryTrigger({
  weekStartDate,
}: {
  weekStartDate: string;
}) {
  const router = useRouter();
  const week = getVietnamIsoWeekInfo(weekStartDate);
  const [isNavigating, setIsNavigating] = useState(false);

  const update = useCallback(
    (value: string) => {
      router.replace(`/reports/field?tab=weekly&weekStart=${value}`, {
        scroll: false,
      });
    },
    [router],
  );

  const handleSummary = useCallback(() => {
    setIsNavigating(true);
    router.push(
      `/reports/field/weekly-summary?weekStart=${week.weekStartDate}`,
    );
  }, [router, week.weekStartDate]);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {/* Week navigation */}
      <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white shadow-2xs">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => update(shiftWeek(week.weekStartDate, -7))}
          aria-label="Tuần trước"
          className="h-8 w-8 p-0 rounded-l-lg rounded-r-none"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="px-2 text-sm font-medium text-slate-700 select-none whitespace-nowrap">
          Tuần {week.weekNumber} · {formatDateVN(week.weekStartDate)} – {formatDateVN(week.weekEndDate)}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => update(shiftWeek(week.weekStartDate, 7))}
          aria-label="Tuần sau"
          className="h-8 w-8 p-0 rounded-r-lg rounded-l-none"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Reset to current week */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => update(getVietnamIsoWeekInfo(new Date()).weekStartDate)}
        className="h-8 gap-1 text-xs"
      >
        <RotateCcw className="h-3 w-3" />
        Tuần hiện tại
      </Button>

      {/* Summary action button */}
      <Button
        size="sm"
        onClick={handleSummary}
        disabled={isNavigating}
        className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
        title="Tổng hợp báo cáo tuần của tất cả công trình trong tuần đã chọn"
      >
        <FileStack className="h-4 w-4" />
        {isNavigating ? "Đang tải..." : "Tổng hợp báo cáo tuần"}
      </Button>
    </div>
  );
}
