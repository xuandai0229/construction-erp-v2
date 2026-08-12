"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PortfolioCatalogItemDto } from "@/app/(dashboard)/materials/actions";
import { ContentCard, SafeText } from "@/components/ui/enterprise";
import { StockStatusBadge } from "./materials-badges";
import { formatManufacturerOrigin, formatQuantity } from "./materials-formatters";

interface MaterialsPortfolioCatalogProps {
  catalog: PortfolioCatalogItemDto[];
  onSelectProject: (projectId: string) => void;
}

export function MaterialsPortfolioCatalog({ catalog, onSelectProject }: MaterialsPortfolioCatalogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const view = searchParams.get("catalogView") === "material" ? "material" : "project";
  const expanded = searchParams.get("catalogMaterial") || "";

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(changes).forEach(([key, value]) => value ? next.set(key, value) : next.delete(key));
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (query === (searchParams.get("q") || "")) return;
    const timer = window.setTimeout(() => update({ q: query }), 250);
    return () => window.clearTimeout(timer);
  }, [query, searchParams]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("vi-VN");
    if (!term) return catalog;
    return catalog.filter((item) => [item.name, item.code, item.unit, item.manufacturer, item.origin]
      .filter(Boolean)
      .some((value) => String(value).toLocaleLowerCase("vi-VN").includes(term)));
  }, [catalog, query]);

  const projects = useMemo(() => {
    const result = new Map<string, { id: string; name: string; entries: Array<{ item: PortfolioCatalogItemDto; stock: PortfolioCatalogItemDto["projectsBreakdown"][number] }> }>();
    filtered.forEach((item) => item.projectsBreakdown.forEach((stock) => {
      const project = result.get(stock.projectId) || { id: stock.projectId, name: stock.projectName, entries: [] };
      project.entries.push({ item, stock });
      result.set(stock.projectId, project);
    }));
    return [...result.values()].sort((left, right) => left.name.localeCompare(right.name, "vi"));
  }, [filtered]);

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] sm:flex-row sm:items-center">
      <label className="relative min-w-0 flex-1"><span className="sr-only">Tìm danh mục vật tư</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo mã, tên, hãng sản xuất hoặc xuất xứ..." className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
      <div className="inline-flex h-10 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-1"><button type="button" onClick={() => update({ catalogView: "project", catalogMaterial: "" })} className={`rounded-md px-3 text-sm font-semibold ${view === "project" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}>Theo công trình</button><button type="button" onClick={() => update({ catalogView: "material" })} className={`rounded-md px-3 text-sm font-semibold ${view === "material" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}>Theo vật tư</button></div>
    </div>

    {view === "project" ? <div className="space-y-4">{projects.map((project) => <ContentCard key={project.id} className="overflow-hidden"><button type="button" onClick={() => onSelectProject(project.id)} className="flex w-full items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 text-left transition hover:bg-slate-50 sm:px-5"><SafeText className="line-clamp-2 text-base font-bold leading-5 text-slate-950">{project.name}</SafeText><span className="shrink-0 text-sm text-[var(--muted-foreground)]">{project.entries.length} loại vật tư</span></button><div className="hidden grid-cols-[minmax(220px,1fr)_100px_190px_140px] border-b border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] sm:grid"><span>Tên vật tư</span><span>Đơn vị</span><span>Hãng sản xuất / xuất xứ</span><span className="text-right">Tồn kho</span></div><div className="divide-y divide-slate-100">{project.entries.map(({ item, stock }) => <div key={stock.materialItemId} className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-[minmax(220px,1fr)_100px_190px_140px] sm:items-center sm:px-5"><SafeText className="font-semibold text-slate-900">{item.name}</SafeText><span className="text-[var(--muted-foreground)]">{item.unit}</span><span className="text-[var(--muted-foreground)]">{formatManufacturerOrigin(item.manufacturer, item.origin, "Chưa cập nhật")}</span><span className="font-mono font-bold tabular-nums sm:text-right">{formatQuantity(stock.stock)} <span className="font-sans text-xs font-medium text-[var(--muted-foreground)]">{item.unit}</span></span></div>)}</div></ContentCard>)}{projects.length === 0 && <ContentCard className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">Không tìm thấy vật tư phù hợp.</ContentCard>}</div> : <ContentCard className="overflow-hidden"><div className="divide-y divide-slate-100">{filtered.map((item) => { const isOpen = expanded === item.identity; return <div key={item.identity}><button type="button" onClick={() => update({ catalogMaterial: isOpen ? "" : item.identity })} className="grid w-full gap-2 px-4 py-4 text-left transition hover:bg-slate-50 sm:grid-cols-[minmax(240px,1fr)_120px_150px] sm:items-center sm:px-5"><div className="flex min-w-0 items-center gap-2"><ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} /><div><SafeText className="font-semibold text-slate-900">{item.name}</SafeText><p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{item.unit} · {formatManufacturerOrigin(item.manufacturer, item.origin, "Chưa cập nhật")}</p></div></div><span className="text-sm text-[var(--muted-foreground)]">{item.projectCount} công trình</span><span className="font-mono font-bold tabular-nums sm:text-right">{formatQuantity(item.totalStock)} <span className="font-sans text-xs font-medium text-[var(--muted-foreground)]">{item.unit}</span></span></button>{isOpen && <div className="border-t border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-3 sm:px-5"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Công trình liên quan</p><div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">{item.projectsBreakdown.map((project) => <button type="button" key={project.materialItemId} onClick={() => onSelectProject(project.projectId)} className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left hover:bg-slate-50"><SafeText className="line-clamp-2 font-medium text-slate-900">{project.projectName}</SafeText><div className="flex shrink-0 items-center gap-3"><span className="font-mono text-sm font-bold">{formatQuantity(project.stock)} {item.unit}</span><StockStatusBadge stock={project.stock} minStockLevel={project.minStockLevel} compact /></div></button>)}</div></div>}</div>; })}</div></ContentCard>}
  </div>;
}
