"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Save, Info, ArrowUpRight } from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import { AppDrawer } from "@/components/ui/app-drawer";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";
import { updateMaterialRequestStatus, updateMaterialRequestItems } from "@/app/actions/material-request";
import { safeFormatDateTimeVN, safeFormatDateVN } from "@/lib/date-utils";
import type { MaterialItemDto, ProjectStockDto } from "@/app/(dashboard)/materials/actions";

const statusConfig = {
  DRAFT: { label: "Nháp", variant: "neutral" as const },
  REQUESTED: { label: "Đã đề xuất", variant: "info" as const },
  PROCESSING: { label: "Đang xử lý", variant: "warning" as const },
  ISSUED: { label: "Đã cấp", variant: "info" as const },
  RECEIVED: { label: "Đã nhận", variant: "success" as const },
  CANCELLED: { label: "Hủy", variant: "danger" as const },
};

const priorityConfig = {
  LOW: { label: "Thấp", variant: "neutral" as const },
  MEDIUM: { label: "Trung bình", variant: "info" as const },
  HIGH: { label: "Cao", variant: "warning" as const },
  URGENT: { label: "Khẩn cấp", variant: "danger" as const },
};

const statusFallback: Record<string, { label: string; variant: "neutral" | "info" | "warning" | "success" | "danger" }> = {
  SUBMITTED: { label: "Chờ phê duyệt", variant: "warning" },
  APPROVED: { label: "Đã duyệt", variant: "success" },
  REJECTED: { label: "Từ chối", variant: "danger" },
};

function getStatusConfig(status: string) {
  return statusConfig[status as keyof typeof statusConfig] || statusFallback[status] || { label: status, variant: "neutral" as const };
}

