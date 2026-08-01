"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname } from 'next/navigation';

export interface OverlayConfig {
  id: string;
  type: 'transient' | 'drawer' | 'modal' | 'confirm';
  triggerRef?: React.RefObject<HTMLElement | null>;
  onClose?: () => void;
  isDirty?: boolean;
}

interface GlobalOverlayContextType {
  activeOverlayId: string | null;
  registerOverlay: (config: OverlayConfig) => void;
  unregisterOverlay: (id: string) => void;
  openOverlay: (id: string) => void;
  closeOverlay: (id: string) => void;
  closeAllTransient: () => void;
}

const GlobalOverlayContext = createContext<GlobalOverlayContextType | null>(null);

export function GlobalOverlayProvider({ children }: { children: React.ReactNode }) {
  const [activeStack, setActiveStack] = useState<OverlayConfig[]>([]);
  const pathname = usePathname();

  // Close transient overlays on route change
  useEffect(() => {
    setActiveStack((prev) => prev.filter((item) => item.type !== 'transient'));
  }, [pathname]);

  // Global Escape key listener (Closes topmost overlay layer)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveStack((prev) => {
          if (prev.length === 0) return prev;
          const topItem = prev[prev.length - 1];

          // Call onClose callback
          if (topItem.onClose) {
            topItem.onClose();
          }

          // Return focus to trigger if available
          if (topItem.triggerRef && topItem.triggerRef.current) {
            topItem.triggerRef.current.focus();
          }

          return prev.slice(0, -1);
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  const registerOverlay = useCallback((config: OverlayConfig) => {
    setActiveStack((prev) => {
      const exists = prev.some((item) => item.id === config.id);
      if (exists) {
        return prev.map((item) => (item.id === config.id ? config : item));
      }
      return [...prev, config];
    });
  }, []);

  const unregisterOverlay = useCallback((id: string) => {
    setActiveStack((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const openOverlay = useCallback((id: string) => {
    // If opening a transient overlay, close existing transient overlays first to avoid stacking multiple non-nested menus
    setActiveStack((prev) => {
      const target = prev.find((item) => item.id === id);
      if (!target) return prev;
      if (target.type === 'transient') {
        const nonTransient = prev.filter((item) => item.type !== 'transient' && item.id !== id);
        return [...nonTransient, target];
      }
      return [...prev.filter((item) => item.id !== id), target];
    });
  }, []);

  const closeOverlay = useCallback((id: string) => {
    setActiveStack((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target && target.triggerRef && target.triggerRef.current) {
        target.triggerRef.current.focus();
      }
      return prev.filter((item) => item.id !== id);
    });
  }, []);

  const closeAllTransient = useCallback(() => {
    setActiveStack((prev) => prev.filter((item) => item.type !== 'transient'));
  }, []);

  const activeOverlayId = activeStack.length > 0 ? activeStack[activeStack.length - 1].id : null;

  return (
    <GlobalOverlayContext.Provider
      value={{
        activeOverlayId,
        registerOverlay,
        unregisterOverlay,
        openOverlay,
        closeOverlay,
        closeAllTransient,
      }}
    >
      {children}
    </GlobalOverlayContext.Provider>
  );
}

export function useGlobalOverlay() {
  const ctx = useContext(GlobalOverlayContext);
  if (!ctx) {
    throw new Error('useGlobalOverlay must be used within GlobalOverlayProvider');
  }
  return ctx;
}

/**
 * Universal Click Outside hook supporting non-swallowing single-click interaction switches.
 * Does NOT call stopPropagation so clicking external triggers opens them in 1 click!
 */
export function useClickOutside({
  isOpen,
  onClose,
  refs,
}: {
  isOpen: boolean;
  onClose: () => void;
  refs: (React.RefObject<HTMLElement | null> | HTMLElement | null)[];
}) {
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent | MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      const isInside = refs.some((ref) => {
        const el = ref && 'current' in ref ? ref.current : ref;
        return el && el.contains(target);
      });

      if (!isInside) {
        onClose();
        // CRITICAL: Do NOT stop propagation or prevent default!
        // This allows the pointer event to naturally hit whatever new button/trigger was clicked,
        // closing this overlay AND opening/triggering the new component in a SINGLE click!
      }
    };

    // Use capture phase for pointerdown to react early before DOM mutations
    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [isOpen, onClose, refs]);
}
