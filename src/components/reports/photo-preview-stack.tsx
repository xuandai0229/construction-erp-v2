"use client";

import { Camera } from "lucide-react";

interface PhotoPreviewStackProps {
  count: number;
}

/** Displays a simplified photo indicator */
export function PhotoPreviewStack({ count }: PhotoPreviewStackProps) {
  if (count === 0) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded-md border border-slate-200 text-slate-600">
      <Camera className="w-3.5 h-3.5" strokeWidth={2} />
      <span className="text-[11px] font-semibold tracking-wide">{count} ảnh</span>
    </div>
  );
}
