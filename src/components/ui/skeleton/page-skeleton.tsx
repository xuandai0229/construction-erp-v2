"use client";

import { cn } from "@/lib/utils";

export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-2xl bg-slate-200/70", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="app-page max-w-[1400px] space-y-5 sm:space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-2">
          <SkeletonBlock className="h-8 w-48" />
          <SkeletonBlock className="h-4 w-72" />
        </div>
        <SkeletonBlock className="h-10 w-32 rounded-lg" />
      </div>

      {/* Stats/Cards */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <SkeletonBlock className="h-24 w-full rounded-xl bg-white" />
        <SkeletonBlock className="h-24 w-full rounded-xl bg-white" />
        <SkeletonBlock className="h-24 w-full rounded-xl bg-white" />
      </div>

      {/* Tabs / Toolbar */}
      <div className="flex items-center gap-4 py-2 border-b border-slate-100">
        <SkeletonBlock className="h-8 w-20 bg-transparent" />
        <SkeletonBlock className="h-8 w-24 bg-transparent" />
        <SkeletonBlock className="h-8 w-24 bg-transparent" />
      </div>

      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-10 flex-1 sm:max-w-xs bg-white rounded-lg" />
        <SkeletonBlock className="h-10 w-32 hidden sm:block bg-white rounded-lg" />
        <SkeletonBlock className="h-10 w-32 hidden sm:block bg-white rounded-lg" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden hidden sm:block">
        <div className="border-b border-slate-100 bg-slate-50/50 p-4">
          <SkeletonBlock className="h-4 w-full max-w-2xl bg-slate-200/50" />
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="space-y-2">
                <SkeletonBlock className="h-4 w-64 bg-slate-100" />
                <SkeletonBlock className="h-3 w-40 bg-slate-100" />
              </div>
              <SkeletonBlock className="h-8 w-24 bg-slate-100 rounded-md" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Mobile Cards */}
      <div className="sm:hidden space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-32 w-full bg-white rounded-xl" />
        ))}
      </div>
    </div>
  );
}
