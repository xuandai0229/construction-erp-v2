"use client";

import React, { useState, useRef, useEffect, useId, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useTransientOverlay, notifyOverlayOpen } from "./global-overlay-manager";

export interface ActionMenuItemProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  id?: string;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  variant?: "default" | "destructive" | "danger";
  disabled?: boolean;
  destructive?: boolean;
  href?: string;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
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
  href,
  onClick,
  children,
  className = "",
  ...props
}: ActionMenuItemProps) {
  const isDestructive = destructive || variant === "destructive" || variant === "danger";
  const displayContent = children ?? label;

  const itemClassName = `w-full flex items-center space-x-2.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors text-left ${
    disabled
      ? "opacity-40 cursor-not-allowed text-slate-400"
      : isDestructive
      ? "text-red-600 hover:bg-red-50 active:bg-red-100"
      : "text-slate-700 hover:bg-slate-100 active:bg-slate-150"
  } ${className}`;

  const content = (
    <>
      {icon && (
        <span className={`h-4 w-4 shrink-0 ${isDestructive ? "text-red-500" : "text-slate-500"}`}>
          {icon}
        </span>
      )}
      <span className="truncate">{displayContent}</span>
    </>
  );

  if (href && !disabled) {
    return (
      <Link
        id={id}
        role="menuitem"
        href={href}
        onClick={onClick}
        className={itemClassName}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      id={id}
      role="menuitem"
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={itemClassName}
      {...props}
    >
      {content}
    </button>
  );
}

export interface UnifiedActionMenuProps {
  open?: boolean;
  defaultOpen?: boolean;
  trigger: React.ReactNode | ((props: { isOpen: boolean; toggle: () => void }) => React.ReactNode);
  items?: ActionMenuItemProps[];
  children?: React.ReactNode;
  align?: "left" | "right" | "end";
  className?: string;
  menuWidth?: string;
  ariaLabel?: string;
  showPointer?: boolean;
  pointerBg?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

export function UnifiedActionMenu({
  open: controlledOpen,
  defaultOpen = false,
  trigger,
  items,
  children,
  align = "right",
  className = "",
  menuWidth = "w-48",
  ariaLabel,
  showPointer = true,
  pointerBg,
  onOpenChange,
}: UnifiedActionMenuProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? Boolean(controlledOpen) : uncontrolledOpen;

  const [coords, setCoords] = useState<{ top: number; left: number; pointerLeft: number }>({
    top: 0,
    left: 0,
    pointerLeft: 16,
  });
  const [isFlipped, setIsFlipped] = useState(false);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();

  // Helper to change open state and safely trigger callback without setState-in-render
  const setOpenState = useCallback(
    (nextState: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextState);
      }
      onOpenChange?.(nextState);
    },
    [isControlled, onOpenChange]
  );

  // Recalculate position for Portal using pure viewport fixed coordinates
  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;

    const triggerRect = el.getBoundingClientRect();
    const triggerCenterX = triggerRect.left + triggerRect.width / 2;

    let numericWidth = 200;
    let numericHeight = 200;

    if (menuRef.current) {
      const mRect = menuRef.current.getBoundingClientRect();
      numericWidth = mRect.width || numericWidth;
      numericHeight = mRect.height || numericHeight;
    } else {
      const val = parseInt(menuWidth.replace(/\D/g, ""), 10);
      if (val) {
        numericWidth = val <= 100 ? val * 4 : val;
      }
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate initial left based on alignment
    let left =
      align === "right" || align === "end"
        ? triggerRect.right - numericWidth
        : align === "left"
        ? triggerRect.left
        : triggerCenterX - numericWidth / 2;

    // Clamp menu left inside viewport (with 12px margin)
    if (left + numericWidth > viewportWidth - 12) {
      left = Math.max(12, viewportWidth - numericWidth - 12);
    }
    if (left < 12) {
      left = 12;
    }

    // Dynamic pointer X relative to menu left
    let pointerLeft = triggerCenterX - left;
    const minPointerOffset = 16;
    const maxPointerOffset = numericWidth - 16;
    pointerLeft = Math.max(minPointerOffset, Math.min(pointerLeft, maxPointerOffset));

    // Calculate top and flip state
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    let flipped = false;
    let top = 0;

    if (spaceBelow < numericHeight + 12 && spaceAbove > spaceBelow) {
      flipped = true;
      top = triggerRect.top - numericHeight - (showPointer ? 8 : 4);
    } else {
      flipped = false;
      top = triggerRect.bottom + (showPointer ? 8 : 4);
    }

    // Clamp top inside viewport
    top = Math.max(8, Math.min(top, viewportHeight - numericHeight - 8));

    setIsFlipped(flipped);
    setCoords({ top, left, pointerLeft });
  }, [align, menuWidth, showPointer]);

  // Recalculate position on mount after portal renders or when open state changes
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();
    const handleScrollOrResize = () => updatePosition();

    // Capture phase for scroll catches all scrollable containers in the DOM
    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    // Initial animation frame ticks to update position after DOM layout stabilization
    const rafId = requestAnimationFrame(() => {
      updatePosition();
    });

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
      cancelAnimationFrame(rafId);
    };
  }, [isOpen, updatePosition]);

  const handleTransientClose = useCallback(() => {
    setOpenState(false);
  }, [setOpenState]);

  // Enforce single active overlay system-wide
  useTransientOverlay({
    id: menuId,
    isOpen,
    onClose: handleTransientClose,
    refs: [triggerRef, menuRef],
  });

  const handleToggle = useCallback(() => {
    const nextState = !isOpen;
    if (nextState) {
      updatePosition();
      notifyOverlayOpen(menuId);
    }
    setOpenState(nextState);
  }, [isOpen, menuId, updatePosition, setOpenState]);

  const handleMenuContentClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest('[role="menuitem"]')) {
      setOpenState(false);
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
          // The render-prop receives an event callback; it does not read refs during render.
          // eslint-disable-next-line react-hooks/refs
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
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            className={`z-[9999] ${menuWidth} relative rounded-xl bg-white p-1.5 shadow-xl border border-slate-200 backdrop-blur-md animate-in fade-in-50 zoom-in-95 duration-100 focus:outline-none`}
          >
            {showPointer && (
              <span
                aria-hidden="true"
                data-action-menu-pointer="true"
                style={{ left: `${coords.pointerLeft}px` }}
                className={`absolute h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-slate-200 z-20 ${
                  isFlipped
                    ? "-bottom-[5.5px] border-r border-b bg-white"
                    : `-top-[5.5px] border-l border-t ${pointerBg || "bg-white"}`
                }`}
              />
            )}
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
