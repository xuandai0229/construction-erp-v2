"use client";

import { useMemo, useState, useEffect } from "react";
import { ArrowDownRight, ArrowUpRight, Search, AlertCircle, X, Box, Pencil, Trash2, RotateCcw } from "lucide-react";
import type { ProjectStockDto, MaterialMovementDto } from "@/app/(dashboard)/materials/actions";
import { StockStatusBadge } from "./materials-badges";
import { formatDate, getStockStatus } from "./materials-formatters";
import { ContentCard, EnterpriseTable, QuantityCell, SafeText, DateCell } from "@/components/ui/enterprise";
import { useSearchParams, useRouter } from "next/navigation";
import { StockDetailDrawer } from "./stock-detail-drawer";
import { MaterialRowActionMenu, type MaterialActionItem } from "./materials-ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

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
  stocks: ProjectStockDto[];
  transactions?: MaterialMovementDto[];
  requests?: MaterialRequestWithItems[];
  onTransaction?: (type: "IMPORT" | "EXPORT", materialId?: string) => void;
  onEditMaterial?: (materialId: string) => void;
  onDeleteMaterial?: (materialId: string) => void;
  onRestoreMaterial?: (materialId: string) => void;
  permissions: {
    canImport: boolean;
    canExport: boolean;
    canUpdate?: boolean;
    canDelete?: boolean;
  };
}

type StockFilter = "all" | "active" | "archived" | "healthy" | "low" | "out" | "negative";

const filters: { id: StockFilter; label: string }[] = [
  { id: "active", label: "Đang sử dụng" },
  { id: "all", label: "Tất cả" },
  { id: "healthy", label: "Đủ hàng" },
  { id: "low", label: "Sắp hết" },
  { id: "out", label: "Hết hàng" },
  { id: "negative", label: "Âm kho" },
  { id: "archived", label: "Đã lưu trữ" },
];

