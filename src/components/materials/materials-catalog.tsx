"use client";

import { useMemo, useState, useEffect } from "react";
import { ArrowDownRight, ArrowUpRight, PackagePlus, Pencil, Search, Trash2, Filter, Eye, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentCard, EnterpriseTable, QuantityCell, SafeText } from "@/components/ui/enterprise";
import type { MaterialItemDto, ProjectStockDto, MaterialMovementDto } from "@/app/(dashboard)/materials/actions";
import { MaterialDetailDrawer } from "./material-detail-drawer";
import { useSearchParams, useRouter } from "next/navigation";
import { getStockStatus } from "./materials-formatters";
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
        <div className="flex items-center gap-1.5 text-slate-600">
          <span className="font-semibold text-slate-900">{filtered.length}</span> vật tư
        </div>
        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <span className="font-semibold text-slate-900">{groups.length}</span> nhóm
        </div>
        <div className="w-1 h-1 rounded-full bg-slate-300"></div>
        <div className="flex items-center gap-1.5 text-slate-600">
          <span className="font-semibold text-slate-900">{materialItems.filter((item) => !item.isActive).length}</span> đã lưu trữ
        </div>
        {hasFilters && (
          <>
            <div className="w-1 h-1 rounded-full bg-slate-300"></div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full text-xs">Đang lọc kết quả</span>
              <button onClick={clearFilters} className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1">
                <X className="h-3.5 w-3.5" /> Xóa lọc
              </button>
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <div className="flex flex-col sm:flex-row flex-1 gap-3 max-w-3xl">
          <div className="relative min-w-0 flex-1">
            <label htmlFor="materials-catalog-search" className="sr-only">Tìm danh mục vật tư</label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
              id="materials-catalog-search"
              type="text"
              placeholder="Tìm mã, tên hoặc nhóm..."
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          
          <div className="relative min-w-0 sm:w-48 shrink-0">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedGroup}
              onChange={(e) => handleGroupChange(e.target.value)}
              className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-9 pr-8 text-sm font-medium text-slate-900 outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">Tất cả nhóm</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
              <option value="UNGROUPED">Chưa phân loại</option>
            </select>
          </div>

          <div className="relative min-w-0 sm:w-48 shrink-0">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedStockStatus}
              onChange={(e) => handleStockStatusChange(e.target.value)}
              className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-9 pr-8 text-sm font-medium text-slate-900 outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="HEALTHY">Đủ hàng</option>
              <option value="LOW">Sắp hết</option>
              <option value="OUT">Hết hàng</option>
              <option value="NEGATIVE">Âm kho</option>
            </select>
          </div>

          <div className="relative min-w-0 sm:w-48 shrink-0">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              value={selectedMaterialStatus}
              onChange={(e) => handleMaterialStatusChange(e.target.value)}
              className="h-10 w-full appearance-none rounded-lg border border-slate-300 bg-white pl-9 pr-8 text-sm font-medium text-slate-900 outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              aria-label="Lọc trạng thái vật tư"
            >
              <option value="ACTIVE">Đang sử dụng</option>
              <option value="ARCHIVED">Đã lưu trữ</option>
              <option value="ALL">Tất cả trạng thái</option>
            </select>
          </div>
        </div>

        {permissions.canCreate && materialItems.length > 0 && (
          <Button onClick={onAddMaterial} className="w-full md:w-auto shrink-0">
            <PackagePlus className="h-4 w-4 mr-2" />
            Thêm vật tư
          </Button>
        )}
      </div>

      <EnterpriseTable className="hidden md:block" data-density="compact">
        <table className="w-full text-left text-sm relative">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur shadow-sm text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-3 py-2.5 border-b border-slate-200">Mã VT</th>
              <th className="px-3 py-2.5 border-b border-slate-200 w-1/3">Tên vật tư</th>
              <th className="px-3 py-2.5 border-b border-slate-200">Đơn vị</th>
              <th className="px-3 py-2.5 border-b border-slate-200">Nhóm</th>
              <th className="px-3 py-2.5 border-b border-slate-200 text-right">Tồn kho</th>
              {hasActions && <th className="px-3 py-2.5 border-b border-slate-200 text-right w-[80px] whitespace-nowrap">Thao tác</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((material) => {
              const stock = stockByMaterialId.get(material.id);
              return (
                <tr 
                  key={material.id} 
                  className="transition hover:bg-slate-50 cursor-pointer group active:bg-slate-100 h-12"
                  onClick={() => handleRowClick(material.id)}
                >
                  <td className="px-3 py-2 font-mono text-xs font-semibold text-slate-500 whitespace-nowrap">{material.code}</td>
                  <td className="px-3 py-2 font-semibold text-slate-950 max-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <SafeText className="group-hover:text-blue-700 transition-colors line-clamp-1">{material.name}</SafeText>
                      {!material.isActive && (
                        <span className="shrink-0 rounded-sm border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                          Đã lưu trữ
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{material.unit}</td>
                  <td className="px-3 py-2 text-slate-600 truncate max-w-[120px]">{material.group || "—"}</td>
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
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
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
                  {!material.isActive && (
                    <span className="mt-1 inline-flex rounded-sm border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                      Đã lưu trữ
                    </span>
                  )}
                  <div className="mt-1 font-mono text-xs font-semibold text-slate-500">{material.code}</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-xs font-semibold text-slate-500">Đơn vị</div>
                  <div className="mt-1 font-bold text-slate-900 truncate">{material.unit}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-xs font-semibold text-slate-500">Nhóm</div>
                  <div className="mt-1 font-bold text-slate-900 truncate">{material.group || "-"}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2 text-right">
                  <div className="text-xs font-semibold text-slate-500">Tồn kho</div>
                  <div className="mt-1 font-mono font-bold text-slate-900">
                    <QuantityCell value={stock ? stock.stock : 0} />
                  </div>
                </div>
              </div>
              {hasActions && <div className="mt-4 border-t border-slate-100 pt-3 flex justify-end">{renderActions(material, stock)}</div>}
            </ContentCard>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-[14px] lg:rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
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
