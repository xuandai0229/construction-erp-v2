"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Search } from "lucide-react";
import type { ProjectStockDto } from "@/app/(dashboard)/materials/actions";
import { StockStatusBadge } from "./materials-badges";
import { formatDate, formatQuantity, getStockStatus } from "./materials-formatters";
import { ContentCard, EnterpriseTable } from "@/components/ui/enterprise";

interface MaterialsStockTableProps {
  stocks: ProjectStockDto[];
  onTransaction?: (type: "IMPORT" | "EXPORT", materialId?: string) => void;
  permissions: {
    canImport: boolean;
    canExport: boolean;
  };
}

type StockFilter = "ALL" | "HEALTHY" | "LOW" | "OUT";

const filters: { id: StockFilter; label: string }[] = [
  { id: "ALL", label: "Tất cả" },
  { id: "HEALTHY", label: "Đủ hàng" },
  { id: "LOW", label: "Sắp hết" },
  { id: "OUT", label: "Hết hàng" },
];

export function MaterialsStockTable({ stocks, onTransaction, permissions }: MaterialsStockTableProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StockFilter>("ALL");
  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return stocks.filter((stock) => {
      const matchSearch =
        !normalizedSearch ||
        [stock.materialItem.name, stock.materialItem.code, stock.materialItem.group || ""].some((value) =>
          value.toLowerCase().includes(normalizedSearch)
        );

      if (!matchSearch) return false;
      const status = getStockStatus(stock.stock, stock.minStockLevel);
      if (filter === "HEALTHY") return status === "healthy";
      if (filter === "LOW") return status === "low";
      if (filter === "OUT") return status === "out";
      return true;
    });
  }, [filter, normalizedSearch, stocks]);

  const hasActions = permissions.canImport || permissions.canExport;

  const actionButtons = (stock: ProjectStockDto) => {
    if (!hasActions) return null;
    return (
      <div className="flex justify-end gap-2">
        {permissions.canImport && (
          <button
            type="button"
            onClick={() => onTransaction?.("IMPORT", stock.materialItemId)}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            <ArrowDownRight className="h-3.5 w-3.5" />
            Nhập
          </button>
        )}
        {permissions.canExport && (
          <div title={stock.stock <= 0 ? "Chưa có tồn kho để xuất" : ""}>
            <button
              type="button"
              onClick={() => onTransaction?.("EXPORT", stock.materialItemId)}
              disabled={stock.stock <= 0}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              Xuất
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-center">
        <div className="relative">
          <label htmlFor="materials-stock-search" className="sr-only">Tìm vật tư tồn kho</label>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="materials-stock-search"
            type="text"
            placeholder="Tìm mã, tên hoặc nhóm vật tư..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:justify-end">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`h-9 whitespace-nowrap rounded-full border px-3 text-xs font-semibold transition ${
                filter === item.id
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <EnterpriseTable className="hidden md:block">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Mã VT</th>
              <th className="px-4 py-3">Tên vật tư</th>
              <th className="px-4 py-3">Nhóm</th>
              <th className="px-4 py-3 text-right">Tồn kho</th>
              <th className="px-4 py-3 text-right">Tồn tối thiểu</th>
              <th className="px-4 py-3 text-center">Trạng thái</th>
              <th className="px-4 py-3">Cập nhật</th>
              {hasActions && <th className="px-4 py-3 text-right">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((stock) => (
              <tr key={stock.id} className="transition hover:bg-slate-50/70">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-500">{stock.materialItem.code}</td>
                <td className="px-4 py-3 font-semibold text-slate-950">{stock.materialItem.name}</td>
                <td className="px-4 py-3 text-slate-600">{stock.materialItem.group || "Chưa phân loại"}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-slate-950">
                  {formatQuantity(stock.stock)} <span className="font-sans text-xs font-medium text-slate-500">{stock.materialItem.unit}</span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-slate-700">
                  {formatQuantity(stock.minStockLevel)} <span className="font-sans text-xs font-medium text-slate-500">{stock.materialItem.unit}</span>
                </td>
                <td className="px-4 py-3 text-center"><StockStatusBadge stock={stock.stock} minStockLevel={stock.minStockLevel} /></td>
                <td className="px-4 py-3 text-xs font-medium text-slate-500">{formatDate(stock.lastUpdated)}</td>
                {hasActions && <td className="px-4 py-3">{actionButtons(stock)}</td>}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                  {stocks.length === 0 
                    ? "Chưa có tồn kho."
                    : "Không tìm thấy vật tư phù hợp với bộ lọc."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </EnterpriseTable>

      <div className="space-y-3 md:hidden">
        {filtered.map((stock) => (
          <ContentCard key={stock.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-bold text-slate-950">{stock.materialItem.name}</div>
                <div className="mt-1 font-mono text-xs font-semibold text-slate-500">{stock.materialItem.code}</div>
              </div>
              <StockStatusBadge stock={stock.stock} minStockLevel={stock.minStockLevel} compact />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-500">Tồn kho</div>
                <div className="mt-1 font-mono text-lg font-bold text-slate-950">
                  {formatQuantity(stock.stock)} <span className="font-sans text-sm font-medium text-slate-500">{stock.materialItem.unit}</span>
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-right">
                <div className="text-xs font-semibold text-slate-500">Tồn tối thiểu</div>
                <div className="mt-1 font-mono text-lg font-bold text-slate-950">
                  {formatQuantity(stock.minStockLevel)} <span className="font-sans text-sm font-medium text-slate-500">{stock.materialItem.unit}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-500">Cập nhật {formatDate(stock.lastUpdated)}</span>
              {hasActions && actionButtons(stock)}
            </div>
          </ContentCard>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-[14px] lg:rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            {stocks.length === 0 
              ? "Chưa có tồn kho."
              : "Không tìm thấy vật tư phù hợp với bộ lọc."}
          </div>
        )}
      </div>
    </div>
  );
}
