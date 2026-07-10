"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type CloseButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
  tone?: "danger" | "neutral";
};

export function CloseButton({
  className,
  label = "Đóng",
  tone = "neutral",
  ...props
}: CloseButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        tone === "danger"
          ? "border-rose-100 bg-rose-50 text-rose-600 hover:border-rose-200 hover:bg-rose-100 hover:text-rose-700 focus-visible:ring-rose-300"
          : "border-slate-200 bg-slate-50 text-slate-500 hover:border-rose-100 hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-rose-300",
        className
      )}
      {...props}
    >
      <X className="h-4.5 w-4.5" />
    </button>
  );
}
