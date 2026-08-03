"use client";

import React, { useState, useRef, useEffect, useId, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTransientOverlay, notifyOverlayOpen } from "./global-overlay-manager";

export interface ActionMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  id?: string;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "default" | "destructive" | "danger";
  disabled?: boolean;
  destructive?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children?: React.ReactNode;
}

export type ActionMenuItem = ActionMenuItemProps;

export function ActionMenuItem({
  id,
  label,
  icon,
  variant = "default",
  destructive,
  disabled,
  onClick,
  children,
  className = "",
  ...props
}: ActionMenuItemProps) {
  const isDestructive = destructive || variant === "destructive" || variant === "danger";
  const displayContent = children ?? label;

  return (
    <button
      id={id}
      role="menuitem"
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full flex items-center space-x-2.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors text-left ${
        disabled
          ? "opacity-40 cursor-not-allowed text-slate-400"
          : isDestructive
          ? "text-red-600 hover:bg-red-50 active:bg-red-100"
          : "text-slate-700 hover:bg-slate-100 active:bg-slate-150"
      } ${className}`}
      {...props}
    >
      {icon && (
        <span className={`h-4 w-4 shrink-0 ${isDestructive ? "text-red-500" : "text-slate-500"}`}>
          {icon}
        </span>
      )}
      <span className="truncate">{displayContent}</span>
    </button>
  );
}

export interface UnifiedActionMenuProps {
  trigger: React.ReactNode | ((props: { isOpen: boolean; toggle: () => void }) => React.ReactNode);
  items?: ActionMenuItemProps[];
  children?: React.ReactNode;
  align?: "left" | "right" | "end";
  className?: string;
  menuWidth?: string;
  ariaLabel?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

export function UnifiedActionMenu({
  trigger,
  items,
  children,
  align = "right",
  className = "",
  menuWidth = "w-48",
  ariaLabel,
  onOpenChange,
}: UnifiedActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  // Recalculate position for Portal
  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

    let numericWidth = 224;
    if (menuRef.current) {
      numericWidth = menuRef.current.offsetWidth || menuRef.current.getBoundingClientRect().width || 224;
    } else {
      const val = parseInt(menuWidth.replace(/\D/g, ""), 10);
      if (val) {
        numericWidth = val <= 100 ? val * 4 : val;
      }
    }

    const viewportWidth = window.innerWidth;

    let left =
      align === "right" || align === "end"
        ? rect.right + scrollLeft - numericWidth
        : rect.left + scrollLeft;

    // Viewport overflow prevention (Clamp inside screen with 12px margin)
    if (left + numericWidth > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - numericWidth - 12);
    }
    if (left < 12) left = 12;

    let top = rect.bottom + scrollTop + 4;
    // Check if bottom of viewport is reached
    if (rect.bottom + 250 > window.innerHeight && rect.top > 250) {
      top = rect.top + scrollTop - 215; // flip upward cleanly
    }

    setCoords({ top, left });
  }, [align, menuWidth]);

  // Recalculate position on mount after portal renders
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => updatePosition(), 0);
      return () => clearTimeout(timer);
    }
  }, [isOpen, updatePosition]);

  // Enforce single active overlay system-wide
  useTransientOverlay({
    id: menuId,
    isOpen,
    onClose: () => {
      setIsOpen(false);
      onOpenChange?.(false);
    },
    refs: [triggerRef, menuRef],
  });

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => {
      const next = !prev;
      if (next) {
        updatePosition();
        notifyOverlayOpen(menuId);
      }
      onOpenChange?.(next);
      return next;
    });
  }, [menuId, updatePosition, onOpenChange]);

  const handleMenuContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest('[role="menuitem"]')) {
      setIsOpen(false);
      onOpenChange?.(false);
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-block ${className}`}
        aria-label={ariaLabel}
        onClick={typeof trigger !== "function" ? handleToggle : undefined}
      >
        {typeof trigger === "function"
          ? trigger({ isOpen, toggle: handleToggle })
          : trigger}
      </div>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id={menuId}
            ref={menuRef}
            role="menu"
            aria-orientation="vertical"
            onClick={handleMenuContentClick}
            style={{
              position: "absolute",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            className={`z-[50] ${menuWidth} rounded-xl bg-white p-1.5 shadow-xl border border-slate-200 backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-100 focus:outline-none`}
          >
            {children ? (
              children
            ) : (
              items?.map((item, idx) => (
                <ActionMenuItem key={item.id || idx} {...item} />
              ))
            )}
          </div>,
          document.body
        )}
    </>
  );
}
