import * as React from "react";
import { cn } from "@/lib/utils";

interface ActionFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  left?: React.ReactNode;
  right?: React.ReactNode;
}

export function ActionFooter({
  left,
  right,
  children,
  className,
  ...props
}: ActionFooterProps) {
  return (
    <div
      className={cn(
        "shrink-0 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur supports-[backdrop-filter]:bg-white/85 md:px-6 md:py-4",
        "pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
        className,
      )}
      {...props}
    >
      {children ?? (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">{left}</div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">{right}</div>
        </div>
      )}
    </div>
  );
}
