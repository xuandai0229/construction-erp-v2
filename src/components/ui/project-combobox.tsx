"use client";

import React, { useState, useRef, useEffect, useMemo, useId } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, Building2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTransientOverlay, notifyOverlayOpen } from "@/components/ui/global-overlay-manager";

export interface ProjectOption {
  id: string;
  name: string;
  code?: string | null;
  location?: string | null;
  status?: string | null;
}

interface ProjectComboboxProps {
  id?: string;
  value?: string; // Must be project.id
  projects: ProjectOption[];
  onValueChange: (projectId: string, project?: ProjectOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  noProjectsMessage?: string;
  disabled?: boolean;
  className?: string;
  error?: boolean;
  testId?: string;
  clearable?: boolean;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLocaleLowerCase("vi-VN");
}

export function ProjectCombobox({
  id,
  value = "",
  projects = [],
  onValueChange,
  placeholder = "Chọn hoặc tìm công trình...",
  searchPlaceholder = "Tìm theo tên hoặc mã công trình...",
  emptyMessage = "Không tìm thấy công trình phù hợp.",
  noProjectsMessage = "Bạn chưa được phân quyền vào công trình nào.",
  disabled = false,
  className,
  error = false,
  testId = "project-combobox",
  clearable = false,
}: ProjectComboboxProps) {
  const generatedId = useId();
  const buttonId = id || generatedId;
  const listboxId = `${buttonId}-listbox`;

  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties | null>(null);
  const [panelMaxHeight, setPanelMaxHeight] = useState(380);
  const [isMobile, setIsMobile] = useState(false);

  // Active selected project
  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === value) || null;
  }, [projects, value]);

  // Filtered options based on search query (Name or Code or Location)
  const filteredProjects = useMemo(() => {
    const q = normalizeSearch(query.trim());
    if (!q) return projects;
    return projects.filter((p) => {
      const nameSearch = normalizeSearch(p.name);
      const codeSearch = p.code ? normalizeSearch(p.code) : "";
      const locSearch = p.location ? normalizeSearch(p.location) : "";
      return nameSearch.includes(q) || codeSearch.includes(q) || locSearch.includes(q);
    });
  }, [projects, query]);

  // Update panel position with viewport collision detection
  const updatePanelPosition = () => {
    if (!triggerRef.current) return;
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const safePadding = 12;
    const mobile = typeof window !== "undefined" ? window.matchMedia("(max-width: 639px)").matches : false;
    setIsMobile(mobile);

    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    if (mobile) {
      const mobileMaxHeight = Math.max(260, Math.floor(viewportHeight * 0.72));
      setPanelMaxHeight(mobileMaxHeight);
      setPanelStyle(null);
      return;
    }

    const spaceBelow = viewportHeight - triggerRect.bottom - 12;
    const spaceAbove = triggerRect.top - 12;
    const openUp = spaceBelow < 260 && spaceAbove > spaceBelow;

    const availableSpace = openUp ? spaceAbove : spaceBelow;
    const calculatedMaxHeight = Math.min(380, Math.max(220, availableSpace));

    setPanelMaxHeight(calculatedMaxHeight);

    // On desktop, allow popover to be comfortably wide (up to 750px) for long project names
    const preferredWidth = Math.max(triggerRect.width, 520);
    const width = Math.min(preferredWidth, viewportWidth - safePadding * 2);
    const left = Math.min(Math.max(safePadding, triggerRect.left), viewportWidth - width - safePadding);

    setPanelStyle({
      position: "fixed",
      left,
      top: openUp ? undefined : triggerRect.bottom + 6,
      bottom: openUp ? viewportHeight - triggerRect.top + 6 : undefined,
      width,
      zIndex: 9999,
    });
  };

  useTransientOverlay({
    id: buttonId,
    isOpen,
    onClose: () => setIsOpen(false),
    refs: [rootRef, panelRef],
  });

  useEffect(() => {
    if (!isOpen) return;
    updatePanelPosition();

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
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

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }
    setActiveIndex(0);
    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const selectProject = (project: ProjectOption) => {
    onValueChange(project.id, project);
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
      setActiveIndex((index) => Math.min(index + 1, Math.max(0, filteredProjects.length - 1)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const option = filteredProjects[activeIndex];
      if (option) selectProject(option);
    }
  };

  const fullSelectedTitle = selectedProject
    ? `${selectedProject.code ? `[${selectedProject.code}] ` : ""}${selectedProject.name}`
    : "";

  const panel = isOpen ? (
    <div
      ref={panelRef}
      style={isMobile ? undefined : panelStyle || undefined}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-950/20 animate-in fade-in-50 duration-150",
        isMobile ? "fixed inset-x-3 bottom-3 z-[9999] max-h-[calc(100dvh-24px)]" : "z-[9999]"
      )}
    >
      {/* Sticky Search Header */}
      <div className="p-2.5 border-b border-slate-100 bg-slate-50/90 backdrop-blur-xs shrink-0">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            data-1p-ignore="true"
            data-lpignore="true"
            data-testid={`${testId}-search-input`}
            onKeyDown={handleKeyDown}
            className="w-full h-9 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-xs sm:text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Options List with Internal Scrollbar */}
      <div
        id={listboxId}
        role="listbox"
        aria-labelledby={buttonId}
        className="custom-scrollbar overflow-y-auto p-1.5 space-y-1"
        style={{ maxHeight: panelMaxHeight }}
        data-testid={`${testId}-listbox`}
      >
        {projects.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs sm:text-sm text-slate-500 font-medium">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            {noProjectsMessage}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs sm:text-sm text-slate-500 font-medium">
            {emptyMessage}
          </div>
        ) : (
          filteredProjects.map((project, index) => {
            const isSelected = project.id === value;
            const active = index === activeIndex;

            return (
              <button
                key={project.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                title={project.name}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectProject(project)}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-start justify-between gap-3 text-xs sm:text-sm group cursor-pointer border border-transparent",
                  active ? "bg-blue-50/80 border-blue-200 text-blue-900" : "hover:bg-slate-50 text-slate-800",
                  isSelected && "bg-blue-50 font-bold border-blue-300 text-blue-900 shadow-2xs"
                )}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  {/* Code badge if present */}
                  {project.code && (
                    <div className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700 border border-slate-200 group-hover:bg-blue-100 group-hover:text-blue-800">
                      {project.code}
                    </div>
                  )}

                  {/* FULL NAME - UNCONSTRAINED WRAPPING */}
                  <div className="font-medium text-slate-900 leading-snug break-words whitespace-normal overflow-wrap-anywhere">
                    {project.name}
                  </div>

                  {/* Location if present */}
                  {project.location && (
                    <div className="text-[11px] text-slate-500 leading-tight">
                      📍 {project.location}
                    </div>
                  )}
                </div>

                {/* Selected Checkmark */}
                {isSelected && (
                  <div className="bg-blue-600 rounded-full p-1 text-white shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  ) : null;

  return (
    <div ref={rootRef} className={cn("relative w-full min-w-0", className)} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        disabled={disabled}
        data-testid={testId}
        onClick={() => {
          if (disabled) return;
          setIsOpen((prev) => {
            const next = !prev;
            if (next) notifyOverlayOpen(buttonId);
            return next;
          });
        }}
        title={fullSelectedTitle || placeholder}
        className={cn(
          "w-full min-h-[44px] px-3 py-2 text-left rounded-xl border bg-white transition-all flex items-center justify-between gap-2 shadow-2xs outline-none",
          isOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200 hover:border-slate-300",
          error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20",
          disabled && "opacity-60 cursor-not-allowed bg-slate-50"
        )}
      >
        {selectedProject ? (
          <div className="min-w-0 flex-1 py-0.5">
            {selectedProject.code && (
              <span className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-blue-700 mr-2 border border-blue-200">
                {selectedProject.code}
              </span>
            )}
            <span className="text-xs sm:text-sm font-semibold text-slate-900 leading-snug line-clamp-2 break-words">
              {selectedProject.name}
            </span>
          </div>
        ) : (
          <span className="text-xs sm:text-sm text-slate-400 font-medium truncate">
            {placeholder}
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0">
          {clearable && value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onValueChange("");
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              title="Xóa lựa chọn"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")}
          />
        </div>
      </button>

      {panel ? createPortal(panel, document.body) : null}
    </div>
  );
}
