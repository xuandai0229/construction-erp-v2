"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Filter, Package, AlertCircle, Eye, Edit2, CheckCircle2, Clock, XCircle, FileText, ArrowRight, AlertTriangle, Boxes, CalendarClock, ClipboardCheck } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { MaterialRequestForm } from "./material-request-form";
import { MaterialRequestDetail } from "./material-request-detail";
import { KpiCard, EnterpriseTable, SafeText, ActionGroup, DateCell } from "@/components/ui/enterprise";
import type { MaterialItemDto, ProjectStockDto } from "@/app/(dashboard)/materials/actions";

const statusConfig = {
  DRAFT: { label: "Nháp", variant: "neutral" as const, icon: FileText },
  REQUESTED: { label: "Đã đề xuất", variant: "info" as const, icon: Clock },
  SUBMITTED: { label: "Chờ phê duyệt", variant: "warning" as const, icon: Clock },
  APPROVED: { label: "Đã duyệt", variant: "success" as const, icon: CheckCircle2 },
  REJECTED: { label: "Từ chối", variant: "danger" as const, icon: XCircle },
  PROCESSING: { label: "Đang xử lý", variant: "info" as const, icon: AlertCircle },
  ISSUED: { label: "Đã cấp", variant: "info" as const, icon: Package },
  RECEIVED: { label: "Đã nhận", variant: "success" as const, icon: CheckCircle2 },
  CANCELLED: { label: "Hủy", variant: "danger" as const, icon: XCircle },
};

const priorityConfig = {
  LOW: { label: "Thấp", variant: "neutral" as const },
  MEDIUM: { label: "Trung bình", variant: "info" as const },
  HIGH: { label: "Cao", variant: "warning" as const },
  URGENT: { label: "Khẩn cấp", variant: "danger" as const },
};

