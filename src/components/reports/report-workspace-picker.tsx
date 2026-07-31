"use client";

import Link from "next/link";
import { ClipboardList, CalendarCheck2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportWorkspacePickerProps {
  canViewField: boolean;
  canViewWeekly: boolean;
  canViewSafety?: boolean;
}

export function ReportWorkspacePicker({
  canViewField,
  canViewWeekly,
  canViewSafety = true,
}: ReportWorkspacePickerProps) {
  const visibleCardsCount = (canViewField ? 1 : 0) + (canViewWeekly ? 1 : 0) + (canViewSafety ? 1 : 0);

  return (
    <div className="w-full max-w-[1140px] mx-auto py-2">
      <div
        className={cn(
          "grid gap-5 sm:gap-6",
          visibleCardsCount === 3
            ? "grid-cols-1 md:grid-cols-3"
            : visibleCardsCount === 2
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1 max-w-[480px] mx-auto"
        )}
      >
        {/* Thẻ 1: Báo cáo hiện trường */}
        {canViewField && (
          <Link
            href="/reports/field"
            prefetch={true}
            className="group relative flex flex-col justify-between p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400/80 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 hover:-translate-y-0.5 active:scale-[0.995]"
            aria-label="Xem báo cáo hiện trường"
          >
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100/80 shadow-2xs group-hover:bg-blue-100/80 group-hover:text-blue-700 transition-colors">
                  <ClipboardList className="h-5 w-5" />
                </div>
              </div>

              <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                Báo cáo hiện trường
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Quản lý nhật ký ngày, báo cáo tuần và tình hình tại công trình.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600 group-hover:text-blue-700">
              <span>Xem báo cáo</span>
              <span className="text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>
        )}

        {/* Thẻ 2: Kiểm tra và kế hoạch tuần */}
        {canViewWeekly && (
          <Link
            href="/reports/weekly-inspection"
            prefetch={true}
            className="group relative flex flex-col justify-between p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-emerald-400/80 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 hover:-translate-y-0.5 active:scale-[0.995]"
            aria-label="Xem kiểm tra và kế hoạch tuần"
          >
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 shadow-2xs group-hover:bg-emerald-100/80 group-hover:text-emerald-700 transition-colors">
                  <CalendarCheck2 className="h-5 w-5" />
                </div>
              </div>

              <h2 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                Kiểm tra và kế hoạch tuần
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Quản lý lịch kiểm tra và kế hoạch công tác theo tuần.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600 group-hover:text-emerald-700">
              <span>Xem kế hoạch</span>
              <span className="text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>
        )}

        {/* Thẻ 3: ATLĐ • PCCC • VSMT */}
        {canViewSafety && (
          <Link
            href="/reports/safety"
            prefetch={true}
            className="group relative flex flex-col justify-between p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-amber-400/80 transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 hover:-translate-y-0.5 active:scale-[0.995]"
            aria-label="Xem báo cáo ATLĐ PCCC VSMT"
          >
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100/80 shadow-2xs group-hover:bg-amber-100/80 group-hover:text-amber-700 transition-colors">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>

              <h2 className="text-lg font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                ATLĐ • PCCC • VSMT
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Kế hoạch kiểm tra và Báo cáo tự đánh giá ATLĐ, PCCC & VSMT hàng tuần.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-amber-600 group-hover:text-amber-700">
              <span>Quản lý hồ sơ</span>
              <span className="text-slate-400 group-hover:text-amber-600 transition-transform group-hover:translate-x-1">→</span>
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}
