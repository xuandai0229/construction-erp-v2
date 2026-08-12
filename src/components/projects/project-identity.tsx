import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getProjectStatusMeta } from "@/lib/project-status";
import { StatusBadge } from "@/components/ui/status-badge";
import { ProjectName } from "@/components/project/project-name";

export type ProjectIdentityVariant =
  | "header"
  | "selector"
  | "table"
  | "card"
  | "dashboard"
  | "full"
  | "compact";

export type ProjectIdentityProps = {
  name: string;
  displayName?: string | null;
  code: string;
  status?: string;
  location?: string | null;
  investor?: string | null;
  commanderName?: string | null;
  executionUnit?: string | null;
  duration?: string | null;
  variant?: ProjectIdentityVariant;
  selected?: boolean;
  href?: string;
  className?: string;
};

export function ProjectIdentity({
  name,
  displayName,
  code,
  status,
  location,
  investor,
  commanderName,
  executionUnit,
  duration,
  variant = "table",
  selected = false,
  href,
  className,
}: ProjectIdentityProps) {
  const primaryTitle = displayName || name;
  const statusMeta = status ? getProjectStatusMeta(status) : null;

  // Render Title Element (Link or Span)
  const renderTitle = (titleClass: string) => {
    if (href) {
      return (
        <Link
          href={href}
          className={cn(
            titleClass,
            "hover:text-blue-600 hover:underline decoration-blue-500/40 underline-offset-4 transition-colors"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {primaryTitle}
        </Link>
      );
    }
    return <span className={titleClass}>{primaryTitle}</span>;
  };

  // 1. Table Variant
  if (variant === "table") {
    return (
      <div className={cn("flex flex-col min-w-0 py-0.5", className)} data-project-identity="table">
        <ProjectName name={primaryTitle} maxLines={2} className="text-[14px] font-bold leading-snug text-slate-950" />
        <div className="mt-1 flex items-center gap-1.5 text-[12px] font-mono font-medium text-slate-600">
          <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[11px] font-bold text-slate-800">
            {code}
          </span>
          {executionUnit && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-slate-700 font-sans font-medium">{executionUnit}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  // 2. Selector Variant
  if (variant === "selector") {
    return (
      <div className={cn("flex flex-col min-w-0 text-left py-0.5", className)} data-project-identity="selector">
        {/* Row 1: Display Name */}
        <div title={primaryTitle} className={cn("text-[14px] font-bold leading-tight text-slate-950 line-clamp-2 break-words", selected && "text-blue-950 font-black")}>
          {primaryTitle}
        </div>

        {/* Row 2: Code · Location · Status */}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-slate-700 font-medium">
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">{code}</span>
          {location && (
            <>
              <span className="text-slate-300">·</span>
              <span className="truncate max-w-[220px] text-slate-700">{location}</span>
            </>
          )}
          {statusMeta && (
            <>
              <span className="text-slate-300">·</span>
              <span className={cn("font-semibold text-[11px]", statusMeta.key === "ACTIVE" ? "text-emerald-700" : "text-slate-700")}>
                {statusMeta.label}
              </span>
            </>
          )}
        </div>

        {/* Row 3: Commander · Execution Unit */}
        {(commanderName || executionUnit) && (
          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-slate-600 font-medium">
            {commanderName && (
              <span>
                Chỉ huy trưởng: <strong className="font-semibold text-slate-900">{commanderName}</strong>
              </span>
            )}
            {executionUnit && (
              <>
                {commanderName && <span className="text-slate-300">·</span>}
                <span>Đơn vị: <strong className="font-semibold text-slate-800">{executionUnit}</strong></span>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // 3. Header Variant
  if (variant === "header") {
    return (
      <div className={cn("flex min-w-0 flex-col gap-1", className)} data-project-identity="header">
        <ProjectName name={primaryTitle} maxLines={2} className="text-[15px] font-bold leading-5 sm:text-base" />
        <span className="w-fit rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-600">
          Mã: {code}
        </span>
      </div>
    );
  }

  // 4. Dashboard Hero Variant
  if (variant === "dashboard") {
    return (
      <div className={cn("flex flex-col min-w-0 space-y-1.5", className)} data-project-identity="dashboard">
        <h1 title={primaryTitle} className="text-[20px] sm:text-[24px] font-black text-slate-950 leading-tight">
          {primaryTitle}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-700 font-medium">
          <span className="font-mono font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-900 text-[12px]">{code}</span>
          {location && (
            <>
              <span className="text-slate-300">·</span>
              <span className="text-slate-800 font-medium">{location}</span>
            </>
          )}
          {commanderName && (
            <>
              <span className="text-slate-300">·</span>
              <span>Chỉ huy trưởng: <strong className="text-slate-950 font-semibold">{commanderName}</strong></span>
            </>
          )}
          {statusMeta && (
            <>
              <span className="text-slate-300">·</span>
              <StatusBadge variant={statusMeta.variant}>{statusMeta.label}</StatusBadge>
            </>
          )}
        </div>
      </div>
    );
  }

  // 5. Card Variant (Mobile / Card Grid)
  if (variant === "card") {
    return (
      <div className={cn("flex flex-col min-w-0 space-y-2", className)} data-project-identity="card">
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono font-bold text-[12px] text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {code}
          </span>
          {statusMeta && <StatusBadge variant={statusMeta.variant}>{statusMeta.label}</StatusBadge>}
        </div>
        <div title={primaryTitle} className="text-[15px] font-bold text-slate-950 leading-snug line-clamp-2">
          {renderTitle("text-[15px] font-bold text-slate-950 leading-snug")}
        </div>
        <div className="text-[13px] text-slate-700 font-medium space-y-1 pt-1.5 border-t border-slate-200">
          {location && <div className="text-slate-800">📍 {location}</div>}
          {commanderName && <div>👷 Chỉ huy trưởng: <strong className="text-slate-900 font-semibold">{commanderName}</strong></div>}
          {executionUnit && <div>🏢 Đơn vị: <strong className="text-slate-800">{executionUnit}</strong></div>}
        </div>
      </div>
    );
  }

  // 6. Full Variant (Detail Page Header)
  if (variant === "full") {
    return (
      <div className={cn("flex flex-col min-w-0 space-y-2", className)} data-project-identity="full">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono font-bold text-[13px] bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-md border border-blue-200">
            {code}
          </span>
          {statusMeta && <StatusBadge variant={statusMeta.variant}>{statusMeta.label}</StatusBadge>}
          {executionUnit && (
            <span className="text-[12px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-semibold border border-slate-200">
              {executionUnit}
            </span>
          )}
        </div>
        <h1 title={primaryTitle} className="text-[22px] sm:text-[26px] font-black text-slate-950 leading-tight">
          {primaryTitle}
        </h1>
        {displayName && name && displayName !== name && (
          <div className="text-[13px] text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-0.5">Tên pháp lý công trình:</span>
            <span className="text-slate-800 font-normal leading-relaxed">{name}</span>
          </div>
        )}
      </div>
    );
  }

  // Default: Compact Variant
  return (
    <div className={cn("flex items-center gap-2 min-w-0", className)} data-project-identity="compact">
      <span className="font-mono text-[12px] font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">{code}</span>
      <span className="text-slate-300">·</span>
    </div>
  );
}
