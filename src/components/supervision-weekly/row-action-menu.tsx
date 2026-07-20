"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowDown, ArrowUp, Copy, MoreVertical, Trash2 } from "lucide-react";

export function RowActionMenu({ canMoveUp, canMoveDown, onMoveUp, onMoveDown, onDuplicate, onDelete, testId }: {
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  testId?: string;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>();

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const update = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const width = 208;
      const left = Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12);
      const openUp = window.innerHeight - rect.bottom < 220 && rect.top > 220;
      setStyle({ position: "fixed", left, top: openUp ? undefined : rect.bottom + 6, bottom: openUp ? window.innerHeight - rect.top + 6 : undefined, width, zIndex: 105 });
    };
    const close = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };
    update();
    document.addEventListener("pointerdown", close);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      document.removeEventListener("pointerdown", close);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  const invoke = (action: () => void) => {
    setOpen(false);
    action();
  };

  const itemClass = "flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40";
  const menu = open ? <div ref={menuRef} role="menu" style={style} data-testid={testId ? `${testId}-menu` : undefined} className="rounded-lg border border-slate-200 bg-white p-1 shadow-xl shadow-slate-950/15">
    <button type="button" role="menuitem" disabled={!canMoveUp} onClick={() => invoke(onMoveUp)} className={itemClass}><ArrowUp className="h-4 w-4" />Di chuyển lên</button>
    <button type="button" role="menuitem" disabled={!canMoveDown} onClick={() => invoke(onMoveDown)} className={itemClass}><ArrowDown className="h-4 w-4" />Di chuyển xuống</button>
    <button type="button" role="menuitem" onClick={() => invoke(onDuplicate)} className={itemClass}><Copy className="h-4 w-4" />Nhân bản</button>
    <button type="button" role="menuitem" onClick={() => invoke(onDelete)} className={`${itemClass} text-rose-700 hover:bg-rose-50`}><Trash2 className="h-4 w-4" />Xóa</button>
  </div> : null;

  return <>
    <button
      ref={triggerRef}
      type="button"
      aria-label="Thao tác dòng"
      aria-haspopup="menu"
      aria-expanded={open}
      title="Thao tác dòng"
      onClick={() => setOpen((current) => !current)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
      data-testid={testId}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <MoreVertical className="h-5 w-5" />
    </button>
    {menu ? createPortal(menu, document.body) : null}
  </>;
}
