import React from "react";
import { cn } from "@/lib/utils";

interface HrWorkspaceShellProps {
  children: React.ReactNode;
  className?: string;
}

export function HrWorkspaceShell({ children, className }: HrWorkspaceShellProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl space-y-6", className)}>
      {children}
    </div>
  );
}

interface HrPageHeaderProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  backHref?: string;
  className?: string;
}

export function HrPageHeader({
  title,
  description,
  action,
  className,
}: HrPageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between min-w-0", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-[1.75rem]">
          {title}
        </h1>
        <p className="mt-1 text-[0.9375rem] leading-6 text-slate-600">
          {description}
        </p>
      </div>
      {action && <div className="flex items-center gap-3 shrink-0">{action}</div>}
    </div>
  );
}

interface HrContentCardProps {
  children: React.ReactNode;
  className?: string;
}

export function HrContentCard({ children, className }: HrContentCardProps) {
  return (
    <div className={cn("bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-xs space-y-4", className)}>
      {children}
    </div>
  );
}

interface HrSectionHeaderProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function HrSectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
  className,
}: HrSectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between border-b border-slate-100 pb-3", className)}>
      <div className="flex items-center gap-2 min-w-0">
        {Icon && <Icon className="w-5 h-5 text-blue-600 shrink-0" />}
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 leading-6">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
