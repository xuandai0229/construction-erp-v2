"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowLeft, Building2, ClipboardList, Factory, Globe, Package } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, EnterpriseTabs } from "@/components/ui/enterprise";
import { useRouter, useSearchParams } from "next/navigation";
import { MaterialsOverview } from "./materials-overview";
import { MaterialsStockTable } from "./materials-stock-table";
import { MaterialsTransactions } from "./materials-transactions";
import { MaterialsCatalog } from "./materials-catalog";
import { MaterialFormDialog } from "./material-form-dialog";
import { TransactionFormDialog } from "./transaction-form-dialog";
import { MaterialProposalList } from "./material-proposal-list";

import {
  createMaterialItem,
  updateMaterialItem,
  deleteMaterialItem,
  restoreMaterialItem,
  createMaterialTransaction,
} from "@/app/(dashboard)/materials/actions";
import type {
  MaterialItemDto,
  MaterialMovementDto,
  ProjectStockDto,
  PortfolioOverviewDto,
  PortfolioCatalogItemDto,
  PortfolioStockItemDto,
} from "@/app/(dashboard)/materials/actions";
import type { MaterialAccessContext } from "@/lib/materials/materials-access";
import { useToast } from "@/components/ui/toast-context";
import { ProjectIdentity } from "@/components/projects/project-identity";
import { cn } from "@/lib/utils";

interface MaterialsWorkspaceProps {
  projects: { id: string; name: string; code: string; status: string; investor: string | null; location: string | null; sourceMetadata: unknown }[];
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
  accessContext?: MaterialAccessContext;
  portfolioOverview?: PortfolioOverviewDto;
  portfolioCatalog?: PortfolioCatalogItemDto[];
  portfolioStocks?: PortfolioStockItemDto[];
  portfolioProposals?: any[];
  portfolioTransactions?: MaterialMovementDto[];
  materialRequests?: any[];
  materialProposals?: any[];
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
  accessContext,
  portfolioOverview,
  portfolioCatalog = [],
  portfolioStocks = [],
  portfolioProposals = [],
  portfolioTransactions = [],
  materialProposals = [],
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

