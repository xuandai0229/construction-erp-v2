"use client";

import React from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import { UnifiedActionMenu } from "@/components/ui/unified-action-menu";

interface SafetyRowActionPortalMenuProps {
  rowId: string;
  onDelete: () => void;
  canDelete?: boolean;
}

export function SafetyRowActionPortalMenu({
  rowId,
  onDelete,
  canDelete = true,
}: SafetyRowActionPortalMenuProps) {
  if (!canDelete) return null;

  return (
    <UnifiedActionMenu
      ariaLabel="Mở menu thao tác hồ sơ"
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
      trigger={<MoreVertical className="h-4 w-4" />}
      items={[
        {
          id: "delete-file",
          label: "Xóa hồ sơ",
          icon: <Trash2 className="h-4 w-4 text-rose-600 shrink-0" />,
          variant: "destructive",
          onClick: () => {
            console.log("[DELETE-WEEKLY-FILE]", {
              stage: "MENU_CLICK",
              weeklyFileId: rowId,
            });
            onDelete();
          },
        },
      ]}
      menuWidth="w-40"
      align="right"
    />
  );
}
