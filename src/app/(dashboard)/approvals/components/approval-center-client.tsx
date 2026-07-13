"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck2,
  Plus,
  Search,
  ShieldCheck,
  X,
  XCircle,
  type LucideIcon,
  Check,
} from "lucide-react";
import type { ApprovalPriority, ApprovalRequestStatus, ApprovalRequestType } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ReasonDialog } from "@/components/ui/reason-dialog";
import { useToast } from "@/components/ui/toast-context";
import { cn } from "@/lib/utils";
import { safeFormatDateVN, toDateInputValue } from "@/lib/date-utils";
import { DateFieldVN } from "@/components/ui/date-field-vn";
import {
  approveApprovalRequest,
  cancelApprovalRequest,
  createApprovalRequest,
  rejectApprovalRequest,
  softDeleteApprovalRequest,
  updateApprovalRequest,
  getApprovalMaterialDetails,
} from "../actions";
import type {
  ApprovalProjectOptionDto,
  ApprovalRequestDto,
  ApprovalSummaryDto,
} from "@/lib/approvals/approval-dto";
import { isApprovalOverdue } from "@/lib/approvals/approval-dto";
import { setProjectContextCookie } from "@/app/actions/project-context";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";

type ApprovalsCenterClientProps = {
  approvals: ApprovalRequestDto[];
  projects: ApprovalProjectOptionDto[];
  summary: ApprovalSummaryDto;
  canCreate: boolean;
  initialProjectId?: string;
};

const TYPE_LABELS: Record<ApprovalRequestType, string> = {
  PAYMENT: "Thanh toán",
  MATERIAL: "Vật tư",
  REPORT: "Báo cáo",
  CONTRACT: "Hợp đồng",
  CHANGE_ORDER: "Phát sinh",
  OTHER: "Khác",
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  PAYMENT_REQUEST: "Thanh toán",
  MATERIAL_REQUEST: "Yêu cầu vật tư",
  SITE_REPORT: "Báo cáo hiện trường",
  CONTRACT: "Hợp đồng",
  FIELD_PROGRESS: "Nghiệm thu khối lượng",
  CHANGE_ORDER: "Phát sinh",
  DOCUMENT: "Tài liệu",
  PURCHASE_REQUEST: "Đề xuất mua hàng",
};

const STATUS_LABELS: Record<ApprovalRequestStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
};

const PRIORITY_LABELS: Record<ApprovalPriority, string> = {
  LOW: "Thấp",
  NORMAL: "Thường",
  HIGH: "Cao",
  URGENT: "Khẩn cấp",
};

const STATUS_STYLES: Record<ApprovalRequestStatus, string> = {
  PENDING: "border-blue-200 bg-blue-50 text-blue-700",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-700",
  CANCELLED: "border-slate-200 bg-slate-100 text-slate-600",
};

const PRIORITY_STYLES: Record<ApprovalPriority, string> = {
  LOW: "border-slate-200 bg-slate-50 text-slate-600",
  NORMAL: "border-blue-200 bg-blue-50 text-blue-700",
  HIGH: "border-amber-200 bg-amber-50 text-amber-700",
  URGENT: "border-rose-200 bg-rose-50 text-rose-700",
};

const TYPE_OPTIONS = Object.keys(TYPE_LABELS) as ApprovalRequestType[];
const STATUS_OPTIONS = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as ApprovalRequestStatus[];
const PRIORITY_OPTIONS = Object.keys(PRIORITY_LABELS) as ApprovalPriority[];

function formatCurrency(value: number | null) {
  if (value === null) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  return safeFormatDateVN(value);
}

