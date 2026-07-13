"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "emerald" | "amber" | "rose" | "slate" | "indigo";

const toneClasses: Record<Tone, string> = {
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  rose: "border-rose-100 bg-rose-50 text-rose-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
  indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
};

export function InteractiveKpiCard({
  label,
  value,
  helper,
  icon,
  tone = "blue",
  className,
  onClick,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  helper?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: Tone;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative min-h-[88px] rounded-[14px] border border-slate-200 bg-white p-4 text-left shadow-sm shadow-slate-950/[0.03] transition-all hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-[0.98] lg:rounded-2xl",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm font-semibold text-slate-600">{label}</div>
        {icon ? (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", toneClasses[tone])}>
            {icon}
          </div>
        ) : null}
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{value}</div>
      {helper ? <div className="mt-1 text-xs leading-5 text-slate-500">{helper}</div> : null}
      <ChevronRight className="absolute right-3 top-3 h-4 w-4 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
    </button>
  );
}
