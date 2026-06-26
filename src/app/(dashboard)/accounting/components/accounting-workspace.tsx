"use client";

import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Search, CheckCircle2, AlertCircle, BarChart3, AlertTriangle, CreditCard, Pencil, Trash2, Eye, FileText, Send, CheckSquare, XCircle, Undo2, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast-context";
import { useRouter } from "next/navigation";
import type { PaymentRequestDto, AccountingContractOptionDto } from "../actions";
import { createPaymentRequest, updatePaymentRequest, deletePaymentRequest, changePaymentStatus } from "../actions";
import { PaymentRequestFormDialog } from "./payment-request-form-dialog";
import { PaymentRequestDetailDrawer } from "./payment-request-detail-drawer";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReasonDialog } from "@/components/ui/reason-dialog";

interface AccountingWorkspaceProps {
  paymentRequests: PaymentRequestDto[];
  projects: { id: string; name: string; code: string }[];
  suppliers: { id: string; name: string }[];
  contracts: AccountingContractOptionDto[];
  globalPermissions: any;
  currentUserId: string;
}

const TYPE_MAP: Record<string, string> = {
  ADVANCE: "Tạm ứng",
  PROGRESS: "Thanh toán khối lượng",
  FINAL: "Quyết toán",
  RETENTION: "Giữ lại",
  OTHER: "Khác",
};

