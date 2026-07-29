"use client";

import { OverflowTooltipText } from "@/components/ui/overflow-tooltip-text";
import { cn } from "@/lib/utils";

export function ProjectName({
  name,
  maxLines = 2,
  className,
}: {
  name: string;
  maxLines?: 1 | 2;
  className?: string;
}) {
  return (
    <span data-project-name className="block min-w-0 max-w-full">
      <OverflowTooltipText
        text={name}
        maxLines={maxLines}
        className={cn("min-w-0 text-sm font-bold leading-5 text-slate-950", className)}
      />
    </span>
  );
}
