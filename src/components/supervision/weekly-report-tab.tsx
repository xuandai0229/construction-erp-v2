"use client";
import { SectionVisits } from "./section-visits";
import { SectionTransitions, SectionQuantities, SectionProgress } from "./section-tables";

type Project = { id: string; code: string; name: string };

export function WeeklyReportTab({ pkg, projects, isEditable, run, pending }: { pkg: any; projects: Project[]; isEditable: boolean; run: (fn: () => Promise<unknown>) => void; pending: boolean }) {
  const isDraftWarning = !isEditable && pkg.status === "DRAFT";

  return (
    <div className="space-y-6">
      {isDraftWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm flex items-center justify-between">
          <div>
            <span className="font-bold text-amber-800">Bản nháp — chưa gửi chính thức:</span>
            <span className="ml-2 text-amber-700">Dữ liệu đang được cập nhật bởi Trưởng ban giám sát.</span>
          </div>
        </div>
      )}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <SectionVisits pkg={pkg} projects={projects} isEditable={isEditable} run={run} pending={pending} />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <SectionTransitions pkg={pkg} projects={projects} isEditable={isEditable} run={run} pending={pending} />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <SectionQuantities pkg={pkg} projects={projects} isEditable={isEditable} run={run} pending={pending} />
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <SectionProgress pkg={pkg} projects={projects} isEditable={isEditable} run={run} pending={pending} />
      </div>
    </div>
  );
}
