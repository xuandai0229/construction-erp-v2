"use client";

import React from "react";
import { Copy, MoreVertical, Trash2 } from "lucide-react";
import { UnifiedActionMenu } from "@/components/ui/unified-action-menu";

export function SafetyRowActionMenu({
  onDuplicate,
  onDelete,
  disabled,
}: {
  onDuplicate: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  if (disabled) return null;

  return (
    <UnifiedActionMenu
      ariaLabel="Thao tác dòng"
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
      trigger={<MoreVertical className="h-4 w-4" />}
      items={[
        {
          id: "duplicate",
          label: "Nhân bản dòng",
          icon: <Copy className="h-3.5 w-3.5 text-blue-600" />,
          onClick: onDuplicate,
        },
        {
          id: "delete",
          label: "Xóa dòng",
          icon: <Trash2 className="h-3.5 w-3.5" />,
          variant: "destructive",
          onClick: onDelete,
        },
      ]}
      menuWidth="w-40"
      align="right"
    />
  );
}
