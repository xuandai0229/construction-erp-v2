"use client";

import { useEffect, useLayoutEffect, useRef, useCallback } from "react";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function AutoTextarea({
  value,
  onChange,
  placeholder,
  disabled,
  className = "",
  minHeight = 38,
}: {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const measuredHeight = el.scrollHeight;
    const computedHeight = Math.max(measuredHeight, minHeight);
    el.style.height = `${computedHeight}px`;
    el.style.overflowY = "hidden";
  }, [minHeight]);

  useIsomorphicLayoutEffect(() => {
    resize();
  }, [value, resize]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      resize();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [resize]);

  return (
    <textarea
      ref={ref}
      rows={1}
      disabled={disabled}
      value={value ?? ""}
      onInput={resize}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`font-normal w-full min-w-0 max-w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs leading-relaxed outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-100 ${className}`}
      style={{ minHeight: `${minHeight}px`, overflowY: "hidden" }}
    />
  );
}
