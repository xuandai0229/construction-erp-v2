"use client";

import Link from "next/link";
import { ClipboardList, CalendarCheck2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportWorkspacePickerProps {
  canViewField: boolean;
  canViewWeekly: boolean;
}

export function ReportWorkspacePicker({
  canViewField,
  canViewWeekly,
}: ReportWorkspacePickerProps) {
  const hasBoth = canViewField && canViewWeekly;

  return (
    <div className="w-full max-w-[980px] mx-auto py-3 sm:py-6">
      <div
        className={cn(
          "grid gap-5 sm:gap-6",
          hasBoth ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 max-w-[480px] mx-auto"
        )}
      >
        {/* Card 1: Báo cáo hiện trường */}
        {canViewField && (
          <Link
            href="/reports/field"
            prefetch={true}
            className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400/80 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 hover:-translate-y-0.5 active:scale-[0.995]"
            aria-label="Mở phân hệ Báo cáo hiện trường"
          >
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80 shadow-2xs group-hover:bg-blue-100/80 group-hover:text-blue-700 transition-colors">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Báo cáo hiện trường
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Quản lý nhật ký ngày, tình hình thi công và sự cố tại công trường.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
              <span>Mở phân hệ</span>
              <span className="text-slate-400 group-hover:text-blue-600 transition-colors">→</span>
            </div>
          </Link>
        )}

        {/* Card 2: Kiểm tra & kế hoạch tuần */}
        {canViewWeekly && (
          <Link
            href="/reports/weekly-inspection"
            prefetch={true}
            className="group relative flex flex-col justify-between p-6 sm:p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-400/80 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 hover:-translate-y-0.5 active:scale-[0.995]"
            aria-label="Mở phân hệ Kiểm tra và kế hoạch tuần"
          >
            <div>
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 shadow-2xs group-hover:bg-emerald-100/80 group-hover:text-emerald-700 transition-colors">
                  <CalendarCheck2 className="h-6 w-6" />
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                  <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                </div>
              </div>

              <h2 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Kiểm tra & kế hoạch tuần
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Quản lý kết quả kiểm tra và kế hoạch công tác theo tuần.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600 group-hover:text-emerald-700">
              <span>Mở phân hệ</span>
              <span className="text-slate-400 group-hover:text-emerald-600 transition-colors">→</span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
