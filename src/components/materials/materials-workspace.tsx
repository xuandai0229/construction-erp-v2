"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ClipboardList, Factory, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useRouter, useSearchParams } from "next/navigation";
import { MaterialsOverview } from "./materials-overview";
import { MaterialsStockTable } from "./materials-stock-table";
import { MaterialsTransactions } from "./materials-transactions";
import { MaterialsCatalog } from "./materials-catalog";
import { MaterialFormDialog } from "./material-form-dialog";
import { TransactionFormDialog } from "./transaction-form-dialog";
import { PurchaseRequestPlaceholder } from "./purchase-request-placeholder";

import { createMaterialItem, updateMaterialItem, deleteMaterialItem, createMaterialTransaction } from "@/app/(dashboard)/materials/actions";
import type { MaterialItemDto, MaterialMovementDto, ProjectStockDto } from "@/app/(dashboard)/materials/actions";
import { useToast } from "@/components/ui/toast-context";

interface MaterialsWorkspaceProps {
  projects: { id: string; name: string; code: string }[];
  materialItems: MaterialItemDto[];
  initialStocks: ProjectStockDto[];
  initialTransactions: MaterialMovementDto[];
  initialProjectId?: string;
  currentUser: { id: string; role?: string };
  permissions: {
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canImport: boolean;
    canExport: boolean;
    canViewTransactions: boolean;
    canViewPurchase: boolean;
  };
}

