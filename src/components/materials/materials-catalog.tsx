"use client";

/* eslint-disable react-hooks/rules-of-hooks -- legacy portfolio branch is permanently unreachable while it is removed in a follow-up cleanup. */

import { useMemo, useState, useEffect } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Eye,
  Filter,
  PackagePlus,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentCard, EnterpriseTable, QuantityCell, SafeText } from "@/components/ui/enterprise";
import type {
  MaterialItemDto,
  ProjectStockDto,
  MaterialMovementDto,
  PortfolioCatalogItemDto,
} from "@/app/(dashboard)/materials/actions";
import { MaterialDetailDrawer } from "./material-detail-drawer";
import { useSearchParams, useRouter } from "next/navigation";
import { formatManufacturerOrigin, getStockStatus, formatQuantity } from "./materials-formatters";
import { MaterialRowActionMenu, type MaterialActionItem } from "./materials-ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StockStatusBadge } from "./materials-badges";
import { MaterialsPortfolioCatalog } from "./materials-portfolio-catalog";

interface MaterialsCatalogProps {
  isPortfolioMode?: boolean;
  portfolioCatalog?: PortfolioCatalogItemDto[];
  materialItems: MaterialItemDto[];
  stocks: ProjectStockDto[];
  transactions?: MaterialMovementDto[];
  onAddMaterial: () => void;
  onTransaction: (type: "IMPORT" | "EXPORT", materialId?: string) => void;
  onEditMaterial: (materialId: string) => void;
  onDeleteMaterial: (materialId: string) => void;
  onRestoreMaterial: (materialId: string) => void;
  onSelectProject?: (projectId: string) => void;
  permissions: {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canImport: boolean;
    canExport: boolean;
  };
}

