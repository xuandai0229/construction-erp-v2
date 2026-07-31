"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search, Plus, Building2 } from "lucide-react";

export interface ProjectOption {
  id: string;
  name: string;
  code?: string;
  location?: string;
}

interface SafetyProjectComboboxProps {
  value?: string; // projectId
  projectMode?: "EXISTING" | "CUSTOM";
  customProjectName?: string;
  projects: ProjectOption[];
  disabled?: boolean;
  onSelectProject: (update: {
    projectMode: "EXISTING" | "CUSTOM";
    projectId?: string;
    customProjectName?: string;
  }) => void;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLocaleLowerCase("vi-VN");
}

export function SafetyProjectCombobox({
  value,
  projectMode = "EXISTING",
  customProjectName = "",
  projects,
  disabled,
  onSelectProject,
}: SafetyProjectComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  // Find selected project option
  const selectedProject = useMemo(() => {
    if (projectMode === "CUSTOM") return null;
    return projects.find((p) => p.id === value) || null;
  }, [projects, value, projectMode]);

  // Check for duplicate names in project list to append distinguishing info
  const nameCountMap = useMemo(() => {
    const map = new Map<string, number>();
    projects.forEach((p) => {
      const nameNorm = p.name.trim().toLowerCase();
      map.set(nameNorm, (map.get(nameNorm) || 0) + 1);
    });
    return map;
  }, [projects]);

  // Filtered options based on search query
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

  // Calculate position when opening dropdown
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const minWidth = Math.max(rect.width, 320);
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < 250 && rect.top > spaceBelow;

    let left = rect.left;
    if (left + minWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - minWidth - 12);
    }

    setPanelStyle({
      position: "fixed",
      left,
      top: openUp ? undefined : rect.bottom + 4,
      bottom: openUp ? window.innerHeight - rect.top + 4 : undefined,
      width: minWidth,
      maxHeight: 280,
      zIndex: 9999,
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const handleScroll = (e: Event) => {
      // Don't close if scroll event originated inside the panel
      if (panelRef.current?.contains(e.target as Node)) return;
      updatePosition();
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setQuery("");
    }
  }, [isOpen]);

  const handleSelectOption = (projectId: string) => {
    onSelectProject({
      projectMode: "EXISTING",
      projectId,
      customProjectName: "",
    });
    setIsOpen(false);
  };

  const handleSelectCustom = () => {
    onSelectProject({
      projectMode: "CUSTOM",
      projectId: projects[0]?.id || "",
      customProjectName: customProjectName || "",
    });
    setIsOpen(false);
  };

  const getOptionDisplayText = (p: ProjectOption) => {
    const isDuplicate = (nameCountMap.get(p.name.trim().toLowerCase()) || 0) > 1;
    let extra = "";
    if (isDuplicate || p.code) {
      const parts = [];
      if (p.code) parts.push(`Mã: ${p.code}`);
      if (p.location) parts.push(p.location);
      if (parts.length > 0) extra = ` (${parts.join(" - ")})`;
    }
    return `${p.name}${extra}`;
  };

  const triggerLabel = useMemo(() => {
    if (projectMode === "CUSTOM") {
      return "+ Tự nhập tên công trình khác";
    }
    if (selectedProject) {
      return getOptionDisplayText(selectedProject);
    }
    return "Chọn công trình...";
  }, [projectMode, selectedProject, nameCountMap]);

  return (
    <div className="relative w-full">
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        title={projectMode === "CUSTOM" ? customProjectName || triggerLabel : selectedProject?.name || triggerLabel}
        className={`w-full min-h-[42px] px-3 py-2 text-left text-xs font-semibold rounded-lg border transition-all flex items-center justify-between gap-2 bg-white ${
          isOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-300 hover:border-slate-400"
        } ${disabled ? "opacity-60 cursor-not-allowed bg-slate-50" : "cursor-pointer"}`}
      >
        <span className="flex-1 leading-snug break-words line-clamp-2 text-slate-800">
          {triggerLabel}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Portal Dropdown Menu */}
      {isOpen &&
        createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in-50 duration-150"
          >
            {/* Search Bar */}
            <div className="p-2 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm công trình..."
                  className="w-full h-8 pl-8 pr-3 text-xs bg-white rounded-md border border-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Options List */}
            <div className="overflow-y-auto max-h-[220px] p-1 divide-y divide-slate-50">
              {filteredProjects.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-slate-400 italic">
                  Không tìm thấy công trình phù hợp.
                </div>
              ) : (
                filteredProjects.map((p) => {
                  const isSelected = projectMode === "EXISTING" && value === p.id;
                  const label = getOptionDisplayText(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectOption(p.id)}
                      className={`w-full text-left px-3 py-2 text-xs rounded-md flex items-start justify-between gap-2 transition-colors ${
                        isSelected ? "bg-blue-50 font-bold text-blue-900" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <Building2 className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                        <span className="break-words leading-relaxed">{label}</span>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-blue-600 mt-0.5" />}
                    </button>
                  );
                })
              )}

              {/* Custom Project Option */}
              <button
                type="button"
                onClick={handleSelectCustom}
                className={`w-full text-left px-3 py-2 text-xs font-bold rounded-md flex items-center gap-2 mt-1 transition-colors ${
                  projectMode === "CUSTOM"
                    ? "bg-amber-50 text-amber-900 border border-amber-200"
                    : "text-blue-600 hover:bg-blue-50"
                }`}
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span>+ Tự nhập tên công trình khác...</span>
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
