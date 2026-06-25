"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Eye, PackagePlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MaterialItemDto, ProjectStockDto } from "@/app/(dashboard)/materials/actions";
import { StockStatusBadge } from "./materials-badges";
import { formatQuantity } from "./materials-formatters";

interface MaterialsCatalogProps {
  materialItems: MaterialItemDto[];
  stocks: ProjectStockDto[];
  onAddMaterial: () => void;
  onTransaction: (type: "IMPORT" | "EXPORT", materialId?: string) => void;
  onEditMaterial: (materialId: string) => void;
  onDeleteMaterial: (materialId: string) => void;
}

export function MaterialsCatalog({ materialItems, stocks, onAddMaterial, onTransaction, onEditMaterial, onDeleteMaterial }: MaterialsCatalogProps) {
  const [search, setSearch] = useState("");
  const stockByMaterialId = useMemo(
    () => new Map(stocks.map((stock) => [stock.materialItemId, stock])),
    [stocks]
  );
  const normalizedSearch = search.trim().toLowerCase();

  const filtered = materialItems.filter((material) => {

    if (!normalizedSearch) return true;
    return [material.code, material.name, material.group || ""].some((value) =>
      value.toLowerCase().includes(normalizedSearch)
    );
  });

  const renderActions = (material: MaterialItemDto, stock?: ProjectStockDto) => (
    <div className="flex flex-wrap justify-end gap-2">
      <button
        type="button"
        onClick={() => onTransaction("IMPORT", material.id)}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ArrowDownRight className="h-3.5 w-3.5" />
        Nhập
      </button>
      <button
        type="button"
        onClick={() => onTransaction("EXPORT", material.id)}
        disabled={!stock || stock.stock <= 0}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
      >
        <ArrowUpRight className="h-3.5 w-3.5" />
        Xuất
      </button>
      <div className="w-px bg-slate-200 mx-1"></div>
      <button
        type="button"
        onClick={() => onEditMaterial(material.id)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 hover:text-blue-600"
        title="Sửa vật tư"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
      </button>
      <button
        type="button"
        onClick={() => onDeleteMaterial(material.id)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600"
        title="Xóa vật tư"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,420px)_auto] md:items-center md:justify-between">
        <div className="relative">
          <label htmlFor="materials-catalog-search" className="sr-only">Tìm danh mục vật tư theo mã, tên hoặc nhóm</label>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="materials-catalog-search"
            type="text"
            placeholder="Tìm mã, tên hoặc nhóm..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <Button onClick={onAddMaterial} className="w-full md:w-auto">
          <PackagePlus className="h-4 w-4" />
          Tạo mã vật tư mới
        </Button>
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03] md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Mã VT</th>
                <th className="px-4 py-3">Tên vật tư</th>
                <th className="px-4 py-3">Đơn vị</th>
                <th className="px-4 py-3">Nhóm</th>
                <th className="px-4 py-3 text-right">Tồn tại công trình</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((material) => {
                const stock = stockByMaterialId.get(material.id);
                return (
                  <tr key={material.id} className="transition hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-500">{material.code}</td>
                    <td className="px-4 py-3 font-semibold text-slate-950">{material.name}</td>
                    <td className="px-4 py-3 text-slate-600">{material.unit}</td>
                    <td className="px-4 py-3 text-slate-600">{material.group || "Chưa phân loại"}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-950">
                      {stock ? `${formatQuantity(stock.stock)} ${material.unit}` : <span className="text-xs font-medium font-sans text-slate-400">0</span>}
                    </td>
                    <td className="px-4 py-3">{renderActions(material, stock)}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    {materialItems.length === 0 
                      ? "Công trình này chưa có vật tư."
                      : "Không tìm thấy vật tư phù hợp với từ khóa."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.map((material) => {
          const stock = stockByMaterialId.get(material.id);
          return (
            <article key={material.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/[0.03]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-bold text-slate-950">{material.name}</div>
                  <div className="mt-1 font-mono text-xs font-semibold text-slate-500">{material.code}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-xs font-semibold text-slate-500">Đơn vị</div>
                  <div className="mt-1 font-bold text-slate-900">{material.unit}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-xs font-semibold text-slate-500">Nhóm</div>
                  <div className="mt-1 truncate font-bold text-slate-900">{material.group || "-"}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2 text-right">
                  <div className="text-xs font-semibold text-slate-500">Tồn kho hiện tại</div>
                  <div className="mt-1 font-mono font-bold text-slate-900">{stock ? formatQuantity(stock.stock) : <span className="text-xs font-medium font-sans text-slate-400">0</span>}</div>
                </div>
              </div>
              <div className="mt-4">{renderActions(material, stock)}</div>
            </article>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            {materialItems.length === 0 
              ? "Công trình này chưa có vật tư."
              : "Không tìm thấy vật tư phù hợp với từ khóa."}
          </div>
        )}
      </div>
    </div>
  );
}
