"use client";

import { useState, useMemo, useCallback } from "react";
import { Package, Plus, Search, Filter, AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, Factory, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useRouter, useSearchParams } from "next/navigation";
import { MaterialsOverview } from "./materials-overview";
import { MaterialsStockTable } from "./materials-stock-table";
import { MaterialsTransactions } from "./materials-transactions";
import { MaterialsCatalog } from "./materials-catalog";
import { MaterialFormDialog } from "./material-form-dialog";
import { TransactionFormDialog } from "./transaction-form-dialog";
import { createMaterialItem, createMaterialTransaction } from "@/app/(dashboard)/materials/actions";
import { useToast } from "@/components/ui/toast-context";

interface MaterialsWorkspaceProps {
  projects: { id: string; name: string; code: string }[];
  materialItems: any[];
  initialStocks: any[];
  initialTransactions: any[];
  initialProjectId?: string;
  currentUser: { id: string; role?: string };
}

export function MaterialsWorkspace({
  projects,
  materialItems,
  initialStocks,
  initialTransactions,
  initialProjectId,
  currentUser,
}: MaterialsWorkspaceProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL State
  const activeTab = searchParams.get("tab") || "overview";
  const [projectId, setProjectId] = useState(initialProjectId || (projects[0]?.id || ""));
  
  // Dialog state
  const [isMaterialFormOpen, setIsMaterialFormOpen] = useState(false);
  const [transactionFormType, setTransactionFormType] = useState<"IMPORT" | "EXPORT" | null>(null);
  const [transactionMaterialId, setTransactionMaterialId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const toast = useToast();
  
  // Handlers
  const handleTabChange = (tab: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    if (projectId) params.set("projectId", projectId);
    router.push(`?${params.toString()}`);
  };

  const handleProjectChange = (pid: string) => {
    setProjectId(pid);
    const params = new URLSearchParams(searchParams);
    params.set("projectId", pid);
    router.push(`?${params.toString()}`);
  };

  const handleCreateMaterial = async (data: { code: string; name: string; unit: string; group?: string; description?: string }) => {
    setIsSubmitting(true);
    try {
      await createMaterialItem(data);
      toast.success("Tạo vật tư thành công");
      setIsMaterialFormOpen(false);
      router.refresh();
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTransaction = async (data: { materialItemId: string; type: "IMPORT" | "EXPORT"; quantity: number; movementDate: Date; notes?: string }) => {
    if (!projectId) {
      toast.error("Vui lòng chọn công trình trước");
      return;
    }
    setIsSubmitting(true);
    try {
      await createMaterialTransaction({
        ...data,
        projectId,
      });
      toast.success(data.type === "IMPORT" ? "Nhập kho thành công" : "Xuất kho thành công");
      setTransactionFormType(null);
      setTransactionMaterialId("");
      router.refresh();
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const TABS = [
    { id: "overview", label: "Tổng quan", icon: ClipboardList },
    { id: "catalog", label: "Danh mục", icon: Package },
    { id: "stock", label: "Tồn kho", icon: Factory },
    { id: "transactions", label: "Nhập / Xuất", icon: ArrowDownRight },
    { id: "proposals", label: "Đề xuất mua", icon: AlertTriangle },
  ];

  return (
    <div className="app-page max-w-[1400px] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Quản lý vật tư</h1>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi nhập, xuất, tồn kho và nhu cầu vật tư tại công trường.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={projectId}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full sm:w-auto h-10 px-3 text-sm rounded-lg bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-sm"
          >
            <option value="" disabled>Chọn công trình...</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
            ))}
          </select>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto h-10 gap-1.5" onClick={() => setTransactionFormType("IMPORT")}>
              <ArrowDownRight className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Nhập kho</span>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto h-10 gap-1.5" onClick={() => setTransactionFormType("EXPORT")}>
              <ArrowUpRight className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Xuất kho</span>
            </Button>
            <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white h-10 gap-1.5" onClick={() => setIsMaterialFormOpen(true)}>
              <Plus className="w-4 h-4" />
              <span>Thêm vật tư</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto pb-1 scrollbar-hide border-b border-slate-200">
        <div className="flex gap-1 min-w-max">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  isActive 
                    ? "border-blue-600 text-blue-700 bg-blue-50/50" 
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                } rounded-t-lg`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-blue-600" : "text-slate-400"}`} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content Area */}
      {!projectId ? (
        <EmptyState 
          title="Chưa chọn công trình"
          description="Vui lòng chọn một công trình để xem dữ liệu vật tư."
          icon={<Factory className="w-8 h-8 text-slate-300" />}
        />
      ) : (
        <div className="min-h-[400px]">
          {activeTab === "overview" && (
            <MaterialsOverview 
              stocks={initialStocks} 
              transactions={initialTransactions} 
              onNavigate={handleTabChange}
            />
          )}
          {activeTab === "catalog" && (
            <MaterialsCatalog 
              materialItems={materialItems}
              stocks={initialStocks}
              onAddMaterial={() => setIsMaterialFormOpen(true)}
            />
          )}
          {activeTab === "stock" && (
            <MaterialsStockTable 
              stocks={initialStocks} 
              onTransaction={(type, matId) => {
                setTransactionFormType(type);
                if (matId) setTransactionMaterialId(matId);
              }}
            />
          )}
          {activeTab === "transactions" && (
            <MaterialsTransactions 
              transactions={initialTransactions} 
              materialItems={materialItems}
              projectId={projectId}
              onAddTransaction={() => setTransactionFormType("IMPORT")}
            />
          )}
          {activeTab === "proposals" && (
            <EmptyState 
              title="Tính năng đang phát triển"
              description="Phân hệ đề xuất mua vật tư từ công trường đang được xây dựng."
              icon={<AlertTriangle className="w-8 h-8 text-amber-400" />}
            />
          )}
        </div>
      )}

      {/* Dialogs */}
      <MaterialFormDialog 
        isOpen={isMaterialFormOpen}
        onClose={() => setIsMaterialFormOpen(false)}
        onSubmit={handleCreateMaterial}
        isSubmitting={isSubmitting}
      />
      
      {transactionFormType && (
        <TransactionFormDialog 
          isOpen={true}
          onClose={() => { setTransactionFormType(null); setTransactionMaterialId(""); }}
          onSubmit={handleCreateTransaction}
          isSubmitting={isSubmitting}
          materialItems={materialItems}
          stocks={initialStocks}
          type={transactionFormType}
          initialMaterialId={transactionMaterialId}
        />
      )}
    </div>
  );
}
