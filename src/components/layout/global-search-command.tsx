"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Building2, Bell, X, FileText, ClipboardCheck, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { GlobalProjectContext } from "@/lib/project-context";
import { setProjectContextCookie } from "@/app/actions/project-context";
import { searchSystem } from "@/app/actions/global-search";

interface GlobalSearchCommandProps {
  globalContext?: GlobalProjectContext;
}

export function GlobalSearchCommand({ globalContext }: GlobalSearchCommandProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<{
    projects: { id: string; name: string; code: string }[];
    notifications: { id: string; type: string; severity: string; title: string; projectName: string; href: string }[];
    reports: { id: string; title: string; reportNo: string; projectName: string; href: string }[];
  }>({ projects: [], notifications: [], reports: [] });
  const debounceRef = useRef<NodeJS.Timeout>(undefined);
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on ESC and Click Outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    
    const handlePointerDown = (e: PointerEvent | MouseEvent) => {
      if (isOpen && panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ projects: [], notifications: [], reports: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchSystem(query, globalContext?.selectedProjectId || null);
        setResults(data);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, globalContext?.selectedProjectId]);

  if (!globalContext) return null;

  const handleProjectSelect = async (projectId: string) => {
    await setProjectContextCookie(projectId);
    setIsOpen(false);
    setQuery("");
    router.refresh();
  };

  const hasResults = results.projects.length > 0 || results.notifications.length > 0 || results.reports.length > 0;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="hidden sm:flex items-center justify-center h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors" 
        aria-label="Tìm kiếm"
        title="Tìm kiếm (Cmd+K)"
      >
        <Search className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col sm:block">
          <div 
            className="fixed inset-0 bg-slate-900/15 transition-opacity" 
            aria-hidden="true"
          />
          <div 
            ref={panelRef}
            className="relative w-full max-w-[800px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 mt-2 mx-2 sm:mx-auto sm:mt-[72px] animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center border-b border-slate-100 px-3 relative">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                className="flex h-14 w-full bg-transparent py-3 pl-3 pr-10 text-slate-900 outline-none placeholder:text-slate-400 sm:text-base"
                placeholder="Tìm kiếm công trình, báo cáo, thông báo..."
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="absolute right-12 top-1/2 -translate-y-1/2">
                {isSearching && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-500 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {!query.trim() && (
                <div className="p-2">
                  <div className="mb-4">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gợi ý tìm kiếm</div>
                    <div className="px-3 py-2 text-sm text-slate-600 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <kbd className="hidden sm:inline-flex items-center justify-center rounded border border-slate-200 bg-slate-100 px-1.5 font-mono text-[10px] font-medium text-slate-500">HN-TH</kbd>
                        <span>Tìm công trình theo mã (VD: HN-TH-2026)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <kbd className="hidden sm:inline-flex items-center justify-center rounded border border-slate-200 bg-slate-100 px-1.5 font-mono text-[10px] font-medium text-slate-500">BC-</kbd>
                        <span>Tìm nhanh báo cáo hiện trường</span>
                      </div>
                    </div>
                  </div>
                  {globalContext.notifications.length > 0 && (
                    <div className="mb-2">
                      <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cần chú ý gần đây</div>
                      {globalContext.notifications.map((n) => (
                        <Link
                          key={n.id}
                          href={n.href || '#'}
                          onClick={() => setIsOpen(false)}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-slate-50 hover:text-blue-600 transition-colors group"
                        >
                          <Bell className="h-4 w-4 text-slate-400 group-hover:text-blue-500 shrink-0" />
                          <div className="flex-1 overflow-hidden">
                            <div className="font-medium truncate text-slate-900 group-hover:text-blue-600">{n.title}</div>
                            <div className="text-xs text-slate-500 truncate">{n.projectName}</div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {query.trim() && !isSearching && !hasResults && (
                <div className="py-14 text-center">
                  <Search className="mx-auto h-8 w-8 text-slate-300 mb-3" />
                  <p className="text-sm font-medium text-slate-900">Không tìm thấy kết quả</p>
                  <p className="text-sm text-slate-500 mt-1">Không có kết quả nào phù hợp với "{query}"</p>
                </div>
              )}

              {results.projects.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Công trình</div>
                  {results.projects.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleProjectSelect(p.id)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-slate-50 hover:text-blue-600 transition-colors group"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-blue-100 transition-colors">
                        <Building2 className="h-4 w-4 text-slate-500 group-hover:text-blue-600" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="font-medium truncate text-slate-900 group-hover:text-blue-600">{p.name}</div>
                        <div className="text-xs text-slate-500 truncate">{p.code}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {results.notifications.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cần xử lý & Phê duyệt</div>
                  {results.notifications.map((n) => (
                    <Link
                      key={n.id}
                      href={n.href}
                      onClick={() => setIsOpen(false)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-slate-50 hover:text-blue-600 transition-colors group"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-blue-100 transition-colors">
                        <ClipboardCheck className="h-4 w-4 text-slate-500 group-hover:text-blue-600" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="font-medium truncate text-slate-900 group-hover:text-blue-600">{n.title}</div>
                        <div className="text-xs text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                          <span className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            n.severity === 'HIGH' ? "bg-rose-500" : "bg-blue-500"
                          )} />
                          {n.projectName}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {results.reports.length > 0 && (
                <div className="mb-4">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Báo cáo hiện trường</div>
                  {results.reports.map((r) => (
                    <Link
                      key={r.id}
                      href={r.href}
                      onClick={() => setIsOpen(false)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-slate-50 hover:text-blue-600 transition-colors group"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-blue-100 transition-colors">
                        <FileText className="h-4 w-4 text-slate-500 group-hover:text-blue-600" />
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <div className="font-medium truncate text-slate-900 group-hover:text-blue-600">{r.title}</div>
                        <div className="text-xs text-slate-500 truncate mt-0.5"><span className="font-medium">{r.reportNo}</span> • {r.projectName}</div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500 flex justify-between">
              <span>Mẹo: Sử dụng Cmd+K hoặc Ctrl+K để mở nhanh</span>
              <span>Đang sử dụng hệ thống tìm kiếm</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
