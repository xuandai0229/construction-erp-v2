"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EnterpriseComboboxOption {
  value: string;
  label: string;
  code?: string | null;
  name?: string | null;
  description?: string | null;
  disabled?: boolean;
}

interface EnterpriseComboboxProps {
  id?: string;
  value?: string;
  selectedLabel?: string;
  options: EnterpriseComboboxOption[];
  onChange: (value: string, option?: EnterpriseComboboxOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  clearable?: boolean;
  ariaLabel?: string;
  allowCustom?: boolean;
  customOptionLabel?: (query: string) => string;
  onCreateOption?: (query: string) => void;
  density?: "default" | "compact";
  maxPanelHeight?: number;
  commitOnBlur?: boolean;
}

function optionSearchText(option: EnterpriseComboboxOption) {
  return [option.code, option.name, option.label, option.description].filter(Boolean).join(" ").toLowerCase();
}

export function EnterpriseCombobox({
  id,
  value = "",
  selectedLabel,
  options,
  onChange,
  placeholder = "Chọn...",
  searchPlaceholder = "Tìm kiếm...",
  emptyMessage = "Không tìm thấy dữ liệu phù hợp.",
  disabled,
  className,
  buttonClassName,
  clearable = true,
  ariaLabel,
  allowCustom = false,
  customOptionLabel,
  onCreateOption,
  density = "default",
  maxPanelHeight,
  commitOnBlur = false,
}: EnterpriseComboboxProps) {
  const generatedId = useId();
  const buttonId = id || generatedId;
  const listboxId = `${buttonId}-listbox`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | null>(null);
  const [panelMaxHeight, setPanelMaxHeight] = useState(320);
  const [isMobile, setIsMobile] = useState(false);

  const selectedOption = options.find((option) => option.value === value) || (allowCustom && value ? { value, label: value } as EnterpriseComboboxOption : undefined);
  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => optionSearchText(option).includes(normalized));
  }, [options, query]);
  const trimmedQuery = query.trim();
  const hasExactMatch = filteredOptions.some((option) => option.label.toLowerCase() === trimmedQuery.toLowerCase() || option.name?.toLowerCase() === trimmedQuery.toLowerCase());
  const showCreateOption = allowCustom && trimmedQuery.length > 0 && !hasExactMatch;

  const updatePanelPosition = () => {
    if (!rootRef.current) return;
    const triggerRect = rootRef.current.getBoundingClientRect();
    const safePadding = 12;
    const mobile = window.innerWidth < 640;
    setIsMobile(mobile);

    const viewportHeight = window.innerHeight;

    let boundaryBottom = viewportHeight;
    const boundaryElements = document.querySelectorAll('[data-boundary="dropdown-boundary"], [data-combobox-boundary-footer]');
    for (let i = 0; i < boundaryElements.length; i++) {
      const bRect = boundaryElements[i].getBoundingClientRect();
      if (bRect.top > triggerRect.bottom && bRect.top < boundaryBottom) {
        boundaryBottom = bRect.top;
      }
    }

    if (mobile) {
      const mobileMaxHeight = maxPanelHeight ? Math.min(maxPanelHeight, viewportHeight * 0.72) : Math.max(260, Math.floor(viewportHeight * 0.72));
      setPanelMaxHeight(mobileMaxHeight);
      setPanelStyle(null);
      return;
    }

    const safeBottom = boundaryBottom - safePadding;
    const spaceBelow = safeBottom - triggerRect.bottom - 8;
    const spaceAbove = triggerRect.top - 12;
    
    const desiredMaxHeight = maxPanelHeight || (density === "compact" ? 220 : 320);

    let openUp = false;
    if (spaceBelow < 180 && spaceAbove > spaceBelow) {
      openUp = true;
    }

    const availableSpace = openUp ? spaceAbove : spaceBelow;
    const calculatedMaxHeight = Math.min(desiredMaxHeight, availableSpace);

    setPanelMaxHeight(calculatedMaxHeight);
    setPanelStyle({
      position: "fixed",
      left: triggerRect.left,
      top: openUp ? undefined : triggerRect.bottom + 6,
      bottom: openUp ? viewportHeight - triggerRect.top + 6 : undefined,
      width: triggerRect.width,
      zIndex: 105,
    });
  };

  const queryRef = useRef(query);
  const onChangeRef = useRef(onChange);
  const onCreateOptionRef = useRef(onCreateOption);
  const optionsRef = useRef(options);

  useEffect(() => {
    queryRef.current = query;
    onChangeRef.current = onChange;
    onCreateOptionRef.current = onCreateOption;
    optionsRef.current = options;
  });

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        if (commitOnBlur && allowCustom && queryRef.current.trim() !== "") {
          const trimmed = queryRef.current.trim();
          const match = optionsRef.current.find(o => o.label.toLowerCase() === trimmed.toLowerCase());
          if (match) {
            onChangeRef.current(match.value, match);
          } else {
            onChangeRef.current(trimmed);
            onCreateOptionRef.current?.(trimmed);
          }
          setQuery("");
        }
        setIsOpen(false);
      }
    };
    updatePanelPosition();
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [isOpen, commitOnBlur, allowCustom]);

  useEffect(() => {
    if (!isOpen) return;
    setActiveIndex(0);
    const timer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const selectOption = (option: EnterpriseComboboxOption) => {
    if (option.disabled) return;
    onChange(option.value, option);
    setQuery("");
    setIsOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!isOpen && ["ArrowDown", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      setIsOpen(true);
      return;
    }

    if (!isOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      setIsOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(0, filteredOptions.length - 1)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) selectOption(option);
      else if (showCreateOption) {
        onChange(trimmedQuery);
        onCreateOption?.(trimmedQuery);
        setQuery("");
        setIsOpen(false);
      }
    }
  };

  const panel = isOpen ? (
    <div
      ref={panelRef}
      style={isMobile ? undefined : panelStyle || undefined}
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/15",
        isMobile ? "fixed inset-x-3 bottom-3 z-[105] max-h-[calc(100dvh-24px)]" : "z-[105]",
      )}
    >
      <div className={cn("border-b border-slate-100", density === "compact" ? "p-1.5" : "p-2")}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            className={cn(
              "w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20",
              density === "compact" ? "h-8" : "h-9"
            )}
          />
        </div>
      </div>
      <div
        id={listboxId}
        role="listbox"
        aria-labelledby={buttonId}
        className="custom-scrollbar overflow-y-auto p-1"
        style={{ maxHeight: isMobile ? panelMaxHeight : panelMaxHeight }}
      >
        {filteredOptions.length === 0 && !showCreateOption ? (
          <div className="px-3 py-6 text-center text-sm text-slate-500">{emptyMessage}</div>
        ) : (
          <>
            {filteredOptions.map((option, index) => {
              const selected = option.value === value;
              const active = index === activeIndex;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  disabled={option.disabled}
                  title={option.label}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectOption(option)}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-2 rounded-lg text-left outline-none transition",
                    density === "compact" ? "px-2 py-1.5" : "px-3 py-2 text-sm",
                    active ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-50",
                    option.disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate font-medium", density === "compact" ? "text-[13px]" : "text-sm")}>{option.label}</span>
                    {option.description ? <span className={cn("mt-0.5 block truncate text-slate-500", density === "compact" ? "text-[11px]" : "text-xs")}>{option.description}</span> : null}
                  </span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-blue-600" /> : null}
                </button>
              );
            })}
            {showCreateOption ? (
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  onChange(trimmedQuery);
                  onCreateOption?.(trimmedQuery);
                  setQuery("");
                  setIsOpen(false);
                }}
                className="mt-1 flex w-full min-w-0 items-center gap-2 rounded-lg border border-dashed border-blue-200 bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-700 hover:bg-blue-100"
                title={trimmedQuery}
              >
                <span className="min-w-0 flex-1 truncate">{customOptionLabel ? customOptionLabel(trimmedQuery) : `Dùng giá trị mới: \"${trimmedQuery}\"`}</span>
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)} onKeyDown={handleKeyDown}>
      <button
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setIsOpen((open) => !open)}
        className={cn(
          "flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 text-left text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500",
          buttonClassName,
        )}
      >
        <span className={cn("min-w-0 flex-1 truncate", !selectedOption && !selectedLabel && "text-slate-400")} title={selectedOption?.label || selectedLabel}>
          {selectedOption?.label || selectedLabel || placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {clearable && value && !disabled ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label="Xóa lựa chọn"
              onClick={(event) => {
                event.stopPropagation();
                onChange("");
                setQuery("");
              }}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          ) : null}
          <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", isOpen && "rotate-180")} />
        </span>
      </button>

      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
