"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Check, ChevronsUpDown, Building2, Globe, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setProjectContextCookie } from '@/app/actions/project-context';
import { getProjectStatusMeta, sortProjectStatuses } from '@/lib/project-status';
import { useTransientOverlay, notifyOverlayOpen } from '@/components/ui/global-overlay-manager';
import { ProjectIdentity } from '@/components/projects/project-identity';

export type GlobalProjectItem = {
  id: string;
  code: string;
  name: string;
  displayName: string | null;
  status: string;
  investor: string | null;
  location: string | null;
  commanderName: string | null;
  executionUnit: string | null;
  durationLabel: string;
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
      .filter(p => {
        const q = search.toLowerCase().trim();
        if (!q) return true;
        return (
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          (p.displayName && p.displayName.toLowerCase().includes(q)) ||
          (p.location && p.location.toLowerCase().includes(q)) ||
          (p.commanderName && p.commanderName.toLowerCase().includes(q)) ||
          (p.executionUnit && p.executionUnit.toLowerCase().includes(q)) ||
          (p.investor && p.investor.toLowerCase().includes(q))
        );
      })
      .sort((left, right) => {
        const statusOrder = sortProjectStatuses(left.status, right.status);
        if (statusOrder !== 0) return statusOrder;
        const nameLeft = left.displayName || left.name;
        const nameRight = right.displayName || right.name;
        return nameLeft.localeCompare(nameRight, "vi");
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

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPortalCoords({
        top: rect.bottom + 6,
        left: rect.left,
        width: Math.max(rect.width, 540),
      });
    }
  };

  const handleToggle = () => {
    if (!isOpen) {
      notifyOverlayOpen("global-project-context-switcher");
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

  useTransientOverlay({
    id: "global-project-context-switcher",
    isOpen,
    onClose: () => {
      setIsOpen(false);
      setSearch('');
    },
    refs: [buttonRef, dropdownRef],
  });

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
      {/* Mobile Modal Sheet (< 640px) */}
      <div 
        className="sm:hidden fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-xs flex flex-col justify-end p-0 animate-in fade-in duration-150"
        aria-hidden="true"
      >
        <div 
          ref={dropdownRef}
          className="w-full max-h-[85vh] rounded-t-2xl bg-white shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-200 border-t border-slate-200"
        >
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
              <Building2 className="h-4.5 w-4.5 text-blue-600 shrink-0" />
              <span>Chọn công trình làm việc ({projects.length})</span>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-3 border-b border-slate-200 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                autoComplete="off"
                type="text"
                placeholder="Tìm tên, mã, địa điểm, chỉ huy trưởng..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm font-medium text-slate-900 placeholder:text-slate-500 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="overflow-y-auto p-2 space-y-2 max-h-[60vh] bg-slate-50/50">
            <button
              type="button"
              data-project-context-id="all"
              onClick={() => handleSelect('all')}
              className={cn(
                "flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left text-sm font-medium transition-colors hover:bg-slate-100 border",
                !displayProjectId 
                  ? "bg-blue-50 text-blue-950 font-bold border-blue-300 shadow-2xs" 
                  : "bg-white border-slate-200 text-slate-800"
              )}
            >
              <div className="flex items-center gap-2.5 text-slate-800">
                <Globe className="h-4 w-4 text-blue-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-900 text-[14px]">Toàn hệ thống</div>
                  <div className="text-[12px] text-slate-600 font-medium">Tổng hợp tất cả {projects.length} công trình</div>
                </div>
              </div>
              {!displayProjectId && <Check className="h-4.5 w-4.5 text-blue-600 shrink-0" />}
            </button>

            {filteredProjects.length === 0 ? (
              <div className="py-8 text-center text-sm font-medium text-slate-600 bg-white rounded-xl border border-slate-200">Không tìm thấy công trình phù hợp</div>
            ) : (
              <div className="space-y-3 pb-2">
                {groupedProjects.map(([statusKey, items]) => {
                  const meta = getProjectStatusMeta(statusKey);
                  return (
                    <div key={statusKey}>
                      <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">{meta.groupLabel} ({items.length})</div>
                      <div className="space-y-1.5">
                        {items.map(project => (
                          <ProjectItemButton
                            key={project.id}
                            project={project}
                            isSelected={displayProjectId === project.id}
                            onClick={() => handleSelect(project.id)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Desktop Floating Panel (>= 640px) */}
      <div
        ref={dropdownRef}
        style={{
          position: 'fixed',
          top: portalCoords ? portalCoords.top : 0,
          left: portalCoords ? portalCoords.left : 0,
          width: portalCoords ? portalCoords.width : 540,
        }}
        className="hidden sm:block z-[100] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl ring-1 ring-slate-900/10 animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="p-3 border-b border-slate-200 bg-slate-50/80">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              autoComplete="off"
              type="text"
              placeholder="Tìm theo tên hiển thị, tên pháp lý, mã, địa điểm, chỉ huy trưởng..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-medium text-slate-900 placeholder:text-slate-500 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2.5 space-y-2 bg-slate-50/30 custom-scrollbar">
          <button
            type="button"
            data-project-context-id="all"
            onClick={() => handleSelect('all')}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors border",
              !displayProjectId 
                ? "bg-blue-50 text-blue-950 font-bold border-blue-300 shadow-2xs" 
                : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
            )}
          >
            <div className="flex items-center gap-3 text-slate-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-700 shrink-0">
                <Globe className="h-4.5 w-4.5" />
              </div>
              <div>
                <div className="font-bold text-[14px] text-slate-900">Toàn hệ thống</div>
                <div className="text-[12px] text-slate-600 font-medium">Tổng hợp tất cả {projects.length} công trình trong phạm vi phân quyền</div>
              </div>
            </div>
            {!displayProjectId && <Check className="h-5 w-5 text-blue-600 shrink-0" />}
          </button>

          {filteredProjects.length === 0 ? (
            <div className="py-10 text-center text-sm font-medium text-slate-600 bg-white rounded-lg border border-slate-200">Không tìm thấy công trình phù hợp</div>
          ) : (
            <div className="space-y-3 pt-1">
              {groupedProjects.map(([statusKey, items]) => {
                const meta = getProjectStatusMeta(statusKey);
                return (
                  <div key={statusKey}>
                    <div className="px-3 pt-2.5 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-600">{meta.groupLabel} ({items.length})</div>
                    <div className="space-y-1.5">
                      {items.map(project => (
                        <ProjectItemButton
                          key={project.id}
                          project={project}
                          isSelected={displayProjectId === project.id}
                          onClick={() => handleSelect(project.id)}
                        />
                      ))}
                    </div>
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

  const triggerTitle = selectedProject
    ? (selectedProject.displayName || selectedProject.name)
    : `Toàn hệ thống (${projects.length} công trình)`;

  const triggerMeta = selectedProject
    ? `${selectedProject.code} · ${getProjectStatusMeta(selectedProject.status).label}`
    : null;

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="relative min-w-0">
        <button
          ref={buttonRef}
          type="button"
          data-project-context-trigger
          onClick={handleToggle}
          className={cn(
            "flex h-[46px] max-w-[480px] items-center justify-between gap-3 rounded-xl border px-3 py-1.5 text-sm font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20",
            displayProjectId
              ? "bg-blue-50/90 border-blue-300 text-blue-950 hover:bg-blue-100/70 shadow-2xs"
              : "bg-white border-slate-200 text-slate-900 hover:bg-slate-50 hover:border-slate-300"
          )}
          aria-expanded={isOpen}
          aria-label="Bộ chọn công trình"
        >
          <div className="flex min-w-0 items-center gap-2.5 max-w-[400px]">
            {displayProjectId ? (
              <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
            ) : (
              <Globe className="h-4 w-4 shrink-0 text-slate-600" />
            )}
            
            <div className="flex flex-col text-left min-w-0">
              <span className="truncate text-[13px] font-bold leading-tight text-slate-950">
                {triggerTitle}
              </span>
              {triggerMeta && (
                <span className="truncate text-[11px] font-mono font-semibold text-slate-600 mt-0.5">
                  {triggerMeta}
                </span>
              )}
            </div>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-500 ml-1" />
        </button>
      </div>

      {dropdownPortal}

      {overviewData ? (
        <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 border border-slate-200">
          <span className={cn(
            "h-2 w-2 rounded-full",
            overviewData.health === "ON_TRACK" ? "bg-emerald-500" :
              overviewData.health === "AT_RISK" ? "bg-amber-500" :
                overviewData.health === "DELAYED" ? "bg-rose-500" :
                  "bg-blue-500"
          )} />
          <span className="text-[12px] font-semibold text-slate-800 truncate max-w-[120px]">
            {overviewData.warning}
          </span>
        </div>
      ) : (
        <div className="hidden sm:flex items-center gap-1.5 px-1.5">
          <span className="text-[12px] font-medium text-slate-600">
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
  return (
    <button
      type="button"
      data-project-context-id={project.id}
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-all border",
        isSelected 
          ? "bg-blue-50/90 border-blue-300 shadow-2xs" 
          : "bg-white border-slate-200 hover:bg-slate-100/80 hover:border-slate-300"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center pr-2">
        <ProjectIdentity
          name={project.name}
          displayName={project.displayName}
          code={project.code}
          status={project.status}
          location={project.location}
          commanderName={project.commanderName}
          executionUnit={project.executionUnit}
          variant="selector"
          selected={isSelected}
        />
      </div>
      {isSelected && <Check className="h-5 w-5 shrink-0 text-blue-600 ml-2" />}
    </button>
  );
}
