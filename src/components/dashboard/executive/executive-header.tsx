"use client";

import { Building2, Globe2 } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard/dashboard-queries";
import type { DashboardContext } from "@/lib/dashboard/dashboard-context";
import { ProjectName } from "@/components/project/project-name";
import { ExecutiveLiveClock } from "./executive-live-clock";

export function ExecutiveHeader({ data, context }: { data: DashboardData; context: DashboardContext }) {
  const selectedProject = context.mode === "PROJECT"
    ? data.projectOverview.find((project) => project.id === context.projectId) ?? null
    : null;

  return (
    <section data-dashboard-hero className="relative min-h-32 overflow-clip rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-elevated)]">
      <div
        className="absolute inset-0 bg-cover bg-[center_right] bg-no-repeat"
        style={{ backgroundImage: "url('/images/dashboard/dashboard-hero-2400x420-v4.png')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.99)_0%,rgba(255,255,255,0.94)_42%,rgba(255,255,255,0.28)_76%,rgba(255,255,255,0.06)_100%)]" aria-hidden="true" />

      <div className="relative z-10 flex min-h-32 max-w-3xl flex-col justify-center gap-1.5 px-5 py-3 sm:px-7 md:px-8">
        <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm backdrop-blur">
          {context.mode === "PORTFOLIO" ? <Globe2 className="size-4 shrink-0 text-blue-600" aria-hidden="true" /> : <Building2 className="size-4 shrink-0 text-blue-600" aria-hidden="true" />}
          <span>{context.mode === "PORTFOLIO" ? "Phạm vi toàn hệ thống" : "Phạm vi một công trình"}</span>
        </div>

        <div className="min-w-0">
          <h1 className="text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-[26px]">
            {context.mode === "PORTFOLIO" ? "Tổng quan điều hành toàn hệ thống" : "Điều hành công trình"}
          </h1>
          {selectedProject ? (
            <ProjectName name={selectedProject.name} maxLines={2} className="mt-1 text-base font-bold text-slate-700 sm:text-lg" />
          ) : (
            <p className="mt-1 max-w-xl text-sm leading-5 text-slate-600">So sánh tiến độ, rủi ro và chất lượng dữ liệu giữa các công trình trong phạm vi được phép xem.</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-medium text-slate-600">
          <ExecutiveLiveClock />
          {selectedProject ? <><span aria-hidden="true" className="hidden size-1 rounded-full bg-slate-300 sm:block" /><span className="font-mono">{selectedProject.code}</span></> : null}
        </div>
      </div>
    </section>
  );
}
