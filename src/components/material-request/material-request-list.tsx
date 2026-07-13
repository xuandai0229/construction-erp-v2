"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Filter, Package, AlertCircle, Eye, Edit2, CheckCircle2, Clock, XCircle, FileText, AlertTriangle, Boxes, CalendarClock, Copy, Trash2, XSquare, FileCheck2, ArrowUpRight } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { MaterialRequestForm } from "./material-request-form";
import { MaterialRequestDetail } from "./material-request-detail";
import { EnterpriseTable, SafeText, DateCell } from "@/components/ui/enterprise";
import { MaterialKpiRibbon, MaterialRowActionMenu, type MaterialActionItem } from "@/components/materials/materials-ui";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteMaterialRequest, cancelMaterialRequest, approveMaterialRequest, rejectMaterialRequest } from "@/app/actions/material-request";
import type { MaterialItemDto, ProjectStockDto } from "@/app/(dashboard)/materials/actions";
import { useToast } from "@/components/ui/toast-context";

const statusConfig = {
  DRAFT: { label: "Nháp", variant: "neutral" as const, icon: FileText },
  SUBMITTED: { label: "Chờ duyệt", variant: "warning" as const, icon: Clock },
  APPROVED: { label: "Đã duyệt", variant: "success" as const, icon: CheckCircle2 },
  REJECTED: { label: "Từ chối", variant: "danger" as const, icon: XCircle },
  // Legacy mappings
  REQUESTED: { label: "Chờ duyệt", variant: "warning" as const, icon: Clock },
  PROCESSING: { label: "Đã duyệt", variant: "success" as const, icon: CheckCircle2 },
  ISSUED: { label: "Đã duyệt", variant: "success" as const, icon: CheckCircle2 },
  RECEIVED: { label: "Đã duyệt", variant: "success" as const, icon: CheckCircle2 },
  CANCELLED: { label: "Từ chối", variant: "danger" as const, icon: XCircle },
};

const priorityConfig = {
  LOW: { label: "Thấp", variant: "neutral" as const },
  MEDIUM: { label: "Trung bình", variant: "info" as const },
  HIGH: { label: "Cao", variant: "warning" as const },
  URGENT: { label: "Khẩn cấp", variant: "danger" as const },
};

type RequestFlag = "all" | "pending" | "approved" | "rejected";