function numberValue(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function MaterialRequestDetail({
  request,
  wbsItems,
  materialItems = [],
  stocks = [],
  currentUserRole,
  onClose,
  onEdit,
  onSuccess
}: {
  request: any;
  wbsItems: any[];
  materialItems?: MaterialItemDto[];
  stocks?: ProjectStockDto[];
  currentUserRole?: string;
  onClose: () => void;
  onEdit: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const operationRef = useRef(false);
  const toast = useToast();
  const router = useRouter();

  const handleOpenApproval = () => {
    if (!request.approvalRequestId) {
      toast.error("Chưa tìm thấy bản ghi phê duyệt liên kết.");
      return;
    }
    router.push(`/approvals?approvalId=${request.approvalRequestId}&sourceType=MATERIAL_REQUEST&sourceId=${request.id}&projectId=${request.projectId}&type=MATERIAL`);
  };
  const handleIssueFromRequest = () => {
    const firstPendingItem = (request.items || []).find((item: any) => {
      const requested = numberValue(item.requestedQuantity);
      const issued = numberValue(item.issuedQuantity);
      return requested > issued;
    }) || request.items?.[0];
    const material = firstPendingItem
      ? materialItems.find((item) => item.code === firstPendingItem.materialCode || item.name === firstPendingItem.materialName)
      : null;
    const params = new URLSearchParams();
    params.set("tab", "transactions");
    params.set("projectId", request.projectId);
    params.set("movementType", "EXPORT");
    params.set("openTransaction", "EXPORT");
    params.set("requestId", request.id);
    if (material) params.set("materialId", material.id);
    router.push(`/materials?${params.toString()}`);
  };
  
  const canApprove = ["ADMIN", "DIRECTOR", "DEPUTY_DIRECTOR", "MANAGER"].includes(currentUserRole || "");

  const [isApproving, setIsApproving] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleApprove = async () => {
    if (!request.approvalRequestId) return;
    setIsApproving(true);
    try {
      const { approveApprovalRequest } = await import("@/app/(dashboard)/approvals/actions");
      const res = await approveApprovalRequest(request.approvalRequestId);
      if (res.ok) {
        toast.success("Đã duyệt phiếu vật tư thành công!");
        onSuccess();
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi duyệt phiếu.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!request.approvalRequestId) return;
    if (!rejectReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối.");
      return;
    }
    setIsApproving(true);
    try {
      const { rejectApprovalRequest } = await import("@/app/(dashboard)/approvals/actions");
      const res = await rejectApprovalRequest(request.approvalRequestId, rejectReason);
      if (res.ok) {
        toast.success("Đã từ chối phiếu vật tư.");
        setShowRejectForm(false);
        setRejectReason("");
        onSuccess();
      }
    } catch (e: any) {
      toast.error(e.message || "Lỗi khi từ chối phiếu.");
    } finally {
      setIsApproving(false);
    }
  };
  
  // Local state for items to allow editing issued/received quantities
  const [items, setItems] = useState<any[]>(request.items || []);

  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: "danger" | "warning" | "info" | "success";
    confirmText: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    isOpen: false, title: "", description: "", variant: "info", confirmText: "", onConfirm: () => {}
  });

  const isEditable = ["DRAFT", "REJECTED"].includes(request.status);
  const canUpdateProgress = ["APPROVED", "PROCESSING", "ISSUED"].includes(request.status);
  const stockByCode = new Map(stocks.map((stock) => [stock.materialItem.code, stock]));
  const stockByName = new Map(stocks.map((stock) => [stock.materialItem.name.toLowerCase(), stock]));

  const getStockForItem = (item: any) => {
    const catalogItem = materialItems.find((material) => material.code === item.materialCode || material.name === item.materialName);
    if (catalogItem) return stockByCode.get(catalogItem.code) || null;
    return stockByCode.get(item.materialCode) || stockByName.get(String(item.materialName || "").toLowerCase()) || null;
  };
  const statusView = getStatusConfig(request.status);

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const executeUpdate = async () => {
    if (operationRef.current) return;
    operationRef.current = true;
    try {
      setLoading(true);
      await updateMaterialRequestItems(request.id, items);

      // Optionally auto-update status if fully received
      const allReceived = items.every(i => Number(i.receivedQuantity) >= Number(i.requestedQuantity));
      if (allReceived && request.status !== "RECEIVED") {
        await updateMaterialRequestStatus(request.id, "RECEIVED");
      } else if (request.status === "APPROVED") {
        await updateMaterialRequestStatus(request.id, "PROCESSING");
      }

      toast.success("Cập nhật cấp/nhận thành công");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật cấp/nhận");
    } finally {
      operationRef.current = false;
      setLoading(false);
    }
  };

  const handleUpdateProgress = async () => {
    try {
      // Validate quantities
      for (const item of items) {
        if (Number(item.issuedQuantity) > Number(item.requestedQuantity)) {
          throw new Error(`So luong da cap cua ${item.materialName} khong duoc lon hon so luong de xuat.`);
        }
        if (Number(item.receivedQuantity) > Number(item.issuedQuantity)) {
          throw new Error(`So luong da nhan cua ${item.materialName} khong duoc lon hon so luong da cap.`);
        }
        if (Number(item.issuedQuantity) < 0 || Number(item.receivedQuantity) < 0) {
          throw new Error(`Số lượng cấp/nhận của ${item.materialName} không được nhỏ hơn 0.`);
        }
      }

      const hasExceeding = items.some(item => Number(item.issuedQuantity) > Number(item.requestedQuantity) || Number(item.receivedQuantity) > Number(item.requestedQuantity));
      if (hasExceeding) {
        setConfirmState({
          isOpen: true,
          title: "Số lượng vượt đề xuất",
          description: "Số lượng cấp/nhận đang lớn hơn số lượng đề xuất. Vui lòng kiểm tra lại trước khi lưu.",
          variant: "warning",
          confirmText: "Vẫn lưu",
          cancelText: "Kiểm tra lại",
          onConfirm: () => {
            setConfirmState(prev => ({ ...prev, isOpen: false }));
            executeUpdate();
          }
        });
        return;
      }

      await executeUpdate();
    } catch (err: any) {
      toast.error(err.message || "Lỗi cập nhật cấp/nhận");
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Vui lòng nhập lý do hủy phiếu.");
      return;
    }
    
    setConfirmState({
      isOpen: true,
      title: "Hủy phiếu đề xuất vật tư?",
      description: "Phiếu sẽ chuyển sang trạng thái hủy. Dữ liệu cũ vẫn được giữ lại để truy vết.",
      variant: "danger",
      confirmText: "Hủy phiếu",
      cancelText: "Đóng",
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        if (operationRef.current) return;
        operationRef.current = true;
        try {
          setLoading(true);
          await updateMaterialRequestStatus(request.id, "CANCELLED", cancelReason);
          toast.success("Đã hủy phiếu thành công");
          onSuccess();
        } catch (err: any) {
          toast.error(err.message || "Lỗi hủy phiếu");
        } finally {
          operationRef.current = false;
          setLoading(false);
        }
      }
    });
  };

  return (
    <AppDrawer isOpen={!!request} onClose={onClose} ariaLabel="Chi tiết đề xuất vật tư">
      <div className="flex h-full flex-col bg-white">
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 line-clamp-1">{request.requestNo}</h2>
                <StatusBadge variant={statusView.variant} size="sm">
                  {statusView.label}
                </StatusBadge>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 font-mono">
                <StatusBadge variant={priorityConfig[request.priority as keyof typeof priorityConfig]?.variant || "neutral"} size="sm">
                  {priorityConfig[request.priority as keyof typeof priorityConfig]?.label}
                </StatusBadge>
                {request.neededDate && (
                  <>
                    <span className="font-sans text-slate-300">•</span>
                    <span className="font-sans font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      Cần: {safeFormatDateVN(request.neededDate)}
                    </span>
                  </>
                )}
              </div>
            </div>
            <CloseButton onClick={onClose} tone="neutral" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="space-y-8">
            {/* THÔNG TIN CHUNG */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Thông tin phiếu</h3>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Người đề xuất</p>
                    <p className="text-sm font-semibold text-slate-900">{request.requestedBy?.name || "Không rõ"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Ngày đề xuất</p>
                    <p className="text-sm font-semibold text-slate-900">{safeFormatDateVN(request.requestDate || request.createdAt)}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-3">
                    <p className="text-xs text-slate-500 mb-1">Ghi chú</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{request.note || "-"}</p>
                  </div>
                  {request.status === "CANCELLED" && (
                    <div className="col-span-2 sm:col-span-3 mt-2 bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-xs text-red-500 font-bold mb-1">Lý do hủy</p>
                      <p className="text-sm text-red-700">{request.cancelReason || "Không rõ"}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PHÊ DUYỆT YÊU CẦU */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Phê duyệt yêu cầu</h3>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge variant={getStatusConfig(request.status).variant} size="sm">
                        {getStatusConfig(request.status).label}
                      </StatusBadge>
                      <span className="text-sm font-medium text-slate-700">
                        {request.status === "SUBMITTED" && "Đang chờ Giám đốc / Ban quản lý duyệt."}
                        {request.status === "APPROVED" && "Phiếu đã được phê duyệt hợp lệ."}
                        {request.status === "REJECTED" && "Phiếu đã bị từ chối."}
                        {request.status === "RECEIVED" && "Phiếu đã hoàn tất nhận vật tư."}
                        {request.status === "DRAFT" && "Phiếu nháp. Chưa gửi phê duyệt."}
                        {["PROCESSING", "ISSUED"].includes(request.status) && "Đang trong quá trình cấp phát."}
                        {request.status === "CANCELLED" && "Phiếu đã bị hủy."}
                      </span>
                    </div>
                    {["SUBMITTED", "APPROVED", "REJECTED"].includes(request.status) && (
                      <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 grid gap-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Mã phê duyệt:</span>
                          <span className="font-mono text-xs font-semibold">{request.approvalRequestId ? request.approvalRequestCode || `APP-?` : "—"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Người gửi:</span>
                          <span className="font-medium text-slate-700">{request.requestedBy?.name || "Không rõ"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Ngày gửi:</span>
                          <span className="font-medium text-slate-700">{safeFormatDateTimeVN(request.updatedAt || request.createdAt)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Quyền xử lý:</span>
                          <span className="font-medium text-slate-700 text-xs bg-slate-200 px-1.5 py-0.5 rounded">Giám đốc, Quản lý, Admin</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {["SUBMITTED", "APPROVED", "REJECTED"].includes(request.status) && (
                    <div className="shrink-0 flex flex-col gap-2 w-full sm:w-auto">
                      {!request.approvalRequestId && request.status === "SUBMITTED" && (
                        <div className="text-amber-700 text-xs leading-relaxed max-w-[240px] bg-amber-50 p-3 rounded-lg border border-amber-200 font-medium mb-2">
                          Phiếu đang chờ duyệt nhưng chưa tìm thấy bản ghi phê duyệt liên kết. Vui lòng liên hệ Admin.
                        </div>
                      )}
                      {request.status === "SUBMITTED" && canApprove ? (
                        <>
                          <div className="flex flex-col gap-2 mb-2">
                            <button
                              onClick={handleApprove}
                              disabled={isApproving || !request.approvalRequestId}
                              className="w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Duyệt phiếu
                            </button>
                            <button
                              onClick={() => setShowRejectForm(!showRejectForm)}
                              disabled={isApproving || !request.approvalRequestId}
                              className="w-full inline-flex items-center justify-center rounded-lg border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                            >
                              Từ chối
                            </button>
                          </div>
                          {showRejectForm && (
                            <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg space-y-2 w-full sm:w-[260px]">
                              <label className="text-xs font-bold text-rose-800">Lý do từ chối:</label>
                              <textarea
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                className="w-full text-sm rounded border border-rose-200 p-2 outline-none focus:ring-1 focus:ring-rose-400"
                                rows={2}
                                placeholder="Nhập lý do..."
                              />
                              <div className="flex justify-end gap-2">
                                <button onClick={() => setShowRejectForm(false)} className="text-xs px-2 py-1 text-slate-500 hover:bg-slate-200 rounded">Hủy</button>
                                <button onClick={handleReject} disabled={isApproving} className="text-xs px-2 py-1 bg-rose-600 text-white rounded hover:bg-rose-700">Xác nhận</button>
                              </div>
                            </div>
                          )}
                        </>
                      ) : !canApprove && request.status === "SUBMITTED" && request.approvalRequestId ? (
                        <div className="text-slate-600 text-xs leading-relaxed max-w-[220px] bg-amber-50 p-3 rounded-lg border border-amber-200 font-medium">
                          Phiếu đã gửi đến Trung tâm phê duyệt. Người có quyền duyệt sẽ xử lý.
                        </div>
                      ) : null}
                      <button
                        onClick={handleOpenApproval}
                        disabled={!request.approvalRequestId}
                        className={`mt-1 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                          request.approvalRequestId 
                            ? "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200 shadow-sm" 
                            : "bg-slate-50 text-slate-400 border border-slate-100 cursor-not-allowed"
                        }`}
                      >
                        Xem tại Trung tâm phê duyệt
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex items-start gap-2 rounded bg-blue-50/50 p-2.5 text-xs text-slate-600 border border-blue-100/50">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                  <p>
                    <strong className="font-medium text-slate-700">Lưu ý:</strong> Duyệt phiếu chỉ xác nhận nhu cầu vật tư. Cấp phát và trừ tồn kho là bước sau do Thủ kho xử lý.
                  </p>
                </div>
                {request.status === "APPROVED" && (
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={handleIssueFromRequest}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                      Xuất kho theo phiếu
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* VẬT TƯ */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-900">Chi tiết vật tư</h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium border border-slate-200">{items.length} loại</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Vật tư</th>
                      <th className="px-4 py-3 text-center">ĐVT</th>
                      <th className="px-4 py-3 text-right">Tồn hiện tại</th>
                      <th className="px-4 py-3 text-right">Đề xuất</th>
                      <th className="px-4 py-3 w-28">Cấp</th>
                      <th className="px-4 py-3 w-28">Nhận</th>
                      <th className="px-4 py-3 text-right">Còn thiếu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => {
                      const req = numberValue(item.requestedQuantity);
                      const recv = numberValue(item.receivedQuantity);
                      const rem = Math.max(0, req - recv);
                      const stock = getStockForItem(item);
                      const hasStockRisk = stock && req > (stock.stock || 0) && ["DRAFT", "SUBMITTED", "APPROVED"].includes(request.status);
                      const formatQty = (num: number) => new Intl.NumberFormat('vi-VN').format(num);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 min-w-[200px]">
                            <div className="font-semibold text-slate-900 text-sm line-clamp-2">{item.materialName}</div>
                            {item.materialCode && <div className="text-xs text-slate-500 font-mono mt-0.5">{item.materialCode}</div>}
                            {item.workItemNameSnapshot && <div className="text-[11px] text-slate-400 mt-1">CV: {item.workItemNameSnapshot}</div>}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-medium text-slate-600">{item.unit}</td>
                          <td className="px-4 py-3 text-right">
                            {stock ? (
                              <div className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold ${hasStockRisk ? 'text-rose-600 bg-rose-50 border border-rose-100' : 'text-slate-600 bg-slate-100 border border-slate-200'}`}>
                                {formatQty(stock.stock || 0)}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{formatQty(req)}</td>
                          <td className="px-2 py-2">
                            {canUpdateProgress ? (
                              <input 
                                type="number"
                                value={item.issuedQuantity}
                                onChange={(e) => handleItemChange(item.id, 'issuedQuantity', e.target.value)}
                                className="w-full px-2 py-1.5 border rounded text-right font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                            ) : (
                              <div className="px-2 py-1.5 text-right font-medium text-slate-900">{formatQty(numberValue(item.issuedQuantity))}</div>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            {canUpdateProgress ? (
                              <input 
                                type="number"
                                value={item.receivedQuantity}
                                onChange={(e) => handleItemChange(item.id, 'receivedQuantity', e.target.value)}
                                className="w-full px-2 py-1.5 border rounded text-right font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                            ) : (
                              <div className="px-2 py-1.5 text-right font-medium text-slate-900">{formatQty(numberValue(item.receivedQuantity))}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-amber-600">{rem > 0 ? `${formatQty(rem)} ${item.unit || ''}`.trim() : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AUDIT / HISTORY */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Lịch sử cập nhật</h3>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 flex flex-col items-center justify-center text-center">
                <Info className="h-6 w-6 text-slate-400 mb-2" />
                <p className="text-sm text-slate-500">Chưa có lịch sử thao tác chi tiết.</p>
                <p className="text-xs text-slate-400 mt-1">Cập nhật lần cuối: {safeFormatDateTimeVN(request.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white p-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {canUpdateProgress && request.status !== "RECEIVED" && request.status !== "CANCELLED" ? (
              <div className="text-sm text-amber-600 font-medium bg-amber-50 px-3 py-1.5 rounded-md w-full sm:w-auto text-center">
                Vui lòng nhập SL cấp/nhận vào ô trống trên bảng
              </div>
            ) : (
              <div></div>
            )}
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isEditable && (
                <button onClick={onEdit} className="flex-1 sm:flex-none px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  <Edit2 className="w-4 h-4" /> Sửa phiếu
                </button>
              )}
              {request.status !== "CANCELLED" && request.status !== "RECEIVED" && (
                <button onClick={() => setIsCancelling(true)} className="flex-1 sm:flex-none px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-semibold transition-colors">
                  Hủy phiếu
                </button>
              )}
              {canUpdateProgress && request.status !== "RECEIVED" && request.status !== "CANCELLED" && (
                <button onClick={handleUpdateProgress} disabled={loading} className="flex-1 sm:flex-none px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
                  {loading ? "Đang xử lý..." : <><Save className="w-4 h-4" /> Lưu số lượng</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog 
        {...confirmState}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
      />
    </AppDrawer>
  );
}
