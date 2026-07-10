import * as React from "react";
import { cn } from "@/lib/utils";

/* ===========================================================
   Enterprise UI Components — Shared across ALL modules
   =========================================================== */

type Tone = "blue" | "emerald" | "amber" | "rose" | "slate" | "indigo";

const toneClasses: Record<Tone, string> = {
  blue: "border-blue-100 bg-blue-50 text-blue-700",
  emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
  amber: "border-amber-100 bg-amber-50 text-amber-700",
  rose: "border-rose-100 bg-rose-50 text-rose-700",
  slate: "border-slate-200 bg-slate-50 text-slate-700",
  indigo: "border-indigo-100 bg-indigo-50 text-indigo-700",
};

/* ---- Page Header ---- */
export function PageHeader({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "rounded-[14px] border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/[0.03] sm:p-5 lg:rounded-2xl",
        className,
      )}
      {...props}
    />
  );
}

/* ---- Page Heading ---- */
export function PageHeading({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="page-heading">{title}</h1>
        {description ? <p className="page-description">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ---- Content Card ---- */
export function ContentCard({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03] lg:rounded-2xl",
        className,
      )}
      {...props}
    />
  );
}

/* ---- Filter Bar ---- */
export function FilterBar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[14px] border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/[0.03] sm:p-4",
        className,
      )}
      {...props}
    />
  );
}

/* ---- Section Header ---- */
export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="min-w-0">
        <h2 className="text-base font-bold tracking-tight text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function KpiCard({
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
  onClick?: () => void;
}) {
  const isInteractive = !!onClick;
  
  return (
    <ContentCard 
      className={cn(
        "p-4 relative group", 
        isInteractive && "cursor-pointer transition-all hover:shadow-md hover:border-blue-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        className
      )}
      onClick={onClick}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-sm font-semibold text-slate-600 whitespace-nowrap">{label}</div>
        {icon ? (
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors group-hover:bg-blue-100 group-hover:border-blue-200 group-hover:text-blue-700", toneClasses[tone])}>
            {icon}
          </div>
        ) : null}
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{value}</div>
      {helper ? <div className="mt-1 text-xs leading-5 text-slate-500">{helper}</div> : null}
      
      {isInteractive && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
        </div>
      )}
    </ContentCard>
  );
}

/* ---- Enterprise Table Container ---- */
export function EnterpriseTable({ className, children }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <ContentCard className={cn("overflow-hidden", className)}>
      <div className="custom-scrollbar overflow-x-auto">{children}</div>
    </ContentCard>
  );
}

/* ---- Metric Cells for data tables ---- */
export function MetricCell({
  value,
  muted,
  className,
}: {
  value: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("block text-right font-mono text-sm font-semibold tabular-nums", muted ? "text-slate-400" : "text-slate-900", className)}>
      {value ?? "—"}
    </span>
  );
}

export function QuantityCell({ value, unit, className }: { value: React.ReactNode; unit?: React.ReactNode; className?: string }) {
  const isNumber = typeof value === "number";
  const formattedValue = isNumber ? new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 }).format(value) : value;
  const isNegative = isNumber && (value as number) < 0;
  
  return (
    <span className={cn("flex items-baseline justify-end gap-1.5 whitespace-nowrap", className)}>
      <span className={cn("font-mono text-sm font-semibold tabular-nums", isNegative ? "text-amber-700" : "text-slate-900")}>
        {formattedValue ?? "—"}
      </span>
      {unit ? <span className="text-xs font-medium text-slate-500">{unit}</span> : null}
    </span>
  );
}

export function PercentCell({ value }: { value: React.ReactNode }) {
  return <MetricCell value={value} className="text-xs" />;
}

/** Money cell — right-aligned, tabular nums, formatted VND-style */
export function MoneyCell({
  value,
  muted,
  className,
}: {
  value: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "block text-right font-mono text-sm font-semibold tabular-nums",
        muted ? "text-slate-400" : "text-slate-900",
        className,
      )}
    >
      {value ?? "—"}
    </span>
  );
}

/** Date cell — consistent date display */
export function DateCell({
  value,
  muted,
  className,
}: {
  value: React.ReactNode;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "block whitespace-nowrap text-sm tabular-nums",
        muted ? "text-slate-400" : "text-slate-600",
        className,
      )}
    >
      {value ?? "—"}
    </span>
  );
}

/* ---- Form Layout Components ---- */
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4 py-5 first:pt-0 last:pb-0", className)}>
      {title && (
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
      )}
      {children}
    </div>
  );
}

export function FormGrid({
  cols = 2,
  children,
  className,
}: {
  cols?: 2 | 3;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        cols === 3
          ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          : "grid-cols-1 sm:grid-cols-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---- Loading Skeleton ---- */
export function LoadingSkeleton({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cn("animate-pulse space-y-3", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded-md bg-slate-200/60"
          style={{ width: `${Math.max(40, 100 - i * 15)}%` }}
        />
      ))}
    </div>
  );
}

/* ---- Error State ---- */
export function ErrorState({
  title = "Đã xảy ra lỗi",
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-[200px] flex-col items-center justify-center p-6 text-center", className)}>
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      {message && <p className="mt-1 text-xs text-slate-500">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
        >
          Thử lại
        </button>
      )}
    </div>
  );
}

/* ---- Pagination ---- */
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  baseUrl,
  className,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  baseUrl: string;
  className?: string;
}) {
  if (totalPages <= 1) return null;
  const skip = (currentPage - 1) * pageSize;

  return (
    <div className={cn("flex flex-col gap-3 border-t border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <p className="text-sm text-slate-500 font-medium">
        Hiển thị <span className="font-semibold text-slate-900">{skip + 1}</span> đến{" "}
        <span className="font-semibold text-slate-900">{Math.min(skip + pageSize, totalItems)}</span> trong số{" "}
        <span className="font-semibold text-slate-900">{totalItems}</span>
      </p>
      <div className="flex items-center gap-2">
        <a
          href={`${baseUrl}&page=${Math.max(1, currentPage - 1)}`}
          className={cn(
            "inline-flex items-center justify-center rounded-lg h-9 w-9 border border-slate-200 transition-colors",
            currentPage === 1 ? "pointer-events-none opacity-50 bg-slate-50 text-slate-400" : "bg-white hover:bg-slate-50 text-slate-700",
          )}
          aria-label="Trang trước"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </a>
        <span className="text-sm font-semibold text-slate-900 px-2">
          Trang {currentPage} / {totalPages}
        </span>
        <a
          href={`${baseUrl}&page=${Math.min(totalPages, currentPage + 1)}`}
          className={cn(
            "inline-flex items-center justify-center rounded-lg h-9 w-9 border border-slate-200 transition-colors",
            currentPage === totalPages ? "pointer-events-none opacity-50 bg-slate-50 text-slate-400" : "bg-white hover:bg-slate-50 text-slate-700",
          )}
          aria-label="Trang sau"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </a>
      </div>
    </div>
  );
}

/* ---- Safe Text & Action Group ---- */
export function SafeText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn("block min-w-0 truncate", className)}
      title={typeof children === "string" ? children : undefined}
    >
      {children}
    </span>
  );
}

export function ActionGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {children}
    </div>
  );
}
