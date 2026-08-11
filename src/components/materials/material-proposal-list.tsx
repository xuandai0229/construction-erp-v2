"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  FileText,
  Eye,
  Pencil,
  FileSpreadsheet,
  Download,
  Printer,
  Trash2,
  MoreHorizontal,
  AlertCircle,
} from "lucide-react";
import { UnifiedActionMenu, ActionMenuItem } from "@/components/ui/unified-action-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { deleteMaterialProposal } from "@/lib/material-proposals/actions";

export type MaterialProposalListItem = {
  id: string;
  proposalNo: string;
  projectNameSnapshot: string;
  requesterNameSnapshot: string;
  proposalDate: Date | string;
  requiredDeliveryDate: Date | string | null;
  status?: string;
  items: Array<unknown>;
};

interface MaterialProposalListProps {
  proposals: MaterialProposalListItem[];
  currentProjectId?: string;
}

export function MaterialProposalList({ proposals, currentProjectId }: MaterialProposalListProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredProposals = useMemo(() => {
    if (!searchTerm.trim()) return proposals;
    const term = searchTerm.toLowerCase();
    return proposals.filter(
      (item) =>
        item.proposalNo.toLowerCase().includes(term) ||
        item.requesterNameSnapshot.toLowerCase().includes(term) ||
        item.projectNameSnapshot.toLowerCase().includes(term)
    );
  }, [proposals, searchTerm]);

  const createUrl = currentProjectId
    ? `/materials/proposals/new?projectId=${currentProjectId}`
    : `/materials/proposals/new`;

  const handleRowClick = (proposalId: string) => {
    router.push(`/materials/proposals/new?edit=${proposalId}`);
  };

  const triggerDownload = async (proposalId: string, proposalNo: string, format: "excel" | "pdf") => {
    try {
      setErrorMessage(null);
      const res = await fetch(`/materials/proposals/${proposalId}/export?format=${format}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Tải file thất bại.");
      const blob = await res.blob();
      if (blob.size === 0) throw new Error("Tệp không có dữ liệu.");

      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;

      const dispositionHeader = res.headers.get("content-disposition") || "";
      let filename = "";
      const filenameMatch = dispositionHeader.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/);
      if (filenameMatch) {
        filename = decodeURIComponent(filenameMatch[1] || filenameMatch[2] || "");
      }
      if (!filename) {
        const ext = format === "excel" ? "xlsx" : "pdf";
        const sanitizedNo = proposalNo.replace(/[^a-zA-Z0-9._-]/g, "-");
        filename = `De-xuat-vat-tu_${sanitizedNo}.${ext}`;
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err: any) {
      console.error("[MaterialProposalList Export Error]", err);
      setErrorMessage(err.message || "Không thể tải tệp. Vui lòng thử lại.");
    }
  };

  const triggerPrint = (proposalId: string) => {
    const existingFrame = document.getElementById("material-proposal-print-frame");
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "material-proposal-print-frame";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.visibility = "hidden";
    iframe.src = `/proposal-export/${proposalId}`;

    iframe.onload = () => {
      try {
        const win = iframe.contentWindow;
        if (win) {
          setTimeout(() => {
            win.focus();
            win.print();
            setTimeout(() => {
              const frameToClean = document.getElementById("material-proposal-print-frame");
              if (frameToClean) frameToClean.remove();
            }, 1000);
          }, 300);
        }
      } catch (err) {
        console.error("[MaterialProposalList Print Error]", err);
        const frameToClean = document.getElementById("material-proposal-print-frame");
        if (frameToClean) frameToClean.remove();
      }
    };
    document.body.appendChild(iframe);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await deleteMaterialProposal(deletingId);
      setDeletingId(null);
      router.refresh();
    } catch (err: any) {
      console.error("[Delete Proposal Error]", err);
      setErrorMessage(err.message || "Không thể xóa đề xuất vật tư. Vui lòng thử lại.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* Header Area */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Danh sách Đề xuất vật tư</h1>
          <p className="text-xs text-slate-500">Quản lý và theo dõi nhu cầu đề xuất vật tư công trình</p>
        </div>
        <Link
          href={createUrl}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
        >
          <Plus className="h-4 w-4" />
          <span>Tạo đề xuất</span>
        </Link>
      </div>

      {/* Search Area */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo mã phiếu, người đề nghị, công trình..."
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2 text-xs font-medium text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-rose-50 p-2.5 text-xs text-rose-800 border border-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-600 hover:text-rose-900 font-bold"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Table Data */}
      {filteredProposals.length > 0 ? (
        <div className="relative overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 font-bold uppercase text-slate-500 border-b border-slate-200 select-none">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap min-w-[150px]">Mã phiếu</th>
                <th className="px-4 py-3.5 whitespace-normal">Công trình</th>
                <th className="px-4 py-3.5 whitespace-nowrap min-w-[130px]">Người đề nghị</th>
                <th className="px-4 py-3.5 whitespace-nowrap min-w-[110px]">Ngày đề nghị</th>
                <th className="px-4 py-3.5 whitespace-nowrap min-w-[110px]">Ngày cần cấp</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-center min-w-[70px]">Số vật tư</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-center min-w-[60px] sticky right-0 bg-slate-50 z-10 border-l border-slate-200/60">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredProposals.map((proposal) => {
                const isActiveRow = activeMenuId === proposal.id;

                return (
                  <tr
                    key={proposal.id}
                    tabIndex={0}
                    role="button"
                    aria-label={`Sửa đề xuất vật tư ${proposal.proposalNo}`}
                    onClick={() => handleRowClick(proposal.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleRowClick(proposal.id);
                      }
                    }}
                    className={`transition-colors cursor-pointer group text-slate-800 align-middle ${
                      isActiveRow
                        ? "bg-blue-50/70 border-l-2 border-l-blue-600 font-medium"
                        : "hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Mã phiếu */}
                    <td className={`px-4 py-3.5 whitespace-nowrap font-bold transition-colors align-middle ${
                      isActiveRow ? "text-blue-700" : "text-blue-900 group-hover:text-blue-600"
                    }`}>
                      {proposal.proposalNo}
                    </td>

                    {/* Công trình */}
                    <td className="px-4 py-3.5 whitespace-normal break-words font-medium text-slate-800 leading-relaxed align-middle">
                      {proposal.projectNameSnapshot}
                    </td>

                    {/* Người đề nghị */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-700 align-middle">
                      {proposal.requesterNameSnapshot}
                    </td>

                    {/* Ngày đề nghị */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 align-middle">
                      {new Date(proposal.proposalDate).toLocaleDateString("vi-VN")}
                    </td>

                    {/* Ngày cần cấp */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 align-middle">
                      {proposal.requiredDeliveryDate
                        ? new Date(proposal.requiredDeliveryDate).toLocaleDateString("vi-VN")
                        : "—"}
                    </td>

                    {/* Số vật tư */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-center font-bold text-slate-700 align-middle">
                      {proposal.items.length}
                    </td>

                    {/* Thao tác */}
                    <td
                      className={`px-4 py-3.5 whitespace-nowrap text-center align-middle sticky right-0 transition-colors border-l border-slate-100 z-10 ${
                        isActiveRow ? "bg-blue-50/90" : "bg-white group-hover:bg-slate-50/80"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <UnifiedActionMenu
                        align="right"
                        menuWidth="w-52"
                        showPointer={true}
                        onOpenChange={(isOpen) => setActiveMenuId(isOpen ? proposal.id : null)}
                        trigger={({ toggle, isOpen }) => (
                          <button
                            type="button"
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors shadow-2xs ${
                              isOpen
                                ? "border-blue-300 bg-blue-100/80 text-blue-700"
                                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            }`}
                            aria-label="Thao tác"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggle();
                            }}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        )}
                      >
                        {/* 1. Xem trước */}
                        <ActionMenuItem
                          icon={<Eye className="h-4 w-4 text-slate-500" />}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/materials/proposals/${proposal.id}/preview`);
                          }}
                        >
                          Xem trước
                        </ActionMenuItem>

                        {/* 2. Chỉnh sửa */}
                        <ActionMenuItem
                          icon={<Pencil className="h-4 w-4 text-slate-500" />}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            router.push(`/materials/proposals/new?edit=${proposal.id}`);
                          }}
                        >
                          Chỉnh sửa
                        </ActionMenuItem>

                        <div className="my-1 border-t border-slate-100" />

                        {/* 3. Tải Excel */}
                        <ActionMenuItem
                          icon={<FileSpreadsheet className="h-4 w-4 text-emerald-600" />}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            triggerDownload(proposal.id, proposal.proposalNo, "excel");
                          }}
                        >
                          Tải Excel
                        </ActionMenuItem>

                        {/* 4. Tải PDF */}
                        <ActionMenuItem
                          icon={<Download className="h-4 w-4 text-rose-600" />}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            triggerDownload(proposal.id, proposal.proposalNo, "pdf");
                          }}
                        >
                          Tải PDF
                        </ActionMenuItem>

                        {/* 5. In */}
                        <ActionMenuItem
                          icon={<Printer className="h-4 w-4 text-blue-600" />}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            triggerPrint(proposal.id);
                          }}
                        >
                          In
                        </ActionMenuItem>

                        <div className="my-1 border-t border-slate-100" />

                        {/* 6. Xóa đề xuất */}
                        <ActionMenuItem
                          destructive
                          icon={<Trash2 className="h-4 w-4 text-rose-600" />}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDeletingId(proposal.id);
                          }}
                        >
                          Xóa đề xuất
                        </ActionMenuItem>
                      </UnifiedActionMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Compact Empty State */
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-3 shadow-xs">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Chưa có đề xuất vật tư</h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm">
            Tạo đề xuất đầu tiên để quản lý nhu cầu cấp vật tư cho công trình này.
          </p>
          <Link
            href={createUrl}
            className="mt-4 flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Tạo đề xuất đầu tiên</span>
          </Link>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="Xóa đề xuất vật tư?"
        description="Đề xuất này sẽ bị xóa và không còn xuất hiện trong danh sách."
        variant="danger"
        confirmText="Xóa đề xuất"
        cancelText="Hủy"
        onConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
      />
    </div>
  );
}
