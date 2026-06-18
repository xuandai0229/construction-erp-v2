"use client";

import { useRef, useState } from "react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { X, Edit2, Package, Save, CheckCircle2, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast-context";
import { updateMaterialRequestStatus, updateMaterialRequestItems } from "@/app/actions/material-request";

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

export function MaterialRequestDetail({
  request,
  wbsItems,
  onClose,
  onEdit,
  onSuccess
}: {
  request: any;
  wbsItems: any[];
  onClose: () => void;
  onEdit: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const operationRef = useRef(false);
  const toast = useToast();
  
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

  const isEditable = ["DRAFT", "REQUESTED", "PROCESSING"].includes(request.status);

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
      } else if (request.status === "REQUESTED") {
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
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-labelledby="detail-modal-title">
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-6xl sm:rounded-xl shadow-2xl flex flex-col mt-12 sm:mt-0 animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-0 sm:fade-in-0 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <button aria-label="Quay lại" onClick={onClose} className="sm:hidden p-1.5 -ml-1.5 text-slate-500 hover:text-slate-800 rounded-full">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 id="detail-modal-title" className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
              Chi tiết: {request.requestNo}
            </h2>
            <StatusBadge variant={statusConfig[request.status as keyof typeof statusConfig]?.variant || "neutral"} size="sm" className="hidden sm:inline-flex">
              {statusConfig[request.status as keyof typeof statusConfig]?.label}
            </StatusBadge>
          </div>
          <div className="flex items-center gap-2">
            {isEditable && (
              <button 
                onClick={onEdit}
                aria-label={`Sửa phiếu ${request.requestNo}`}
                className="hidden sm:flex px-3 py-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg text-sm font-semibold items-center gap-1.5 transition-colors"
              >
                <Edit2 className="w-4 h-4" /> Sửa phiếu
              </button>
            )}
            <button onClick={onClose} aria-label="Đóng chi tiết phiếu" className="hidden sm:block p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:px-6 pb-[calc(96px+env(safe-area-inset-bottom))] sm:pb-6 space-y-6">

          <div className="sm:hidden mb-2">
            <StatusBadge variant={statusConfig[request.status as keyof typeof statusConfig]?.variant || "neutral"} size="md">
              {statusConfig[request.status as keyof typeof statusConfig]?.label}
            </StatusBadge>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-slate-500 font-medium text-xs mb-1">Ngày đề xuất</p>
              <p className="font-semibold text-slate-900">{format(new Date(request.requestDate), "dd/MM/yyyy")}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium text-xs mb-1">Ngày cần vật tư</p>
              <p className="font-semibold text-blue-700">{request.neededDate ? format(new Date(request.neededDate), "dd/MM/yyyy") : "-"}</p>
            </div>
            <div>
              <p className="text-slate-500 font-medium text-xs mb-1">Mức ưu tiên</p>
              <StatusBadge variant={priorityConfig[request.priority as keyof typeof priorityConfig]?.variant || "neutral"} size="sm">
                {priorityConfig[request.priority as keyof typeof priorityConfig]?.label}
              </StatusBadge>
            </div>
            <div>
              <p className="text-slate-500 font-medium text-xs mb-1">Người đề xuất</p>
              <p className="font-semibold text-slate-900">{request.requestedBy?.name}</p>
            </div>
            {request.note && (
              <div className="col-span-2 sm:col-span-4 mt-2">
                <p className="text-slate-500 font-medium text-xs mb-1">Ghi chú chung</p>
                <p className="text-slate-800">{request.note}</p>
              </div>
            )}
            {request.status === "CANCELLED" && request.cancelReason && (
              <div className="col-span-2 sm:col-span-4 mt-2 p-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-red-600 font-medium text-xs mb-1">Lý do hủy</p>
                <p className="text-red-800 font-semibold">{request.cancelReason}</p>
              </div>
            )}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="px-4 py-3">Tên vật tư</th>
                  <th className="px-4 py-3">Đơn vị</th>
                  <th className="px-4 py-3 text-right">SL Đề xuất</th>
                  <th className="px-4 py-3 w-32">Đã cấp</th>
                  <th className="px-4 py-3 w-32">Đã nhận</th>
                  <th className="px-4 py-3 text-right">Còn thiếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => {
                  const remaining = Math.max(0, Number(item.requestedQuantity) - Number(item.receivedQuantity));
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{item.materialName}</p>
                        {item.fieldProgressItemId && (
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">
                            CV: {wbsItems.find(w => w.id === item.fieldProgressItemId)?.workContent || "Không rõ"}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{item.unit}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{Number(item.requestedQuantity)}</td>
                      <td className="px-4 py-2">
                        <label htmlFor={`desktop-issued-${item.id}`} className="sr-only">Số lượng đã cấp cho {item.materialName}</label>
                        <input 
                          id={`desktop-issued-${item.id}`}
                          name={`desktop-issued-${item.id}`}
                          type="number"
                          min="0"
                          value={item.issuedQuantity}
                          onChange={(e) => handleItemChange(item.id, 'issuedQuantity', e.target.value)}
                          disabled={request.status === "RECEIVED" || request.status === "CANCELLED"}
                          className="w-full px-2 py-1.5 bg-white text-slate-900 border border-slate-300 rounded text-right focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <label htmlFor={`desktop-received-${item.id}`} className="sr-only">Số lượng đã nhận cho {item.materialName}</label>
                        <input 
                          id={`desktop-received-${item.id}`}
                          name={`desktop-received-${item.id}`}
                          type="number"
                          min="0"
                          value={item.receivedQuantity}
                          onChange={(e) => handleItemChange(item.id, 'receivedQuantity', e.target.value)}
                          disabled={request.status === "RECEIVED" || request.status === "CANCELLED"}
                          className="w-full px-2 py-1.5 bg-white text-slate-900 border border-slate-300 rounded text-right focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${remaining > 0 ? "text-orange-600" : "text-emerald-600"}`}>
                          {remaining}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-3">
            <h3 className="font-bold text-slate-800 px-1">Chi tiết vật tư ({items.length})</h3>
            {items.map((item, idx) => {
              const remaining = Math.max(0, Number(item.requestedQuantity) - Number(item.receivedQuantity));
              return (
                <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-bold text-slate-900">{item.materialName}</h4>
                      <p className="text-xs text-slate-500 mt-1">Đơn vị: <span className="font-medium text-slate-700">{item.unit}</span></p>
                      {item.fieldProgressItemId && (
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          CV: {wbsItems.find(w => w.id === item.fieldProgressItemId)?.workContent || "Không rõ"}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500">Đề xuất</p>
                      <p className="font-bold text-blue-600 text-lg">{Number(item.requestedQuantity)}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label htmlFor={`mobile-issued-${item.id}`} className="text-xs font-medium text-slate-600 block mb-1">Đã cấp</label>
                      <input 
                        id={`mobile-issued-${item.id}`}
                        name={`mobile-issued-${item.id}`}
                        type="number"
                        min="0"
                        value={item.issuedQuantity}
                        onChange={(e) => handleItemChange(item.id, 'issuedQuantity', e.target.value)}
                        disabled={request.status === "RECEIVED" || request.status === "CANCELLED"}
                        className="w-full px-2 py-2 bg-white text-slate-900 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                      />
                    </div>
                    <div>
                      <label htmlFor={`mobile-received-${item.id}`} className="text-xs font-medium text-slate-600 block mb-1">Đã nhận</label>
                      <input 
                        id={`mobile-received-${item.id}`}
                        name={`mobile-received-${item.id}`}
                        type="number"
                        min="0"
                        value={item.receivedQuantity}
                        onChange={(e) => handleItemChange(item.id, 'receivedQuantity', e.target.value)}
                        disabled={request.status === "RECEIVED" || request.status === "CANCELLED"}
                        className="w-full px-2 py-2 bg-white text-slate-900 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <span className="text-xs font-medium text-slate-600">Còn thiếu:</span>
                    <span className={`text-sm font-bold ${remaining > 0 ? "text-orange-600" : "text-emerald-600"}`}>
                      {remaining}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {isCancelling && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-3">
              <label htmlFor="cancelReason" className="block text-sm font-semibold text-red-800">Lý do hủy phiếu <span className="text-red-500">*</span></label>
              <textarea 
                id="cancelReason"
                name="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy..."
                className="w-full p-2 bg-white text-slate-900 border border-red-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsCancelling(false)} className="px-3 py-1.5 text-sm text-slate-600 font-medium hover:bg-red-100 rounded">Quay lại</button>
                <button onClick={handleCancel} disabled={loading} className="px-3 py-1.5 text-sm bg-red-600 text-white font-semibold rounded hover:bg-red-700 disabled:opacity-50">Xác nhận hủy</button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-4 sm:px-6 py-4 bg-slate-50 flex sm:justify-end gap-3 sticky bottom-0 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-4 z-20 rounded-b-xl shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] sm:shadow-none flex-wrap">
          {request.status !== "CANCELLED" && request.status !== "RECEIVED" && !isCancelling && (
            <button 
              type="button" 
              onClick={() => setIsCancelling(true)}
              className="px-4 py-2 text-red-600 font-semibold hover:bg-red-50 border border-transparent hover:border-red-200 rounded-lg transition-colors text-sm order-3 sm:order-1 w-full sm:w-auto mt-2 sm:mt-0"
            >
              Hủy phiếu
            </button>
          )}

          {isEditable && (
            <button 
              type="button" 
              onClick={onEdit}
              className="sm:hidden flex-1 px-4 py-2 bg-white border border-slate-300 text-slate-700 font-semibold rounded-lg text-sm hover:bg-slate-50 flex items-center justify-center gap-2 shadow-sm order-1"
            >
              <Edit2 className="w-4 h-4" /> Sửa
            </button>
          )}

          {request.status !== "CANCELLED" && request.status !== "RECEIVED" && (
            <button 
              type="button"
              onClick={handleUpdateProgress}
              disabled={loading}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 text-white font-semibold rounded-lg text-sm hover:bg-emerald-700 active:bg-emerald-800 flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50 order-2"
            >
              <Save className="w-4 h-4" /> Cập nhật cấp/nhận
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        title={confirmState.title}
        description={confirmState.description}
        variant={confirmState.variant}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={confirmState.onConfirm}
        isLoading={loading}
      />
    </div>
  );
}
