"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, MoreVertical, Trash2 } from "lucide-react";

export function SafetyRowActionMenu({
  onDuplicate,
  onDelete,
  disabled,
}: {
  onDuplicate: () => void;
  onDelete: () => void;
  disabled?: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<React.CSSProperties>();

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const updatePosition = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      const width = 150;
      const left = Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12);
      const openUp = window.innerHeight - rect.bottom < 180 && rect.top > 180;
      setStyle({
        position: "fixed",
        left,
        top: openUp ? undefined : rect.bottom + 4,
        bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
        width,
        zIndex: 105,
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setOpen(false);
      }
    };

    updatePosition();
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  if (disabled) return null;

  const invokeAction = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const itemClass =
    "flex min-h-9 w-full items-center gap-2 rounded-md px-3 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 transition";

  const menu = open ? (
    <div
      ref={menuRef}
      role="menu"
      style={style}
      className="rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10"
    >
      <button type="button" role="menuitem" onClick={() => invokeAction(onDuplicate)} className={itemClass}>
        <Copy className="h-3.5 w-3.5 text-blue-600" />
        <span>Nhân bản dòng</span>
      </button>
      <button
        type="button"
        role="menuitem"
        onClick={() => invokeAction(onDelete)}
        className={`${itemClass} text-rose-600 hover:bg-rose-50`}
      >
        <Trash2 className="h-3.5 w-3.5" />
        <span>Xóa dòng</span>
      </button>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Thao tác dòng"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-transparent text-slate-400 hover:bg-slate-100 hover:text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {menu ? createPortal(menu, document.body) : null}
    </>
  );
}
