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

/**
 * Dispatch global signal when any non-modal overlay opens
 */
export function notifyOverlayOpen(id: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app-overlay-open', { detail: { id } }));
  }
}

/**
 * Dispatch global signal to close all non-modal overlays
 */
export function closeAllOverlays() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('app-overlay-close-all'));
  }
}

export function GlobalOverlayProvider({ children }: { children: React.ReactNode }) {
  const [activeStack, setActiveStack] = useState<OverlayConfig[]>([]);
  const pathname = usePathname();

  // Close transient overlays on route change
  useEffect(() => {
    setActiveStack((prev) => prev.filter((item) => item.type !== 'transient'));
    closeAllOverlays();
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
    closeAllOverlays();
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
      }
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [isOpen, onClose, refs]);
}

/**
 * Universal Transient Overlay Hook enforcing Single Active Non-Modal Overlay System-Wide.
 */
export function useTransientOverlay({
  id,
  isOpen,
  onClose,
  refs = [],
}: {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  refs?: (React.RefObject<HTMLElement | null> | HTMLElement | null)[];
}) {
  const pathname = usePathname();

  // 1. Mutual exclusion: Close when another transient overlay opens
  useEffect(() => {
    if (!isOpen) return;

    const handleOverlayOpen = (event: Event) => {
      const customEvent = event as CustomEvent<{ id?: string }>;
      if (customEvent.detail && customEvent.detail.id !== id) {
        onClose();
      }
    };

    const handleCloseAll = () => {
      onClose();
    };

    window.addEventListener('app-overlay-open', handleOverlayOpen);
    window.addEventListener('app-overlay-close-all', handleCloseAll);
    window.addEventListener('close-overlays', handleCloseAll);

    return () => {
      window.removeEventListener('app-overlay-open', handleOverlayOpen);
      window.removeEventListener('app-overlay-close-all', handleCloseAll);
      window.removeEventListener('close-overlays', handleCloseAll);
    };
  }, [id, isOpen, onClose]);

  // 2. Close on route change
  useEffect(() => {
    if (isOpen) {
      onClose();
    }
  }, [pathname]);

  // 3. Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  // 4. Non-swallowing pointerdown outside click dismissal
  useClickOutside({ isOpen, onClose, refs });
}