function StatusBadge({ status }: { status: ApprovalRequestStatus }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-wider ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: ApprovalPriority }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${PRIORITY_STYLES[priority]}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  helper: string;
  icon: LucideIcon;
  tone: "blue" | "amber" | "emerald" | "rose" | "slate";
}) {
  const toneClass = {
    blue: "border-blue-100 bg-gradient-to-br from-blue-50 to-white text-blue-700",
    amber: "border-amber-100 bg-gradient-to-br from-amber-50 to-white text-amber-700",
    emerald: "border-emerald-100 bg-gradient-to-br from-emerald-50 to-white text-emerald-700",
    rose: "border-rose-100 bg-gradient-to-br from-rose-50 to-white text-rose-700",
    slate: "border-slate-200 bg-gradient-to-br from-slate-50 to-white text-slate-700",
  }[tone];

  return (
    <div className={`rounded-2xl border ${toneClass} p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-600 truncate" title={label}>{label}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-950 truncate" title={String(value)}>{value}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-950/5`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

function formatCompactCurrency(value: number | string | null | undefined) {
  if (value == null) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "—";

  if (num >= 1_000_000_000) {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(num / 1_000_000_000) + " tỷ ₫";
  }
  if (num >= 1_000_000) {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(num / 1_000_000) + " triệu ₫";
  }
  return new Intl.NumberFormat('vi-VN').format(num) + " ₫";
}

function ApprovalFormDialog({
  isOpen,
  onClose,
  projects,
  isSubmitting,
  onSubmit,
  initialData,
}: {
  isOpen: boolean;
  onClose: () => void;
  projects: ApprovalProjectOptionDto[];
  isSubmitting: boolean;
  onSubmit: (data: {
    projectId: string;
    title: string;
    description: string;
    type: ApprovalRequestType;
    priority: ApprovalPriority;
    amount: string;
    dueDate: string;
  }) => Promise<void>;
  initialData?: ApprovalRequestDto;
}) {
  const [projectId, setProjectId] = useState(initialData?.projectId ?? projects[0]?.id ?? "");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [type, setType] = useState<ApprovalRequestType>(initialData?.type ?? "PAYMENT");
  const [priority, setPriority] = useState<ApprovalPriority>(initialData?.priority ?? "NORMAL");
  const [amount, setAmount] = useState(initialData?.amount?.toString() ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(initialData?.dueDate));

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await onSubmit({ projectId, title, description, type, priority, amount, dueDate });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="approval-create-title"
      onClick={!isSubmitting ? onClose : undefined}
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl shadow-slate-950/20 sm:rounded-3xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/50 px-5 py-5 sm:px-6">
          <div>
            <h2 id="approval-create-title" className="text-xl font-bold text-slate-950">
              {initialData ? "Sửa yêu cầu phê duyệt" : "Tạo yêu cầu phê duyệt ngoài hồ sơ nguồn"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {initialData ? "Cập nhật thông tin yêu cầu phê duyệt hiện tại." : "Dùng cho các trường hợp cần xin ý kiến thủ công ngoài quy trình hệ thống."}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={isSubmitting} className="icon-button shrink-0" aria-label="Đóng">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!initialData && (
          <div className="px-5 py-4 sm:px-6">
             <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
               <strong>Lưu ý:</strong> Yêu cầu tạo thủ công sẽ không tự liên kết với hồ sơ nguồn. Với hồ sơ thanh toán, vật tư, hợp đồng, nên tạo trực tiếp từ module tương ứng khi chức năng đó sẵn sàng.
             </div>
          </div>
        )}

        <div className="grid gap-5 px-5 pb-6 sm:grid-cols-2 sm:px-6">
          <label className="sm:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Công trình <span className="text-red-500">*</span></span>
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.code} - {project.name}</option>
              ))}
            </select>
          </label>

          <label className="sm:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Tiêu đề <span className="text-red-500">*</span></span>
            <input  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Ví dụ: Xin ý kiến phương án móng cọc công trình A..."
              required
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">Loại yêu cầu</span>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as ApprovalRequestType)}
              disabled={!!initialData}
              className={`mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${initialData ? "bg-slate-50 text-slate-500" : "bg-white"}`}
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>{TYPE_LABELS[option]}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">Ưu tiên</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as ApprovalPriority)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option} value={option}>{PRIORITY_LABELS[option]}</option>
              ))}
            </select>
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">Số tiền (VNĐ)</span>
            <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              inputMode="numeric"
              placeholder="Nhập 0 nếu không áp dụng"
              min="0"
              type="number"
            />
          </label>

          <label>
            <span className="text-sm font-semibold text-slate-700">Hạn xử lý <span className="text-red-500">*</span></span>
            <DateFieldVN
              value={dueDate}
              onChange={(val) => setDueDate(val)}
              className="mt-1.5"
              required
            />
          </label>

          <label className="sm:col-span-2">
            <span className="text-sm font-semibold text-slate-700">Mô tả</span>
            <textarea  autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1.5 min-h-[100px] w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Ghi rõ các nội dung trọng tâm cần cấp trên xem xét và quyết định..."
            />
          </label>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>Hủy</Button>
          <Button type="submit" disabled={isSubmitting || projects.length === 0}>
            {isSubmitting ? "Đang xử lý..." : (initialData ? "Cập nhật" : "Tạo yêu cầu")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}

