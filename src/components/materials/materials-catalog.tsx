"use client";

import { useMemo, useState, useEffect } from "react";
import { ArrowDownRight, ArrowUpRight, PackagePlus, Pencil, Search, Trash2, Filter, Eye, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentCard, EnterpriseTable, QuantityCell, SafeText } from "@/components/ui/enterprise";
import type { MaterialItemDto, ProjectStockDto, MaterialMovementDto } from "@/app/(dashboard)/materials/actions";
import { MaterialDetailDrawer } from "./material-detail-drawer";
import { useSearchParams, useRouter } from "next/navigation";
import { getStockStatus, formatQuantity } from "./materials-formatters";
import { MaterialRowActionMenu, type MaterialActionItem } from "./materials-ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface MaterialsCatalogProps {
  materialItems: MaterialItemDto[];
  stocks: ProjectStockDto[];
  transactions?: MaterialMovementDto[];
  onAddMaterial: () => void;
  onTransaction: (type: "IMPORT" | "EXPORT", materialId?: string) => void;
  onEditMaterial: (materialId: string) => void;
  onDeleteMaterial: (materialId: string) => void;
  onRestoreMaterial: (materialId: string) => void;
  permissions: {
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canImport: boolean;
    canExport: boolean;
  };
}

export function MaterialsCatalog({ materialItems, stocks, transactions = [], onAddMaterial, onTransaction, onEditMaterial, onDeleteMaterial, onRestoreMaterial, permissions }: MaterialsCatalogProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [selectedGroup, setSelectedGroup] = useState<string>(searchParams.get("group") || "ALL");
  const [selectedStockStatus, setSelectedStockStatus] = useState<string>(searchParams.get("stockStatus") || "ALL");
  const [selectedMaterialStatus, setSelectedMaterialStatus] = useState<string>(searchParams.get("materialStatus") || "ACTIVE");
  
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(searchParams.get("materialId"));
  const [deletingMaterial, setDeletingMaterial] = useState<MaterialItemDto | null>(null);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Sync with URL
  useEffect(() => {
    if (searchParams.has("q")) setSearch(searchParams.get("q") || "");
    if (searchParams.has("group")) setSelectedGroup(searchParams.get("group") || "ALL");
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

  const handleGroupChange = (val: string) => {
    setSelectedGroup(val);
    updateUrl({ group: val });
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
    setSelectedGroup("ALL");
    setSelectedStockStatus("ALL");
    setSelectedMaterialStatus("ACTIVE");
    updateUrl({ q: null, group: null, stockStatus: null, materialStatus: null });
  };

  const stockByMaterialId = useMemo(
    () => new Map(stocks.map((stock) => [stock.materialItemId, stock])),
    [stocks]
  );
  
  const groups = useMemo(() => {
    let sourceItems = materialItems;
    if (selectedMaterialStatus === "ACTIVE") sourceItems = materialItems.filter(m => m.isActive);
    else if (selectedMaterialStatus === "ARCHIVED") sourceItems = materialItems.filter(m => !m.isActive);
    
    const allGroups = new Set(sourceItems.map(m => m.group?.trim()).filter(Boolean));
    return Array.from(allGroups).sort((a, b) => a!.localeCompare(b!, 'vi')) as string[];
  }, [materialItems, selectedMaterialStatus]);

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = materialItems.filter((material) => {
    const stock = stockByMaterialId.get(material.id);

    if (selectedMaterialStatus === "ACTIVE" && !material.isActive) return false;
    if (selectedMaterialStatus === "ARCHIVED" && material.isActive) return false;
    
    // Group filter
    if (selectedGroup !== "ALL" && material.group !== selectedGroup && (selectedGroup !== "UNGROUPED" || material.group)) {
      return false;
    }

    // Stock Status filter
    if (selectedStockStatus !== "ALL") {
      const currentStock = stock ? stock.stock : 0;
      const minStock = stock ? stock.minStockLevel : 0;
      const status = getStockStatus(currentStock, minStock);
      
      if (selectedStockStatus === "HEALTHY" && status !== "healthy") return false;
      if (selectedStockStatus === "LOW" && status !== "low") return false;
      if (selectedStockStatus === "OUT" && status !== "out") return false;
      if (selectedStockStatus === "NEGATIVE" && currentStock >= 0) return false;
    }

    // Search filter
    if (!normalizedSearch) return true;
    return [material.code, material.name, material.group || ""].some((value) =>
      value.toLowerCase().includes(normalizedSearch)
    );
  });

  const hasFilters = search !== "" || selectedGroup !== "ALL" || selectedStockStatus !== "ALL" || selectedMaterialStatus !== "ACTIVE";

  const hasActions = permissions.canImport || permissions.canExport || permissions.canUpdate || permissions.canDelete;

  const renderActions = (material: MaterialItemDto, stock?: ProjectStockDto) => {
    if (!hasActions) return null;

    const actions: MaterialActionItem[] = [
      {
        label: "Xem chi tiết",
        icon: <Eye className="w-4 h-4" />,
        onClick: () => handleRowClick(material.id),
      }
    ];

    if (permissions.canImport) {
      actions.push({
        label: "Nhập kho",
        icon: <ArrowDownRight className="w-4 h-4" />,
        onClick: () => onTransaction("IMPORT", material.id),
        disabled: !material.isActive,
        disabledReason: "Vật tư đã lưu trữ",
      });
    }

    if (permissions.canExport) {
      actions.push({
        label: "Xuất kho",
        icon: <ArrowUpRight className="w-4 h-4" />,
        onClick: () => onTransaction("EXPORT", material.id),
        disabled: !material.isActive || !stock || stock.stock <= 0,
        disabledReason: "Không có tồn kho",
      });
    }

    if (permissions.canUpdate) {
      actions.push({
        label: "Sửa vật tư",
        icon: <Pencil className="w-4 h-4" />,
        onClick: () => onEditMaterial(material.id),
      });
    }

    if (!material.isActive && permissions.canUpdate) {
      actions.push({
        label: "Khôi phục vật tư",
        icon: <RotateCcw className="w-4 h-4" />,
        onClick: () => onRestoreMaterial(material.id),
      });
    }

    if (permissions.canDelete && material.isActive) {
      actions.push({
        label: "Xóa vật tư",
        icon: <Trash2 className="w-4 h-4" />,
        danger: true,
        onClick: () => {
          setDeletingMaterial(material);
        },
      });
    }

    return (
      <div className="flex justify-end">
        <MaterialRowActionMenu actions={actions} />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* HEADER METADATA */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
          <span className="font-semibold text-[var(--foreground)]">{filtered.length}</span> vật tư
        </div>
        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
          <span className="font-semibold text-[var(--foreground)]">{groups.length}</span> nhóm
        </div>
        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
        <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
          <span className="font-semibold text-[var(--foreground)]">{materialItems.filter((item) => !item.isActive).length}</span> đã lưu trữ
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
              {selectedGroup !== "ALL" && (
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[11px] font-medium">
                  Nhóm: {selectedGroup === "UNGROUPED" ? "Chưa phân loại" : selectedGroup}
                  <X className="h-3 w-3 cursor-pointer hover:text-blue-900" onClick={() => handleGroupChange("ALL")} />
                </span>
              )}
              {selectedStockStatus !== "ALL" && (
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[11px] font-medium">
                  Tồn kho: {selectedStockStatus === "HEALTHY" ? "Đủ hàng" : selectedStockStatus === "LOW" ? "Sắp hết" : selectedStockStatus === "OUT" ? "Hết hàng" : "Âm kho"}
                  <X className="h-3 w-3 cursor-pointer hover:text-blue-900" onClick={() => handleStockStatusChange("ALL")} />
                </span>
              )}
              {selectedMaterialStatus !== "ACTIVE" && (
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[11px] font-medium">
                  Trạng thái: {selectedMaterialStatus === "ARCHIVED" ? "Đã lưu trữ" : "Tất cả"}
                  <X className="h-3 w-3 cursor-pointer hover:text-blue-900" onClick={() => handleMaterialStatusChange("ACTIVE")} />
                </span>
              )}
              <button onClick={clearFilters} className="text-[11px] font-semibold text-[var(--muted-foreground)] hover:text-slate-900 transition-colors ml-1">
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
            <label htmlFor="materials-catalog-search" className="sr-only">Tìm danh mục vật tư</label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)] opacity-70" />
            <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
              id="materials-catalog-search"
              type="text"
              placeholder="Tìm mã, tên hoặc nhóm..."
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
            <Button onClick={onAddMaterial} className="w-full sm:w-auto shrink-0 shadow-sm bg-blue-600 hover:bg-blue-700 text-white">
              <PackagePlus className="h-4 w-4 mr-2" />
              Thêm vật tư
            </Button>
          )}
        </div>

        {/* Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-[var(--surface-subtle)] border border-[var(--border)] rounded-[var(--radius-lg)] animate-in fade-in slide-in-from-top-2">
            <div className="relative min-w-0">
              <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1.5 block uppercase tracking-wider">Nhóm vật tư</label>
              <select
                value={selectedGroup}
                onChange={(e) => handleGroupChange(e.target.value)}
                className="h-9 w-full appearance-none rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 text-sm font-medium text-[var(--foreground)] outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả nhóm</option>
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
                <option value="UNGROUPED">Chưa phân loại</option>
              </select>
            </div>

            <div className="relative min-w-0">
              <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1.5 block uppercase tracking-wider">Tình trạng tồn kho</label>
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
              <label className="text-[11px] font-semibold text-[var(--muted-foreground)] mb-1.5 block uppercase tracking-wider">Trạng thái dữ liệu</label>
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
              <th className="px-3 py-2.5 border-b border-[var(--border)] whitespace-nowrap">Nhóm</th>
              <th className="px-3 py-2.5 border-b border-[var(--border)] text-right whitespace-nowrap">Tồn kho</th>
              {hasActions && <th className="px-3 py-2.5 border-b border-[var(--border)] text-right w-[80px] whitespace-nowrap">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((material) => {
              const stock = stockByMaterialId.get(material.id);
              return (
                <tr 
                  key={material.id} 
                  className="transition hover:bg-[var(--surface-subtle)] cursor-pointer group active:bg-[var(--border)] h-12"
                  onClick={() => handleRowClick(material.id)}
                >
                  <td className="px-3 py-2 font-mono text-xs font-semibold text-[var(--muted-foreground)] whitespace-nowrap">{material.code}</td>
                  <td className="px-3 py-2 font-semibold text-slate-950 max-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <SafeText className="group-hover:text-blue-700 transition-colors line-clamp-1">{material.name}</SafeText>
                      {!material.isActive && (
                        <span className="shrink-0 rounded-sm border border-[var(--border)] bg-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
                          Đã lưu trữ
                        </span>
                      )}
                      {material.description?.includes("[CREATED_FROM_REQUEST:") && (
                        <span 
                          title={`Tạo từ đề xuất. Tổng duyệt: ${formatQuantity(material.approvedProposalQuantity || 0)} ${material.unit}. Đã nhập kho: ${formatQuantity(material.importedFromProposalQuantity || 0)} ${material.unit}.`}
                          className="shrink-0 rounded-sm border border-blue-200 bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[10px] font-medium"
                        >
                          Từ đề xuất
                        </span>
                      )}
                      {material.importedFromProposalQuantity !== undefined && material.importedFromProposalQuantity > 0 && !material.description?.includes("[CREATED_FROM_REQUEST:") && (
                        <span 
                          title={`Đã nhập kho từ đề xuất: ${formatQuantity(material.importedFromProposalQuantity)} ${material.unit}.`}
                          className="shrink-0 rounded-sm border border-emerald-200 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[10px] font-medium"
                        >
                          Đã nhập từ đề xuất
                        </span>
                      )}
                      {material.pendingProposalQuantity !== undefined && material.pendingProposalQuantity > 0 && (
                        <span 
                          title={`Đang có đề xuất chờ duyệt ${formatQuantity(material.pendingProposalQuantity)} ${material.unit}.`}
                          className="shrink-0 rounded-sm border border-indigo-200 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 text-[10px] font-medium"
                        >
                          Có đề xuất chờ duyệt
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[var(--muted-foreground)] whitespace-nowrap">{material.unit}</td>
                  <td className="px-3 py-2 text-[var(--muted-foreground)] truncate max-w-[120px]">{material.group || "—"}</td>
                  <td className="px-3 py-2">
                    <QuantityCell value={stock ? stock.stock : 0} unit={material.unit} />
                  </td>
                  {hasActions && (
                    <td className="px-3 py-2 relative text-right">
                      {renderActions(material, stock)}
                    </td>
                  )}
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
                  <div className="mt-1 flex flex-wrap gap-1">
                    {!material.isActive && (
                      <span className="inline-flex rounded-sm border border-[var(--border)] bg-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
                        Đã lưu trữ
                      </span>
                    )}
                    {material.description?.includes("[CREATED_FROM_REQUEST:") && (
                      <span 
                        title={`Tạo từ đề xuất. Tổng duyệt: ${formatQuantity(material.approvedProposalQuantity || 0)} ${material.unit}. Đã nhập kho: ${formatQuantity(material.importedFromProposalQuantity || 0)} ${material.unit}.`}
                        className="inline-flex rounded-sm border border-blue-200 bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[10px] font-medium"
                      >
                        Từ đề xuất
                      </span>
                    )}
                    {material.importedFromProposalQuantity !== undefined && material.importedFromProposalQuantity > 0 && !material.description?.includes("[CREATED_FROM_REQUEST:") && (
                      <span 
                        title={`Đã nhập kho từ đề xuất: ${formatQuantity(material.importedFromProposalQuantity)} ${material.unit}.`}
                        className="inline-flex rounded-sm border border-emerald-200 bg-emerald-50 text-emerald-700 px-1.5 py-0.5 text-[10px] font-medium"
                      >
                        Đã nhập từ đề xuất
                      </span>
                    )}
                    {material.pendingProposalQuantity !== undefined && material.pendingProposalQuantity > 0 && (
                      <span 
                        title={`Đang có đề xuất chờ duyệt ${formatQuantity(material.pendingProposalQuantity)} ${material.unit}.`}
                        className="inline-flex rounded-sm border border-indigo-200 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 text-[10px] font-medium"
                      >
                        Có đề xuất chờ duyệt
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-mono text-xs font-semibold text-[var(--muted-foreground)]">{material.code}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-2">
                  <div className="text-xs font-semibold text-[var(--muted-foreground)]">Đơn vị</div>
                  <div className="mt-1 font-bold text-[var(--foreground)] truncate">{material.unit}</div>
                </div>
                <div className="rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-2">
                  <div className="text-xs font-semibold text-[var(--muted-foreground)]">Nhóm</div>
                  <div className="mt-1 font-bold text-[var(--foreground)] truncate">{material.group || "-"}</div>
                </div>
                <div className="rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-2 text-right">
                  <div className="text-xs font-semibold text-[var(--muted-foreground)]">Tồn kho</div>
                  <div className="mt-1 font-mono font-bold text-[var(--foreground)]">
                    <QuantityCell value={stock ? stock.stock : 0} />
                  </div>
                </div>
              </div>
              {hasActions && <div className="mt-4 border-t border-[var(--border)] pt-3 flex justify-end">{renderActions(material, stock)}</div>}
            </ContentCard>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-[var(--radius-md)] lg:rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm text-[var(--muted-foreground)]">
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
          </div>
        )}
      </div>
      
      {/* DRAWER */}
      {selectedMaterialId && (
        <MaterialDetailDrawer
          material={materialItems.find(m => m.id === selectedMaterialId) || null}
          projectId={searchParams.get("projectId") || ""}
          stock={stockByMaterialId.get(selectedMaterialId)}
          recentTransactions={transactions.filter(t => t.materialItemId === selectedMaterialId).slice(0, 5)}
          onClose={closeDrawer}
          onEdit={() => onEditMaterial(selectedMaterialId)}
          onDelete={() => {
            const material = materialItems.find(m => m.id === selectedMaterialId);
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
