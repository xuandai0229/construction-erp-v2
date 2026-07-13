"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Save, Info, ArrowUpRight } from "lucide-react";
import { CloseButton } from "@/components/ui/close-button";
import { AppDrawer } from "@/components/ui/app-drawer";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";
import { deleteMaterialRequest, approveMaterialRequest, rejectMaterialRequest } from "@/app/actions/material-request";
import { safeFormatDateTimeVN, safeFormatDateVN } from "@/lib/date-utils";
import { NumericInput } from "@/components/ui/numeric-input";
import type { MaterialItemDto, ProjectStockDto } from "@/app/(dashboard)/materials/actions";

const statusFallback: Record<string, { label: string; variant: "neutral" | "info" | "warning" | "success" | "danger" }> = {
  SUBMITTED: { label: "Chờ duyệt", variant: "warning" },
  APPROVED: { label: "Đã duyệt", variant: "success" },
  REJECTED: { label: "Từ chối", variant: "danger" },
  CANCELLED: { label: "Từ chối (Hủy)", variant: "danger" },
};

function getStatusConfig(status: string) {
  return statusFallback[status] || { label: status, variant: "neutral" as const };
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
  currentUserId,
  onClose,
  onEdit,
  onSuccess
}: {
  request: any;
  wbsItems: any[];
  materialItems?: MaterialItemDto[];
  stocks?: ProjectStockDto[];
  currentUserRole?: string;
  currentUserId?: string;
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

  const isOwner = currentUserId && request.requestedById === currentUserId;
  const isManager = currentUserRole === "ADMIN" || currentUserRole === "DIRECTOR";
  const isEditable = ["DRAFT", "SUBMITTED", "REQUESTED", "PENDING"].includes(request.status) && (isOwner || isManager);
  const isDeletable = ["DRAFT", "REJECTED", "SUBMITTED", "REQUESTED", "PENDING"].includes(request.status) && (isOwner || isManager);
  const canUpdateProgress = ["APPROVED", "PROCESSING", "ISSUED"].includes(request.status);
  const stockByCode = new Map(stocks.map((stock) => [stock.materialItem.code, stock]));
  const stockByName = new Map(stocks.map((stock) => [stock.materialItem.name.toLowerCase(), stock]));

  const getStockForItem = (item: any) => {
    const catalogItem = materialItems.find((material) => material.code === item.materialCode || material.name === item.materialName);
    if (catalogItem) return stockByCode.get(catalogItem.code) || null;
    return stockByCode.get(item.materialCode) || stockByName.get(String(item.materialName || "").toLowerCase()) || null;
  };
  const statusView = getStatusConfig(request.status);

  // Progress updates removed for simplified flow

  const handleDelete = async () => {
    setConfirmState({
      isOpen: true,
      title: "Xóa đề xuất vật tư",
      description: "Bạn có chắc muốn xóa đề xuất này không? Thao tác này không thể hoàn tác.",
      variant: "danger",
      confirmText: "Xóa đề xuất",
      cancelText: "Đóng",
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        if (operationRef.current) return;
        operationRef.current = true;
        try {
          setLoading(true);
          await deleteMaterialRequest(request.id);
          toast.success("Đã xóa đề xuất vật tư");
          onSuccess();
        } catch (err: any) {
          toast.error(err.message || "Lỗi xóa đề xuất");
        } finally {
          operationRef.current = false;
          setLoading(false);
        }
      }
    });
  };

  const handleApprove = async () => {
    setConfirmState({
      isOpen: true,
      title: "Duyệt đề xuất vật tư",
      description: "Vật tư trong đề xuất sẽ được tự động liên kết hoặc thêm vào Danh mục vật tư của công trình.\nBạn có chắc chắn muốn duyệt?",
      variant: "success",
      confirmText: "Duyệt đề xuất",
      cancelText: "Đóng",
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        if (operationRef.current) return;
        operationRef.current = true;
        try {
          setLoading(true);
          await approveMaterialRequest(request.id);
          toast.success("Đã duyệt đề xuất vật tư");
          onSuccess();
        } catch (err: any) {
          toast.error(err.message || "Lỗi duyệt đề xuất");
        } finally {
          operationRef.current = false;
          setLoading(false);
        }
      }
    });
  };

  const handleReject = async () => {
    if (!cancelReason.trim()) {
      toast.error("Vui lòng nhập lý do từ chối.");
      return;
    }
    setConfirmState({
      isOpen: true,
      title: "Từ chối đề xuất",
      description: "Đề xuất này sẽ chuyển sang trạng thái Từ chối.",
      variant: "danger",
      confirmText: "Từ chối",
      cancelText: "Đóng",
      onConfirm: async () => {
        setConfirmState(prev => ({ ...prev, isOpen: false }));
        if (operationRef.current) return;
        operationRef.current = true;
        try {
          setLoading(true);
          await rejectMaterialRequest(request.id, cancelReason);
          toast.success("Đã từ chối đề xuất");
          onSuccess();
        } catch (err: any) {
          toast.error(err.message || "Lỗi từ chối đề xuất");
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
                  {(request.status === "REJECTED" || request.status === "CANCELLED") && request.cancelReason && (
                    <div className="col-span-2 sm:col-span-3 mt-2 bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-xs text-red-500 font-bold mb-1">Lý do từ chối</p>
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
                </div>
                  
                <div className="mt-4 flex items-start gap-2 rounded bg-blue-50/50 p-2.5 text-xs text-slate-600 border border-blue-100/50">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
                  <p>
                    <strong className="font-medium text-slate-700">Lưu ý:</strong> Duyệt phiếu sẽ tự động liên kết (hoặc tạo mới) vật tư vào Danh mục và tạo ngay giao dịch <strong>Nhập kho</strong> tương ứng với số lượng đề xuất. Tồn kho thực tế sẽ <strong>TĂNG</strong>.
                  </p>
                </div>
                {/* Nút xuất chung đã bị loại bỏ theo thiết kế mới */}
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
                      <th className="px-4 py-3 text-center w-24">Đơn vị</th>
                      <th className="px-4 py-3 text-right w-32">Đề xuất</th>
                      <th className="px-4 py-3 w-48">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map(item => {
                      const req = numberValue(item.requestedQuantity);
                      const formatQty = (num: number) => new Intl.NumberFormat('vi-VN').format(num);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 min-w-[200px]">
                            <div className="font-semibold text-slate-900 text-sm line-clamp-2">{item.materialName}</div>
                            {item.materialCode && <div className="text-xs text-slate-500 font-mono mt-0.5">{item.materialCode}</div>}
                            {item.workItemNameSnapshot && <div className="text-[11px] text-slate-400 mt-1">Công việc: {item.workItemNameSnapshot}</div>}
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-medium text-slate-600">{item.unit}</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">{formatQty(req)}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-[200px]" title={item.note || ""}>
                            {item.note || "-"}
                          </td>
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
                {request.status === "SUBMITTED" && (
                  <div className="flex flex-col gap-2">
                    <textarea
                      placeholder="Lý do từ chối (nếu có)"
                      className="w-full h-16 rounded-lg border border-slate-300 p-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                    />
                    <button onClick={handleReject} disabled={loading} className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 border border-red-200">
                      Từ chối đề xuất
                    </button>
                  </div>
                )}
                {request.status === "REJECTED" && "Đề xuất đã bị từ chối."}
                <p className="text-xs text-slate-400 mt-1">Cập nhật lần cuối: {safeFormatDateTimeVN(request.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-white p-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 w-full">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {isEditable && (
                <button onClick={onEdit} className="flex-1 sm:flex-none px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  <Edit2 className="w-4 h-4" /> Sửa đề xuất
                </button>
              )}
              {request.status === "SUBMITTED" && isManager && (
                <button onClick={handleApprove} className="flex-1 sm:flex-none px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                  Duyệt đề xuất
                </button>
              )}
              {isDeletable && (
                <button onClick={handleDelete} className="flex-1 sm:flex-none px-4 py-2 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-semibold transition-colors">
                  Xóa đề xuất
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
