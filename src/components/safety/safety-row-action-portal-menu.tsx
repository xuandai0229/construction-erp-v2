"use client";

import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MoreVertical, Trash2 } from "lucide-react";

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

  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top?: number; bottom?: number; right: number }>({ right: 12 });

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const deletingRef = useRef(false);

  const calculatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeight = 52;

    const right = Math.max(12, window.innerWidth - rect.right);

    if (spaceBelow < menuHeight && rect.top > menuHeight) {
      setCoords({
        bottom: window.innerHeight - rect.top + 4,
        right,
      });
    } else {
      setCoords({
        top: rect.bottom + 4,
        right,
      });
    }
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isOpen) {
      calculatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDownOutside = (e: PointerEvent | MouseEvent) => {
      const path = e.composedPath ? e.composedPath() : [];
      const clickedInsideTrigger =
        (triggerRef.current && triggerRef.current.contains(e.target as Node)) ||
        (triggerRef.current && path.includes(triggerRef.current as Node));
      const clickedInsideMenu =
        (menuRef.current && menuRef.current.contains(e.target as Node)) ||
        (menuRef.current && path.includes(menuRef.current as Node));

      if (clickedInsideTrigger || clickedInsideMenu) {
        return;
      }

      setIsOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    const handleScrollOrResize = () => {
      setIsOpen(false);
    };

    window.addEventListener("pointerdown", handlePointerDownOutside, true);
    window.addEventListener("mousedown", handlePointerDownOutside, true);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDownOutside, true);
      window.removeEventListener("mousedown", handlePointerDownOutside, true);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen]);

  const handleDeleteClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    console.log("[DELETE-WEEKLY-FILE]", {
      stage: "MENU_CLICK",
      weeklyFileId: rowId,
    });

    if (deletingRef.current) return;
    deletingRef.current = true;
    setIsOpen(false);

    try {
      onDelete();
    } finally {
      deletingRef.current = false;
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        aria-label="Mở menu thao tác hồ sơ"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              right: `${coords.right}px`,
              zIndex: 99999,
              pointerEvents: "auto",
            }}
            className="w-40 rounded-xl border border-slate-200/90 bg-white p-1 shadow-xl text-xs font-sans animate-in fade-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onPointerDown={(e) => {
                e.stopPropagation();
                console.log("[DELETE-WEEKLY-FILE]", {
                  stage: "MENU_POINTER_DOWN",
                  weeklyFileId: rowId,
                });
              }}
              onClick={handleDeleteClick}
              className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg text-rose-600 hover:bg-rose-50 font-bold transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4 text-rose-600 shrink-0" />
              <span>Xóa hồ sơ</span>
            </button>
          </div>,
          document.body
        )}
    </>
  );
}