const STATUS_MAP: Record<string, { label: string; color: string; dot: string }> = {
  DRAFT: { label: "Nháp", color: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  SUBMITTED: { label: "Chờ duyệt", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  APPROVED: { label: "Đã duyệt", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  PAID: { label: "Đã thanh toán", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  REJECTED: { label: "Từ chối", color: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500" },
  CANCELLED: { label: "Đã hủy", color: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-300" },
};

function formatCurrency(val: number) {
  return new Intl.NumberFormat("vi-VN").format(val) + " đ";
}

function formatDate(dateString: string | null) {
  if (!dateString) return "Chưa có hạn";
  // parse exactly from YYYY-MM-DD to avoid timezone offset shifts
  const parts = dateString.split("T")[0].split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateString;
}

function isOverdue(dueDate: string | null, status: string) {
  if (!dueDate || status === "PAID" || status === "CANCELLED" || status === "REJECTED") return false;
  
  const due = new Date(dueDate.split("T")[0] + "T23:59:59.999+07:00"); // End of day VN time
  return due < new Date();
}



export function AccountingWorkspace({ paymentRequests, projects, suppliers, contracts, globalPermissions, currentUserId }: AccountingWorkspaceProps) {
  const router = useRouter();
  const toast = useToast();
  
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("");
  const [filterType, setFilterType] = useState("");
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<PaymentRequestDto | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [activeDetailRequest, setActiveDetailRequest] = useState<PaymentRequestDto | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description?: React.ReactNode;
    confirmText: string;
    variant: "danger" | "warning" | "info" | "success";
    actionFn: () => Promise<void>;
  }>({
    isOpen: false,
    title: "",
    confirmText: "Xác nhận",
    variant: "info",
    actionFn: async () => {},
  });

  const openConfirm = (title: string, description: string, confirmText: string, variant: "danger" | "warning" | "info" | "success", actionFn: () => Promise<void>) => {
    setConfirmConfig({ isOpen: true, title, description, confirmText, variant, actionFn });
  };
  const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));

  const normalizedSearch = search.trim().toLowerCase();

  const filtered = useMemo(() => {
    return paymentRequests.filter((c) => {
      const matchesSearch = !normalizedSearch || 
        c.requestCode.toLowerCase().includes(normalizedSearch) || 
        c.title.toLowerCase().includes(normalizedSearch) ||
        c.project.code.toLowerCase().includes(normalizedSearch) ||
        (c.supplier && c.supplier.name.toLowerCase().includes(normalizedSearch));
        
      const matchesProject = !filterProject || c.projectId === filterProject;
      const matchesType = !filterType || c.type === filterType;
      
      return matchesSearch && matchesProject && matchesType;
    });
  }, [paymentRequests, normalizedSearch, filterProject, filterType]);

  const stats = useMemo(() => {
    let totalAll = 0;
    let overdueCount = 0;
    const uniqueProjects = new Set();

    paymentRequests.forEach(req => {
      totalAll += req.totalAmount;
      uniqueProjects.add(req.projectId);
      if (isOverdue(req.dueDate, req.status)) {
        overdueCount++;
      }
    });

    return { 
      totalAll, 
      totalCount: paymentRequests.length, 
      overdueCount, 
      uniqueProjects: uniqueProjects.size 
    };
  }, [paymentRequests]);

  const handleOpenCreate = () => {
    setEditingRequest(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (req: PaymentRequestDto) => {
    setEditingRequest(req);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (editingRequest) {
        await updatePaymentRequest(editingRequest.id, data);
        toast.success("Đã cập nhật hồ sơ");
      } else {
        await createPaymentRequest(data);
        toast.success("Đã tạo hồ sơ thanh toán");
      }
      setIsFormOpen(false);
      setEditingRequest(null);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Có lỗi xảy ra";
      toast.error(message);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (req: PaymentRequestDto) => {
    openConfirm(
      "Hủy hồ sơ thanh toán",
      "Bạn có chắc chắn muốn xóa mềm hồ sơ này?",
      "Xóa hồ sơ",
      "danger",
      async () => {
        setIsSubmitting(true);
        try {
          await deletePaymentRequest(req.id);
          toast.success("Đã xóa hồ sơ");
          router.refresh();
          closeConfirm();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
        } finally {
          setIsSubmitting(false);
        }
      }
    );
  };

  const handleOpenDetail = (req: PaymentRequestDto) => {
    setActiveDetailRequest(req);
    setIsDetailOpen(true);
  };

  const summaryCards = [
    { label: "Tổng số hồ sơ", value: stats.totalCount.toString(), icon: FileText, tone: "indigo" as const },
    { label: "Tổng giá trị", value: formatCurrency(stats.totalAll), icon: CreditCard, tone: "blue" as const },
    { label: "Quá hạn thanh toán", value: stats.overdueCount.toString(), icon: AlertTriangle, tone: "rose" as const },
    { label: "Công trình có hồ sơ", value: stats.uniqueProjects.toString(), icon: BarChart3, tone: "emerald" as const },
  ];

  const toneMap = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    rose: "bg-rose-50 text-rose-700 border-rose-100",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  };

  return (
    <div className="app-page mx-auto max-w-[1400px] space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/[0.03] sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Kế toán & thanh toán</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Quản lý đề nghị thanh toán, hoá đơn, chứng từ và kế hoạch dòng tiền.
            </p>
          </div>
          {globalPermissions.canCreate && projects.length > 0 && (
            <Button onClick={handleOpenCreate} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Tạo hồ sơ
            </Button>
          )}
        </div>
      </section>

      {paymentRequests.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summaryCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/[0.03]">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-slate-600">{card.label}</div>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${toneMap[card.tone]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-xl font-bold tracking-tight text-slate-950">{card.value}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {paymentRequests.length > 0 && (
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto_auto] items-center">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm mã hồ sơ, tiêu đề, đối tác..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-2 w-full lg:w-auto">
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none"
            >
              <option value="">Tất cả công trình</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code}</option>
              ))}
            </select>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none"
            >
              <option value="">Tất cả loại</option>
              {Object.entries(TYPE_MAP).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {paymentRequests.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Hồ sơ</th>
                  <th className="px-4 py-3">Phân loại</th>
                  <th className="px-4 py-3">Công trình / Đối tác</th>
                  <th className="px-4 py-3 text-right">Tổng thanh toán</th>
                  <th className="px-4 py-3 text-center">Hạn thanh toán</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((req) => {
                  const overdue = isOverdue(req.dueDate, req.status);

                  return (
                    <tr key={req.id} className="group transition hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-950">{req.title}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                          <span className="font-mono">{req.requestCode}</span>
                          <span className="text-slate-300">•</span>
                          <span>Bởi {req.createdBy.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-700">{TYPE_MAP[req.type]}</span>
                        {req.contract && (
                          <div className="text-xs text-slate-500 mt-0.5 truncate max-w-[150px]" title={`Hợp đồng: ${req.contract.contractNo}`}>
                            HĐ: {req.contract.contractNo}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{req.project.code}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {req.supplier ? req.supplier.name : "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="font-mono font-bold text-blue-700">{formatCurrency(req.totalAmount)}</div>
                        <div className="text-xs text-slate-400 mt-0.5">Trước VAT: {formatCurrency(req.subTotal)}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className={`font-mono text-xs ${overdue ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                          {formatDate(req.dueDate)}
                          {overdue && <div className="text-[10px] uppercase tracking-wider text-red-500 mt-0.5">Quá hạn</div>}
                        </div>
                      </td>

                      <td className="py-3 pr-4 pl-3 text-right sticky right-0 bg-white group-hover:bg-slate-50/70 border-b border-slate-100 transition-colors">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDetail(req)}
                            className="h-8 w-8 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(req)}
                            disabled={!req.canUpdate}
                            className={`h-8 w-8 ${req.canUpdate ? 'text-blue-600 hover:bg-blue-50' : 'text-slate-300 opacity-60 cursor-not-allowed'}`}
                            title={req.canUpdate ? "Sửa hồ sơ" : "Không có quyền sửa"}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(req)}
                            disabled={!req.canDelete || isSubmitting}
                            className={`h-8 w-8 ${req.canDelete ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-300 opacity-60 cursor-not-allowed'}`}
                            title={req.canDelete ? "Xóa hồ sơ" : "Không có quyền xóa"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                      Không tìm thấy hồ sơ thanh toán phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {paymentRequests.length === 0 && (
        <EmptyState
          title="Chưa có hồ sơ thanh toán"
          description="Tạo hồ sơ thanh toán để theo dõi hóa đơn, đề nghị thanh toán và phê duyệt."
          icon={<CreditCard className="h-6 w-6 text-slate-500" />}
          action={
            globalPermissions.canCreate && projects.length > 0 ? (
              <Button onClick={handleOpenCreate} variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Tạo hồ sơ thanh toán
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Form Dialog */}
      <PaymentRequestFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingRequest(null);
        }}
        onSubmit={handleFormSubmit}
        isSubmitting={isSubmitting}
        initialData={editingRequest}
        projects={projects}
        suppliers={suppliers}
        contracts={contracts}
      />

      <PaymentRequestDetailDrawer
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        paymentRequest={activeDetailRequest}
      />

      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        onClose={closeConfirm}
        title={confirmConfig.title}
        description={confirmConfig.description}
        confirmText={confirmConfig.confirmText}
        variant={confirmConfig.variant}
        onConfirm={confirmConfig.actionFn}
        isLoading={isSubmitting}
      />

    </div>
  );
}