function numberValue(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function requestRemaining(request: any) {
  return (request.items || []).reduce((total: number, item: any) => {
    return total + Math.max(0, numberValue(item.requestedQuantity) - numberValue(item.receivedQuantity));
  }, 0);
}

function requestIssued(request: any) {
  return (request.items || []).reduce((total: number, item: any) => total + numberValue(item.issuedQuantity), 0);
}

function requestReceived(request: any) {
  return (request.items || []).reduce((total: number, item: any) => total + numberValue(item.receivedQuantity), 0);
}

function requestTotal(request: any) {
  return (request.items || []).reduce((total: number, item: any) => total + numberValue(item.requestedQuantity), 0);
}

function isClosedStatus(status: string) {
  return ["RECEIVED", "CANCELLED", "REJECTED"].includes(status);
}

function isOverdue(request: any) {
  if (!request.neededDate || isClosedStatus(request.status)) return false;
  return new Date(request.neededDate).toISOString().slice(0, 10) < new Date().toISOString().slice(0, 10);
}

function isPartialIssue(request: any) {
  const issued = requestIssued(request);
  return issued > 0 && issued < requestTotal(request) && !isClosedStatus(request.status);
}

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

export function MaterialRequestList({ 
  projectId, 
  initialRequests, 
  wbsItems,
  materialItems = [],
  stocks = [],
  currentUserRole,
  currentUserId,
}: { 
  projectId: string;
  initialRequests: any[];
  wbsItems: any[];
  materialItems?: MaterialItemDto[];
  stocks?: ProjectStockDto[];
  currentUserRole?: string;
  currentUserId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const requests = initialRequests;
  const search = searchParams.get("q") || "";
  const statusFilter = searchParams.get("requestStatus") || "ALL";
  const priorityFilter = searchParams.get("requestPriority") || "ALL";
  const activeFlag = (searchParams.get("requestFlag") || "all") as RequestFlag;
  const requestId = searchParams.get("requestId") || "";
  const requestMode = searchParams.get("requestMode") || "";
  const selectedRequest = requests.find((request) => request.id === requestId) || null;
  const isFormOpen = requestMode === "create" || (requestMode === "edit" && !!selectedRequest);
  const isDetailOpen = !!selectedRequest && !isFormOpen;

  const stockByMaterial = useMemo(() => {
    const byCode = new Map<string, ProjectStockDto>();
    const byName = new Map<string, ProjectStockDto>();
    stocks.forEach((stock) => {
      byCode.set(normalize(stock.materialItem.code), stock);
      byName.set(normalize(stock.materialItem.name), stock);
    });
    return { byCode, byName };
  }, [stocks]);

  const workById = useMemo(() => {
    const map = new Map<string, string>();
    wbsItems.forEach((work) => {
      const label = `${work.code ? `${work.code} — ` : ""}${work.workContent || work.name || work.categoryName || "Chưa có tên công việc"}`;
      map.set(work.id, label);
    });
    return map;
  }, [wbsItems]);

  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingRequest, setDeletingRequest] = useState<any | null>(null);
  const [isCanceling, setIsCanceling] = useState(false);
  const [cancelingRequest, setCancelingRequest] = useState<any | null>(null);
  
  const [isApproving, setIsApproving] = useState(false);
  const [approvingRequest, setApprovingRequest] = useState<any | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectingRequest, setRejectingRequest] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const handleDelete = async () => {
    if (!deletingRequest) return;
    setIsDeleting(true);
    try {
      await deleteMaterialRequest(deletingRequest.id);
      setDeletingRequest(null);
      toast.success("Đã xóa đề xuất vật tư");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApprove = async () => {
    if (!approvingRequest) return;
    setIsApproving(true);
    try {
      await approveMaterialRequest(approvingRequest.id);
      setApprovingRequest(null);
      toast.success("Đã duyệt phiếu đề xuất vật tư");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectingRequest) return;
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối");
      return;
    }
    setIsRejecting(true);
    try {
      await rejectMaterialRequest(rejectingRequest.id, rejectReason);
      setRejectingRequest(null);
      setRejectReason("");
      toast.success("Đã từ chối phiếu đề xuất vật tư");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "Có lỗi xảy ra");
    } finally {
      setIsRejecting(false);
    }
  };

  const getStockForItem = (item: any) => {
    return stockByMaterial.byCode.get(normalize(item.materialCode)) || stockByMaterial.byName.get(normalize(item.materialName)) || null;
  };

  const hasStockRisk = (request: any) => {
    return (request.items || []).some((item: any) => {
      const stock = getStockForItem(item);
      if (!stock) return false;
      const remaining = Math.max(0, numberValue(item.requestedQuantity) - numberValue(item.issuedQuantity));
      return remaining > stock.stock;
    });
  };

  const updateUrl = (updates: Record<string, string | null>, replace = false) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "ALL" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    params.set("tab", "requests");
    if (projectId) params.set("projectId", projectId);
    const url = `?${params.toString()}`;
    if (replace) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  };

  const formatQty = (num: number) => new Intl.NumberFormat('vi-VN').format(num);

  // Filter Logic
  const filteredRequests = requests.filter(req => {
    // Hide Cancelled from main list if wanted, but since they are mapped to "Từ chối (Hủy)", we can keep them or hide.
    // Let's filter out legacy if needed, or just let them show.
    const haystack = [
      req.requestNo,
      req.note,
      req.requestedBy?.name,
      ...(req.items || []).flatMap((item: any) => [
        item.materialCode,
        item.materialName,
        item.note,
        item.workItemNameSnapshot,
        workById.get(item.fieldProgressItemId) || workById.get(item.wbsItemId) || "",
      ]),
    ].map(normalize).join(" ");
    const matchesSearch = !search || haystack.includes(normalize(search));
    const normalizedStatus = ["PROCESSING", "ISSUED", "RECEIVED"].includes(req.status) ? "APPROVED" : (req.status === "REQUESTED" ? "SUBMITTED" : (req.status === "CANCELLED" ? "REJECTED" : req.status));
    const matchesStatus = statusFilter === "ALL" || normalizedStatus === statusFilter;
    const matchesFlag =
      activeFlag === "all" ||
      (activeFlag === "pending" && normalizedStatus === "SUBMITTED") ||
      (activeFlag === "approved" && normalizedStatus === "APPROVED") ||
      (activeFlag === "rejected" && normalizedStatus === "REJECTED");
    return matchesSearch && matchesStatus && matchesFlag;
  });

  // KPI Calculation
  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => ["SUBMITTED", "REQUESTED"].includes(r.status)).length;
  const approvedRequests = requests.filter(r => ["APPROVED", "PROCESSING", "ISSUED", "RECEIVED"].includes(r.status)).length;
  const rejectedRequests = requests.filter(r => ["REJECTED", "CANCELLED"].includes(r.status)).length;
  const kpiItems = [
    {
      key: "all",
      label: "Tổng đề xuất",
      value: formatQty(totalRequests),
      helper: "Toàn dự án",
      icon: <FileText className="h-4 w-4" />,
      tone: "slate" as const,
      active: activeFlag === "all" && statusFilter === "ALL",
      onClick: () => updateUrl({ requestFlag: null, requestStatus: null }),
    },
    {
      key: "pending",
      label: "Chờ duyệt",
      value: formatQty(pendingRequests),
      helper: "Đang chờ duyệt",
      icon: <Clock className="h-4 w-4" />,
      tone: "amber" as const,
      active: statusFilter === "SUBMITTED",
      onClick: () => updateUrl({ requestFlag: null, requestStatus: "SUBMITTED" }),
    },
    {
      key: "approved",
      label: "Đã duyệt",
      value: formatQty(approvedRequests),
      helper: "Đã được phê duyệt",
      icon: <CheckCircle2 className="h-4 w-4" />,
      tone: "emerald" as const,
      active: statusFilter === "APPROVED",
      onClick: () => updateUrl({ requestFlag: null, requestStatus: "APPROVED" }),
    },
    {
      key: "rejected",
      label: "Từ chối",
      value: formatQty(rejectedRequests),
      helper: "Bị từ chối",
      icon: <XCircle className="h-4 w-4" />,
      tone: "rose" as const,
      active: statusFilter === "REJECTED",
      onClick: () => updateUrl({ requestFlag: null, requestStatus: "REJECTED" }),
    },
  ];

  const handleCreate = () => {
    updateUrl({ requestMode: "create", requestId: null });
  };

  const handleEdit = (req: any) => {
    updateUrl({ requestMode: "edit", requestId: req.id });
  };

  const handleView = (req: any) => {
    updateUrl({ requestId: req.id, requestMode: null });
  };

  const handleCloseOverlay = () => {
    updateUrl({ requestId: null, requestMode: null }, true);
  };

  const handleMutationSuccess = () => {
    handleCloseOverlay();
    router.refresh();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <MaterialKpiRibbon items={kpiItems} />

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-1">
          <div className="relative flex-1 max-w-md min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <label htmlFor="search-request" className="sr-only">Tìm kiếm đề xuất</label>
            <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true" 
              id="search-request"
              name="search-request"
              type="text"
              placeholder="Tìm tên vật tư, công việc, người tạo..."
              className="w-full pl-9 pr-4 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={search}
              onChange={(e) => updateUrl({ q: e.target.value, requestId: null, requestMode: null }, true)}
            />
          </div>
          <div className="relative min-w-0 sm:w-44 shrink-0">
            <label htmlFor="filter-status" className="sr-only">Bộ lọc trạng thái</label>
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <select
              id="filter-status"
              name="filter-status"
              className="w-full appearance-none rounded-lg border border-slate-300 bg-white pl-9 pr-8 h-10 text-sm font-medium text-slate-900 outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={statusFilter}
              onChange={(e) => updateUrl({ requestStatus: e.target.value, requestFlag: null })}
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="SUBMITTED">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Từ chối</option>
            </select>
          </div>
        </div>
        <button 
          onClick={handleCreate}
          className="h-10 px-4 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 active:bg-blue-800 active:scale-95 flex items-center justify-center gap-2 shadow-sm transition-all whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" /> Tạo đề xuất
        </button>
      </div>

      {/* Desktop Table */}
      <EnterpriseTable className="hidden md:block max-h-[600px]">
        <table className="w-full text-left text-sm relative">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur shadow-sm text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">Tên vật tư</th>
              <th className="px-4 py-3 border-b border-slate-200 text-right whitespace-nowrap">Số lượng đề xuất</th>
              <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">Đơn vị</th>
              <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">Công việc liên quan</th>
              <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">Người tạo</th>
              <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">Ngày tạo</th>
              <th className="px-4 py-3 border-b border-slate-200 whitespace-nowrap">Trạng thái</th>
              <th className="px-4 py-3 border-b border-slate-200 text-right w-[80px] whitespace-nowrap">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center text-slate-500 bg-slate-50/50">
                  <div className="flex flex-col items-center justify-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200 text-slate-400">
                      <Package className="h-6 w-6" />
                    </div>
                    <div className="font-semibold text-slate-900 text-base">Chưa có đề xuất vật tư</div>
                    <p className="mt-1 mb-4 text-sm text-slate-500 max-w-sm mx-auto">Tạo đề xuất đầu tiên để gửi nhu cầu bổ sung vật tư cho công trình.</p>
                    <button
                      type="button"
                      onClick={handleCreate}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Tạo đề xuất
                    </button>
                  </div>
                </td>
              </tr>
            ) : filteredRequests.map(req => {
              const StatusIcon = statusConfig[req.status as keyof typeof statusConfig]?.icon || FileText;
              
              const isOwner = currentUserId && req.requestedById === currentUserId;
              const isManager = currentUserRole === "ADMIN" || currentUserRole === "DIRECTOR";
              const isEditable = ["DRAFT", "SUBMITTED", "REQUESTED", "PENDING"].includes(req.status) && (isOwner || isManager);
              const isDeletable = ["DRAFT", "REJECTED", "SUBMITTED", "REQUESTED", "PENDING"].includes(req.status) && (isOwner || isManager);
              
              return (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleView(req)}>
                  <td className="px-4 py-3 text-slate-900 font-medium max-w-[250px]">
                    {req.items && req.items.length > 0 ? (
                      <div className="line-clamp-2">
                        {req.items[0].materialName}
                        {req.items.length > 1 ? <span className="text-slate-500 text-xs ml-1">(+{req.items.length - 1} loại)</span> : ''}
                      </div>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-900 font-bold text-right whitespace-nowrap">
                    {formatQty(requestTotal(req))}
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {req.items?.[0]?.unit || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-[200px]">
                    <div className="line-clamp-2 text-xs">
                      {req.items?.[0]?.workItemNameSnapshot || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 truncate max-w-[150px]">
                    <SafeText>{req.requestedBy?.name}</SafeText>
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    <DateCell value={req.requestDate || req.createdAt ? format(new Date(req.requestDate || req.createdAt), "dd/MM/yyyy") : "-"} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {(() => {
                      const hasMovement = req.movements && req.movements.length > 0;
                      let label = statusConfig[req.status as keyof typeof statusConfig]?.label;
                      let variant = statusConfig[req.status as keyof typeof statusConfig]?.variant || "neutral";
                      if (["APPROVED", "PROCESSING", "ISSUED", "RECEIVED"].includes(req.status)) {
                        if (hasMovement) {
                          label = "Đã duyệt · Đã nhập";
                        } else {
                          label = "Đã duyệt · Chưa nhập kho";
                          variant = "danger";
                        }
                      }
                      return (
                        <StatusBadge variant={variant} size="sm" className="gap-1.5 px-2.5 py-1">
                          <StatusIcon className="w-3.5 h-3.5" />
                          {label}
                        </StatusBadge>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3 text-right relative" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end">
                      <MaterialRowActionMenu
                        actions={[
                          {
                            label: "Chi tiết",
                            icon: <Eye className="h-4 w-4" />,
                            onClick: () => handleView(req),
                          },
                          {
                            label: "Sao chép mã",
                            icon: <Copy className="h-4 w-4" />,
                            onClick: () => {
                              void navigator.clipboard.writeText(req.requestNo);
                              toast.success("Da sao chep ma phieu");
                            },
                          },
                          ...(isEditable ? [
                            {
                              label: "Sửa đề xuất",
                              icon: <Edit2 className="h-4 w-4" />,
                              onClick: () => handleEdit(req),
                            }
                          ] : []),
                          ...(isDeletable ? [
                            {
                              label: "Xóa đề xuất",
                              icon: <Trash2 className="h-4 w-4" />,
                              danger: true,
                              onClick: () => setDeletingRequest(req),
                            }
                          ] : []),
                          ...(req.status === "SUBMITTED" ? [
                            {
                              label: "Duyệt đề xuất",
                              icon: <CheckCircle2 className="h-4 w-4" />,
                              onClick: () => setApprovingRequest(req),
                            },
                            {
                              label: "Từ chối",
                              icon: <XCircle className="h-4 w-4" />,
                              danger: true,
                              onClick: () => setRejectingRequest(req),
                            }
                          ] : []),
                          ...(req.status === "REJECTED" ? [
                            {
                              label: "Xóa đề xuất",
                              icon: <Trash2 className="h-4 w-4" />,
                              danger: true,
                              onClick: () => setDeletingRequest(req),
                            }
                          ] : [])
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </EnterpriseTable>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="bg-slate-50/50 p-8 text-center rounded-xl border border-slate-200">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200 text-slate-400">
              <Package className="h-6 w-6" />
            </div>
            <div className="font-semibold text-slate-900 text-base">Chưa có đề xuất vật tư</div>
            <p className="mt-1 mb-4 text-sm text-slate-500">Tạo đề xuất đầu tiên để gửi nhu cầu bổ sung vật tư cho công trình.</p>
            <button
              type="button"
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors w-full justify-center"
            >
              <Plus className="h-4 w-4" />
              Tạo đề xuất
            </button>
          </div>
        ) : filteredRequests.map(req => {
          const StatusIcon = statusConfig[req.status as keyof typeof statusConfig]?.icon || FileText;
          return (
            <div key={req.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 active:scale-[0.99] transition-transform" onClick={() => handleView(req)}>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <SafeText className="font-bold text-slate-900 text-base">
                    {req.items && req.items.length > 0 ? (
                      <>
                        {req.items[0].materialName}
                        {req.items.length > 1 ? <span className="text-slate-500 text-xs ml-1">(+{req.items.length - 1} loại)</span> : ''}
                      </>
                    ) : 'Chưa có vật tư'}
                  </SafeText>
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    {formatQty(requestTotal(req))} {req.items?.[0]?.unit || ''}
                  </p>
                </div>
                {(() => {
                  const hasMovement = req.movements && req.movements.length > 0;
                  let label = statusConfig[req.status as keyof typeof statusConfig]?.label;
                  let variant = statusConfig[req.status as keyof typeof statusConfig]?.variant || "neutral";
                  if (["APPROVED", "PROCESSING", "ISSUED", "RECEIVED"].includes(req.status)) {
                    if (hasMovement) {
                      label = "Đã duyệt · Đã nhập";
                    } else {
                      label = "Đã duyệt · Chưa nhập kho";
                      variant = "danger";
                    }
                  }
                  return (
                    <StatusBadge variant={variant} size="sm" className="shrink-0 gap-1.5">
                      <StatusIcon className="w-3.5 h-3.5" />
                      {label}
                    </StatusBadge>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 p-2 rounded-lg">
                <div>
                  <span className="text-slate-500 block text-xs">Người tạo:</span>
                  <span className="font-semibold text-slate-900 line-clamp-1">{req.requestedBy?.name || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Ngày tạo:</span>
                  <div className="font-semibold text-slate-900">
                    {req.requestDate || req.createdAt ? format(new Date(req.requestDate || req.createdAt), "dd/MM/yyyy") : "-"}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modals/Drawers */}
      {isFormOpen && (
        <MaterialRequestForm 
          projectId={projectId}
          initialData={selectedRequest}
          wbsItems={wbsItems}
          materialItems={materialItems}
          stocks={stocks}
          onClose={handleCloseOverlay}
          onSuccess={handleMutationSuccess}
        />
      )}

      {isDetailOpen && (
        <MaterialRequestDetail
          request={selectedRequest}
          wbsItems={wbsItems}
          materialItems={materialItems}
          stocks={stocks}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          onClose={handleCloseOverlay}
          onEdit={() => {
            if (selectedRequest) handleEdit(selectedRequest);
          }}
          onSuccess={handleMutationSuccess}
        />
      )}

      {deletingRequest && (
        <ConfirmDialog
          isOpen={!!deletingRequest}
          onClose={() => setDeletingRequest(null)}
          title="Xóa đề xuất vật tư"
          description={`Bạn có chắc muốn xóa đề xuất này không?\nThao tác này không thể hoàn tác.`}
          confirmText="Xóa đề xuất"
          variant="danger"
          isLoading={isDeleting}
          onConfirm={handleDelete}
        />
      )}

      {approvingRequest && (
        <ConfirmDialog
          isOpen={!!approvingRequest}
          onClose={() => setApprovingRequest(null)}
          title="Duyệt và ghi nhận nhập kho?"
          description={`Duyệt đề xuất này.\nGhi nhận nhập kho số lượng đã đề xuất.\nTăng tồn kho thật.\nGắn nguồn nhập: Đề xuất vật tư.\nKhông cần nhập kho lần hai.`}
          confirmText="Duyệt đề xuất"
          variant="success"
          isLoading={isApproving}
          onConfirm={handleApprove}
        />
      )}

      {rejectingRequest && (
        <ConfirmDialog
          isOpen={!!rejectingRequest}
          onClose={() => { setRejectingRequest(null); setRejectReason(""); }}
          title="Từ chối đề xuất vật tư"
          description={
            <div className="space-y-3">
              <p>{`Vui lòng nhập lý do từ chối đề xuất "${rejectingRequest.requestNo}":`}</p>
              <textarea
                className="h-24 w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                placeholder="Nhập lý do từ chối..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          }
          confirmText="Từ chối"
          variant="danger"
          isLoading={isRejecting}
          onConfirm={handleReject}
        />
      )}
    </div>
  );
}