function MaterialRequestPreview({ approvalId }: { approvalId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getApprovalMaterialDetails(approvalId).then((res) => {
      if (active) {
        setData(res);
        setLoading(false);
      }
    });
    return () => { active = false; };
  }, [approvalId]);

  if (loading) return <div className="text-sm text-slate-500 animate-pulse mt-4">Đang tải chi tiết phiếu vật tư...</div>;
  if (!data) return <div className="text-sm text-rose-500 mt-4">Không tìm thấy phiếu yêu cầu vật tư liên kết. Phiếu có thể đã bị xóa hoặc bạn không có quyền xem.</div>;

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <h4 className="text-sm font-semibold text-slate-900 mb-3 text-blue-700">Yêu cầu vật tư cần phê duyệt</h4>
      <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-4">
        <div className="text-sm">
          <span className="text-slate-500">Mã phiếu: </span>
          <span className="font-semibold text-slate-900">{data.requestNo || "—"}</span>
        </div>
        <div className="text-sm">
          <span className="text-slate-500">Người gửi: </span>
          <span className="font-semibold text-slate-900">{data.requestedBy?.name || "Không rõ"}</span>
        </div>
        <div className="text-sm">
          <span className="text-slate-500">Ngày đề xuất: </span>
          <span className="font-medium text-slate-900">{formatDate(data.requestDate)}</span>
        </div>
        <div className="text-sm">
          <span className="text-slate-500">Ngày cần vật tư: </span>
          <span className="font-medium text-slate-900">{formatDate(data.neededDate)}</span>
        </div>
        <div className="text-sm">
          <span className="text-slate-500">Trạng thái phiếu vật tư: </span>
          <StatusBadge status={data.status} />
        </div>
        <div className="text-sm">
          <span className="text-slate-500">Ưu tiên: </span>
          <span className="font-medium text-slate-900">{PRIORITY_LABELS[data.priority as ApprovalPriority] || data.priority}</span>
        </div>
        {data.note && (
          <div className="text-sm col-span-2">
            <span className="text-slate-500">Ghi chú: </span>
            <span className="text-slate-700">{data.note}</span>
          </div>
        )}
      </div>
        
      <div className="mt-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Danh sách vật tư yêu cầu ({data.items?.length || 0})</div>
        <div className="rounded-lg border border-slate-200 overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[500px]">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">Mã vật tư</th>
                <th className="px-3 py-2 font-medium">Tên vật tư</th>
                <th className="px-3 py-2 font-medium">Đơn vị</th>
                <th className="px-3 py-2 font-medium text-right">Đề xuất</th>
                <th className="px-3 py-2 font-medium text-right">Đã cấp</th>
                <th className="px-3 py-2 font-medium text-right">Đã nhận</th>
                <th className="px-3 py-2 font-medium text-right text-rose-600">Còn thiếu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {data.items?.map((item: any) => {
                const formatQty = (num: number) => new Intl.NumberFormat('vi-VN').format(num);
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-500 font-mono text-xs">{item.materialCode || "—"}</td>
                    <td className="px-3 py-2 text-slate-900 font-medium">{item.materialName || "Vật tư không rõ"}</td>
                    <td className="px-3 py-2 text-slate-500">{item.unit || "—"}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatQty(item.requestedQuantity)}</td>
                    <td className="px-3 py-2 text-right text-emerald-600">{formatQty(item.issuedQuantity)}</td>
                    <td className="px-3 py-2 text-right text-blue-600">{formatQty(item.receivedQuantity)}</td>
                    <td className="px-3 py-2 text-right font-medium text-rose-600">{formatQty(item.remainingQuantity)}</td>
                  </tr>
                );
              })}
              {(!data.items || data.items.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-3 py-4 text-center text-slate-500 italic">Không có vật tư nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex">
        <a href={`/materials?tab=requests&projectId=${data.projectId}&requestId=${data.id}`} className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
          <FileCheck2 className="mr-1 h-4 w-4" />
          Mở xem phiếu vật tư gốc
        </a>
      </div>
    </div>
  );
}

