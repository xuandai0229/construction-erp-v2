"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Search, Trash2, Eye, Plus, FileText, CheckCircle2, AlertCircle, BarChart3, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EnterpriseTable, FilterBar, KpiCard, PageHeader, ContentCard } from "@/components/ui/enterprise";
import type { ContractDto } from "@/app/(dashboard)/contracts/actions";
import { ContractFormDialog } from "./contract-form-dialog";
import { ContractDetailDrawer } from "./contract-detail-drawer";
import { createContract, updateContract, deleteContract } from "@/app/(dashboard)/contracts/actions";
import { useToast } from "@/components/ui/toast-context";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getContractDisplayStatus, type ContractPermissionSet } from "@/lib/contracts/contracts-permissions";
import { setProjectContextCookie } from "@/app/actions/project-context";

interface ContractsWorkspaceProps {
  contracts: ContractDto[];
  projects: { id: string; name: string; code: string }[];
  suppliers: { id: string; name: string; code: string }[];
  globalPermissions: ContractPermissionSet;
  initialProjectId?: string;
}

const TYPE_MAP: Record<string, string> = {
  CLIENT: "Chủ đầu tư",
  SUBCONTRACTOR: "Thầu phụ",
  SUPPLIER: "Nhà cung cấp",
  LABOR: "Khoán nhân công",
};

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT: { label: "Nháp", color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  ACTIVE: { label: "Đang thực hiện", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  COMPLETED: { label: "Đã hoàn thành", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  TERMINATED: { label: "Chấm dứt", color: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  OVERDUE: { label: "Quá hạn", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-600" },
  EXPIRING: { label: "Sắp hết hạn", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat("vi-VN").format(val) + " đ";
}

function formatDate(dateString: string | null) {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function ContractsWorkspace({ contracts, projects, suppliers, globalPermissions, initialProjectId }: ContractsWorkspaceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const toast = useToast();
  
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProjectState] = useState(initialProjectId || "");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    setFilterProjectState(initialProjectId || "");
  }, [initialProjectId]);

  const setFilterProject = async (projectId: string) => {
    setFilterProjectState(projectId);
    await setProjectContextCookie(projectId || "all");
    const params = new URLSearchParams(searchParams.toString());
    if (projectId) {
      params.set("projectId", projectId);
    } else {
      params.delete("projectId");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    router.refresh();
  };
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractDto | null>(null);
  const [viewingContract, setViewingContract] = useState<ContractDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      // Search
      const matchesSearch = !normalizedSearch || 
        c.contractNo.toLowerCase().includes(normalizedSearch) || 
        c.name.toLowerCase().includes(normalizedSearch) ||
        c.project.code.toLowerCase().includes(normalizedSearch) ||
        (c.supplier && c.supplier.name.toLowerCase().includes(normalizedSearch));
        
      // Filters
      const matchesProject = !filterProject || c.projectId === filterProject;
      const displayStatus = getContractDisplayStatus(c.status, c.endDate);
      const matchesStatus = !filterStatus || displayStatus === filterStatus;
      const matchesType = !filterType || c.type === filterType;
      
      return matchesSearch && matchesProject && matchesStatus && matchesType;
    });
  }, [contracts, normalizedSearch, filterProject, filterStatus, filterType]);

  // Summary stats
  const activeCount = useMemo(() => {
    return filtered.filter((c) => getContractDisplayStatus(c.status, c.endDate) === "ACTIVE").length;
  }, [filtered]);
  
  const expiringCount = useMemo(() => {
    return filtered.filter((c) => getContractDisplayStatus(c.status, c.endDate) === "EXPIRING").length;
  }, [filtered]);

  const overdueCount = useMemo(() => {
    return filtered.filter((c) => getContractDisplayStatus(c.status, c.endDate) === "OVERDUE").length;
  }, [filtered]);
  
  const totalValue = filtered.reduce((sum, c) => sum + c.value, 0);

  const handleOpenCreate = () => {
    setEditingContract(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (contract: ContractDto) => {
    setEditingContract(contract);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (editingContract) {
        await updateContract(editingContract.id, data);
        toast.success("Đã cập nhật hợp đồng");
      } else {
        await createContract(data);
        toast.success("Đã thêm hợp đồng");
      }
      setIsFormOpen(false);
      setEditingContract(null);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
      toast.error(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (contract: ContractDto) => {
    setIsSubmitting(true);
    try {
      await deleteContract(contract.id);
      toast.success("Đã xóa hợp đồng");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const summaryCards = [
    { label: "Đang thực hiện", value: activeCount, icon: CheckCircle2, tone: "emerald" as const },
    { label: "Sắp hết hạn", value: expiringCount, icon: AlertCircle, tone: "amber" as const },
    { label: "Quá hạn", value: overdueCount, icon: AlertTriangle, tone: "rose" as const },
    { label: "Tổng giá trị", value: formatCurrency(totalValue), icon: BarChart3, tone: "indigo" as const },
  ];

  return (
    <div className="app-page mx-auto max-w-[1400px] space-y-5">
      {/* Header */}
      <PageHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Quản lý hợp đồng</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Theo dõi hợp đồng, giá trị và tiến độ thực hiện.
            </p>
          </div>
          {globalPermissions.canCreate && projects.length > 0 && (
            <Button onClick={handleOpenCreate} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Thêm hợp đồng
            </Button>
          )}
        </div>
      </PageHeader>

      {/* Summary Cards */}
      {contracts.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <KpiCard
                key={card.label}
                label={card.label}
                value={card.value}
                tone={card.tone}
                icon={<Icon className="h-5 w-5" />}
                className={card.tone === "indigo" ? "[&>div:nth-child(2)]:text-xl" : undefined}
              />
            );
          })}
        </div>
      )}

      {/* Search & Filter */}
      {contracts.length > 0 && (
        <FilterBar className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] items-center">
          <div className="relative w-full">
            <label htmlFor="contracts-search" className="sr-only">Tìm mã, tên hợp đồng, đối tác...</label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              id="contracts-search"
              type="text"
              placeholder="Tìm mã, tên hợp đồng, đối tác..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          
          <div className="grid grid-cols-3 gap-2 w-full lg:w-auto">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Tất cả công trình</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code}</option>
              ))}
            </select>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Tất cả phân loại</option>
              {Object.entries(TYPE_MAP).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(STATUS_MAP).map(([key, info]) => (
                <option key={key} value={key}>{info.label}</option>
              ))}
            </select>
          </div>
        </FilterBar>
      )}

      {/* Desktop Table */}
      {contracts.length > 0 && (
        <EnterpriseTable className="hidden lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Hợp đồng</th>
                  <th className="px-4 py-3">Công trình</th>
                  <th className="px-4 py-3">Đối tác</th>
                  <th className="px-4 py-3 text-right">Giá trị</th>
                  <th className="px-4 py-3 text-center">Thời hạn</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((contract) => {
                  const displayStatus = getContractDisplayStatus(contract.status, contract.endDate);
                  const statusInfo = STATUS_MAP[displayStatus] || STATUS_MAP.DRAFT;
                  return (
                    <tr key={contract.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <button 
                          type="button" 
                          className="font-semibold text-slate-950 hover:text-blue-600 hover:underline transition-colors text-left"
                          onClick={() => setViewingContract(contract)}
                        >
                          {contract.name}
                        </button>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono">{contract.contractNo}</span>
                          <span className="text-slate-300">•</span>
                          <span>{TYPE_MAP[contract.type] || contract.type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{contract.project.code}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {contract.type === "CLIENT" ? (
                          <span className="text-slate-500 font-medium">Chủ đầu tư</span>
                        ) : contract.supplier ? (
                          <div className="min-w-[150px] whitespace-normal" title={contract.supplier.name}>
                            {contract.supplier.name}
                          </div>
                        ) : (
                          <span className="text-amber-600 font-medium italic">Chưa chọn đối tác</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                        {formatCurrency(contract.value)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center text-xs">
                          <span className="text-slate-500 font-mono">{formatDate(contract.startDate)}</span>
                          <span className="text-slate-400 leading-none">↓</span>
                          <span className="text-slate-900 font-mono">{formatDate(contract.endDate)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-semibold whitespace-nowrap ${statusInfo.color}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusInfo.dot}`} />
                          {statusInfo.label}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewingContract(contract)}
                            className="h-8 w-8 text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          {contract.canUpdate && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(contract)}
                              className="h-8 w-8 text-slate-600 hover:bg-slate-50 hover:text-blue-600"
                              title="Sửa hợp đồng"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {contract.canDelete && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(contract)}
                              disabled={isSubmitting}
                              className="h-8 w-8 text-slate-600 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Xóa hợp đồng"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                      Không tìm thấy hợp đồng phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
        </EnterpriseTable>
      )}

      {/* Mobile Cards */}
      {contracts.length > 0 && (
        <div className="space-y-3 lg:hidden">
          {filtered.map((contract) => {
            const displayStatus = getContractDisplayStatus(contract.status, contract.endDate);
            const statusInfo = STATUS_MAP[displayStatus] || STATUS_MAP.DRAFT;
            return (
              <ContentCard key={contract.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <button 
                      type="button" 
                      className="font-bold text-slate-950 hover:text-blue-600 text-left transition-colors"
                      onClick={() => setViewingContract(contract)}
                    >
                      {contract.name}
                    </button>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-500">{contract.contractNo}</span>
                      <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusInfo.color.replace('border', '')}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setViewingContract(contract)}
                      className="h-8 w-8 text-slate-600"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {contract.canUpdate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenEdit(contract)}
                        className="h-8 w-8 text-slate-600"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm border-t border-slate-100 pt-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-500">Giá trị</div>
                    <div className="font-mono font-bold text-blue-700">{formatCurrency(contract.value)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-slate-500">Công trình</div>
                    <div className="font-medium text-slate-900">{contract.project.code}</div>
                  </div>
                </div>
                
                <div className="mt-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-500 mr-1">Đối tác:</span>
                  {contract.type === "CLIENT" ? (
                    <span className="text-slate-500 font-medium">Chủ đầu tư</span>
                  ) : contract.supplier ? (
                    contract.supplier.name
                  ) : (
                    <span className="text-amber-600 font-medium italic">Chưa chọn đối tác</span>
                  )}
                </div>
              </ContentCard>
            );
          })}
          {filtered.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              Không tìm thấy hợp đồng phù hợp.
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {contracts.length === 0 && (
        <EmptyState
          title="Chưa có hợp đồng"
          description={projects.length === 0 ? "Bạn cần được phân quyền vào công trình để tạo hợp đồng." : "Thêm hợp đồng để theo dõi giá trị, thời hạn và đối tác liên quan."}
          icon={<FileText className="h-6 w-6 text-slate-500" />}
          action={
            globalPermissions.canCreate && projects.length > 0 ? (
              <Button onClick={handleOpenCreate} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Thêm hợp đồng
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Form dialog */}
      {(globalPermissions.canCreate || globalPermissions.canUpdate) && (
        <ContractFormDialog
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingContract(null);
          }}
          onSubmit={handleFormSubmit}
          isSubmitting={isSubmitting}
          initialData={editingContract}
          projects={projects}
          suppliers={suppliers}
        />
      )}

      {/* Detail Drawer */}
      <ContractDetailDrawer
        isOpen={!!viewingContract}
        onClose={() => setViewingContract(null)}
        contract={viewingContract}
        onEdit={(c) => {
          setViewingContract(null);
          handleOpenEdit(c);
        }}
        onDelete={(c) => {
          setViewingContract(null);
          handleDelete(c);
        }}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