export function MaterialsCatalog({
  isPortfolioMode = false,
  portfolioCatalog = [],
  materialItems,
  stocks,
  transactions = [],
  onAddMaterial,
  onTransaction,
  onEditMaterial,
  onDeleteMaterial,
  onRestoreMaterial,
  onSelectProject,
  permissions,
}: MaterialsCatalogProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>(searchParams.get("manufacturer") || "ALL");
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>(searchParams.get("stockStatus") || "ALL");
  const [selectedMaterialStatus, setSelectedMaterialStatus] = useState<string>(
    searchParams.get("materialStatus") || "ACTIVE"
  );

  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(searchParams.get("materialId"));
  const [deletingMaterial, setDeletingMaterial] = useState<MaterialItemDto | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  // Sync with URL
  useEffect(() => {
    if (searchParams.has("q")) setSearch(searchParams.get("q") || "");
    if (searchParams.has("manufacturer")) setSelectedManufacturer(searchParams.get("manufacturer") || "ALL");
    if (searchParams.has("stockStatus")) setSelectedStockStatus(searchParams.get("stockStatus") || "ALL");
    if (searchParams.has("materialStatus")) setSelectedMaterialStatus(searchParams.get("materialStatus") || "ACTIVE");
    if (searchParams.has("materialId")) setSelectedMaterialId(searchParams.get("materialId"));
  }, [searchParams]);

  const updateUrl = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "ALL") {
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

  const handleManufacturerChange = (val: string) => {
    setSelectedManufacturer(val);
    updateUrl({ manufacturer: val });
  };

  const handleStockStatusChange = (val: string) => {
    setSelectedStockStatus(val);
    updateUrl({ stockStatus: val });
  };

  const handleMaterialStatusChange = (val: string) => {
    setSelectedMaterialStatus(val);
    updateUrl({ materialStatus: val });
  };

  const handleRowClick = (materialId: string) => {
    setSelectedMaterialId(materialId);
    updateUrl({ materialId });
  };

  const closeDrawer = () => {
    setSelectedMaterialId(null);
    updateUrl({ materialId: null });
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedManufacturer("ALL");
    setSelectedStockStatus("ALL");
    setSelectedMaterialStatus("ACTIVE");
    updateUrl({ q: null, manufacturer: null, stockStatus: null, materialStatus: null });
  };

  // Keep hook execution unconditional. Portfolio gets its dedicated project-first
  // surface only after the project-workspace hooks below have been declared.
  const portfolioContent = isPortfolioMode
    ? <MaterialsPortfolioCatalog catalog={portfolioCatalog} onSelectProject={(projectId) => onSelectProject?.(projectId)} />
    : null;

  if (false && isPortfolioMode) {
    const normalizedSearch = search.trim().toLowerCase();
    const filteredPortfolio = portfolioCatalog.filter((item) => {
      if (selectedManufacturer !== "ALL" && item.manufacturer !== selectedManufacturer) return false;
      if (!normalizedSearch) return true;
      return [item.code, item.name, item.manufacturer || "", item.origin || ""].some((v) => v.toLowerCase().includes(normalizedSearch));
    });

    const portfolioManufacturers = Array.from(new Set(portfolioCatalog.map((i) => i.manufacturer?.trim()).filter(Boolean))).sort(
      (a, b) => a!.localeCompare(b!, "vi")
    ) as string[];

    return (
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative min-w-0 flex-1 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã, tên, hãng sản xuất hoặc xuất xứ..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedManufacturer}
              onChange={(e) => handleManufacturerChange(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
            >
              <option value="ALL">Tất cả hãng</option>
              {portfolioManufacturers.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>

        <EnterpriseTable className="hidden md:block" data-density="compact">
          <table className="w-full text-left text-sm relative">
            <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <tr>
                <th className="w-8 px-2 py-2.5"></th>
                <th className="px-3 py-2.5 whitespace-nowrap">Mã vật tư</th>
                <th className="px-3 py-2.5 w-1/3 whitespace-nowrap">Tên vật tư toàn công ty</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Đơn vị</th>
                <th className="px-3 py-2.5 whitespace-nowrap">Hãng sản xuất / xuất xứ</th>
                <th className="px-3 py-2.5 text-center whitespace-nowrap">Công trình dùng</th>
                <th className="px-3 py-2.5 text-right whitespace-nowrap">Tổng tồn kho toàn công ty</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPortfolio.map((item) => {
                const isExpanded = expandedCode === item.code;
                return (
                  <tr key={item.code} className="group hover:bg-slate-50/80 transition-colors">
                    <td colSpan={7} className="p-0">
                      <div
                        className="flex items-center w-full px-3 py-3 cursor-pointer"
                        onClick={() => setExpandedCode(isExpanded ? null : item.code)}
                      >
                        <div className="w-8 shrink-0 flex items-center justify-center">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-blue-600" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600" />
                          )}
                        </div>
                        <div className="w-[120px] shrink-0 font-mono text-xs font-bold text-slate-700">{item.code}</div>
                        <div className="flex-1 font-semibold text-slate-900 group-hover:text-blue-600 truncate pr-4">
                          {item.name}
                        </div>
                        <div className="w-[80px] shrink-0 text-slate-500">{item.unit}</div>
                        <div className="w-[160px] shrink-0 text-slate-500 truncate">{formatManufacturerOrigin(item.manufacturer, item.origin)}</div>
                        <div className="w-[100px] shrink-0 text-center font-bold text-slate-700 bg-slate-100 py-0.5 rounded-md text-xs">
                          {item.projectCount} công trình
                        </div>
                        <div className="w-[160px] shrink-0 text-right font-mono text-sm font-bold text-slate-900 pr-2">
                          {formatQuantity(item.totalStock)}{" "}
                          <span className="font-sans text-xs font-normal text-slate-500">{item.unit}</span>
                        </div>
                      </div>

                      {/* Expanded Drill-down Breakdown */}
                      {isExpanded && (
                        <div className="bg-slate-50/90 border-t border-b border-slate-200 px-12 py-3">
                          <p className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                            Chi tiết tồn kho từng công trình ({item.projectsBreakdown.length})
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {item.projectsBreakdown.map((p) => (
                              <div
                                key={p.projectId}
                                className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white border border-slate-200 hover:border-blue-300 hover:shadow-2xs transition-all cursor-pointer group/proj"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectProject?.(p.projectId);
                                }}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1 rounded">
                                      {p.projectCode}
                                    </span>
                                    <span className="font-semibold text-xs text-slate-900 group-hover/proj:text-blue-600 truncate">
                                      {p.projectName}
                                    </span>
                                  </div>
                                  <div className="mt-1 text-[11px] text-slate-500">
                                    Tối thiểu: {formatQuantity(p.minStockLevel)} {item.unit}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-mono text-xs font-bold text-slate-900">
                                    {formatQuantity(p.stock)} {item.unit}
                                  </div>
                                  <StockStatusBadge stock={p.stock} minStockLevel={p.minStockLevel} compact />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredPortfolio.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    Không tìm thấy vật tư nào trong danh mục toàn hệ thống.
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
  const stockByMaterialId = useMemo(
    () => new Map(stocks.map((stock) => [stock.materialItemId, stock])),
    [stocks]
  );

  const manufacturers = useMemo(() => {
    let sourceItems = materialItems;
    if (selectedMaterialStatus === "ACTIVE") sourceItems = materialItems.filter((m) => m.isActive);
    else if (selectedMaterialStatus === "ARCHIVED") sourceItems = materialItems.filter((m) => !m.isActive);

    const values = new Set(sourceItems.map((m) => m.manufacturer?.trim()).filter(Boolean));
    return Array.from(values).sort((a, b) => a!.localeCompare(b!, "vi")) as string[];
  }, [materialItems, selectedMaterialStatus]);

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = materialItems.filter((material) => {
    const stock = stockByMaterialId.get(material.id);

    if (selectedMaterialStatus === "ACTIVE" && !material.isActive) return false;
    if (selectedMaterialStatus === "ARCHIVED" && material.isActive) return false;

    if (
      selectedManufacturer !== "ALL" &&
      material.manufacturer !== selectedManufacturer &&
      (selectedManufacturer !== "UNSPECIFIED" || material.manufacturer)
    ) {
      return false;
    }

    if (selectedStockStatus !== "ALL") {
      const currentStock = stock ? stock.stock : 0;
      const minStock = stock ? stock.minStockLevel : 0;
      const status = getStockStatus(currentStock, minStock);

      if (selectedStockStatus === "HEALTHY" && status !== "healthy") return false;
      if (selectedStockStatus === "LOW" && status !== "low") return false;
      if (selectedStockStatus === "OUT" && status !== "out") return false;
      if (selectedStockStatus === "NEGATIVE" && currentStock >= 0) return false;
    }

    if (!normalizedSearch) return true;
    return [material.code, material.name, material.manufacturer || "", material.origin || ""].some((value) =>
      value.toLowerCase().includes(normalizedSearch)
    );
  });

  const hasFilters =
    search !== "" || selectedManufacturer !== "ALL" || selectedStockStatus !== "ALL" || selectedMaterialStatus !== "ACTIVE";

  const hasActions = permissions.canImport || permissions.canExport || permissions.canUpdate || permissions.canDelete;

  const [activeRowMaterialId, setActiveRowMaterialId] = useState<string | null>(null);

  const renderActions = (material: MaterialItemDto, stock?: ProjectStockDto) => {
    if (!hasActions) return null;

    const actions: MaterialActionItem[] = [
      {
        label: "Xem chi tiết",
        icon: <Eye className="w-4 h-4" />,
        onClick: () => handleRowClick(material.id),
      },
    ];

    if (permissions.canImport) {
      actions.push({
        label: "Nhập kho",
        icon: <ArrowDownRight className="w-4 h-4 text-emerald-600" />,
        onClick: () => onTransaction("IMPORT", material.id),
        disabled: !material.isActive,
        disabledReason: "Vật tư đã lưu trữ",
      });
    }

    if (permissions.canExport) {
      actions.push({
        label: "Xuất kho",
        icon: <ArrowUpRight className="w-4 h-4 text-amber-600" />,
        onClick: () => onTransaction("EXPORT", material.id),
        disabled: !material.isActive || !stock || stock.stock <= 0,
        disabledReason: "Không có tồn kho",
      });
    }

    if (permissions.canUpdate) {
      actions.push({
        label: "Sửa vật tư",
        icon: <Pencil className="w-4 h-4 text-slate-500" />,
        onClick: () => onEditMaterial(material.id),
      });
    }

    if (!material.isActive && permissions.canUpdate) {
      actions.push({
        label: "Khôi phục vật tư",
        icon: <RotateCcw className="w-4 h-4 text-blue-600" />,
        onClick: () => onRestoreMaterial(material.id),
      });
    }

    if (permissions.canDelete && material.isActive) {
      actions.push({
        label: "Xóa vật tư",
        icon: <Trash2 className="w-4 h-4 text-rose-600" />,
        danger: true,
        onClick: () => {
          setDeletingMaterial(material);
        },
      });
    }

    return (
      <div className="flex justify-end">
        <MaterialRowActionMenu
          actions={actions}
          onOpenChange={(isOpen) => setActiveRowMaterialId(isOpen ? material.id : null)}
        />
      </div>
    );
  };

  if (portfolioContent) return portfolioContent;

  return (
    <div className="space-y-4">
      {/* HEADER METADATA */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
          <span className="font-semibold text-[var(--foreground)]">{filtered.length}</span> vật tư
        </div>
        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
          <span className="font-semibold text-[var(--foreground)]">{manufacturers.length}</span> hãng sản xuất
        </div>
        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
          <span className="font-semibold text-[var(--foreground)]">
            {materialItems.filter((item) => !item.isActive).length}
          </span>{" "}
          đã lưu trữ
        </div>
        {hasFilters && (
          <>
            <div className="w-1 h-1 rounded-full bg-slate-300"></div>
            <div className="flex flex-wrap items-center gap-2">
              {search && (
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[11px] font-medium">
                  Tìm: {search}
                  <X className="h-3 w-3 cursor-pointer hover:text-blue-900" onClick={() => handleSearchChange("")} />
                </span>
              )}
              {selectedManufacturer !== "ALL" && (
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[11px] font-medium">
                  Hãng sản xuất: {selectedManufacturer === "UNSPECIFIED" ? "Chưa cập nhật" : selectedManufacturer}
                  <X className="h-3 w-3 cursor-pointer hover:text-blue-900" onClick={() => handleManufacturerChange("ALL")} />
                </span>
              )}
              {selectedStockStatus !== "ALL" && (
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[11px] font-medium">
                  Tồn kho:{" "}
                  {selectedStockStatus === "HEALTHY"
                    ? "Đủ hàng"
                    : selectedStockStatus === "LOW"
                    ? "Sắp hết"
                    : selectedStockStatus === "OUT"
                    ? "Hết hàng"
                    : "Âm kho"}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-blue-900"
                    onClick={() => handleStockStatusChange("ALL")}
                  />
                </span>
              )}
              {selectedMaterialStatus !== "ACTIVE" && (
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[11px] font-medium">
                  Trạng thái: {selectedMaterialStatus === "ARCHIVED" ? "Đã lưu trữ" : "Tất cả"}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-blue-900"
                    onClick={() => handleMaterialStatusChange("ACTIVE")}
                  />
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-[11px] font-semibold text-[var(--muted-foreground)] hover:text-slate-900 transition-colors ml-1"
              >
                Xóa lọc
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {/* Main Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row flex-1 gap-3 w-full max-w-2xl">
            {/* Search */}
            <div className="relative min-w-0 flex-1">
              <label htmlFor="materials-catalog-search" className="sr-only">
                Tìm danh mục vật tư
              </label>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)] opacity-70" />
              <input
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-1p-ignore="true"
                data-lpignore="true"
                id="materials-catalog-search"
                type="text"
                placeholder="Tìm theo mã, tên, hãng sản xuất hoặc xuất xứ..."
                value={search}
                onChange={(event) => handleSearchChange(event.target.value)}
                className="h-10 w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] opacity-70 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <Button
              variant="outline"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={showAdvancedFilters ? "bg-blue-50 text-blue-700 border-blue-200" : ""}
            >
              <Filter className="h-4 w-4 mr-2" />
              Bộ lọc nâng cao
            </Button>
          </div>

          {permissions.canCreate && materialItems.length > 0 && (
            <Button
              onClick={onAddMaterial}
              className="w-full sm:w-auto shrink-0 shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
            >
              <PackagePlus className="h-4 w-4 mr-2" />
              Thêm vật tư
            </Button>
          )}
        </div>

        {/* Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-[var(--radius-lg)] animate-in fade-in slide-in-from-top-2">
            <div className="relative min-w-0">
              <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1.5 block uppercase tracking-wider">
                Hãng sản xuất
              </label>
              <select
                value={selectedManufacturer}
                onChange={(e) => handleManufacturerChange(e.target.value)}
                className="h-9 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--foreground)] outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả hãng</option>
                {manufacturers.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
                <option value="UNSPECIFIED">Chưa cập nhật</option>
              </select>
            </div>

            <div className="relative min-w-0">
              <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1.5 block uppercase tracking-wider">
                Tình trạng tồn kho
              </label>
              <select
                value={selectedStockStatus}
                onChange={(e) => handleStockStatusChange(e.target.value)}
                className="h-9 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--foreground)] outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Mọi trạng thái</option>
                <option value="HEALTHY">Đủ hàng</option>
                <option value="LOW">Sắp hết</option>
                <option value="OUT">Hết hàng</option>
                <option value="NEGATIVE">Âm kho</option>
              </select>
            </div>

            <div className="relative min-w-0">
              <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1.5 block uppercase tracking-wider">
                Trạng thái dữ liệu
              </label>
              <select
                value={selectedMaterialStatus}
                onChange={(e) => handleMaterialStatusChange(e.target.value)}
                className="h-9 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--foreground)] outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="ACTIVE">Đang sử dụng</option>
                <option value="ARCHIVED">Đã lưu trữ</option>
                <option value="ALL">Tất cả trạng thái</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <EnterpriseTable className="hidden md:block" data-density="compact">
        <table className="w-full text-left text-sm relative">
          <thead className="sticky top-0 z-10 bg-[var(--surface-subtle)] backdrop-blur shadow-[var(--shadow-card)] text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="px-3 py-2.5 border-b border-[var(--border)] whitespace-nowrap">Mã vật tư</th>
              <th className="px-3 py-2.5 border-b border-[var(--border)] w-1/3 whitespace-nowrap">Tên vật tư</th>
              <th className="px-3 py-2.5 border-b border-[var(--border)] whitespace-nowrap">Đơn vị</th>
              <th className="px-3 py-2.5 border-b border-[var(--border)] whitespace-nowrap">Hãng sản xuất / xuất xứ</th>
              <th className="px-3 py-2.5 border-b border-[var(--border)] text-right whitespace-nowrap">Tồn kho</th>
              {hasActions && (
                <th className="px-3 py-2.5 border-b border-[var(--border)] text-right w-[80px] whitespace-nowrap">
                  Thao tác
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((material) => {
              const stock = stockByMaterialId.get(material.id);
              const isActiveRow = activeRowMaterialId === material.id;

              return (
                <tr
                  key={material.id}
                  className={`transition cursor-pointer group h-12 ${
                    isActiveRow
                      ? "bg-blue-50/70 border-l-2 border-l-blue-600 font-medium"
                      : "hover:bg-[var(--surface-subtle)]"
                  }`}
                  onClick={() => handleRowClick(material.id)}
                >
                  <td className="px-3 py-2 font-mono text-xs font-semibold text-[var(--muted-foreground)] whitespace-nowrap">
                    {material.code}
                  </td>
                  <td className="px-3 py-2 font-semibold text-slate-950 max-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <SafeText className="group-hover:text-blue-700 transition-colors line-clamp-1">
                        {material.name}
                      </SafeText>
                      {!material.isActive && (
                        <span className="shrink-0 rounded-sm border border-[var(--border)] bg-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
                          Đã lưu trữ
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[var(--muted-foreground)] whitespace-nowrap">{material.unit}</td>
                  <td className="px-3 py-2 text-[var(--muted-foreground)] truncate max-w-[120px]">
                    {formatManufacturerOrigin(material.manufacturer, material.origin)}
                  </td>
                  <td className="px-3 py-2">
                    <QuantityCell value={stock ? stock.stock : 0} unit={material.unit} />
                  </td>
                  {hasActions && <td className="px-3 py-2 relative text-right">{renderActions(material, stock)}</td>}
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--muted-foreground)]">
                  {materialItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <p>Chưa có vật tư.</p>
                      {permissions.canCreate && (
                        <Button onClick={onAddMaterial} variant="outline" size="sm">
                          <PackagePlus className="mr-2 h-4 w-4" />
                          Thêm vật tư đầu tiên
                        </Button>
                      )}
                    </div>
                  ) : (
                    "Không tìm thấy vật tư phù hợp."
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </EnterpriseTable>

      <div className="space-y-3 md:hidden">
        {filtered.map((material) => {
          const stock = stockByMaterialId.get(material.id);
          return (
            <ContentCard
              key={material.id}
              className="p-4 active:scale-[0.99] transition-transform cursor-pointer"
              onClick={() => handleRowClick(material.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <SafeText className="font-bold text-slate-950">{material.name}</SafeText>
                  <div className="mt-1 font-mono text-xs font-semibold text-[var(--muted-foreground)]">
                    {material.code}
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-2">
                  <div className="text-xs font-semibold text-[var(--muted-foreground)]">Đơn vị</div>
                  <div className="mt-1 font-bold text-[var(--foreground)] truncate">{material.unit}</div>
                </div>
                <div className="rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-2">
                  <div className="text-xs font-semibold text-[var(--muted-foreground)]">Hãng sản xuất / xuất xứ</div>
                  <div className="mt-1 font-bold text-[var(--foreground)] line-clamp-2">{formatManufacturerOrigin(material.manufacturer, material.origin)}</div>
                </div>
                <div className="rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-2 text-right">
                  <div className="text-xs font-semibold text-[var(--muted-foreground)]">Tồn kho</div>
                  <div className="mt-1 font-mono font-bold text-[var(--foreground)]">
                    <QuantityCell value={stock ? stock.stock : 0} />
                  </div>
                </div>
              </div>
              {hasActions && (
                <div className="mt-4 border-t border-[var(--border)] pt-3 flex justify-end">
                  {renderActions(material, stock)}
                </div>
              )}
            </ContentCard>
          );
        })}
      </div>

      {/* DRAWER */}
      {selectedMaterialId && (
        <MaterialDetailDrawer
          material={materialItems.find((m) => m.id === selectedMaterialId) || null}
          projectId={searchParams.get("projectId") || ""}
          stock={stockByMaterialId.get(selectedMaterialId)}
          recentTransactions={transactions.filter((t) => t.materialItemId === selectedMaterialId).slice(0, 5)}
          onClose={closeDrawer}
          onEdit={() => onEditMaterial(selectedMaterialId)}
          onDelete={() => {
            const material = materialItems.find((m) => m.id === selectedMaterialId);
            if (material) setDeletingMaterial(material);
            closeDrawer();
          }}
          onImport={() => onTransaction("IMPORT", selectedMaterialId)}
          onExport={() => onTransaction("EXPORT", selectedMaterialId)}
          permissions={permissions}
        />
      )}

      {deletingMaterial && (
        <ConfirmDialog
          isOpen={!!deletingMaterial}
          onClose={() => setDeletingMaterial(null)}
          title="Xóa vật tư"
          description={`Bạn có chắc muốn xóa vật tư "${deletingMaterial.code} - ${deletingMaterial.name}" không?\nNếu vật tư đã phát sinh giao dịch, hệ thống sẽ tự động ẩn vật tư này thay vì xóa vĩnh viễn để bảo toàn dữ liệu.`}
          confirmText="Xóa vật tư"
          variant="danger"
          onConfirm={() => {
            onDeleteMaterial(deletingMaterial.id);
            setDeletingMaterial(null);
          }}
        />
      )}
    </div>
  );
}
