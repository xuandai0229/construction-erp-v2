"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, Building2, Bell, FileText, ClipboardCheck, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { GlobalProjectContext } from "@/lib/project-context";
import { setProjectContextCookie } from "@/app/actions/project-context";
import { searchSystem } from "@/app/actions/global-search";
import { CloseButton } from "@/components/ui/close-button";

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setResults({ projects: [], notifications: [], reports: [] });
    setIsSearching(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    closeSearch();
  }, [pathname, searchParamsKey, closeSearch]);

  // Close on ESC and Click Outside
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeSearch();
      }
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        window.dispatchEvent(new Event("close-overlays")); setIsOpen((open) => !open);
      }
    };
    
    const handlePointerDown = (e: PointerEvent | MouseEvent) => {
      if (isOpen && panelRef.current && !panelRef.current.contains(e.target as Node)) {
        closeSearch();
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
  }, [closeSearch, isOpen]);

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
    closeSearch();
    const params = new URLSearchParams(searchParams.toString());
    params.set("projectId", projectId);
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
    router.refresh();
  };

  const hasResults = results.projects.length > 0 || results.notifications.length > 0 || results.reports.length > 0;

  return (
    <>
      <button 
        onClick={() => { window.dispatchEvent(new Event("close-overlays")); setIsOpen(true); }}
        className="hidden sm:flex items-center justify-center h-9 w-9 rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors" 
        aria-label="Tìm kiếm"
        title="Tìm kiếm (Cmd+K)"
      >
        <Search className="h-5 w-5" />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-x-0 bottom-0 top-16 z-[65] bg-slate-900/30 backdrop-blur-sm transition-all" 
            aria-hidden="true"
          />
          <div 
            ref={panelRef}
            className="fixed z-[75] w-[calc(100%-1rem)] max-w-[800px] left-1/2 -translate-x-1/2 top-[72px] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center border-b border-slate-100 px-4 h-14 relative">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <div className="relative flex-1 flex items-center h-full">
                <input
                  ref={inputRef}
                  className="flex h-full w-full bg-transparent py-3 pl-3 pr-10 text-slate-900 outline-none placeholder:text-slate-400 sm:text-base"
                  placeholder="Tìm công trình, báo cáo, hồ sơ, thông báo..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && !isSearching && (
                    <CloseButton
                      onClick={() => {
                        setQuery("");
                        inputRef.current?.focus();
                      }}
                      className="absolute right-2"
                      tone="neutral"
                      aria-label="Xóa nội dung tìm kiếm"
                    />
                )}
                {isSearching && (
                  <div className="absolute right-2 flex h-6 w-6 items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  </div>
                )}
              </div>
              <CloseButton 
                onClick={closeSearch}
                className="hidden sm:flex ml-2"
                title="Đóng (Esc)"
                tone="neutral"
              />
              <CloseButton 
                onClick={closeSearch}
                className="sm:hidden ml-1"
                tone="neutral"
              />
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
              {!query.trim() && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
                  <div className="mb-2">
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tìm nhanh</div>
                    <div className="flex flex-col gap-1 mt-1">
                      <Link href="/projects" onClick={closeSearch} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                        <Building2 className="h-4 w-4 text-slate-400" /> Công trình đang chọn
                      </Link>
                      <Link href="/reports" onClick={closeSearch} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                        <FileText className="h-4 w-4 text-slate-400" /> Báo cáo hiện trường
                      </Link>
                      <Link href="/approvals" onClick={closeSearch} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                        <ClipboardCheck className="h-4 w-4 text-slate-400" /> Hồ sơ chờ xử lý
                      </Link>
                      <Link href="/contracts" onClick={closeSearch} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                        <FileText className="h-4 w-4 text-slate-400" /> Hợp đồng / thanh toán
                      </Link>
                    </div>
                  </div>
                  <div>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cần chú ý gần đây</div>
                    {globalContext.notifications.length > 0 ? (
                      <div className="flex flex-col gap-1 mt-1">
                        {globalContext.notifications.slice(0, 3).map((n) => (
                          <Link
                            key={n.id}
                            href={n.href || '#'}
                            onClick={closeSearch}
                            className="flex items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors group"
                          >
                            <Bell className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                            <div className="flex-1 overflow-hidden leading-tight">
                              <div className="font-medium truncate">{n.title}</div>
                              <div className="text-[11px] text-slate-500 truncate mt-0.5">{n.projectName}</div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-4 text-sm text-slate-500 flex items-center gap-2">
                        <Bell className="h-4 w-4 text-slate-300" /> Không có cảnh báo mới
                      </div>
                    )}
                  </div>
                </div>
              )}

              {query.trim() && !isSearching && !hasResults && (
                <div className="py-14 text-center">
                  <Search className="mx-auto h-8 w-8 text-slate-300 mb-3" />
                  <p className="text-sm font-medium text-slate-900">Không tìm thấy kết quả phù hợp</p>
                  <p className="text-sm text-slate-500 mt-1">Thử tìm theo mã công trình, tên báo cáo hoặc từ khóa nghiệp vụ</p>
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
                      onClick={closeSearch}
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
                      onClick={closeSearch}
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
            
            <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] font-medium text-slate-500 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="font-mono bg-white border border-slate-200 rounded px-1 text-slate-400">↑</kbd><kbd className="font-mono bg-white border border-slate-200 rounded px-1 text-slate-400">↓</kbd> chọn</span>
                <span className="flex items-center gap-1"><kbd className="font-mono bg-white border border-slate-200 rounded px-1.5 text-slate-400">Enter</kbd> mở</span>
                <span className="flex items-center gap-1"><kbd className="font-mono bg-white border border-slate-200 rounded px-1.5 text-slate-400">Esc</kbd> đóng</span>
              </div>
              <div className="flex items-center gap-1">
                <kbd className="font-mono bg-white border border-slate-200 rounded px-1.5 text-slate-400">Ctrl/Cmd + K</kbd>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