  const isPortfolioMode = accessContext?.isPortfolioMode ?? false;
  const canSwitchScope = accessContext?.dataScope === "COMPANY";
  const returnTo = searchParams.get("returnTo");
  const safeReturnTo = returnTo && returnTo.startsWith("/materials") && !returnTo.startsWith("//") ? returnTo : null;

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
  ].filter((t) => t.visible);

  const currentTab = tabs.some((tab) => tab.id === activeTab) ? activeTab : "overview";

  const updateUrl = (tab: string, nextProjectId = projectId, additionalParams?: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    const nextScope = additionalParams?.scope || (isPortfolioMode ? "portfolio" : "project");

    if (nextScope === "portfolio") {
      params.set("scope", "portfolio");
      params.delete("projectId");
      params.delete("returnTo");
    } else {
      params.set("scope", "project");
      if (nextProjectId) params.set("projectId", nextProjectId);
      if (safeReturnTo) {
        params.set("returnTo", safeReturnTo);
      } else if (isPortfolioMode) {
        const portfolioContext = new URLSearchParams(searchParams.toString());
        portfolioContext.set("scope", "portfolio");
        portfolioContext.set("tab", tab);
        portfolioContext.delete("projectId");
        portfolioContext.delete("returnTo");
        params.set("returnTo", `/materials?${portfolioContext.toString()}`);
      }
    }
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([k, v]) => params.set(k, v));
    }
    const query = params.toString();
    router.push(query ? `?${query}` : "?");
  };

  const handleSelectProject = (targetProjectId: string) => {
    const params = new URLSearchParams();
    params.set("tab", currentTab);
    params.set("projectId", targetProjectId);
    params.set("scope", "project");
    const portfolioParams = new URLSearchParams(searchParams);
    portfolioParams.set("scope", "portfolio");
    portfolioParams.set("tab", currentTab);
    portfolioParams.delete("projectId");
    portfolioParams.delete("returnTo");
    params.set("returnTo", `/materials?${portfolioParams.toString()}`);
    router.push(`?${params.toString()}`);
  };

  const handleCreateMaterial = async (data: {
    code?: string;
    name: string;
    unit: string;
    manufacturer?: string;
    origin?: string;
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
          manufacturer: data.manufacturer,
          origin: data.origin,
          description: data.description,
          minStockLevel: data.minStockLevel,
        });
        toast.success("Đã cập nhật vật tư");
      } else {
        await createMaterialItem({ ...data, projectId });
        if (data.initialStock && data.initialStock > 0) {
          toast.success("Đã tạo vật tư và nhập tồn kho ban đầu");
        } else {
          toast.success("Đã tạo vật tư. Tồn hiện có đang là 0.");
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
      toast.success("Đã khôi phục vật tư");
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

  const currentProject = projects.find((project) => project.id === projectId);

  return (
    <div className="app-page w-full max-w-full space-y-4 sm:space-y-5 pb-24">
      <PageHeader className="flex flex-col gap-2.5 sm:gap-3 py-3 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Quản lý vật tư</h1>
            {!canSwitchScope && isPortfolioMode ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 border border-blue-200">
                <Globe className="h-3 w-3" /> Phạm vi: Toàn công ty
              </span>
            ) : !canSwitchScope ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
                <Building2 className="h-3 w-3 text-slate-500" /> Phạm vi: Công trình
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {isPortfolioMode
              ? "Theo dõi tổng thể danh mục, tồn kho, đề xuất và giao dịch vật tư trên toàn bộ công trình."
              : "Theo dõi chi tiết danh mục, tồn kho, yêu cầu và nhập/xuất vật tư tại công trường."}
          </p>
          {!isPortfolioMode && safeReturnTo && (
            <button type="button" onClick={() => router.push(safeReturnTo)} className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-slate-950">
              <ArrowLeft className="h-4 w-4" /> Quay lại toàn công ty
            </button>
          )}
        </div>

        {!isPortfolioMode && currentProject && (
          <ProjectIdentity
            name={currentProject.name}
            code={currentProject.code}
            status={currentProject.status}
            investor={currentProject.investor}
            location={currentProject.location}
            executionUnit={
              typeof currentProject.sourceMetadata === "object" &&
              currentProject.sourceMetadata &&
              "unit" in currentProject.sourceMetadata
                ? String((currentProject.sourceMetadata as { unit?: unknown }).unit ?? "")
                : null
            }
            variant="header"
            className="max-w-[min(32rem,100%)] rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-2"
          />
        )}
      </PageHeader>

      <EnterpriseTabs
        tabs={tabs}
        activeTab={currentTab}
        onChange={(tabId) => updateUrl(tabId)}
        rightContent={canSwitchScope ? (
          <div className="inline-flex h-10 items-center gap-1 rounded-lg border border-slate-200 bg-slate-100/90 p-1" aria-label="Phạm vi dữ liệu vật tư">
            <button
              type="button"
              aria-pressed={isPortfolioMode}
              onClick={() => updateUrl(currentTab, undefined, { scope: "portfolio" })}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                isPortfolioMode ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
              )}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Toàn công ty</span>
            </button>
            <button
              type="button"
              aria-pressed={!isPortfolioMode}
              onClick={() => {
                const targetId = accessContext.selectedProjectId || projects[0]?.id || "";
                updateUrl(currentTab, targetId, { scope: "project" });
              }}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30",
                !isPortfolioMode ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900",
              )}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span>Theo công trình</span>
            </button>
          </div>
        ) : undefined}
      />

      {!isPortfolioMode && !projectId ? (
        <EmptyState
          title="Chưa chọn công trình"
          description="Bạn cần chọn một công trình từ bộ chọn trên thanh tiêu đề để xem dữ liệu vật tư."
          icon={<Factory className="h-8 w-8 text-[var(--muted-foreground)] opacity-70" />}
        />
      ) : (
        <section className="min-h-[420px]">
          {currentTab === "overview" && (
            <MaterialsOverview
              isPortfolioMode={isPortfolioMode}
              portfolioOverview={portfolioOverview}
              portfolioCatalog={portfolioCatalog}
              portfolioStocks={portfolioStocks}
              portfolioProposals={portfolioProposals}
              portfolioTransactions={portfolioTransactions}
              projects={projects}
              stocks={initialStocks}
              transactions={initialTransactions}
              requests={materialProposals}
              onNavigate={(tab, params) => updateUrl(tab, projectId, params)}
              onGoToCatalog={() => updateUrl("catalog")}
              onSelectProject={handleSelectProject}
              permissions={permissions}
            />
          )}
          {currentTab === "catalog" && (
            <MaterialsCatalog
              isPortfolioMode={isPortfolioMode}
              portfolioCatalog={portfolioCatalog}
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
              onSelectProject={handleSelectProject}
              permissions={permissions}
              onTransaction={(type, materialId) => {
                setTransactionFormType(type);
                setTransactionMaterialId(materialId || "");
              }}
            />
          )}
          {currentTab === "stock" && (
            <MaterialsStockTable
              isPortfolioMode={isPortfolioMode}
              portfolioStocks={portfolioStocks}
              stocks={initialStocks.map((stock) => {
                const catalogItem = materialItems.find((m) => m.id === stock.materialItemId);
                if (catalogItem) {
                  return {
                    ...stock,
                    materialItem: {
                      ...stock.materialItem,
                      importedFromProposalQuantity: catalogItem.importedFromProposalQuantity,
                      approvedProposalQuantity: catalogItem.approvedProposalQuantity,
                      pendingProposalQuantity: catalogItem.pendingProposalQuantity,
                    },
                  };
                }
                return stock;
              })}
              transactions={initialTransactions}
              requests={materialProposals}
              onTransaction={(type, materialId) => {
                setTransactionFormType(type);
                setTransactionMaterialId(materialId || "");
              }}
              onEditMaterial={handleEditMaterial}
              onDeleteMaterial={handleDeleteMaterial}
              onRestoreMaterial={handleRestoreMaterial}
              onSelectProject={handleSelectProject}
              permissions={permissions}
            />
          )}
          {currentTab === "transactions" && (
            <MaterialsTransactions
              isPortfolioMode={isPortfolioMode}
              portfolioTransactions={portfolioTransactions}
              transactions={initialTransactions}
              stocks={initialStocks}
              materialItems={materialItems}
              projects={projects}
              onSelectProject={handleSelectProject}
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
              <MaterialProposalList
                isPortfolioMode={isPortfolioMode}
                proposals={isPortfolioMode ? portfolioProposals : materialProposals}
                currentProjectId={projectId}
                projects={projects}
                onSelectProject={handleSelectProject}
                capabilities={{
                  canCreate: permissions.canCreate,
                  canEdit: permissions.canUpdate,
                  canDelete: permissions.canDelete,
                  canExport: accessContext?.capabilities.canExport ?? false,
                }}
              />
            </div>
          )}
        </section>
      )}

      {!isPortfolioMode && (permissions.canCreate || permissions.canUpdate) && (
        <MaterialFormDialog
          isOpen={isMaterialFormOpen}
          onClose={() => {
            setIsMaterialFormOpen(false);
            setEditingMaterialId(null);
          }}
          onSubmit={handleCreateMaterial}
          isSubmitting={isSubmitting}
          initialData={editingMaterialId ? materialItems.find((m) => m.id === editingMaterialId) : undefined}
        />
      )}

      {!isPortfolioMode && transactionFormType && (permissions.canImport || permissions.canExport) && (
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
