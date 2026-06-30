"use client";

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Check, ChevronsUpDown, Building2, Globe, Search, HardHat, ClipboardList, PauseCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setProjectContextCookie } from '@/app/actions/project-context';

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

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSelect(id: string | null) {
    // 1. Update cookie via server action
    await setProjectContextCookie(id);
    
    // 2. Sync URL
    const params = new URLSearchParams(searchParams.toString());
    if (id && id !== 'all') {
      params.set('projectId', id);
    } else {
      params.delete('projectId');
    }
    
    setIsOpen(false);
    
    // We navigate to the current pathname with the new query param
    router.push(`${pathname}?${params.toString()}`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm transition-colors hover:bg-slate-50",
            selectedProjectId 
              ? "bg-blue-50/50 text-blue-900 border-blue-200" 
              : "bg-white text-slate-700"
          )}
        >
          <div className="flex items-center gap-2 truncate max-w-[120px] sm:max-w-[200px]">
            {selectedProjectId ? (
              <Building2 className="h-4 w-4 shrink-0 text-blue-600" />
            ) : (
              <Globe className="h-4 w-4 shrink-0 text-slate-500" />
            )}
            <span className="truncate font-medium">
              {selectedProject ? selectedProject.name : "Toàn hệ thống"}
            </span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute right-0 sm:left-0 top-full z-50 mt-2 w-[280px] sm:w-[320px] overflow-hidden rounded-xl border border-slate-100 bg-white shadow-lg">
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm tên hoặc mã..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
              
              <div className="max-h-64 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-200">
                <button
                  onClick={() => handleSelect('all')}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-100",
                    !selectedProjectId && "bg-slate-100 font-bold"
                  )}
                >
                  <div className="flex items-center gap-2 text-slate-700">
                    <Globe className="h-4 w-4 shrink-0" />
                    <span>Toàn hệ thống</span>
                  </div>
                  {!selectedProjectId && <Check className="h-4 w-4 text-slate-600 shrink-0" />}
                </button>
                
                {filteredProjects.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">Không tìm thấy công trình</div>
                ) : (
                  <div className="mt-2 space-y-4 pb-1">
                    {/* Active Projects */}
                    {filteredProjects.filter(p => p.status === "ACTIVE").length > 0 && (
                      <div>
                        <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Đang thi công</div>
                        {filteredProjects.filter(p => p.status === "ACTIVE").map(project => (
                          <ProjectItemButton 
                            key={project.id} 
                            project={project} 
                            isSelected={selectedProjectId === project.id} 
                            onClick={() => handleSelect(project.id)} 
                            icon={<HardHat className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-500" />}
                          />
                        ))}
                      </div>
                    )}
                    
                    {/* Planning Projects */}
                    {filteredProjects.filter(p => p.status === "PLANNING").length > 0 && (
                      <div>
                        <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Đang chuẩn bị</div>
                        {filteredProjects.filter(p => p.status === "PLANNING").map(project => (
                          <ProjectItemButton 
                            key={project.id} 
                            project={project} 
                            isSelected={selectedProjectId === project.id} 
                            onClick={() => handleSelect(project.id)} 
                            icon={<ClipboardList className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-500" />}
                          />
                        ))}
                      </div>
                    )}

                    {/* On Hold Projects */}
                    {filteredProjects.filter(p => p.status === "ON_HOLD").length > 0 && (
                      <div>
                        <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Tạm dừng</div>
                        {filteredProjects.filter(p => p.status === "ON_HOLD").map(project => (
                          <ProjectItemButton 
                            key={project.id} 
                            project={project} 
                            isSelected={selectedProjectId === project.id} 
                            onClick={() => handleSelect(project.id)} 
                            icon={<PauseCircle className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-amber-500" />}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

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
  icon 
}: { 
  project: GlobalProjectItem; 
  isSelected: boolean; 
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50",
        isSelected && "bg-blue-50/80 text-blue-800 hover:bg-blue-50"
      )}
    >
      <div className="flex items-center gap-2.5 truncate pr-2">
        {icon}
        <div className="truncate">
          <div className={cn("font-medium truncate transition-colors", isSelected ? "text-blue-800" : "text-slate-700 group-hover:text-blue-700")}>
            {project.name}
          </div>
          <div className="text-[11px] text-slate-500">{project.code}</div>
        </div>
      </div>
      {isSelected && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
    </button>
  );
}
