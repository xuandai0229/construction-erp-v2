"use client";

import { cn } from "@/lib/utils";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-slate-200/70", className)} />;
}

export function WorkspaceContentSkeleton() {
  return (
    <div className="w-full space-y-5 min-h-[500px] animate-fadeIn" data-testid="workspace-content-skeleton">
      {/* KPI / Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <SkeletonBlock className="h-20 sm:h-22 w-full rounded-xl bg-white border border-slate-100 shadow-2xs" />
        <SkeletonBlock className="h-20 sm:h-22 w-full rounded-xl bg-white border border-slate-100 shadow-2xs" />
        <SkeletonBlock className="h-20 sm:h-22 w-full rounded-xl bg-white border border-slate-100 shadow-2xs" />
        <SkeletonBlock className="h-20 sm:h-22 w-full rounded-xl bg-white border border-slate-100 shadow-2xs" />
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
        <SkeletonBlock className="h-9 flex-1 sm:max-w-md bg-slate-100/80 rounded-lg" />
        <div className="flex items-center gap-2">
          <SkeletonBlock className="h-9 w-28 bg-slate-100/80 rounded-lg" />
          <SkeletonBlock className="h-9 w-28 bg-slate-100/80 rounded-lg" />
          <SkeletonBlock className="h-9 w-32 bg-blue-100/60 rounded-lg" />
        </div>
      </div>

      {/* Table Skeleton Container */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-2xs overflow-hidden min-h-[350px]">
        <div className="border-b border-slate-100 bg-slate-50/60 px-4 py-3">
          <SkeletonBlock className="h-4 w-full max-w-md bg-slate-200/60" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <div className="space-y-2 flex-1 pr-4">
                <SkeletonBlock className="h-4 w-1/3 bg-slate-100" />
                <SkeletonBlock className="h-3 w-1/4 bg-slate-100/80" />
              </div>
              <SkeletonBlock className="h-7 w-20 bg-slate-100 rounded-md shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
