"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Building2, Globe, ChevronDown, Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getProjectStatusMeta } from "@/lib/project-status";
import type { GlobalProjectContext } from "@/lib/project-context";
import { setProjectContextCookie } from "@/app/actions/project-context";

export function MobileProjectContextBar({ globalContext }: { globalContext: GlobalProjectContext | null }) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  if (!globalContext) return null;

  // We only show this on global root pages if needed, but since we want to know what context we are in globally:
  // "Project selector trên mobile mở bằng Bottom Sheet. Màn chính chỉ hiển thị: Mã hoặc tên công trình rút gọn. Nút đổi công trình. Trạng thái nhỏ."
  
  // Hide on pages that have their own project detail header to avoid duplication
  const isProjectSpecificPage = pathname.match(/^\/projects\/([a-zA-Z0-9_-]+)(\/.*)?$/) && !pathname.match(/^\/projects\/new/);
  if (isProjectSpecificPage) return null;

  const displayProjectId = globalContext.selectedProjectId;
  const selectedProject = globalContext.accessibleProjects.find(p => p.id === displayProjectId);
  
  const filteredProjects = globalContext.accessibleProjects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSelect(id: string | null) {
    await setProjectContextCookie(id);
    setIsOpen(false);
    setSearch("");
    window.location.reload(); // Hard reload to apply context globally since it affects server queries
  }

  return (
    <>
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-slate-200 px-4 py-2.5 shadow-sm sticky top-[52px] z-40">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            selectedProject ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-500"
          )}>
            {selectedProject ? <Building2 className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {selectedProject ? 'Công trình hiện tại' : 'Phạm vi dữ liệu'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-slate-900 truncate">
                {selectedProject ? selectedProject.name : "Toàn hệ thống"}
              </span>
              {selectedProject && (
                <span className={cn("shrink-0 h-2 w-2 rounded-full", getProjectStatusMeta(selectedProject.status).dotClassName)} />
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="ml-3 shrink-0 flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[12px] font-semibold text-slate-700 active:bg-slate-200"
        >
          Đổi <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden flex flex-col justify-end">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />
          <div className="relative bg-white rounded-t-2xl shadow-xl w-full max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-full duration-200">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Chọn công trình</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-3 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Tìm tên hoặc mã..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-[14px] outline-none focus:border-blue-500 focus:bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="p-2 overflow-y-auto custom-scrollbar pb-[calc(1rem+env(safe-area-inset-bottom))]">
              <button
                onClick={() => handleSelect(null)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors mb-2",
                  !displayProjectId ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"
                )}
              >
                <div className="flex items-center gap-3">
                  <Globe className={cn("h-5 w-5", !displayProjectId ? "text-blue-600" : "text-slate-400")} />
                  <span className="font-semibold text-[14px]">Toàn hệ thống</span>
                </div>
                {!displayProjectId && <Check className="h-5 w-5 text-blue-600" />}
              </button>

              <div className="space-y-1">
                {filteredProjects.map(project => {
                  const isSelected = displayProjectId === project.id;
                  const meta = getProjectStatusMeta(project.status);
                  return (
                    <button
                      key={project.id}
                      onClick={() => handleSelect(project.id)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition-colors",
                        isSelected ? "bg-blue-50 text-blue-700" : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        <div className={cn("h-2 w-2 rounded-full shrink-0", meta.dotClassName)} />
                        <div className="min-w-0">
                          <div className={cn("font-bold text-[14px] truncate", isSelected ? "text-blue-800" : "text-slate-900")}>
                            {project.name}
                          </div>
                          <div className="flex items-center gap-2 text-[12px] text-slate-500 mt-0.5">
                            <span className="font-medium bg-slate-100 px-1.5 py-0.5 rounded">{project.code}</span>
                            <span>{meta.label}</span>
                          </div>
                        </div>
                      </div>
                      {isSelected && <Check className="h-5 w-5 text-blue-600 shrink-0" />}
                    </button>
                  );
                })}
                {filteredProjects.length === 0 && (
                  <div className="py-8 text-center text-[14px] text-slate-500">
                    Không tìm thấy công trình phù hợp
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