type RequestFlag = "all" | "pending" | "active" | "approved" | "partial" | "received" | "missing" | "overdue" | "stock-risk";

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
}: { 
  projectId: string;
  initialRequests: any[];
  wbsItems: any[];
  materialItems?: MaterialItemDto[];
  stocks?: ProjectStockDto[];
  currentUserRole?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      const label = `${work.code ? `${work.code} - ` : ""}${work.workContent || work.name || work.categoryName || "Chua co ten cong viec"}`;
      map.set(work.id, label);
    });
    return map;
  }, [wbsItems]);

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
    const haystack = [
      req.requestNo,
      req.note,
      req.requestedBy?.name,
      ...(req.items || []).flatMap((item: any) => [
        item.materialCode,
        item.materialName,
        item.note,
        workById.get(item.fieldProgressItemId) || workById.get(item.wbsItemId) || "",
      ]),
    ].map(normalize).join(" ");
    const matchesSearch = !search || haystack.includes(normalize(search));
    const matchesStatus = statusFilter === "ALL" || req.status === statusFilter;
    const matchesPriority = priorityFilter === "ALL" || req.priority === priorityFilter;
    const matchesFlag =
      activeFlag === "all" ||
      (activeFlag === "pending" && req.status === "SUBMITTED") ||
      (activeFlag === "active" && ["REQUESTED", "SUBMITTED", "APPROVED", "PROCESSING", "ISSUED"].includes(req.status)) ||
      (activeFlag === "approved" && req.status === "APPROVED") ||
      (activeFlag === "partial" && isPartialIssue(req)) ||
      (activeFlag === "received" && req.status === "RECEIVED") ||
      (activeFlag === "missing" && requestRemaining(req) > 0 && !["CANCELLED", "REJECTED"].includes(req.status)) ||
      (activeFlag === "overdue" && isOverdue(req)) ||
      (activeFlag === "stock-risk" && hasStockRisk(req));
    return matchesSearch && matchesStatus && matchesPriority && matchesFlag;
  });

  // KPI Calculation
  const totalRequests = requests.length;
  const pendingRequests = requests.filter(r => r.status === "SUBMITTED").length;
  const processingRequests = requests.filter(r => ["REQUESTED", "SUBMITTED", "APPROVED", "PROCESSING", "ISSUED"].includes(r.status)).length;
  const approvedRequests = requests.filter(r => r.status === "APPROVED").length;
  const partialRequests = requests.filter(isPartialIssue).length;
  const receivedRequests = requests.filter(r => r.status === "RECEIVED").length;
  const missingItemsRequests = requests.filter(r => 
    r.items.some((i: any) => Number(i.requestedQuantity) > Number(i.receivedQuantity)) && r.status !== "CANCELLED"
  ).length;
  const overdueRequests = requests.filter(isOverdue).length;
  const stockRiskRequests = requests.filter(hasStockRisk).length;

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
      {/* Request Command Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2">
        {([
          { key: "all", label: "Tổng phiếu", value: totalRequests, icon: <FileText className="h-3.5 w-3.5" />, color: "text-slate-500 bg-slate-50 border-slate-200", activeColor: "ring-2 ring-blue-500 bg-blue-50 border-blue-200 text-blue-700", filterAction: () => updateUrl({ requestFlag: null, requestStatus: null }), isActive: activeFlag === "all" && statusFilter === "ALL", isAlert: false },
          { key: "pending", label: "Chờ duyệt", value: pendingRequests, icon: <Clock className="h-3.5 w-3.5" />, color: "text-amber-600 bg-amber-50/50 border-amber-200", activeColor: "ring-2 ring-amber-500 bg-amber-50 border-amber-300 text-amber-700", filterAction: () => updateUrl({ requestFlag: null, requestStatus: "SUBMITTED" }), isActive: statusFilter === "SUBMITTED", isAlert: false },
          { key: "active", label: "Đang xử lý", value: processingRequests, icon: <AlertCircle className="h-3.5 w-3.5" />, color: "text-blue-600 bg-blue-50/50 border-blue-200", activeColor: "ring-2 ring-blue-500 bg-blue-50 border-blue-300 text-blue-700", filterAction: () => updateUrl({ requestFlag: "active", requestStatus: null }), isActive: activeFlag === "active", isAlert: false },
          { key: "received", label: "Đã nhận", value: receivedRequests, icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-emerald-600 bg-emerald-50/50 border-emerald-200", activeColor: "ring-2 ring-emerald-500 bg-emerald-50 border-emerald-300 text-emerald-700", filterAction: () => updateUrl({ requestFlag: null, requestStatus: "RECEIVED" }), isActive: statusFilter === "RECEIVED", isAlert: false },
          { key: "missing", label: "Thiếu vật tư", tooltip: "Chưa nhận đủ so với đề xuất", value: missingItemsRequests, icon: <Boxes className="h-3.5 w-3.5" />, isAlert: true, color: "", activeColor: "", filterAction: () => updateUrl({ requestFlag: "missing", requestStatus: null }), isActive: activeFlag === "missing" },
          { key: "overdue", label: "Quá hạn", value: overdueRequests, icon: <CalendarClock className="h-3.5 w-3.5" />, isAlert: true, color: "", activeColor: "", filterAction: () => updateUrl({ requestFlag: "overdue", requestStatus: null }), isActive: activeFlag === "overdue" },
          { key: "stock-risk", label: "Thiếu tồn", tooltip: "Tồn kho hiện tại không đủ cấp", value: stockRiskRequests, icon: <AlertTriangle className="h-3.5 w-3.5" />, isAlert: true, color: "", activeColor: "", filterAction: () => updateUrl({ requestFlag: "stock-risk", requestStatus: null }), isActive: activeFlag === "stock-risk" },
        ] as any[]).map((kpi) => {
          let styleClass = "bg-white border-slate-200 hover:border-slate-300";
          let iconClass = kpi.isAlert ? "bg-slate-100 text-slate-400" : kpi.color.split(" ").slice(0, 2).join(" ");
          let valueClass = "text-slate-900";
          
          if (kpi.isActive) {
            styleClass = kpi.isAlert ? "ring-2 ring-rose-500 bg-rose-50 border-rose-300" : kpi.activeColor.split(" ").slice(0, 3).join(" ");
            iconClass = kpi.isAlert ? "bg-rose-100 text-rose-600" : kpi.activeColor.split(" ")[1].replace("ring-", "bg-").replace("500", "100") + " " + kpi.activeColor.split(" ")[3];
            valueClass = kpi.isAlert ? "text-rose-700" : "text-slate-900";
          } else if (kpi.isAlert && kpi.value > 0) {
            styleClass = "bg-rose-50/40 border-rose-200 hover:border-rose-300";
            iconClass = "bg-rose-100 text-rose-600";
            valueClass = "text-rose-700";
          }

          return (
            <button
              key={kpi.key}
              type="button"
              onClick={kpi.filterAction}
              title={kpi.tooltip || undefined}
              className={`flex h-[72px] items-center gap-3.5 rounded-2xl border px-4 shadow-sm transition-all hover:shadow-md active:scale-[0.98] ${styleClass}`}
            >
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                {kpi.icon}
              </div>
              <div className="flex flex-col items-start min-w-0">
                <div className={`text-2xl font-bold leading-none tabular-nums tracking-tight ${valueClass}`}>
                  {formatQty(kpi.value)}
                </div>
                <div className="mt-1 text-xs font-semibold whitespace-nowrap text-slate-500">
                  {kpi.label}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 flex-1">
          <div className="relative flex-1 max-w-md min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <label htmlFor="search-request" className="sr-only">Tìm kiếm đề xuất</label>
            <input 
              id="search-request"
              name="search-request"
              type="text"
              placeholder="Tìm mã phiếu, ghi chú..."
              className="w-full pl-9 pr-4 py-2 bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={search}
              onChange={(e) => updateUrl({ q: e.target.value, requestId: null, requestMode: null }, true)}
            />
          </div>
          <div className="relative min-w-0">
            <label htmlFor="filter-status" className="sr-only">Bộ lọc trạng thái</label>
            <select
              id="filter-status"
              name="filter-status"
              className="w-full sm:w-auto appearance-none pl-3 pr-8 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              value={statusFilter}
              onChange={(e) => updateUrl({ requestStatus: e.target.value, requestFlag: null })}
            >
              <option value="ALL">Tất cả trạng thái</option>
              {Object.entries(statusConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          </div>
          <div className="relative min-w-0">
            <label htmlFor="filter-priority" className="sr-only">Bộ lọc ưu tiên</label>
            <select
              id="filter-priority"
              name="filter-priority"
              className="w-full sm:w-auto appearance-none pl-3 pr-8 py-2 bg-white text-slate-900 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
              value={priorityFilter}
              onChange={(e) => updateUrl({ requestPriority: e.target.value })}
            >
              <option value="ALL">Tất cả ưu tiên</option>
              {Object.entries(priorityConfig).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          </div>
          <button
            type="button"
            onClick={() => updateUrl({ requestFlag: activeFlag === "stock-risk" ? null : "stock-risk", requestStatus: null })}
            className={`h-10 rounded-lg border px-3 text-sm font-semibold transition-colors shrink-0 whitespace-nowrap ${
              activeFlag === "stock-risk"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Không đủ tồn
          </button>
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
              <th className="px-4 py-3 border-b border-slate-200">Mã phiếu</th>
              <th className="px-4 py-3 border-b border-slate-200">Ngày cần</th>
              <th className="px-4 py-3 border-b border-slate-200">Số loại VT</th>
              <th className="px-4 py-3 border-b border-slate-200">Trạng thái</th>
              <th className="px-4 py-3 border-b border-slate-200">Ưu tiên</th>
              <th className="px-4 py-3 border-b border-slate-200 w-1/4">Người tạo</th>
              <th className="px-4 py-3 border-b border-slate-200 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Không tìm thấy đề xuất vật tư nào.
                </td>
              </tr>
            ) : filteredRequests.map(req => {
              const StatusIcon = statusConfig[req.status as keyof typeof statusConfig]?.icon || FileText;
              const isEditable = ["DRAFT", "REJECTED"].includes(req.status);
              
              return (
                <tr key={req.id} className="hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleView(req)}>
                  <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">{req.requestNo}</td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    <DateCell value={req.neededDate ? format(new Date(req.neededDate), "dd/MM/yyyy") : "-"} />
                    {isOverdue(req) ? (
                      <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                        <CalendarClock className="h-3 w-3" /> Quá hạn
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div className="space-y-1">
                      <div className="font-semibold text-slate-900">{req.items?.length || 0} loại VT</div>
                      <div className="text-[11px]">
                        Đề xuất {formatQty(requestTotal(req))} · Cấp {formatQty(requestIssued(req))} · Nhận {formatQty(requestReceived(req))}
                      </div>
                      {requestRemaining(req) > 0 && !isClosedStatus(req.status) && (
                        <div className="text-[11px] font-semibold text-amber-600">
                          Thiếu {formatQty(requestRemaining(req))}
                        </div>
                      )}
                      {hasStockRisk(req) ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                          <AlertTriangle className="h-3 w-3" /> Không đủ tồn
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge variant={statusConfig[req.status as keyof typeof statusConfig]?.variant || "neutral"} size="sm" className="gap-1.5 px-2.5 py-1">
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig[req.status as keyof typeof statusConfig]?.label}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge variant={priorityConfig[req.priority as keyof typeof priorityConfig]?.variant || "neutral"} size="sm">
                      {priorityConfig[req.priority as keyof typeof priorityConfig]?.label}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-0">
                    <SafeText>{req.requestedBy?.name}</SafeText>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <ActionGroup className="justify-end flex-nowrap">
                      {isEditable && (
                        <button onClick={() => handleEdit(req)} aria-label={`Sửa đề xuất ${req.requestNo}`} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => handleView(req)} aria-label={`Chi tiết đề xuất ${req.requestNo}`} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors" title="Chi tiết">
                        <Eye className="w-4 h-4" />
                      </button>
                    </ActionGroup>
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
          <div className="bg-white p-8 text-center rounded-xl border border-slate-200 text-slate-500 text-sm">
            Không tìm thấy đề xuất vật tư nào. Hãy tạo đề xuất vật tư đầu tiên.
          </div>
        ) : filteredRequests.map(req => {
          const StatusIcon = statusConfig[req.status as keyof typeof statusConfig]?.icon || FileText;
          return (
            <div key={req.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 active:scale-[0.99] transition-transform" onClick={() => handleView(req)}>
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <SafeText className="font-bold text-slate-900 text-base">{req.requestNo}</SafeText>
                  <p className="mt-1 text-xs font-medium text-slate-600">
                    <SafeText>{req.requestedBy?.name}</SafeText>
                  </p>
                </div>
                <StatusBadge variant={statusConfig[req.status as keyof typeof statusConfig]?.variant || "neutral"} size="sm" className="shrink-0 gap-1.5">
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusConfig[req.status as keyof typeof statusConfig]?.label}
                </StatusBadge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 p-2 rounded-lg">
                <div>
                  <span className="text-slate-500 block text-xs">Vật tư:</span>
                  <span className="font-semibold text-slate-900">{req.items?.length || 0} loại</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Ngày cần:</span>
                  <div className="font-semibold text-slate-900 flex items-center gap-1">
                    {req.neededDate ? format(new Date(req.neededDate), "dd/MM/yyyy") : "-"}
                    {isOverdue(req) && <CalendarClock className="w-3 h-3 text-rose-500" />}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <div className="flex flex-col text-[11px]">
                  <span className="text-slate-500">Đề xuất {formatQty(requestTotal(req))} · Cấp {formatQty(requestIssued(req))} · Nhận {formatQty(requestReceived(req))}</span>
                  {requestRemaining(req) > 0 && !isClosedStatus(req.status) && (
                    <span className="font-semibold text-amber-600">Thiếu {formatQty(requestRemaining(req))}</span>
                  )}
                </div>
                {hasStockRisk(req) && (
                  <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
                    <AlertTriangle className="w-3 h-3" /> Không đủ tồn
                  </span>
                )}
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
          onClose={handleCloseOverlay}
          onEdit={() => {
            if (selectedRequest) handleEdit(selectedRequest);
          }}
          onSuccess={handleMutationSuccess}
        />
      )}
    </div>
  );
}
