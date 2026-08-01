"use client";

import React from "react";
import { ArrowDown, ArrowUp, Copy, MoreVertical, Trash2 } from "lucide-react";
import { UnifiedActionMenu, ActionMenuItem } from "@/components/ui/unified-action-menu";

export function RowActionMenu({
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onDelete,
  testId,
}: {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  testId?: string;
}) {
  const items: ActionMenuItem[] = [];

  if (canMoveUp) {
    items.push({
      id: "move-up",
      label: "Di chuyển lên",
      icon: <ArrowUp className="h-4 w-4" />,
      onClick: onMoveUp,
    });
  }

  if (canMoveDown) {
    items.push({
      id: "move-down",
      label: "Di chuyển xuống",
      icon: <ArrowDown className="h-4 w-4" />,
      onClick: onMoveDown,
    });
  }

  items.push({
    id: "duplicate",
    label: "Nhân bản",
    icon: <Copy className="h-4 w-4" />,
    onClick: onDuplicate,
  });

  items.push({
    id: "delete",
    label: "Xóa",
    icon: <Trash2 className="h-4 w-4 text-rose-700" />,
    variant: "destructive",
    onClick: onDelete,
  });

  return (
    <UnifiedActionMenu
      ariaLabel="Thao tác dòng"
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      trigger={<MoreVertical className="h-4 w-4" data-testid={testId} />}
      items={items}
      menuWidth="w-44"
      align="right"
    />
  );
}
