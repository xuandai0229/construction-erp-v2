"use client";

/* eslint-disable react-hooks/rules-of-hooks -- legacy portfolio branch is permanently unreachable while it is removed in a follow-up cleanup. */

import { useMemo, useState, useEffect } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Search,
  AlertCircle,
  X,
  Box,
  Pencil,
  Trash2,
  RotateCcw,
  Filter,
  ExternalLink,
} from "lucide-react";
import type { ProjectStockDto, MaterialMovementDto, PortfolioStockItemDto } from "@/app/(dashboard)/materials/actions";
import { StockStatusBadge } from "./materials-badges";
import { MaterialsPortfolioStock } from "./materials-portfolio-stock";
import { formatDate, formatManufacturerOrigin, getStockStatus, formatQuantity } from "./materials-formatters";
import { ContentCard, EnterpriseTable, QuantityCell, SafeText, DateCell } from "@/components/ui/enterprise";
import { useSearchParams, useRouter } from "next/navigation";
import { StockDetailDrawer } from "./stock-detail-drawer";
import { MaterialRowActionMenu, type MaterialActionItem } from "./materials-ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";

export type MaterialRequestWithItems = {
  id: string;
  code?: string;
  requestNo?: string;
  status?: string;
  neededDate?: string | Date | null;
  createdAt?: string | Date | null;
  notes?: string | null;
  items?: Array<{
    materialItemId?: string | null;
    quantity?: number | null;
    unit?: string | null;
  }>;
};

interface MaterialsStockTableProps {
  isPortfolioMode?: boolean;
  portfolioStocks?: PortfolioStockItemDto[];
  stocks: ProjectStockDto[];
  transactions?: MaterialMovementDto[];
  requests?: MaterialRequestWithItems[];
  onTransaction?: (type: "IMPORT" | "EXPORT", materialId?: string) => void;
  onEditMaterial?: (materialId: string) => void;
  onDeleteMaterial?: (materialId: string) => void;
  onRestoreMaterial?: (materialId: string) => void;
  onSelectProject?: (projectId: string) => void;
  permissions: {
    canImport: boolean;
    canExport: boolean;
    canUpdate?: boolean;
    canDelete?: boolean;
  };
}

const statusOptions = [
  { id: "all", label: "Trạng thái" },
  { id: "healthy", label: "Đủ hàng" },
  { id: "low", label: "Sắp hết" },
  { id: "out", label: "Hết hàng" },
  { id: "negative", label: "Âm kho" },
];

const sourceOptions = [
  { id: "all", label: "Nguồn" },
  { id: "imported_proposal", label: "Nhập từ đề xuất" },
  { id: "has_proposal", label: "Có đề xuất chờ duyệt" },
];

