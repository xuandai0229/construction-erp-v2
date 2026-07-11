"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EditableComboboxOption {
  value: string;
  label: string;
}

interface EditableComboboxProps {
  id?: string;
  value: string;
  options: EditableComboboxOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
  customOptionLabel?: (query: string) => string;
  disabled?: boolean;
  className?: string;
}

export function EditableCombobox({
  id,
  value,
  options,
  onChange,
  placeholder = "Nhập hoặc chọn...",
  emptyMessage = "Không tìm thấy.",
  customOptionLabel,
  disabled,
  className,
}: EditableComboboxProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const listboxId = `${inputId}-listbox`;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | null>(null);
  const [panelMaxHeight, setPanelMaxHeight] = useState(260);
  const [isMobile, setIsMobile] = useState(false);

  // Sync external value → inputValue
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const trimmed = inputValue.trim();
  const normalizedInput = trimmed.toLowerCase();

  const filteredOptions = normalizedInput
    ? options.filter((o) => o.label.toLowerCase().includes(normalizedInput))
    : options;

  const hasExactMatch = filteredOptions.some(
    (o) => o.label.toLowerCase() === normalizedInput
  );
  const showCreateOption = trimmed.length > 0 && !hasExactMatch;

  // Build the items list for keyboard nav: filtered options + optional create
  const totalItems = filteredOptions.length + (showCreateOption ? 1 : 0);

  // ─── Core helpers (declared before effects that reference them) ──
  const commitValue = (v: string) => {
    setInputValue(v);
    onChange(v);
  };

  const selectOption = (opt: EditableComboboxOption) => {
    commitValue(opt.value);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const selectCustom = () => {
    commitValue(trimmed);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  // ─── Panel positioning ──────────────────────────────────────
  const updatePanelPosition = () => {
    if (!rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    const mobile = window.innerWidth < 640;
    setIsMobile(mobile);
    const vh = window.innerHeight;

    if (mobile) {
      setPanelMaxHeight(Math.max(220, Math.floor(vh * 0.55)));
      setPanelStyle(null);
      return;
    }

    // Find boundary footers
    let boundaryBottom = vh;
    const els = document.querySelectorAll('[data-boundary="dropdown-boundary"], [data-combobox-boundary-footer]');
    for (let i = 0; i < els.length; i++) {
      const b = els[i].getBoundingClientRect();
      if (b.top > rect.bottom && b.top < boundaryBottom) boundaryBottom = b.top;
    }

    const spaceBelow = boundaryBottom - rect.bottom - 16;
    const spaceAbove = rect.top - 16;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const available = openUp ? spaceAbove : spaceBelow;
    const maxH = Math.min(260, available);

    setPanelMaxHeight(maxH);
    setPanelStyle({
      position: "fixed",
      left: rect.left,
      top: openUp ? undefined : rect.bottom + 4,
      bottom: openUp ? vh - rect.top + 4 : undefined,
      width: rect.width,
      zIndex: 105,
    });
  };

  // ─── Outside click to close & commit ────────────────────────
  // Use refs to avoid stale closures
  const inputValueRef = useRef(inputValue);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    inputValueRef.current = inputValue;
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    if (!isOpen) return;
    updatePanelPosition();

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t) && !panelRef.current?.contains(t)) {
        // Commit whatever text is in the input on blur
        const v = inputValueRef.current.trim();
        onChangeRef.current(v);
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [isOpen]);

  // ─── Input handlers ─────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setInputValue(v);
    if (!isOpen) setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleInputFocus = () => {
    if (!isOpen) setIsOpen(true);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // If focus moves to the panel or clear/toggle buttons within the combobox, do not commit yet.
    if (rootRef.current?.contains(e.relatedTarget as Node) || panelRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }
    const v = inputValue.trim();
    commitValue(v);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) { setIsOpen(true); return; }
      setActiveIndex((i) => Math.min(i + 1, totalItems - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (e.key === "Enter" && isOpen) {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
        selectOption(filteredOptions[activeIndex]);
      } else if (activeIndex === filteredOptions.length && showCreateOption) {
        selectCustom();
      } else if (trimmed) {
        commitValue(trimmed);
        setIsOpen(false);
      }
      return;
    }
  };

  const toggleDropdown = () => {
    if (disabled) return;
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    commitValue("");
    setInputValue("");
    inputRef.current?.focus();
  };

  // ─── Dropdown panel ─────────────────────────────────────────
  const panel = isOpen ? (
    <div
      ref={panelRef}
      style={isMobile ? undefined : panelStyle || undefined}
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/15",
        isMobile ? "fixed inset-x-3 bottom-3 z-[105] max-h-[calc(100dvh-24px)]" : "z-[105]",
      )}
    >
      <div
        id={listboxId}
        role="listbox"
        className="custom-scrollbar overflow-y-auto p-1"
        style={{ maxHeight: panelMaxHeight }}
      >
        {filteredOptions.length === 0 && !showCreateOption ? (
          <div className="px-3 py-4 text-center text-sm text-slate-500">{emptyMessage}</div>
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
                  title={option.label}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(e) => { e.preventDefault(); selectOption(option); }}
                  className={cn(
                    "flex w-full min-w-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm outline-none transition",
                    active ? "bg-blue-50 text-blue-800" : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{option.label}</span>
                  {selected ? <Check className="h-4 w-4 shrink-0 text-blue-600" /> : null}
                </button>
              );
            })}
            {showCreateOption ? (
              <button
                type="button"
                role="option"
                aria-selected={false}
                onMouseEnter={() => setActiveIndex(filteredOptions.length)}
                onMouseDown={(e) => { e.preventDefault(); selectCustom(); }}
                className={cn(
                  "mt-0.5 flex w-full min-w-0 items-center gap-2 rounded-lg border border-dashed border-blue-200 px-3 py-2 text-left text-sm font-semibold transition",
                  activeIndex === filteredOptions.length
                    ? "bg-blue-100 text-blue-800"
                    : "bg-blue-50 text-blue-700 hover:bg-blue-100",
                )}
                title={trimmed}
              >
                <Plus className="h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">
                  {customOptionLabel ? customOptionLabel(trimmed) : `Dùng giá trị mới: "${trimmed}"`}
                </span>
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)} onKeyDown={handleKeyDown}>
      <div
        className={cn(
          "flex h-10 w-full items-center rounded-lg border bg-white text-sm transition",
          isOpen
            ? "border-blue-500 ring-2 ring-blue-100"
            : "border-slate-300 hover:border-slate-400",
          disabled && "cursor-not-allowed bg-slate-100",
        )}
      >
        {/* Editable input — the main interaction zone */}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-1p-ignore="true"
          data-lpignore="true"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          className="h-full min-w-0 flex-1 bg-transparent px-3 text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:text-slate-500"
        />

        {/* Clear button */}
        {value && !disabled ? (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Xóa"
            onClick={handleClear}
            className="mr-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}

        {/* Dropdown trigger — visible chevron button */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Mở danh sách"
          onClick={toggleDropdown}
          disabled={disabled}
          className={cn(
            "flex h-full w-9 shrink-0 items-center justify-center border-l transition",
            isOpen
              ? "border-blue-200 bg-blue-50 text-blue-600"
              : "border-slate-200 bg-slate-50/80 text-slate-500 hover:bg-slate-100 hover:text-slate-700",
            "rounded-r-lg disabled:cursor-not-allowed disabled:text-slate-400",
          )}
        >
          <ChevronDown className={cn("h-[18px] w-[18px] transition-transform", isOpen && "rotate-180")} />
        </button>
      </div>

      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
