import * as React from "react";
import { cn } from "@/lib/utils";

export interface AppDrawerProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
  panelClassName?: string;
  closeOnOverlayClick?: boolean;
}

/**
 * AppDrawer — Premium slide-in panel from the right.
 *
 * Layout rules:
 *  - Mobile (<sm): full-screen, no border-radius.
 *  - SM+: Flush to the right, full height, no border-radius.
 *  - Overlay: very subtle dim so the rest of the UI stays recognizable.
 *  - Z-index: overlay at z-[70], above header (z-60) but below toasts/dialogs (z-[100]).
 */
export function AppDrawer({
  isOpen,
  onClose,
  children,
  ariaLabel,
  className,
  panelClassName,
  closeOnOverlayClick = true,
}: AppDrawerProps) {
  return (
    <div
      className={cn(
        // Overlay
        "fixed inset-0 z-[70] flex justify-end transition-opacity duration-200",
        // Flush to right, no padding
        "p-0",
        // Overlay background — very subtle, premium
        "bg-slate-900/10 backdrop-blur-[1px]",
        isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        className,
      )}
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={cn(
          // Panel base
          "flex w-full max-w-[100vw] flex-col overflow-hidden bg-white transition-transform duration-300 ease-out",
          // Full screen height, no radius, flush to right edge
          "h-[100dvh] rounded-none",
          "sm:max-w-3xl",
          // LG+: wider panels for data-heavy views
          "lg:max-w-5xl",
          // Premium shadow & ring
          "shadow-2xl shadow-slate-950/20 ring-1 ring-slate-900/[0.08]",
          // Slide animation
          isOpen ? "translate-x-0" : "translate-x-full",
          panelClassName,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
