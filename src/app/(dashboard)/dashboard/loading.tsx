function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-200/70 ${className}`} />;
}

export default function DashboardLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 overflow-x-hidden sm:gap-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/[0.03] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="h-8 w-72 max-w-full" />
            <SkeletonBlock className="h-4 w-56 max-w-full" />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <SkeletonBlock className="h-10 w-full sm:w-28" />
            <SkeletonBlock className="h-10 w-full sm:w-28" />
            <SkeletonBlock className="h-10 w-full sm:w-28" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-950/[0.03]">
            <SkeletonBlock className="mb-5 h-10 w-10 rounded-xl" />
            <SkeletonBlock className="mb-3 h-8 w-24" />
            <SkeletonBlock className="h-4 w-40 max-w-full" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
        <div className="space-y-5 lg:col-span-8 lg:space-y-6">
          <SkeletonBlock className="h-72 bg-white" />
          <SkeletonBlock className="h-96 bg-white" />
        </div>
        <div className="space-y-5 lg:col-span-4 lg:space-y-6">
          <SkeletonBlock className="h-64 bg-white" />
          <SkeletonBlock className="h-64 bg-white" />
        </div>
      </div>
    </div>
  );
}
