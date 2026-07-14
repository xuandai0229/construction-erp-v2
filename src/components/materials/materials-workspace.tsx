"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ClipboardList, Factory, Package } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/enterprise";
import { useRouter, useSearchParams } from "next/navigation";
import { MaterialsOverview } from "./materials-overview";
import { MaterialsStockTable } from "./materials-stock-table";
import { MaterialsTransactions } from "./materials-transactions";
import { MaterialsCatalog } from "./materials-catalog";
import { MaterialFormDialog } from "./material-form-dialog";
import { TransactionFormDialog } from "./transaction-form-dialog";
import { MaterialRequestList } from "@/components/material-request/material-request-list";

import { createMaterialItem, updateMaterialItem, deleteMaterialItem, restoreMaterialItem, createMaterialTransaction } from "@/app/(dashboard)/materials/actions";
import type { MaterialItemDto, MaterialMovementDto, ProjectStockDto } from "@/app/(dashboard)/materials/actions";
import { useToast } from "@/components/ui/toast-context";

interface MaterialsWorkspaceProps {
  projects: { id: string; name: string; code: string }[];
  materialItems: MaterialItemDto[];
  initialStocks: ProjectStockDto[];
  initialTransactions: MaterialMovementDto[];
  initialProjectId?: string;
  permissions: {
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canImport: boolean;
    canExport: boolean;
    canViewTransactions: boolean;
  };
  materialRequests?: any[];
  wbsItems?: any[];
  currentUserRole?: string;
  currentUserId?: string;
}