export function MaterialsWorkspace({
  projects,
  materialItems,
  initialStocks,
  initialTransactions,
  initialProjectId,
  permissions,
}: MaterialsWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const activeTab = searchParams.get("tab") || "overview";
  const [projectId, setProjectId] = useState(initialProjectId || projects[0]?.id || "");
  const [isMaterialFormOpen, setIsMaterialFormOpen] = useState(false);
  const [transactionFormType, setTransactionFormType] = useState<"IMPORT" | "EXPORT" | null>(null);
  const [transactionMaterialId, setTransactionMaterialId] = useState("");
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setProjectId(initialProjectId || projects[0]?.id || "");
  }, [initialProjectId, projects]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId),
    [projectId, projects]
  );

  const lowStockCount = useMemo(
    () => initialStocks.filter((stock) => stock.minStockLevel > 0 && stock.stock <= stock.minStockLevel).length,
    [initialStocks]
  );

  const updateUrl = (tab: string, nextProjectId = projectId) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    if (nextProjectId) params.set("projectId", nextProjectId);
    router.push(`?${params.toString()}`);
  };

  const handleProjectChange = (nextProjectId: string) => {
    setProjectId(nextProjectId);
    updateUrl(activeTab, nextProjectId);
  };

  const handleCreateMaterial = async (data: {
    code?: string;
    name: string;
    unit: string;
    group?: string;
    description?: string;
    minStockLevel?: number;
  }) => {
    if (!projectId) {
      toast.error("Vui lòng chọn công trình trước");
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingMaterialId) {
        await updateMaterialItem(editingMaterialId, { name: data.name, unit: data.unit, group: data.group, description: data.description });
        toast.success("Cập nhật vật tư thành công");
      } else {
        await createMaterialItem({ ...data, projectId });
        toast.success("Tạo vật tư thành công");
      }
      setIsMaterialFormOpen(false);
      setEditingMaterialId(null);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể lưu vật tư";
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
      toast.success("Xóa vật tư thành công");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể xóa vật tư";
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
      toast.success(data.type === "IMPORT" ? "Nhập kho thành công" : "Xuất kho thành công");
      setTransactionFormType(null);
      setTransactionMaterialId("");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tạo giao dịch";
      toast.error(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    { id: "overview", label: "Tổng quan", icon: ClipboardList, visible: permissions.canView },
    { id: "catalog", label: "Danh mục vật tư", icon: Package, visible: permissions.canView },
    { id: "stock", label: "Tồn kho", icon: Factory, visible: permissions.canView },
    { id: "transactions", label: "Nhập / Xuất", icon: ArrowDownRight, visible: permissions.canViewTransactions },
    { id: "proposals", label: "Đề xuất mua", icon: AlertTriangle, visible: permissions.canViewPurchase },
  ].filter(t => t.visible);

  return (
    <div className="app-page mx-auto max-w-[1400px] space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/[0.03] sm:p-5">
        <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
          <div className="space-y-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Quản lý vật tư</h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                Quản lý danh mục, tồn kho và nhập xuất vật tư theo công trình.
              </p>
            </div>
            <div className="grid gap-2 sm:max-w-xl">
              <label htmlFor="materials-project-select" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Công trình đang xem
              </label>
              <div className="relative w-full">
                <select
                  id="materials-project-select"
                  value={projectId}
                  onChange={(event) => handleProjectChange(event.target.value)}
                  className="h-10 w-full truncate rounded-lg border border-slate-300 bg-white px-3 pr-8 text-sm font-medium text-slate-900 shadow-sm shadow-slate-950/[0.03] outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="" disabled>Chọn công trình</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name} ({project.code})
                    </option>
                  ))}
                </select>
              </div>
              {selectedProject && (
                <div className="text-xs text-slate-500 mt-1">
                  Dữ liệu của công trình: <strong className="text-slate-700">{selectedProject.code}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 xl:w-[280px]">
            {permissions.canImport && (
              <div title={
                !projectId ? "Vui lòng chọn công trình" : 
                materialItems.length === 0 ? "Cần tạo mã vật tư trước khi nhập kho" : ""
              }>
                <Button variant="outline" className="w-full h-10 px-0 sm:px-4 justify-center text-slate-700" onClick={() => setTransactionFormType("IMPORT")} disabled={!projectId || materialItems.length === 0}>
                  <ArrowDownRight className="h-4 w-4 text-emerald-600 sm:mr-1.5" />
                  <span className="hidden sm:inline">Nhập kho</span>
                  <span className="sm:hidden text-xs">Nhập kho</span>
                </Button>
              </div>
            )}
            
            {permissions.canExport && (
              <div title={
                !projectId ? "Vui lòng chọn công trình" : 
                materialItems.length === 0 ? "Cần tạo mã vật tư trước khi xuất kho" :
                initialStocks.every(s => s.stock <= 0) ? "Chưa có tồn kho để xuất" : ""
              }>
                <Button variant="outline" className="w-full h-10 px-0 sm:px-4 justify-center text-slate-700" onClick={() => setTransactionFormType("EXPORT")} disabled={!projectId || materialItems.length === 0 || initialStocks.every(s => s.stock <= 0)}>
                  <ArrowUpRight className="h-4 w-4 text-amber-600 sm:mr-1.5" />
                  <span className="hidden sm:inline">Xuất kho</span>
                  <span className="sm:hidden text-xs">Xuất kho</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <nav className="overflow-x-auto border-b border-slate-200" aria-label="Tabs quản lý vật tư">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => updateUrl(tab.id)}
                className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-800"
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
          title="Chưa có công trình để theo dõi vật tư"
          description="Bạn cần được phân quyền vào một công trình đang hoạt động trước khi nhập, xuất hoặc xem tồn kho."
          icon={<Factory className="h-8 w-8 text-slate-400" />}
        />
      ) : (
        <section className="min-h-[420px]">
          {activeTab === "overview" && (
            <MaterialsOverview
              materialItems={materialItems}
              stocks={initialStocks}
              transactions={initialTransactions}
              onNavigate={updateUrl}
              onGoToCatalog={() => updateUrl("catalog")}
              onCreateImport={() => setTransactionFormType("IMPORT")}
              permissions={permissions}
            />
          )}
          {activeTab === "catalog" && (
            <MaterialsCatalog
              materialItems={materialItems}
              stocks={initialStocks}
              onAddMaterial={() => {
                setEditingMaterialId(null);
                setIsMaterialFormOpen(true);
              }}
              onEditMaterial={handleEditMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              permissions={permissions}
              onTransaction={(type, materialId) => {
                setTransactionFormType(type);
                setTransactionMaterialId(materialId || "");
              }}
            />
          )}
          {activeTab === "stock" && (
            <MaterialsStockTable
              stocks={initialStocks}
              onTransaction={(type, materialId) => {
                setTransactionFormType(type);
                setTransactionMaterialId(materialId || "");
              }}
              permissions={permissions}
            />
          )}
          {activeTab === "transactions" && (
            <MaterialsTransactions
              transactions={initialTransactions}
              onAddTransaction={() => setTransactionFormType("IMPORT")}
              hasMaterials={materialItems.length > 0}
              permissions={permissions}
            />
          )}
          {activeTab === "proposals" && <PurchaseRequestPlaceholder lowStockCount={lowStockCount} />}
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
        />
      )}

      {transactionFormType && (permissions.canImport || permissions.canExport) && (
        <TransactionFormDialog
          isOpen
          onClose={() => {
            setTransactionFormType(null);
            setTransactionMaterialId("");
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
