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

import { createMaterialItem, updateMaterialItem, deleteMaterialItem, createMaterialTransaction } from "@/app/(dashboard)/materials/actions";
import type { MaterialItemDto, MaterialMovementDto, ProjectStockDto } from "@/app/(dashboard)/materials/actions";
import { useToast } from "@/components/ui/toast-context";
import { setProjectContextCookie } from "@/app/actions/project-context";

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

  useEffect(() => {
    setProjectId(initialProjectId || "");
  }, [initialProjectId]);

  const tabs = [
    { id: "overview", label: "Tổng quan", icon: ClipboardList, visible: permissions.canView },
    { id: "catalog", label: "Danh mục vật tư", icon: Package, visible: permissions.canView },
    { id: "stock", label: "Tồn kho", icon: Factory, visible: permissions.canView },
    { id: "requests", label: "Yêu cầu vật tư", icon: ClipboardList, visible: permissions.canView },
    { id: "transactions", label: "Nhập / Xuất", icon: ArrowDownRight, visible: permissions.canViewTransactions },
  ].filter(t => t.visible);

  const currentTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : "overview";

  const updateUrl = (tab: string, nextProjectId = projectId) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    if (nextProjectId) {
      params.set("projectId", nextProjectId);
    } else {
      params.delete("projectId");
    }
    const query = params.toString();
    router.push(query ? `?${query}` : "?");
  };

  const handleProjectChange = async (nextProjectId: string) => {
    setProjectId(nextProjectId);
    await setProjectContextCookie(nextProjectId);
    updateUrl(currentTab, nextProjectId);
    router.refresh();
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
        toast.success("Đã lưu");
      } else {
        await createMaterialItem({ ...data, projectId });
        toast.success("Đã lưu");
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
    <div className="app-page mx-auto max-w-[1400px] space-y-5">
      <PageHeader>
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

            </div>
          </div>


        </div>
      </PageHeader>

      <nav className="overflow-x-auto border-b border-slate-200" aria-label="Tabs quản lý vật tư">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
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
              onNavigate={updateUrl}
              onGoToCatalog={() => updateUrl("catalog")}
              permissions={permissions}
            />
          )}
          {currentTab === "catalog" && (
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
          {currentTab === "stock" && (
            <MaterialsStockTable
              stocks={initialStocks}
              onTransaction={(type, materialId) => {
                setTransactionFormType(type);
                setTransactionMaterialId(materialId || "");
              }}
              permissions={permissions}
            />
          )}
          {currentTab === "transactions" && (
            <MaterialsTransactions
              transactions={initialTransactions}
              onAddTransaction={() => setTransactionFormType(permissions.canImport ? "IMPORT" : "EXPORT")}
              hasMaterials={materialItems.length > 0}
              permissions={permissions}
            />
          )}
          {currentTab === "requests" && (
            <div className="pt-2">
              <MaterialRequestList 
                projectId={projectId}
                initialRequests={materialRequests}
                wbsItems={wbsItems}
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
