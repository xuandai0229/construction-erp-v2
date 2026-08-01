"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface AppDrawerProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
  panelClassName?: string;
  closeOnOverlayClick?: boolean;
  isDirty?: boolean;
  onDirtyCloseAttempt?: () => void;
}

/**
 * AppDrawer — Premium slide-in panel from the right.
 * Standard Z-index: z-[200]
 */
export function AppDrawer({
  isOpen,
  onClose,
  children,
  ariaLabel,
  className,
  panelClassName,
  closeOnOverlayClick = true,
  isDirty = false,
  onDirtyCloseAttempt,
}: AppDrawerProps) {
  // Handle Escape key
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isDirty && onDirtyCloseAttempt) {
          onDirtyCloseAttempt();
        } else if (onClose) {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isDirty, onClose, onDirtyCloseAttempt]);

  const handleOverlayClick = () => {
    if (!closeOnOverlayClick) return;
    if (isDirty && onDirtyCloseAttempt) {
      onDirtyCloseAttempt();
    } else if (onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const content = (
    <div
      className={cn(
        "fixed inset-0 z-[200] flex justify-end transition-opacity duration-200 p-0 bg-slate-900/40 backdrop-blur-[2px] animate-in fade-in duration-200",
        className
      )}
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          "flex w-full min-w-0 max-w-full flex-col overflow-hidden bg-white transition-transform duration-300 ease-out h-[100dvh] rounded-none sm:max-w-3xl lg:max-w-5xl shadow-2xl shadow-slate-950/20 ring-1 ring-slate-900/[0.08] animate-in slide-in-from-right duration-300",
          panelClassName
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