function ApprovalDetailDrawer({
  approval,
  onClose,
  onApprove,
  onReject,
  onCancel,
  onEdit,
}: {
  approval: ApprovalRequestDto | null;
  onClose: () => void;
  onApprove: (approval: ApprovalRequestDto) => void;
  onReject: (approval: ApprovalRequestDto) => void;
  onCancel: (approval: ApprovalRequestDto) => void;
  onEdit: (approval: ApprovalRequestDto) => void;
}) {
  const isOpen = Boolean(approval);
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!approval) return null;

  const overdue = isApprovalOverdue(approval);
  const canDecide = approval.status === "PENDING" && approval.permissions?.canApprove;
  const canCancel = approval.status === "PENDING" && approval.permissions?.canCancel;
  const canEdit = approval.status === "PENDING" && approval.permissions?.canEdit;

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-slate-950/40 backdrop-blur-sm" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className="flex h-full w-full flex-col bg-white shadow-2xl shadow-slate-950/20 sm:max-w-[600px]" onMouseDown={(event) => event.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 bg-slate-50/50">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="font-mono text-xs font-semibold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">{approval.code}</span>
              <StatusBadge status={approval.status} />
              {overdue && (
                <span className="inline-flex items-center rounded-md bg-red-100 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-red-700">
                  Quá hạn
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold leading-tight text-slate-950">{approval.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="icon-button shrink-0 bg-white shadow-sm ring-1 ring-slate-200" aria-label="Đóng chi tiết">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {approval.status === "PENDING" && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                <div className="text-sm text-amber-800">
                  {approval.type === "MATERIAL" || approval.sourceType === "MATERIAL_REQUEST" ? (
                    <>
                      <strong className="block mb-1">Lưu ý phê duyệt vật tư</strong>
                      Kiểm tra nhu cầu vật tư, tồn kho và ngày cần trước khi duyệt. Duyệt phiếu không tự động trừ kho.
                    </>
                  ) : (
                    <>
                      <strong className="block mb-1">Thiếu chứng từ đính kèm</strong>
                      Chưa có chứng từ đính kèm (hóa đơn, PDF, bảng khối lượng) trong giao diện này. Hãy kiểm tra kỹ phân hệ gốc trước khi duyệt để tránh sai sót. Quyết định tại đây sẽ đồng bộ lập tức về module gốc.
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-8">
            <section>
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                Thông tin tổng quan
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailItem label="Công trình" value={`${approval.project.code} - ${approval.project.name}`} />
                <DetailItem label="Người tạo" value={approval.requester.name} />
                <DetailItem label="Giá trị" value={formatCurrency(approval.amount)} />
                <DetailItem label="Hạn xử lý" value={formatDate(approval.dueDate)} />
                <DetailItem label="Loại yêu cầu" value={TYPE_LABELS[approval.type]} />
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Mức ưu tiên</div>
                  <div className="mt-1"><PriorityBadge priority={approval.priority} /></div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-slate-900 mb-3">Hồ sơ gốc liên kết</h3>
              {(approval.sourceType || approval.sourceId) ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                        {SOURCE_TYPE_LABELS[approval.sourceType ?? ""] ?? approval.sourceType ?? "Nguồn"}
                      </div>
                      {approval.sourceType !== "MATERIAL_REQUEST" && (
                        <div className="font-mono text-sm font-semibold text-slate-900">
                          {approval.sourceId || "Không có mã"}
                        </div>
                      )}
                    </div>
                    {!["PaymentRequest", "Contract", "MaterialRequest", "MATERIAL_REQUEST"].includes(approval.sourceType ?? "") ? (
                       <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                         Tham chiếu nội bộ
                       </span>
                    ) : (
                       <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                         Đã liên kết
                       </span>
                    )}
                  </div>
                  {approval.sourceType === "MATERIAL_REQUEST" && (
                    <MaterialRequestPreview approvalId={approval.id} />
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                  Yêu cầu này không liên kết với hồ sơ gốc nào.
                </div>
              )}
            </section>
            
            <section>
              <h3 className="text-sm font-bold text-slate-900 mb-3">Mô tả chi tiết</h3>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
                {approval.description || <span className="text-slate-400 italic">Người tạo không cung cấp mô tả bổ sung.</span>}
              </div>
            </section>

            {approval.status !== "PENDING" && (
              <section>
                <h3 className="text-sm font-bold text-slate-900 mb-3">Quyết định</h3>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold">
                      {approval.decidedBy?.name.charAt(0) ?? "?"}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{approval.decidedBy?.name ?? "Chưa rõ người quyết định"}</div>
                      <div className="text-xs text-slate-500">{approval.decidedAt ? formatDate(approval.decidedAt) : "Chưa rõ thời gian"}</div>
                    </div>
                  </div>
                  {approval.decisionNote && (
                    <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700 border border-slate-100">
                      <strong>Ghi chú:</strong> {approval.decisionNote}
                    </div>
                  )}
                </div>
              </section>
            )}
            
            <section>
               <h3 className="text-sm font-bold text-slate-900 mb-3">Lịch sử thao tác (Audit Log)</h3>
               <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                 <Clock className="mx-auto h-6 w-6 text-slate-400 mb-2" />
                 <p className="text-sm text-slate-500">Lịch sử thao tác chi tiết sẽ được hiển thị ở phase sau.</p>
               </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white px-6 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onClose} className="w-full sm:w-auto">Đóng</Button>
            {canEdit && (
              <Button type="button" variant="outline" onClick={() => onEdit(approval)} className="w-full sm:w-auto text-blue-600 border-blue-200 hover:bg-blue-50">Sửa</Button>
            )}
            {canCancel && (
              <Button type="button" variant="outline" onClick={() => onCancel(approval)} className="w-full sm:w-auto text-slate-600">Hủy yêu cầu</Button>
            )}
            {canDecide && (
              <>
                <Button type="button" variant="outline" className="w-full sm:w-auto text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700" onClick={() => onReject(approval)}>Từ chối</Button>
                <Button type="button" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => onApprove(approval)}>
                  {approval.type === "MATERIAL" || approval.sourceType === "MATERIAL_REQUEST" ? "Duyệt phiếu" : "Duyệt hồ sơ"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ApprovalCenterClient({
  approvals,
  projects,
  canCreate,
  initialProjectId,
}: ApprovalsCenterClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const toast = useToast();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilterState] = useState(initialProjectId || "");
  const [typeFilter, setTypeFilter] = useState("");
  
  // Custom Tabs
  const [activeTab, setActiveTab] = useState<"PENDING" | "RESOLVED" | "ALL">("PENDING");

  const [viewing, setViewing] = useState<ApprovalRequestDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ApprovalRequestDto | null>(null);
  const [approving, setApproving] = useState<ApprovalRequestDto | null>(null);
  const [rejecting, setRejecting] = useState<ApprovalRequestDto | null>(null);
  const [cancelling, setCancelling] = useState<ApprovalRequestDto | null>(null);
  const [deepLinkedApprovalId, setDeepLinkedApprovalId] = useState<string | null>(null);
  const [deepLinkMissing, setDeepLinkMissing] = useState(false);

  useEffect(() => {
    setProjectFilterState(initialProjectId || "");
  }, [initialProjectId]);

  const clearApprovalDeepLinkParams = useCallback(() => {
    const params = new URLSearchParams(searchParamsKey);
    const hadDetailParams = ["approvalId", "requestId", "id", "open", "notificationId"].some((key) => params.has(key));
    params.delete("approvalId");
    params.delete("requestId");
    params.delete("id");
    params.delete("sourceId");
    params.delete("open");
    params.delete("notificationId");
    if (params.get("type")?.includes("-")) {
      params.delete("type");
    }
    if (!hadDetailParams) return;

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParamsKey]);

  const closeApprovalDetail = useCallback(() => {
    setViewing(null);
    setDeepLinkedApprovalId(null);
    setDeepLinkMissing(false);
    clearApprovalDeepLinkParams();
  }, [clearApprovalDeepLinkParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParamsKey);
    const approvalId = params.get("approvalId") || params.get("requestId");
    const targetId = params.get("id");
    const sourceId = params.get("sourceId");
    const shouldOpen = params.get("open") === "1" || Boolean(approvalId) || Boolean(sourceId);
    if (!shouldOpen && !targetId) {
      setDeepLinkMissing(false);
      return;
    }

    const matchedApproval = approvals.find((approval) =>
      (approvalId && approval.id === approvalId) ||
      (targetId && approval.id === targetId) ||
      (targetId && approval.sourceId === targetId) ||
      (sourceId && approval.sourceId === sourceId)
    );

    if (!matchedApproval) {
      setViewing(null);
      setDeepLinkedApprovalId(null);
      setDeepLinkMissing(true);
      return;
    }

    setDeepLinkMissing(false);
    setViewing(matchedApproval);
    setDeepLinkedApprovalId(matchedApproval.id);
    setProjectFilterState(matchedApproval.projectId);
    setTypeFilter("");
    setSearch("");
    setActiveTab(matchedApproval.status === "PENDING" ? "PENDING" : "RESOLVED");

    window.setTimeout(() => {
      document.getElementById(`approval-row-${matchedApproval.id}`)?.scrollIntoView({
        block: "center",
        behavior: "smooth",
      });
    }, 100);
  }, [approvals, searchParamsKey]);

  const handleProjectFilterChange = async (projectId: string) => {
    setProjectFilterState(projectId);
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

  const handleDeleteApproval = async (approval: ApprovalRequestDto) => {
    if (isPending) return;
    runAction(
      () => softDeleteApprovalRequest(approval.id),
      "Đã xóa yêu cầu",
    );
  };

  const normalizedSearch = search.trim().toLowerCase();

  const filteredApprovals = useMemo(() => {
    return approvals.filter((approval) => {
      // Tab filtering
      if (activeTab === "PENDING" && approval.status !== "PENDING") return false;
      if (activeTab === "RESOLVED" && approval.status === "PENDING") return false;

      // Search filtering
      const searchMatch =
        !normalizedSearch ||
        approval.code.toLowerCase().includes(normalizedSearch) ||
        approval.title.toLowerCase().includes(normalizedSearch) ||
        approval.requester.name.toLowerCase().includes(normalizedSearch) ||
        approval.project.name.toLowerCase().includes(normalizedSearch) ||
        approval.project.code.toLowerCase().includes(normalizedSearch);

      return (
        searchMatch &&
        (!projectFilter || approval.projectId === projectFilter) &&
        (!typeFilter || approval.type === typeFilter)
      );
    });
  }, [approvals, normalizedSearch, projectFilter, typeFilter, activeTab]);

  const displaySummary = useMemo(() => {
    const pending = filteredApprovals.filter((approval) => approval.status === "PENDING");

    return {
      pendingCount: pending.length,
      overdueCount: filteredApprovals.filter((approval) => isApprovalOverdue(approval)).length,
      approvedCount: filteredApprovals.filter((approval) => approval.status === "APPROVED").length,
      rejectedCount: filteredApprovals.filter((approval) => approval.status === "REJECTED").length,
      pendingAmount: pending.reduce((sum, approval) => {
        if (approval.type === "MATERIAL" || approval.sourceType === "MATERIAL_REQUEST") return sum;
        return sum + (approval.amount ?? 0);
      }, 0),
    };
  }, [filteredApprovals]);

  const runAction = (action: () => Promise<unknown>, successMessage: string, after?: () => void) => {
    startTransition(async () => {
      try {
        await action();
        toast.success(successMessage);
        after?.();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
      }
    });
  };

  const handleCreate = async (data: {
    projectId: string;
    title: string;
    description: string;
    type: ApprovalRequestType;
    priority: ApprovalPriority;
    amount: string;
    dueDate: string;
  }) => {
    await createApprovalRequest(data);
    toast.success("Đã tạo yêu cầu phê duyệt");
    setCreating(false);
    router.refresh();
  };

  const handleUpdate = async (data: {
    projectId: string;
    title: string;
    description: string;
    type: ApprovalRequestType;
    priority: ApprovalPriority;
    amount: string;
    dueDate: string;
  }) => {
    if (!editing) return;
    await updateApprovalRequest({ ...data, id: editing.id });
    toast.success("Đã cập nhật yêu cầu phê duyệt");
    setEditing(null);
    closeApprovalDetail();
    router.refresh();
  };

  return (
    <div className="app-page mx-auto max-w-[1400px] space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600 mb-2">
            <ShieldCheck className="h-4 w-4" />
            Trung tâm phê duyệt
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Phê duyệt</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Tổng hợp các yêu cầu cần xử lý theo công trình.
          </p>
        </div>
        {canCreate && projects.length > 0 && (
          <Button type="button" onClick={() => setCreating(true)} className="w-full sm:w-auto shadow-sm">
            <Plus className="h-4 w-4" />
            Tạo yêu cầu
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Cần xử lý" value={displaySummary.pendingCount} helper="Yêu cầu chờ bạn quyết định" icon={Clock} tone="blue" />
        <SummaryCard label="Quá hạn" value={displaySummary.overdueCount} helper="Chưa xử lý và đã quá hạn" icon={AlertTriangle} tone="amber" />
        <SummaryCard label="Đã duyệt" value={displaySummary.approvedCount} helper="Yêu cầu đã được chấp thuận" icon={CheckCircle2} tone="emerald" />
        <SummaryCard label="Từ chối" value={displaySummary.rejectedCount} helper="Yêu cầu đã bị từ chối" icon={XCircle} tone="rose" />
        <SummaryCard label="Giá trị chờ xử lý" value={formatCompactCurrency(displaySummary.pendingAmount)} helper="Tổng giá trị các yêu cầu đang chờ" icon={ShieldCheck} tone="slate" />
      </div>

      {deepLinkMissing && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Không tìm thấy nội dung thông báo hoặc bạn không có quyền truy cập.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar & Tabs */}
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-100 p-1 text-sm text-slate-500">
             <button onClick={() => setActiveTab("PENDING")} className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 font-medium transition-all ${activeTab === "PENDING" ? "bg-white text-slate-950 shadow-sm" : "hover:text-slate-900"}`}>
                Cần xử lý
             </button>
             <button onClick={() => setActiveTab("RESOLVED")} className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 font-medium transition-all ${activeTab === "RESOLVED" ? "bg-white text-slate-950 shadow-sm" : "hover:text-slate-900"}`}>
                Đã xử lý
             </button>
             <button onClick={() => setActiveTab("ALL")} className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 font-medium transition-all ${activeTab === "ALL" ? "bg-white text-slate-950 shadow-sm" : "hover:text-slate-900"}`}>
                Tất cả
             </button>
          </div>
          
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <label htmlFor="approvals-search" className="sr-only">Tìm kiếm yêu cầu phê duyệt</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
                id="approvals-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm kiếm..."
                className="h-9 w-full sm:w-64 rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <select value={projectFilter} onChange={(event) => handleProjectFilterChange(event.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
              <option value="">Tất cả công trình</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.code}</option>
              ))}
            </select>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
              <option value="">Loại yêu cầu</option>
              {TYPE_OPTIONS.map((type) => (
                <option key={type} value={type}>{TYPE_LABELS[type]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table Area */}
        {filteredApprovals.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={activeTab === "PENDING" ? "Hiện không có yêu cầu nào chờ duyệt" : "Không tìm thấy yêu cầu phù hợp"}
              description={activeTab === "PENDING" ? "Bạn đã xử lý xong mọi việc. Các đề xuất mới sẽ hiển thị tại đây." : "Thử thay đổi bộ lọc hoặc tìm kiếm với từ khóa khác."}
              icon={<FileCheck2 className="h-8 w-8 text-slate-400" />}
            />
          </div>
        ) : (
          <>
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-[800px] w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 min-w-[120px]">Yêu cầu</th>
                  <th className="px-5 py-3.5 min-w-[150px]">Nguồn / Công trình</th>
                  <th className="px-5 py-3.5 text-right min-w-[160px]">Giá trị / Hạn</th>
                  <th className="px-5 py-3.5 min-w-[120px]">Trạng thái</th>
                  <th className="px-5 py-3.5 text-right sticky right-0 bg-slate-50 z-10 border-l border-slate-100 shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.05)]">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredApprovals.map((approval) => {
                  const overdue = isApprovalOverdue(approval);
                  const canDecide = approval.status === "PENDING" && approval.permissions?.canApprove;
                  const canEdit = approval.status === "PENDING" && approval.permissions?.canEdit;
                  return (
                    <tr
                      id={`approval-row-${approval.id}`}
                      key={approval.id}
                      className={cn(
                        "group hover:bg-slate-50/50 transition-colors",
                        deepLinkedApprovalId === approval.id && "bg-blue-50/80 ring-2 ring-inset ring-blue-200"
                      )}
                    >
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1">
                          <button type="button" onClick={() => setViewing(approval)} className="text-left font-semibold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {approval.title}
                          </button>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] font-medium text-slate-500">{approval.code}</span>
                            <span className="text-[11px] text-slate-300">•</span>
                            <span className="text-[11px] text-slate-500">{TYPE_LABELS[approval.type]}</span>
                          </div>
                          <div className="text-[11px] text-slate-400">Tạo bởi: {approval.requester.name}</div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="font-medium text-slate-900 line-clamp-1 max-w-[250px]" title={`${approval.project.code} - ${approval.project.name}`}>
                            {approval.project.code} - {approval.project.name}
                          </div>
                          {approval.sourceType || approval.sourceId ? (
                            <div className="text-[11px] text-slate-500">
                               <span className="font-medium">{SOURCE_TYPE_LABELS[approval.sourceType ?? ""] ?? approval.sourceType ?? "Nguồn"}</span>
                               {approval.sourceType === "MATERIAL_REQUEST" ? ` • ${approval.title.replace("Yêu cầu vật tư: ", "")}` : (approval.sourceId && ` • ${approval.sourceId}`)}
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-400 italic">Chỉ tham chiếu nội bộ</div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                         <div className="font-mono font-semibold text-slate-900 mb-1.5">
                           {approval.type === "MATERIAL" || approval.sourceType === "MATERIAL_REQUEST" ? "—" : formatCurrency(approval.amount)}
                         </div>
                         <div className="flex items-center justify-end gap-2">
                            <PriorityBadge priority={approval.priority} />
                            <span className={`font-mono text-[11px] ${overdue ? "font-bold text-red-600" : "text-slate-500"}`}>
                               {formatDate(approval.dueDate)}
                            </span>
                         </div>
                      </td>
                      <td className="px-5 py-3">
                         <StatusBadge status={approval.status} />
                      </td>
                      <td className="px-5 py-3 sticky right-0 bg-white group-hover:bg-slate-50/50 transition-colors z-10 border-l border-slate-100 shadow-[-5px_0_15px_-5px_rgba(0,0,0,0.05)]">
                        <div className="flex justify-end gap-1.5">
                          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600" onClick={() => setViewing(approval)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {canEdit && (
                            <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-blue-600 hover:bg-blue-50 hover:text-blue-700 whitespace-nowrap" onClick={() => setEditing(approval)}>Sửa</Button>
                          )}
                          {canDecide ? (
                            <>
                              <Button type="button" size="sm" variant="outline" className="h-8 px-2.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50 whitespace-nowrap" onClick={() => setApproving(approval)}>Duyệt</Button>
                              <Button type="button" size="sm" variant="outline" className="h-8 px-2.5 text-rose-700 border-rose-200 hover:bg-rose-50 whitespace-nowrap" onClick={() => setRejecting(approval)}>Từ chối</Button>
                            </>
                          ) : approval.permissions?.canSoftDelete ? (
                              <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-rose-600 hover:bg-rose-50 hover:text-rose-700 whitespace-nowrap" onClick={() => handleDeleteApproval(approval)} disabled={isPending}>Xóa</Button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="sm:hidden flex flex-col divide-y divide-slate-100">
            {filteredApprovals.map((approval) => {
              const overdue = isApprovalOverdue(approval);
              const canDecide = approval.status === "PENDING" && approval.permissions?.canApprove;
              const canEdit = approval.status === "PENDING" && approval.permissions?.canEdit;
              return (
                <div
                  id={`approval-row-${approval.id}`}
                  key={approval.id}
                  className={cn(
                    "p-4 flex flex-col gap-3",
                    deepLinkedApprovalId === approval.id && "bg-blue-50/80 ring-2 ring-inset ring-blue-200"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                         <span className="font-mono text-[10px] font-medium text-slate-500">{approval.code}</span>
                         <StatusBadge status={approval.status} />
                      </div>
                      <button type="button" onClick={() => setViewing(approval)} className="text-left font-semibold text-slate-900 leading-snug line-clamp-2">
                        {approval.title}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    <div className="col-span-2 text-slate-600 line-clamp-1">
                      <span className="font-medium">{approval.project.code}</span> - {approval.project.name}
                    </div>
                    <div className="text-slate-500">
                      Nguồn:
                    </div>
                    <div className="font-medium text-slate-900 text-right">
                      {SOURCE_TYPE_LABELS[approval.sourceType ?? ""] ?? approval.sourceType ?? "Khác"}
                    </div>
                    <div className="text-slate-500">
                      Giá trị:
                    </div>
                    <div className="font-mono font-semibold text-slate-900 text-right">
                      {approval.type === "MATERIAL" || approval.sourceType === "MATERIAL_REQUEST" ? "—" : formatCurrency(approval.amount)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-2">
                      <PriorityBadge priority={approval.priority} />
                      <span className={`font-mono text-[11px] ${overdue ? "font-bold text-red-600" : "text-slate-500"}`}>
                         {formatDate(approval.dueDate)}
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                       {canEdit && (
                          <Button type="button" size="sm" variant="ghost" className="h-8 px-3 text-blue-600 hover:bg-blue-50 hover:text-blue-700" onClick={() => setEditing(approval)}>Sửa</Button>
                       )}
                       {canDecide ? (
                          <Button type="button" size="sm" className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setApproving(approval)}>Duyệt</Button>
                       ) : approval.permissions?.canSoftDelete ? (
                          <Button type="button" size="sm" variant="ghost" className="h-8 px-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => handleDeleteApproval(approval)} disabled={isPending}>Xóa</Button>
                       ) : (
                          <Button type="button" variant="ghost" size="sm" className="h-8 px-3 text-slate-600 hover:bg-slate-50" onClick={() => setViewing(approval)}>Chi tiết</Button>
                       )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      <ApprovalDetailDrawer
        approval={viewing}
        onClose={closeApprovalDetail}
        onApprove={setApproving}
        onReject={setRejecting}
        onCancel={setCancelling}
        onEdit={setEditing}
      />

      <ApprovalFormDialog
        key={creating ? "create" : "create-closed"}
        isOpen={creating}
        onClose={() => setCreating(false)}
        projects={projects}
        isSubmitting={isPending}
        onSubmit={handleCreate}
      />

      <ApprovalFormDialog
        key={editing ? editing.id : "edit-closed"}
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        projects={projects}
        isSubmitting={isPending}
        initialData={editing ?? undefined}
        onSubmit={handleUpdate}
      />

      <ConfirmDialog
        isOpen={!!approving}
        onClose={() => setApproving(null)}
        title="Duyệt yêu cầu phê duyệt?"
        description={approving ? `${approving.code} - ${approving.title}` : undefined}
        variant="success"
        confirmText="Duyệt hồ sơ"
        isLoading={isPending}
        onConfirm={() => {
          if (!approving) return;
          runAction(
            () => approveApprovalRequest(approving.id),
            "Đã duyệt yêu cầu",
            () => {
              setApproving(null);
              closeApprovalDetail();
            },
          );
        }}
      />

      <ReasonDialog
        isOpen={!!rejecting}
        onClose={() => setRejecting(null)}
        title="Từ chối yêu cầu"
        description={
          rejecting ? (
            <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="font-semibold text-slate-900 mb-3">{rejecting.code} - {rejecting.title}</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm text-slate-600">
                <div className="col-span-2"><span className="text-slate-500 mr-2">Công trình:</span> {rejecting.project.code}</div>
                <div><span className="text-slate-500 mr-2">Giá trị:</span> <span className="font-mono text-slate-900 font-medium">{formatCurrency(rejecting.amount)}</span></div>
                <div><span className="text-slate-500 mr-2">Hạn xử lý:</span> <span className="font-mono text-slate-900 font-medium">{formatDate(rejecting.dueDate)}</span></div>
              </div>
            </div>
          ) : undefined
        }
        confirmText="Từ chối yêu cầu"
        minLength={10}
        isLoading={isPending}
        placeholder="Nhập lý do từ chối để người tạo có thể chỉnh sửa hoặc bổ sung hồ sơ..."
        onConfirm={(reason) => {
          if (!rejecting) return;
          runAction(
            () => rejectApprovalRequest(rejecting.id, reason),
            "Đã từ chối yêu cầu",
            () => {
              setRejecting(null);
              closeApprovalDetail();
            },
          );
        }}
      />

      <ConfirmDialog
        isOpen={!!cancelling}
        onClose={() => setCancelling(null)}
        title="Hủy yêu cầu phê duyệt?"
        description={cancelling ? "Yêu cầu sẽ chuyển sang trạng thái Đã hủy. Dữ liệu sẽ không bị xóa cứng khỏi hệ thống." : undefined}
        variant="warning"
        confirmText="Hủy yêu cầu"
        isLoading={isPending}
        onConfirm={() => {
          if (!cancelling) return;
          runAction(
            () => cancelApprovalRequest(cancelling.id),
            "Đã hủy yêu cầu",
            () => {
              setCancelling(null);
              closeApprovalDetail();
            },
          );
        }}
      />
    </div>
  );
}
