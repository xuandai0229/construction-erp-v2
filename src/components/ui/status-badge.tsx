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
        "inline-flex items-center justify-center rounded-full font-medium border leading-none whitespace-nowrap min-w-fit transition-colors",
        {
          // Sizes
          "h-6 px-2 text-[11px] sm:text-xs": size === "sm",
          "h-7 px-2.5 text-xs sm:text-sm": size === "md",
          "h-8 px-3 text-sm": size === "lg",
          
          // Variants
          "bg-emerald-50 text-emerald-700 border-emerald-200": variant === "success",
          "bg-amber-50 text-amber-700 border-amber-200": variant === "warning",
          "bg-red-50 text-red-700 border-red-200": variant === "danger",
          "bg-blue-50 text-blue-700 border-blue-200": variant === "info" || variant === "default",
          "bg-slate-50 text-slate-600 border-slate-200": variant === "neutral",
          "bg-violet-50 text-violet-700 border-violet-200": variant === "purple",
        },
        className
      )}
      {...props}
    />
  )
}