export function MaterialsWorkspace({
  projects,
  materialItems,
  initialStocks,
  initialTransactions,
  initialProjectId,
  permissions,
  materialRequests = [],
  wbsItems = [],
  currentUserRole,
  currentUserId,
}: MaterialsWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const activeTab = searchParams.get("tab") || "overview";
  const [projectId, setProjectId] = useState(initialProjectId || "");
  const [isMaterialFormOpen, setIsMaterialFormOpen] = useState(false);
  const [transactionFormType, setTransactionFormType] = useState<"IMPORT" | "EXPORT" | null>(null);
  const [transactionMaterialId, setTransactionMaterialId] = useState("");
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const existingGroups = Array.from(new Set(materialItems.map(m => m.group?.trim()).filter(Boolean))).sort((a, b) => a!.localeCompare(b!, 'vi')) as string[];

  useEffect(() => {
    setProjectId(initialProjectId || "");
  }, [initialProjectId]);

  useEffect(() => {
    const openTransaction = searchParams.get("openTransaction");
    if (openTransaction !== "IMPORT" && openTransaction !== "EXPORT") return;
    if (openTransaction === "IMPORT" && !permissions.canImport) return;
    if (openTransaction === "EXPORT" && !permissions.canExport) return;
    setTransactionFormType(openTransaction);
    setTransactionMaterialId(searchParams.get("materialId") || "");
  }, [permissions.canExport, permissions.canImport, searchParams]);

  const tabs = [
    { id: "overview", label: "Tổng quan", icon: ClipboardList, visible: permissions.canView },
    { id: "catalog", label: "Danh mục vật tư", icon: Package, visible: permissions.canView },
    { id: "stock", label: "Tồn kho", icon: Factory, visible: permissions.canView },
    { id: "requests", label: "Đề xuất vật tư", icon: ClipboardList, visible: permissions.canView },
    { id: "transactions", label: "Nhập / Xuất", icon: ArrowDownRight, visible: permissions.canViewTransactions },
  ].filter(t => t.visible);

  const currentTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : "overview";

  const updateUrl = (tab: string, nextProjectId = projectId, additionalParams?: Record<string, string>) => {
    const params = new URLSearchParams(); // clear all when switching tabs
    params.set("tab", tab);
    if (nextProjectId) {
      params.set("projectId", nextProjectId);
    }
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([k, v]) => params.set(k, v));
    }
    const query = params.toString();
    router.push(query ? `?${query}` : "?");
  };

  const handleCreateMaterial = async (data: {
    code?: string;
    name: string;
    unit: string;
    group?: string;
    description?: string;
    minStockLevel?: number;
    initialStock?: number;
    initialStockDate?: Date;
    initialStockNotes?: string;
  }) => {
    if (!projectId) {
      toast.error("Vui lòng chọn công trình trước");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingMaterialId) {
        await updateMaterialItem(editingMaterialId, { 
          code: data.code,
          name: data.name, 
          unit: data.unit, 
          group: data.group, 
          description: data.description,
          minStockLevel: data.minStockLevel
        });
        toast.success("Đã cập nhật vật tư");
      } else {
        await createMaterialItem({ ...data, projectId });
        if (data.initialStock && data.initialStock > 0) {
          toast.success("Đã tạo vật tư và nhập tồn kho ban đầu");
        } else {
          toast.success("Đã tạo vật tư. Tồn hiện có đang là 0. Hãy nhập kho nếu công trình đã có vật tư này.");
        }
      }
      setIsMaterialFormOpen(false);
      setEditingMaterialId(null);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
      toast.error(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMaterial = (id: string) => {
    setEditingMaterialId(id);
    setIsMaterialFormOpen(true);
  };

  const handleDeleteMaterial = async (id: string) => {
    setIsSubmitting(true);
    try {
      await deleteMaterialItem(id);
      toast.success("Đã xóa");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreMaterial = async (id: string) => {
    setIsSubmitting(true);
    try {
      await restoreMaterialItem(id);
      toast.success("ÄÃ£ khÃ´i phá»¥c váº­t tÆ°");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTransaction = async (data: {
    materialItemId: string;
    type: "IMPORT" | "EXPORT";
    quantity: number;
    unitPrice?: number;
    movementDate: Date;
    notes?: string;
  }) => {
    if (!projectId) {
      toast.error("Vui lòng chọn công trình trước");
      return;
    }

    setIsSubmitting(true);
    try {
      await createMaterialTransaction({ ...data, projectId });
      toast.success(data.type === "IMPORT" ? "Đã nhập kho" : "Đã xuất kho");
      setTransactionFormType(null);
      setTransactionMaterialId("");
      if (searchParams.get("openTransaction")) {
        const params = new URLSearchParams(searchParams);
        params.delete("openTransaction");
        params.delete("requestId");
        router.replace(`?${params.toString()}`, { scroll: false });
      }
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
      toast.error(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="app-page mx-auto max-w-[1400px] space-y-4 sm:space-y-5 pb-24">
      <PageHeader className="flex flex-col gap-2.5 sm:gap-3 py-3 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Quản lý vật tư</h1>
          <p className="mt-1 text-sm text-slate-600">
            Theo dõi danh mục, tồn kho, yêu cầu và nhập/xuất vật tư.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 w-max">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Đang xem: <span className="font-semibold text-slate-900">{projects.find(p => p.id === projectId)?.name || "—"}</span>
        </div>
      </PageHeader>

      <nav className="sticky top-0 z-30 -mx-3 px-3 sm:mx-0 sm:px-0 bg-slate-50/90 backdrop-blur-md overflow-x-auto border-b border-slate-200" aria-label="Tabs quản lý vật tư">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => updateUrl(tab.id)}
                className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-blue-600 bg-blue-50/50 text-blue-700"
                    : "border-transparent text-slate-500 hover:bg-slate-100/50 hover:text-slate-800"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      {!projectId ? (
        <EmptyState
          title="Chưa chọn công trình"
          description="Bạn cần chọn một công trình để xem dữ liệu vật tư."
          icon={<Factory className="h-8 w-8 text-slate-400" />}
        />
      ) : (
        <section className="min-h-[420px]">
          {currentTab === "overview" && (
            <MaterialsOverview
              stocks={initialStocks}
              transactions={initialTransactions}
              requests={materialRequests}
              onNavigate={(tab, params) => updateUrl(tab, projectId, params)}
              onGoToCatalog={() => updateUrl("catalog")}
              permissions={permissions}
            />
          )}
          {currentTab === "catalog" && (
            <MaterialsCatalog
              materialItems={materialItems}
              stocks={initialStocks}
              transactions={initialTransactions}
              onAddMaterial={() => {
                setEditingMaterialId(null);
                setIsMaterialFormOpen(true);
              }}
              onEditMaterial={handleEditMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              onRestoreMaterial={handleRestoreMaterial}
              permissions={permissions}
              onTransaction={(type, materialId) => {
                setTransactionFormType(type);
                setTransactionMaterialId(materialId || "");
              }}
            />
          )}
          {currentTab === "stock" && (
            <MaterialsStockTable
              stocks={initialStocks.map(stock => {
                const catalogItem = materialItems.find(m => m.id === stock.materialItemId);
                if (catalogItem) {
                  return {
                    ...stock,
                    materialItem: {
                      ...stock.materialItem,
                      importedFromProposalQuantity: catalogItem.importedFromProposalQuantity,
                      approvedProposalQuantity: catalogItem.approvedProposalQuantity,
                      pendingProposalQuantity: catalogItem.pendingProposalQuantity,
                    }
                  };
                }
                return stock;
              })}
              transactions={initialTransactions}
              requests={materialRequests}
              onTransaction={(type, materialId) => {
                setTransactionFormType(type);
                setTransactionMaterialId(materialId || "");
              }}
              onEditMaterial={handleEditMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              onRestoreMaterial={handleRestoreMaterial}
              permissions={permissions}
            />
          )}
          {currentTab === "transactions" && (
            <MaterialsTransactions
              transactions={initialTransactions}
              stocks={initialStocks}
              materialItems={materialItems}
              onAddTransaction={(type, materialId) => {
                setTransactionFormType(type || (permissions.canImport ? "IMPORT" : "EXPORT"));
                setTransactionMaterialId(materialId || "");
              }}
              hasMaterials={materialItems.some((material) => material.isActive)}
              permissions={permissions}
            />
          )}
          {currentTab === "requests" && (
            <div className="pt-2">
              <MaterialRequestList 
                projectId={projectId}
                initialRequests={materialRequests}
                wbsItems={wbsItems}
                materialItems={materialItems}
                stocks={initialStocks}
                currentUserRole={currentUserRole}
                currentUserId={currentUserId}
              />
            </div>
          )}
        </section>
      )}

      {(permissions.canCreate || permissions.canUpdate) && (
        <MaterialFormDialog
          isOpen={isMaterialFormOpen}
          onClose={() => {
            setIsMaterialFormOpen(false);
            setEditingMaterialId(null);
          }}
          onSubmit={handleCreateMaterial}
          isSubmitting={isSubmitting}
          initialData={editingMaterialId ? materialItems.find(m => m.id === editingMaterialId) : undefined}
          existingGroups={existingGroups}
        />
      )}

      {transactionFormType && (permissions.canImport || permissions.canExport) && (
        <TransactionFormDialog
          isOpen
          onClose={() => {
            setTransactionFormType(null);
            setTransactionMaterialId("");
            if (searchParams.get("openTransaction")) {
              const params = new URLSearchParams(searchParams);
              params.delete("openTransaction");
              params.delete("requestId");
              router.replace(`?${params.toString()}`, { scroll: false });
            }
          }}
          onSubmit={handleCreateTransaction}
          isSubmitting={isSubmitting}
          materialItems={materialItems}
          stocks={initialStocks}
          type={transactionFormType}
          initialMaterialId={transactionMaterialId}
          permissions={permissions}
        />
      )}
    </div>
  );
}