export function MaterialsStockTable({
  isPortfolioMode = false,
  portfolioStocks = [],
  stocks,
  transactions = [],
  requests = [],
  onTransaction,
  onEditMaterial,
  onDeleteMaterial,
  onRestoreMaterial,
  onSelectProject,
  permissions,
}: MaterialsStockTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const urlSearch = searchParams.get("q") || "";
  const urlStatus = searchParams.get("stockStatus") || "all";
  const urlSource = searchParams.get("source") || "all";
  const urlArchive = searchParams.get("archive") || "active";
  const urlStockItemId = searchParams.get("stockItemId");

  const [search, setSearch] = useState(urlSearch);
  const [statusFilter, setStatusFilter] = useState(urlStatus);
  const [sourceFilter, setSourceFilter] = useState(urlSource);
  const [archiveFilter, setArchiveFilter] = useState(urlArchive);
  const [selectedStockId, setSelectedStockId] = useState<string | null>(urlStockItemId);
  const [deletingStock, setDeletingStock] = useState<ProjectStockDto | null>(null);

  useEffect(() => {
    setSearch(searchParams.get("q") || "");
    setStatusFilter(searchParams.get("stockStatus") || "all");
    setSourceFilter(searchParams.get("source") || "all");
    setArchiveFilter(searchParams.get("archive") || "active");
    setSelectedStockId(searchParams.get("stockItemId"));
  }, [searchParams]);

  const updateUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleSearchChange = (val: string) => {
    setSearch(val);
    updateUrl({ q: val });
  };

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    updateUrl({ stockStatus: val === "all" ? null : val });
  };

  const handleSourceChange = (val: string) => {
    setSourceFilter(val);
    updateUrl({ source: val === "all" ? null : val });
  };

  const handleArchiveChange = (val: string) => {
    setArchiveFilter(val);
    updateUrl({ archive: val === "active" ? null : val });
  };

  const handleRowClick = (stockId: string) => {
    setSelectedStockId(stockId);
    updateUrl({ stockItemId: stockId });
  };

  const closeDrawer = () => {
    setSelectedStockId(null);
    updateUrl({ stockItemId: null });
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setSourceFilter("all");
    setArchiveFilter("active");
    updateUrl({ q: null, stockStatus: null, source: null, archive: null });
  };

  // Keep hook execution unconditional. Portfolio gets its dedicated project-first
  // surface only after the project-workspace hooks below have been declared.
  const portfolioContent = isPortfolioMode
    ? <MaterialsPortfolioStock stocks={portfolioStocks} onSelectProject={(projectId) => onSelectProject?.(projectId)} />
    : null;

  if (false && isPortfolioMode) {
    const normalizedSearch = search.trim().toLowerCase();
    const filteredPortfolioStocks = portfolioStocks.filter((stock) => {
      if (statusFilter === "low" && !stock.warning) return false;
      if (!normalizedSearch) return true;
      return [stock.name, stock.code, stock.manufacturer || "", stock.origin || ""].some((v) => v.toLowerCase().includes(normalizedSearch));
    });

    return (
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative min-w-0 flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã hoặc tên vật tư toàn công ty..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
          >
            {statusOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <EnterpriseTable className="hidden md:block" data-density="compact">
          <table className="w-full text-left text-sm relative">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-3 py-2.5 whitespace-nowrap">Mã vật tư</th>
                <th className="px-3 py-2.5 w-1/3 whitespace-nowrap">Tên vật tư</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Số công trình</th>
                <th className="px-3 py-2.5 text-right whitespace-nowrap">Tổng tồn kho</th>
                <th className="px-3 py-2.5 text-center whitespace-nowrap">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPortfolioStocks.map((s) => (
                <tr key={s.code} className="hover:bg-slate-50 transition-colors">
                  <td className="px-3 py-3 font-mono text-xs font-bold text-slate-700 whitespace-nowrap">{s.code}</td>
                  <td className="px-3 py-3 font-semibold text-slate-900">
                    <SafeText>{s.name}</SafeText>
                  </td>
                  <td className="px-3 py-3 text-slate-600 whitespace-nowrap">
                    <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {s.projectCount} công trình
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-sm font-bold text-right text-slate-900 whitespace-nowrap">
                    {formatQuantity(s.totalStock)}{" "}
                    <span className="font-sans text-xs font-normal text-slate-500">{s.unit}</span>
                  </td>
                  <td className="px-3 py-3 text-center whitespace-nowrap">
                    {s.warning ? (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold border border-amber-200">
                        <AlertCircle className="h-3.5 w-3.5" /> {s.lowStockProjectCount} CT thiếu tồn
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-xs font-semibold border border-emerald-200">
                        Đủ hàng
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredPortfolioStocks.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                    Không tìm thấy dữ liệu tồn kho công trình phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </EnterpriseTable>
      </div>
    );
  }

  // PROJECT MODE RENDER
  const selectedStock = useMemo(
    () => stocks.find((stock) => stock.id === selectedStockId) ?? null,
    [stocks, selectedStockId]
  );

  const selectedMaterialItemId = selectedStock?.materialItemId ?? null;

  const selectedRecentTransactions = useMemo(() => {
    if (!selectedMaterialItemId) return [];
    return transactions
      .filter((transaction) => transaction.materialItemId === selectedMaterialItemId)
      .slice(0, 5);
  }, [transactions, selectedMaterialItemId]);

  const selectedRelatedRequests = useMemo(() => {
    if (!selectedMaterialItemId) return [];
    return requests.filter((request) =>
      request.items?.some((item) => item.materialItemId === selectedMaterialItemId)
    );
  }, [requests, selectedMaterialItemId]);

  const normalizedSearch = search.trim().toLowerCase();

  const { filtered, counts } = useMemo(() => {
    const counts = {
      all: stocks.length,
      active: 0,
      archived: 0,
      healthy: 0,
      low: 0,
      out: 0,
      negative: 0,
      hasProposal: 0,
      importedProposal: 0,
    };

    const filtered = stocks.filter((stock) => {
      const matchSearch =
        !normalizedSearch ||
        [stock.materialItem.name, stock.materialItem.code, stock.materialItem.manufacturer || "", stock.materialItem.origin || ""].some((value) =>
          value.toLowerCase().includes(normalizedSearch)
        );

      if (!matchSearch) return false;

      const isActive = stock.materialItem.isActive;
      const status = getStockStatus(stock.stock, stock.minStockLevel);

      if (isActive) {
        counts.active++;
        if (status === "healthy") counts.healthy++;
        if (status === "low") counts.low++;
        if (status === "out") counts.out++;
        if (status === "negative") counts.negative++;
        if (stock.materialItem.pendingProposalQuantity && stock.materialItem.pendingProposalQuantity > 0)
          counts.hasProposal++;
        if (stock.materialItem.importedFromProposalQuantity && stock.materialItem.importedFromProposalQuantity > 0)
          counts.importedProposal++;
      } else {
        counts.archived++;
      }

      if (archiveFilter === "active" && !isActive) return false;
      if (archiveFilter === "archived" && isActive) return false;

      if (statusFilter !== "all" && status !== statusFilter) return false;

      if (
        sourceFilter === "imported_proposal" &&
        (!stock.materialItem.importedFromProposalQuantity || stock.materialItem.importedFromProposalQuantity <= 0)
      )
        return false;
      if (
        sourceFilter === "has_proposal" &&
        (!stock.materialItem.pendingProposalQuantity || stock.materialItem.pendingProposalQuantity <= 0)
      )
        return false;

      return true;
    });

    return { filtered, counts };
  }, [search, statusFilter, sourceFilter, archiveFilter, stocks]);

  const hasFilters = search !== "" || statusFilter !== "all" || sourceFilter !== "all" || archiveFilter !== "active";

  const hasActions = permissions.canImport || permissions.canExport || permissions.canUpdate || permissions.canDelete;

  const [activeStockId, setActiveStockId] = useState<string | null>(null);

  const actionButtons = (stock: ProjectStockDto) => {
    if (!hasActions) return null;

    const actions: MaterialActionItem[] = [
      {
        label: "Xem chi tiết",
        icon: <Search className="w-4 h-4 text-slate-500" />,
        onClick: () => handleRowClick(stock.id),
      },
    ];

    if (permissions.canImport) {
      actions.push({
        label: "Nhập kho",
        icon: <ArrowDownRight className="w-4 h-4 text-emerald-600" />,
        onClick: () => onTransaction?.("IMPORT", stock.materialItemId),
        disabled: !stock.materialItem.isActive,
        disabledReason: "Vật tư đã lưu trữ",
      });
    }

    if (permissions.canExport) {
      actions.push({
        label: "Xuất kho",
        icon: <ArrowUpRight className="w-4 h-4 text-amber-600" />,
        onClick: () => onTransaction?.("EXPORT", stock.materialItemId),
        disabled: !stock.materialItem.isActive || stock.stock <= 0,
        disabledReason: "Chưa có tồn kho để xuất",
      });
    }

    if (permissions.canUpdate && onEditMaterial) {
      actions.push({
        label: "Sửa vật tư",
        icon: <Pencil className="w-4 h-4 text-slate-500" />,
        onClick: () => onEditMaterial(stock.materialItemId),
      });
    }

    if (permissions.canDelete) {
      if (stock.materialItem.isActive) {
        if (onDeleteMaterial) {
          actions.push({
            label: "Xóa vật tư",
            icon: <Trash2 className="w-4 h-4 text-rose-600" />,
            danger: true,
            onClick: () => setDeletingStock(stock),
          });
        }
      } else {
        if (onRestoreMaterial) {
          actions.push({
            label: "Khôi phục vật tư",
            icon: <RotateCcw className="w-4 h-4 text-blue-600" />,
            onClick: () => onRestoreMaterial(stock.materialItemId),
          });
        }
      }
    }

    return (
      <div className="flex justify-end">
        <MaterialRowActionMenu
          actions={actions}
          onOpenChange={(isOpen) => setActiveStockId(isOpen ? stock.id : null)}
        />
      </div>
    );
  };

  if (portfolioContent) return portfolioContent;

  return (
    <div className="space-y-4">
      {/* HEADER METADATA & CONTROL CENTER */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
          <span className="font-semibold text-[var(--foreground)]">{filtered.length}</span> vật tư
        </div>
        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
          <span className="font-semibold text-[var(--foreground)]">{counts.active}</span> đang sử dụng
        </div>
        {(counts.low > 0 || counts.out > 0 || counts.negative > 0) && (
          <>
            <div className="w-1 h-1 rounded-full bg-slate-300"></div>
            <div className="flex items-center gap-1.5 text-amber-700">
              <span className="font-semibold">{counts.low + counts.out + counts.negative}</span> cảnh báo
            </div>
          </>
        )}
        {hasFilters && (
          <>
            <div className="w-1 h-1 rounded-full bg-slate-300"></div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full text-xs">
                Đang lọc kết quả
              </span>
              <button
                onClick={clearFilters}
                className="text-xs font-semibold text-[var(--muted-foreground)] hover:text-[var(--foreground)] flex items-center gap-1"
              >
                <X className="h-3.5 w-3.5" /> Xóa lọc
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex flex-col sm:flex-row flex-1 gap-3 max-w-4xl">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="materials-stock-search" className="sr-only">
              Tìm vật tư tồn kho
            </label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)] opacity-70" />
            <input
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-1p-ignore="true"
              data-lpignore="true"
              id="materials-stock-search"
              type="text"
              placeholder="Tìm theo mã, tên, hãng sản xuất hoặc xuất xứ..."
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="h-10 w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] opacity-70 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="relative min-w-0 sm:w-44 shrink-0">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)] opacity-70" />
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="h-10 w-full appearance-none rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] pl-9 pr-8 text-sm font-medium text-[var(--foreground)] outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {statusOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <EnterpriseTable className="hidden md:block" data-density="compact">
        <table className="w-full min-w-[920px] text-left text-sm relative">
          <thead className="sticky top-0 z-10 bg-[var(--surface-subtle)] backdrop-blur shadow-[var(--shadow-card)] text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-3 py-2.5 border-b border-[var(--border)] whitespace-nowrap">Mã vật tư</th>
              <th className="px-3 py-2.5 border-b border-[var(--border)] w-[25%] whitespace-nowrap">Tên vật tư</th>
              <th className="px-3 py-2.5 border-b border-[var(--border)] whitespace-nowrap">Hãng sản xuất / xuất xứ</th>
              <th className="px-3 py-2.5 border-b border-[var(--border)] text-right whitespace-nowrap">Tồn kho</th>
              <th className="px-3 py-2.5 border-b border-[var(--border)] text-right whitespace-nowrap">Ngưỡng cảnh báo</th>
              <th className="px-3 py-2.5 border-b border-[var(--border)] text-center whitespace-nowrap">Trạng thái</th>
              <th className="px-3 py-2.5 border-b border-[var(--border)] whitespace-nowrap">Cập nhật</th>
              {hasActions && (
                <th className="px-3 py-2.5 border-b border-[var(--border)] text-right w-[80px] whitespace-nowrap">
                  Thao tác
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((stock) => {
              const isActiveRow = activeStockId === stock.id;
              return (
                <tr
                  key={stock.id}
                  className={`transition cursor-pointer group h-12 ${
                    isActiveRow
                      ? "bg-blue-50/70 border-l-2 border-l-blue-600 font-medium"
                      : "hover:bg-[var(--surface-subtle)]"
                  }`}
                  onClick={() => handleRowClick(stock.id)}
                >
                  <td className="px-3 py-2 font-mono text-xs font-semibold text-[var(--muted-foreground)] whitespace-nowrap">
                    {stock.materialItem.code}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-950 max-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <SafeText className="group-hover:text-blue-700 transition-colors line-clamp-1">
                        {stock.materialItem.name}
                      </SafeText>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[var(--muted-foreground)] truncate max-w-[120px]">
                    {formatManufacturerOrigin(stock.materialItem.manufacturer, stock.materialItem.origin)}
                  </td>
                  <td className="px-3 py-2">
                    <QuantityCell value={stock.stock} unit={stock.materialItem.unit} />
                  </td>
                  <td className="px-3 py-2">
                    <QuantityCell value={stock.minStockLevel} unit={stock.materialItem.unit} />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <StockStatusBadge stock={stock.stock} minStockLevel={stock.minStockLevel} />
                  </td>
                  <td className="px-3 py-2">
                    <DateCell value={formatDate(stock.lastUpdated)} />
                  </td>
                  {hasActions && <td className="px-3 py-2 text-right relative">{actionButtons(stock)}</td>}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={hasActions ? 8 : 7} className="px-3 py-12 text-center text-sm text-[var(--muted-foreground)]">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <p>Không tìm thấy vật tư phù hợp.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </EnterpriseTable>

      <div className="space-y-3 md:hidden">
        {filtered.map((stock) => (
          <ContentCard
            key={stock.id}
            className="p-3 active:scale-[0.99] transition-transform cursor-pointer"
            onClick={() => handleRowClick(stock.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SafeText className="font-bold text-slate-950 line-clamp-1">{stock.materialItem.name}</SafeText>
                <div className="mt-1 font-mono text-xs font-semibold text-[var(--muted-foreground)]">
                  {stock.materialItem.code}
                </div>
              </div>
              <div className="shrink-0">
                <StockStatusBadge stock={stock.stock} minStockLevel={stock.minStockLevel} compact />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-2.5 sm:p-3">
                <div className="text-xs font-semibold text-[var(--muted-foreground)]">Tồn kho</div>
                <div className="mt-1">
                  <QuantityCell value={stock.stock} unit={stock.materialItem.unit} />
                </div>
              </div>
              <div className="rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-2.5 sm:p-3 text-right">
                <div className="text-xs font-semibold text-[var(--muted-foreground)]">Ngưỡng cảnh báo</div>
                <div className="mt-1">
                  <QuantityCell value={stock.minStockLevel} unit={stock.materialItem.unit} />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">
                Cập nhật: {formatDate(stock.lastUpdated)}
              </span>
              {hasActions && actionButtons(stock)}
            </div>
          </ContentCard>
        ))}
      </div>

      {/* DRAWER */}
      <StockDetailDrawer
        stock={selectedStock}
        recentTransactions={selectedRecentTransactions}
        relatedRequests={selectedRelatedRequests}
        onClose={closeDrawer}
        onImport={() => {
          if (!selectedMaterialItemId) return;
          closeDrawer();
          setTimeout(() => {
            onTransaction?.("IMPORT", selectedMaterialItemId);
          }, 150);
        }}
        onExport={() => {
          if (!selectedMaterialItemId) return;
          closeDrawer();
          setTimeout(() => {
            onTransaction?.("EXPORT", selectedMaterialItemId);
          }, 150);
        }}
        permissions={permissions}
      />

      {deletingStock && onDeleteMaterial && (
        <ConfirmDialog
          isOpen={!!deletingStock}
          onClose={() => setDeletingStock(null)}
          title="Xóa vật tư"
          description={`Bạn có chắc muốn xóa vật tư "${deletingStock.materialItem.code} - ${deletingStock.materialItem.name}" không?\nNếu vật tư đã phát sinh giao dịch, hệ thống sẽ tự động ẩn vật tư này thay vì xóa vĩnh viễn để bảo toàn dữ liệu.`}
          confirmText="Xóa vật tư"
          variant="danger"
          onConfirm={() => {
            onDeleteMaterial(deletingStock.materialItemId);
            setDeletingStock(null);
          }}
        />
      )}
    </div>
  );
}
