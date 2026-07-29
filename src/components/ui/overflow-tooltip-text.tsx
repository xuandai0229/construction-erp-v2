"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface OverflowTooltipTextProps {
  text: string;
  maxLines?: number;
  className?: string;
  tooltipMaxWidth?: string;
  children?: React.ReactNode;
}

type TooltipPosition = { top: number; left: number; placement: "top" | "bottom" };

/**
 * Truncates text only in its own layout box and exposes the full value on hover,
 * keyboard focus, and tap/click. It deliberately has no fixed inline width so a
 * parent flex/grid container remains responsible for allocating space.
 */
export function OverflowTooltipText({
  text,
  maxLines = 1,
  className,
  tooltipMaxWidth = "max-w-[min(32rem,calc(100vw-2rem))]",
  children,
}: OverflowTooltipTextProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();
  const [isOverflowed, setIsOverflowed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<TooltipPosition>({ top: 0, left: 0, placement: "top" });

  const checkOverflow = useCallback(() => {
    const element = textRef.current;
    if (!element) return false;

    const nextIsOverflowed = maxLines === 1
      ? element.scrollWidth > element.clientWidth + 1
      : element.scrollHeight > element.clientHeight + 1;

    setIsOverflowed(nextIsOverflowed);
    return nextIsOverflowed;
  }, [maxLines]);

  useEffect(() => {
    const element = textRef.current;
    if (!element) return;

    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(element);
    return () => observer.disconnect();
  }, [checkOverflow, text]);

  const updatePosition = useCallback(() => {
    const element = textRef.current;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const viewportPadding = 16;
    const maxTooltipHalfWidth = Math.min(256, (window.innerWidth - viewportPadding * 2) / 2);
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, viewportPadding + maxTooltipHalfWidth),
      window.innerWidth - viewportPadding - maxTooltipHalfWidth,
    );
    const showBelow = rect.top < 72;

    setPosition({
      top: showBelow ? rect.bottom + 8 : rect.top - 8,
      left,
      placement: showBelow ? "bottom" : "top",
    });
  }, []);

  const openTooltip = useCallback(() => {
    if (!checkOverflow()) return;
    updatePosition();
    setIsOpen(true);
  }, [checkOverflow, updatePosition]);

  const closeTooltip = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeTooltip();
    };
    const onPointerDown = (event: PointerEvent) => {
      if (textRef.current && !textRef.current.contains(event.target as Node)) closeTooltip();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [closeTooltip, isOpen]);

  const lineClampStyle: React.CSSProperties = maxLines === 1
    ? { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }
    : {
        display: "-webkit-box",
        WebkitLineClamp: maxLines,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      };

  return (
    <>
      <div
        ref={textRef}
        className={cn("block min-w-0 max-w-full cursor-default", className)}
        style={lineClampStyle}
        onMouseEnter={openTooltip}
        onMouseLeave={closeTooltip}
        onFocus={openTooltip}
        onBlur={closeTooltip}
        onClick={(event) => {
          if (!checkOverflow()) return;
          event.preventDefault();
          event.stopPropagation();
          if (isOpen) closeTooltip();
          else openTooltip();
        }}
        tabIndex={isOverflowed ? 0 : undefined}
        aria-label={text}
        aria-describedby={isOpen ? tooltipId : undefined}
      >
        {children ?? text}
      </div>

      {isOpen && typeof window !== "undefined" && createPortal(
        <div
          id={tooltipId}
          role="tooltip"
          className={cn(
            "pointer-events-none fixed z-[9999] rounded-lg border border-slate-700/50 bg-slate-900/95 px-3 py-2 text-xs font-medium text-white shadow-xl backdrop-blur-sm",
            tooltipMaxWidth,
          )}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: position.placement === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
            overflowWrap: "anywhere",
          }}
        >
          {text}
        </div>,
        document.body,
      )}
    </>
  );
}
