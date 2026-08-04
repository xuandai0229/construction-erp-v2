import React from "react";
import { FolderOpen, FilterX, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface HrEmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
  variant?: "no-data" | "filter-mismatch";
  className?: string;
}

export function HrEmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "no-data",
  className,
}: HrEmptyStateProps) {
  const DefaultIcon = variant === "filter-mismatch" ? FilterX : Users;
  const ActiveIcon = Icon || DefaultIcon;

  return (
    <div
      className={cn(
        "bg-white border border-slate-200 rounded-xl p-8 sm:p-10 text-center flex flex-col items-center justify-center min-h-[220px] max-h-[300px] shadow-xs space-y-3",
        className
      )}
    >
      <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center shrink-0">
        <ActiveIcon className="w-6 h-6" />
      </div>
      <div className="space-y-1 max-w-md">
        <h3 className="text-base font-bold text-slate-900 leading-6">{title}</h3>
        <p className="text-xs text-slate-600 leading-5">{description}</p>
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
