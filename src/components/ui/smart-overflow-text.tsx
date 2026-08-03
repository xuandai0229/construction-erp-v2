"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type HTMLAttributes, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";

type SmartOverflowTextProps = HTMLAttributes<HTMLSpanElement> & {
  value: string | null | undefined;
  lines?: number;
  wrap?: boolean;
  copyable?: boolean;
};

export function SmartOverflowText({ value, lines = 2, wrap = true, copyable = true, className, style, ...props }: SmartOverflowTextProps) {
  const text = value ?? "";
  const ref = useRef<HTMLSpanElement>(null);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();
  const [overflowing, setOverflowing] = useState(false);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const check = () => {
      const next = node.scrollHeight > node.clientHeight + 1 || node.scrollWidth > node.clientWidth + 1;
      setOverflowing(next);
      if (!next) setOpen(false);
    };
    check();
    const observer = new ResizeObserver(check);
    observer.observe(node);
    return () => observer.disconnect();
  }, [text, lines]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        ref.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = () => {
    if (!overflowing) return;
    setCopied(false);
    setOpen((current) => !current);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    if ((event.key === "Enter" || event.key === " ") && overflowing) {
      event.preventDefault();
      event.stopPropagation();
      toggle();
    }
    props.onKeyDown?.(event);
  };

  const clampStyle: CSSProperties = wrap && lines > 0
    ? { display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: lines, overflow: "hidden", ...style }
    : wrap
      ? { whiteSpace: "normal", overflowWrap: "anywhere", ...style }
      : { overflow: "hidden", textOverflow: "ellipsis", ...style };

  if (!text) return <span ref={ref} className={className} data-business-text="true" {...props} />;
  return (
    <span ref={wrapperRef} className="relative block min-w-0 max-w-full" data-business-text="true">
      <span
        ref={ref}
        tabIndex={overflowing ? 0 : undefined}
        role={overflowing ? "button" : undefined}
        aria-label={text}
        aria-describedby={overflowing && open ? tooltipId : undefined}
        onFocus={() => overflowing && setOpen(true)}
        onClick={(event) => { if (overflowing) event.stopPropagation(); toggle(); }}
        onKeyDown={onKeyDown}
        data-overflow-mode={overflowing ? "compact-expandable" : "full"}
        data-full-text-trigger={overflowing ? "true" : undefined}
        className={cn("block max-w-full", wrap ? "break-words" : "whitespace-nowrap", overflowing && "cursor-help", className)}
        style={clampStyle}
        {...props}
      >
        {text}
      </span>
      {overflowing && open && (
        <span id={tooltipId} role="dialog" aria-label="Nội dung đầy đủ" className="absolute left-0 top-full z-[70] mt-2 block w-max max-w-[min(34rem,calc(100vw-2rem))] whitespace-normal break-words rounded-xl border border-slate-200 bg-white p-3 text-left text-sm font-normal leading-5 text-slate-900 shadow-xl">
          <span className="block max-h-56 overflow-auto">{text}</span>
          {copyable && (
            <button type="button" className="mt-2 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onClick={() => { void navigator.clipboard?.writeText(text); setCopied(true); }}>
              {copied ? "Đã sao chép" : "Sao chép"}
            </button>
          )}
        </span>
      )}
    </span>
  );
}
