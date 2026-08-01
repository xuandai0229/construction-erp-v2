"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Check, ChevronsUpDown, Building2, Globe, Search, Hammer, ClipboardList, PauseCircle, CheckCircle2, HelpCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setProjectContextCookie } from '@/app/actions/project-context';
import { getProjectStatusMeta, sortProjectStatuses } from '@/lib/project-status';
import { useClickOutside } from '@/components/ui/global-overlay-manager';

export type GlobalProjectItem = {
  id: string;
  code: string;
  name: string;
  status: string;
};

export function GlobalProjectContextSwitcher({
  projects,
  selectedProjectId,
  overviewData
}: {
  projects: GlobalProjectItem[];
  selectedProjectId: string | null;
  overviewData: { health: string; warning: string } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [portalCoords, setPortalCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchParamsKey = searchParams.toString();

  let routeProjectId: string | null = null;
  const projectMatch = pathname.match(/^\/projects\/([^\/]+)/);
  const documentMatch = pathname.match(/^\/documents\/([^\/]+)/);

  if (projectMatch && projectMatch[1] !== 'new') {
    routeProjectId = projectMatch[1];
  } else if (documentMatch && documentMatch[1] !== 'new') {
    routeProjectId = documentMatch[1];
  }

  let isRootGlobalRoute = false;
  if (pathname === '/documents' || pathname === '/projects') {
    isRootGlobalRoute = true;
  }

  const displayProjectId = isRootGlobalRoute ? null : (routeProjectId || selectedProjectId);
  const selectedProject = projects.find(p => p.id === displayProjectId);

  const filteredProjects = useMemo(
    () => projects
      .filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.code.toLowerCase().includes(search.toLowerCase())
      )
      .sort((left, right) => {
        const statusOrder = sortProjectStatuses(left.status, right.status);
        if (statusOrder !== 0) return statusOrder;
        return left.name.localeCompare(right.name, "vi");
      }),
    [projects, search],
  );

  const groupedProjects = useMemo(() => {
    const groups = new Map<string, GlobalProjectItem[]>();
    for (const project of filteredProjects) {
      const meta = getProjectStatusMeta(project.status);
      const key = meta.key;
      groups.set(key, [...(groups.get(key) ?? []), project]);
    }
    return Array.from(groups.entries()).sort(([left], [right]) => sortProjectStatuses(left, right));
  }, [filteredProjects]);

  // Recalculate panel position when opened or resized
  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPortalCoords({
        top: rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 320),
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      window.dispatchEvent(new Event("close-overlays"));
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
      setSearch('');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  // Close on route change
  useEffect(() => {
    setIsOpen(false);
    setSearch("");
  }, [pathname, searchParamsKey]);

  // Click outside without swallowing clicks
  useClickOutside({
    isOpen,
    onClose: () => {
      setIsOpen(false);
      setSearch("");
    },
    refs: [buttonRef, dropdownRef],
  });

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setSearch("");
        buttonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  async function handleSelect(id: string | null) {
    await setProjectContextCookie(id);
    setIsOpen(false);
    setSearch("");

    if (routeProjectId) {
      if (!id || id === 'all') {
        router.push(pathname.startsWith('/documents') ? '/documents' : '/projects');
      } else {
        const newPathname = pathname.replace(`/${routeProjectId}`, `/${id}`);
        router.push(newPathname);
      }
    } else {
      if (pathname === '/documents' && id && id !== 'all') {
        router.push(`/documents/${id}`);
      } else if (pathname === '/projects' && id && id !== 'all') {
        router.push(`/projects/${id}`);
      } else {
        const params = new URLSearchParams(searchParams.toString());
        if (id && id !== 'all') {
          params.set('projectId', id);
        } else {
          params.delete('projectId');
        }

        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
      }
    }
  }

  const dropdownPortal = isOpen && typeof document !== 'undefined' ? createPortal(
    <>
      {/* Mobile Backdrop & Centered Modal Shell for screens < 640px */}
      <div 
        className="sm:hidden fixed inset-0 z-[100] bg-slate-900/50 backdrop-blur-xs flex flex-col justify-end p-0 animate-in fade-in duration-150"
        aria-hidden="true"
      >
        <div 
          ref={dropdownRef}
          className="w-full max-h-[85vh] rounded-t-2xl bg-white shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-200"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span>Chọn công trình làm việc</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                autoComplete="off"
                type="text"
                placeholder="Tìm tên hoặc mã công trình..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="overflow-y-auto p-2 space-y-1 max-h-[60vh]">
            <button
              type="button"
              data-project-context-id="all"
              onClick={() => handleSelect('all')}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-colors hover:bg-slate-100",
                !displayProjectId && "bg-blue-50/80 text-blue-800 font-bold"
              )}
            >
              <div className="flex items-center gap-2.5 text-slate-700">
                <Globe className="h-4 w-4 text-slate-500 shrink-0" />
                <span>Toàn hệ thống</span>
              </div>
              {!displayProjectId && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
            </button>

            {filteredProjects.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">Không tìm thấy công trình</div>
            ) : (
              <div className="mt-2 space-y-3 pb-2">
                {groupedProjects.map(([statusKey, items]) => {
                  const meta = getProjectStatusMeta(statusKey);
                  return (
                    <div key={statusKey}>
                      <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{meta.groupLabel}</div>
                      {items.map(project => (
                        <ProjectItemButton
                          key={project.id}
                          project={project}
                          isSelected={displayProjectId === project.id}
                          onClick={() => handleSelect(project.id)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Portal Floating Panel for screens >= 640px */}
      <div
        ref={dropdownRef}
        style={{
          position: 'fixed',
          top: portalCoords ? portalCoords.top : 0,
          left: portalCoords ? portalCoords.left : 0,
          width: portalCoords ? portalCoords.width : 320,
        }}
        className="hidden sm:block z-[100] overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xl ring-1 ring-slate-900/5 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="p-2 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
            <input
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              type="text"
              placeholder="Tìm tên hoặc mã..."
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto p-1.5 custom-scrollbar">
          <button
            type="button"
            data-project-context-id="all"
            onClick={() => handleSelect('all')}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-100",
              !displayProjectId && "bg-blue-50/80 text-blue-800 font-bold"
            )}
          >
            <div className="flex items-center gap-2.5 text-slate-700">
              <Globe className="h-4 w-4 shrink-0 text-slate-500" />
              <span>Toàn hệ thống</span>
            </div>
            {!displayProjectId && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
          </button>

          {filteredProjects.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">Không tìm thấy công trình</div>
          ) : (
            <div className="mt-2 space-y-3 pb-1">
              {groupedProjects.map(([statusKey, items]) => {
                const meta = getProjectStatusMeta(statusKey);
                return (
                  <div key={statusKey}>
                    <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">{meta.groupLabel}</div>
                    {items.map(project => (
                      <ProjectItemButton
                        key={project.id}
                        project={project}
                        isSelected={displayProjectId === project.id}
                        onClick={() => handleSelect(project.id)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="relative min-w-0">
        <button
          ref={buttonRef}
          type="button"
          data-project-context-trigger
          onClick={handleToggle}
          className={cn(
            "flex h-10 max-w-[400px] items-center justify-between gap-2 rounded-lg border border-slate-200 bg-[var(--surface-subtle)] px-3 text-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20",
            displayProjectId
              ? "bg-blue-50/60 text-blue-900 border-blue-200"
              : "bg-white text-slate-700 hover:bg-slate-50"
          )}
          aria-expanded={isOpen}
          aria-label="Bộ chọn công trình"
        >
          <div className="flex min-w-0 items-center gap-2 truncate max-w-[340px]">
            {displayProjectId ? (
              <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
            ) : (
              <Globe className="h-4 w-4 shrink-0 text-slate-500" />
            )}
            <span className="truncate font-medium leading-tight" title={selectedProject?.name}>
              {selectedProject ? selectedProject.name : displayProjectId ? "Đang xem công trình" : "Toàn hệ thống"}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </div>

      {dropdownPortal}

      {overviewData ? (
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 border border-slate-100">
          <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            overviewData.health === "ON_TRACK" ? "bg-emerald-500" :
              overviewData.health === "AT_RISK" ? "bg-amber-500" :
                overviewData.health === "DELAYED" ? "bg-rose-500" :
                  "bg-blue-500"
          )} />
          <span className="text-[11px] font-medium text-slate-600 truncate max-w-[100px]">
            {overviewData.warning}
          </span>
        </div>
      ) : (
        <div className="hidden sm:flex items-center gap-1.5 px-1.5">
          <span className="text-[12px] font-medium text-slate-500">
            <span className="text-slate-900 font-bold">{projects.length}</span> công trình
          </span>
        </div>
      )}
    </div>
  );
}

function ProjectItemButton({
  project,
  isSelected,
  onClick,
}: {
  project: GlobalProjectItem;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meta = getProjectStatusMeta(project.status);
  const StatusIcon =
    meta.key === "ACTIVE" ? Hammer :
      meta.key === "PLANNING" ? ClipboardList :
        meta.key === "ON_HOLD" ? PauseCircle :
          meta.key === "COMPLETED" ? CheckCircle2 :
            HelpCircle;

  return (
    <button
      type="button"
      data-project-context-id={project.id}
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100",
        isSelected && "bg-blue-50/80 text-blue-800 hover:bg-blue-50"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5 pr-2">
        <StatusIcon className={cn("h-4 w-4 shrink-0 mt-0.5", meta.iconToneClassName)} />
        <div className="truncate min-w-0">
          <div className={cn("font-medium truncate leading-snug transition-colors", isSelected ? "text-blue-800 font-semibold" : "text-slate-700 group-hover:text-blue-700")} title={project.name}>
            {project.name}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
            <span>{project.code}</span>
            <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.dotClassName)} />
            <span>{meta.label}</span>
          </div>
        </div>
      </div>
      {isSelected && <Check className="h-4 w-4 shrink-0 text-blue-600 ml-1" />}
    </button>
  );
}
