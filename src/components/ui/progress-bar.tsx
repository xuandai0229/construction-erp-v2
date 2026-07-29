import { cn } from "@/lib/utils";

type ProgressTone = "emerald" | "amber" | "rose" | "blue" | "slate";

const toneClass: Record<ProgressTone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  blue: "bg-blue-500",
  slate: "bg-slate-500",
};

export function ProgressBar({
  value,
  tone = "blue",
  label,
  className,
}: {
  value: number | null;
  tone?: ProgressTone;
  label: string;
  className?: string;
}) {
  const visualValue = value === null ? 0 : Math.min(100, Math.max(0, value));

  return (
    <div
      className={cn("h-2 w-full max-w-full rounded-full bg-slate-100", className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value ?? undefined}
      data-progress-status={value === null ? "unavailable" : "available"}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none", toneClass[tone])}
        style={{ width: `${visualValue}%` }}
      />
    </div>
  );
}
