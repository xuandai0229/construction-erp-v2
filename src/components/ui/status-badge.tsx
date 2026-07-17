import * as React from "react"
import { cn } from "@/lib/utils"

export type StatusBadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' | 'default';
export type StatusBadgeSize = 'sm' | 'md' | 'lg';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusBadgeVariant;
  size?: StatusBadgeSize;
}

export function StatusBadge({ className, variant = "neutral", size = "md", ...props }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-w-fit items-center justify-center whitespace-nowrap rounded-[var(--radius-sm)] border font-semibold leading-none tracking-[-0.01em] transition-colors",
        {
          // Sizes
          "h-6 px-2 text-[11px] sm:text-xs": size === "sm",
          "h-7 px-2.5 text-xs sm:text-sm": size === "md",
          "h-8 px-3 text-sm": size === "lg",
          
          // Variants
          "bg-emerald-50 text-emerald-700 border-emerald-200": variant === "success",
          "bg-amber-50 text-amber-700 border-amber-200": variant === "warning",
          "bg-rose-50 text-rose-700 border-rose-200": variant === "danger",
          "bg-blue-50 text-blue-700 border-blue-200": variant === "info" || variant === "default",
          "bg-slate-100 text-slate-700 border-slate-200": variant === "neutral",
          "bg-violet-50 text-violet-700 border-violet-200": variant === "purple",
        },
        className
      )}
      {...props}
    />
  )
}