export function MaterialsStockTable({ stocks, transactions = [], requests = [], onTransaction, onEditMaterial, onDeleteMaterial, onRestoreMaterial, permissions }: MaterialsStockTableProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const urlSearch = searchParams.get("q") || "";
  const urlStatus = (searchParams.get("stockStatus") || "active").toLowerCase();
  const validStatus = filters.some(f => f.id === urlStatus) ? (urlStatus as StockFilter) : "active";
  const urlStockItemId = searchParams.get("stockItemId");

  const [search, setSearch] = useState(urlSearch);
  const [filter, setFilter] = useState<StockFilter>(validStatus);
  const [selectedStockId, setSelectedStockId] = useState<string | null>(urlStockItemId);
  const [deletingStock, setDeletingStock] = useState<ProjectStockDto | null>(null);
  
  useEffect(() => {
    setSearch(searchParams.get("q") || "");
    const newStatus = (searchParams.get("stockStatus") || "active").toLowerCase();
    setFilter(filters.some(f => f.id === newStatus) ? (newStatus as StockFilter) : "active");
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

  const handleSearchChange = (val: string) => {
    setSearch(val);
    updateUrl({ q: val });
  };

  const handleFilterChange = (val: StockFilter) => {
    setFilter(val);
    updateUrl({ stockStatus: val });
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
    setFilter("active");
    updateUrl({ q: null, stockStatus: "active" });
  };

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
    };

    const filtered = stocks.filter((stock) => {
      // Filter by search first
      const matchSearch =
        !normalizedSearch ||
        [stock.materialItem.name, stock.materialItem.code, stock.materialItem.group || ""].some((value) =>
          value.toLowerCase().includes(normalizedSearch)
        );

      if (!matchSearch) return false;

      const isActive = stock.materialItem.isActive;
      const status = getStockStatus(stock.stock, stock.minStockLevel);
      
      // Update counts only for items matching search
      if (isActive) {
        counts.active++;
        if (status === "healthy") counts.healthy++;
        if (status === "low") counts.low++;
        if (status === "out") counts.out++;
        if (status === "negative") counts.negative++;
      } else {
        counts.archived++;
      }

      // Filter by status
      if (filter === "active") return isActive;
      if (filter === "archived") return !isActive;
      if (filter === "healthy") return isActive && status === "healthy";
      if (filter === "low") return isActive && status === "low";
      if (filter === "out") return isActive && status === "out";
      if (filter === "negative") return isActive && status === "negative";
      
      return true;
    });

    return { filtered, counts };
  }, [filter, normalizedSearch, stocks]);

  const hasFilters = search !== "" || filter !== "active";

  const hasActions = permissions.canImport || permissions.canExport || permissions.canUpdate || permissions.canDelete;

  const actionButtons = (stock: ProjectStockDto) => {
    if (!hasActions) return null;
    
    const actions: MaterialActionItem[] = [
      {
        label: "Xem chi tiết",
        icon: <Search className="w-4 h-4" />,
        onClick: () => handleRowClick(stock.id),
      }
    ];

    if (permissions.canImport) {
      actions.push({
        label: "Nhập kho",
        icon: <ArrowDownRight className="w-4 h-4" />,
        onClick: () => onTransaction?.("IMPORT", stock.materialItemId),
        disabled: !stock.materialItem.isActive,
        disabledReason: "Vật tư đã lưu trữ",
      });
    }

    if (permissions.canExport) {
      actions.push({
        label: "Xuất kho",
        icon: <ArrowUpRight className="w-4 h-4" />,
        onClick: () => onTransaction?.("EXPORT", stock.materialItemId),
        disabled: !stock.materialItem.isActive || stock.stock <= 0,
        disabledReason: "Chưa có tồn kho để xuất",
      });
    }

    if (permissions.canUpdate && onEditMaterial) {
      actions.push({
        label: "Sửa vật tư",
        icon: <Pencil className="w-4 h-4" />,
        onClick: () => onEditMaterial(stock.materialItemId),
      });
    }

    if (permissions.canDelete) {
      if (stock.materialItem.isActive) {
        if (onDeleteMaterial) {
          actions.push({
            label: "Xóa vật tư",
            icon: <Trash2 className="w-4 h-4" />,
            danger: true,
            onClick: () => setDeletingStock(stock),
          });
        }
      } else {
        if (onRestoreMaterial) {
          actions.push({
            label: "Khôi phục vật tư",
            icon: <RotateCcw className="w-4 h-4" />,
            onClick: () => onRestoreMaterial(stock.materialItemId),
          });
        }
      }
    }

    return (
      <div className="flex justify-end">
        <MaterialRowActionMenu actions={actions} />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* HEADER METADATA & CONTROL CENTER */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleFilterChange("all")}>
            <Box className="w-4 h-4 text-slate-400" />
            <span>Tổng số: <span className="font-semibold text-slate-900">{counts.all}</span></span>
          </div>
          {counts.negative > 0 && (
            <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-200 cursor-pointer hover:bg-rose-100 transition-colors" onClick={() => handleFilterChange("negative")}>
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <span>Âm kho: <span className="font-semibold">{counts.negative}</span></span>
            </div>
          )}
          {counts.out > 0 && (
            <div className="flex items-center gap-1.5 text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors" onClick={() => handleFilterChange("out")}>
              <AlertCircle className="w-4 h-4 text-slate-500" />
              <span>Hết hàng: <span className="font-semibold">{counts.out}</span></span>
            </div>
          )}
          {counts.low > 0 && (
            <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors" onClick={() => handleFilterChange("low")}>
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>Sắp hết: <span className="font-semibold">{counts.low}</span></span>
            </div>
          )}
        </div>
        
        {hasFilters && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full text-xs">Đang lọc kết quả</span>
            <button onClick={clearFilters} className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1">
              <X className="h-3.5 w-3.5" /> Xóa lọc
            </button>
          </div>
        )}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-center">
        <div className="relative min-w-0">
          <label htmlFor="materials-stock-search" className="sr-only">Tìm vật tư tồn kho</label>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
            id="materials-stock-search"
            type="text"
            placeholder="Tìm mã, tên hoặc nhóm vật tư..."
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:justify-end custom-scrollbar">
          {filters.map((item) => {
            let count = 0;
            if (item.id === "all") count = counts.all;
            else if (item.id === "active") count = counts.active;
            else if (item.id === "archived") count = counts.archived;
            else if (item.id === "healthy") count = counts.healthy;
            else if (item.id === "low") count = counts.low;
            else if (item.id === "out") count = counts.out;
            else if (item.id === "negative") count = counts.negative;

            return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleFilterChange(item.id)}
              className={`h-9 whitespace-nowrap rounded-full border px-4 text-xs font-semibold transition flex items-center gap-1.5 ${
                filter === item.id
                  ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <span>{item.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${filter === item.id ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}>
                {count}
              </span>
            </button>
          )})}
        </div>
      </div>

      <EnterpriseTable className="hidden md:block" data-density="compact">
        <table className="w-full min-w-[920px] text-left text-sm relative">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur shadow-sm text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5 border-b border-slate-200">Mã VT</th>
              <th className="px-3 py-2.5 border-b border-slate-200 w-[25%]">Tên vật tư</th>
              <th className="px-3 py-2.5 border-b border-slate-200">Nhóm</th>
              <th className="px-3 py-2.5 border-b border-slate-200 text-right">Tồn kho</th>
              <th className="px-3 py-2.5 border-b border-slate-200 text-right">Ngưỡng cảnh báo</th>
              <th className="px-3 py-2.5 border-b border-slate-200 text-center">Trạng thái</th>
              <th className="px-3 py-2.5 border-b border-slate-200">Cập nhật</th>
              {hasActions && <th className="px-3 py-2.5 border-b border-slate-200 text-right w-[80px] whitespace-nowrap">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((stock) => (
              <tr 
                key={stock.id} 
                className="transition hover:bg-slate-50 cursor-pointer group active:bg-slate-100 h-12"
                onClick={() => handleRowClick(stock.id)}
              >
                <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-500 whitespace-nowrap">{stock.materialItem.code}</td>
                <td className="px-3 py-2 font-semibold text-slate-950 max-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <SafeText className="group-hover:text-blue-700 transition-colors line-clamp-1">{stock.materialItem.name}</SafeText>
                    {!stock.materialItem.isActive && (
                      <span className="shrink-0 rounded-sm border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600" title="Vật tư đã ngừng sử dụng, chỉ hiển thị để giữ lịch sử">
                        Đã lưu trữ
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-slate-600 truncate max-w-[120px]">{stock.materialItem.group || "—"}</td>
                <td className="px-3 py-2">
                  <QuantityCell value={stock.stock} unit={stock.materialItem.unit} />
                </td>
                <td className="px-3 py-2">
                  <QuantityCell value={stock.minStockLevel} unit={stock.materialItem.unit} />
                </td>
                <td className="px-3 py-2 text-center"><StockStatusBadge stock={stock.stock} minStockLevel={stock.minStockLevel} /></td>
                <td className="px-3 py-2"><DateCell value={formatDate(stock.lastUpdated)} /></td>
                {hasActions && (
                  <td className="px-3 py-2 text-right relative">
                    {actionButtons(stock)}
                  </td>
                )}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={hasActions ? 8 : 7} className="px-3 py-12 text-center text-sm text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    {filter === "low" && <p>Không có vật tư sắp hết. Kho đang an toàn.</p>}
                    {filter === "out" && <p>Không có vật tư hết hàng.</p>}
                    {filter === "negative" && <p>Không có tồn kho âm.</p>}
                    {filter === "all" || filter === "healthy" ? (
                      <p>{stocks.length === 0 ? "Chưa có dữ liệu tồn kho." : "Không tìm thấy vật tư phù hợp với bộ lọc."}</p>
                    ) : null}
                    {hasFilters && (
                      <button onClick={clearFilters} className="text-blue-600 hover:underline">Xóa bộ lọc</button>
                    )}
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
            className="p-4 active:scale-[0.99] transition-transform cursor-pointer"
            onClick={() => handleRowClick(stock.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SafeText className="font-bold text-slate-950 line-clamp-1">{stock.materialItem.name}</SafeText>
                {!stock.materialItem.isActive && (
                  <span className="mt-1 inline-flex rounded-sm border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600" title="Vật tư đã ngừng sử dụng, chỉ hiển thị để giữ lịch sử">
                    Đã lưu trữ
                  </span>
                )}
                <div className="mt-1 font-mono text-xs font-semibold text-slate-500">{stock.materialItem.code}</div>
              </div>
              <div className="shrink-0">
                <StockStatusBadge stock={stock.stock} minStockLevel={stock.minStockLevel} compact />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-500">Tồn kho</div>
                <div className="mt-1">
                  <QuantityCell value={stock.stock} unit={stock.materialItem.unit} />
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-right">
                <div className="text-xs font-semibold text-slate-500">Ngưỡng cảnh báo</div>
                <div className="mt-1">
                  <QuantityCell value={stock.minStockLevel} unit={stock.materialItem.unit} />
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-medium text-slate-500">Cập nhật: {formatDate(stock.lastUpdated)}</span>
              {hasActions && actionButtons(stock)}
            </div>
          </ContentCard>
        ))}
        {filtered.length === 0 && (
          <div className="rounded-[14px] lg:rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            {filter === "low" && <p>Không có vật tư sắp hết. Kho đang an toàn.</p>}
            {filter === "out" && <p>Không có vật tư hết hàng.</p>}
            {filter === "negative" && <p>Không có tồn kho âm.</p>}
            {filter === "all" || filter === "healthy" ? (
              <p>{stocks.length === 0 ? "Chưa có dữ liệu tồn kho." : "Không tìm thấy vật tư phù hợp với bộ lọc."}</p>
            ) : null}
            {hasFilters && (
              <button onClick={clearFilters} className="mt-3 text-blue-600 hover:underline">Xóa bộ lọc</button>
            )}
          </div>
        )}
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
