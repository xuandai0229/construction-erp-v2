"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
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
}

function optionSearchText(option: EnterpriseComboboxOption) {
  return [option.code, option.name, option.label, option.description].filter(Boolean).join(" ").toLowerCase();
}

export function EnterpriseCombobox({
  id,
  value = "",
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
}: EnterpriseComboboxProps) {
  const generatedId = useId();
  const buttonId = id || generatedId;
  const listboxId = `${buttonId}-listbox`;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedOption = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => optionSearchText(option).includes(normalized));
  }, [options, query]);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

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
    }
  };

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
        <span className={cn("min-w-0 flex-1 truncate", !selectedOption && "text-slate-400")} title={selectedOption?.label}>
          {selectedOption?.label || placeholder}
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

      {isOpen ? (
        <div className="absolute left-0 right-0 top-full z-[120] mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/15">
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
          <div
            id={listboxId}
            role="listbox"
            aria-labelledby={buttonId}
            className="custom-scrollbar max-h-[min(320px,calc(100vh-180px))] overflow-y-auto p-1"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-500">{emptyMessage}</div>
            ) : (
              filteredOptions.map((option, index) => {
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
                      "flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm outline-none transition",
                      active ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-50",
                      option.disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{option.label}</span>
                      {option.description ? <span className="mt-0.5 block truncate text-xs text-slate-500">{option.description}</span> : null}
                    </span>
                    {selected ? <Check className="h-4 w-4 shrink-0 text-blue-600" /> : null}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
