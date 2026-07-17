"use client";

import { AppDrawer } from "@/components/ui/app-drawer";
import { CloseButton } from "@/components/ui/close-button";
import { formatDateTime, formatQuantity, getStockStatus } from "./materials-formatters";
import { MovementTypeBadge, StockStatusBadge } from "./materials-badges";
import type { MaterialItemDto, ProjectStockDto, MaterialMovementDto } from "@/app/(dashboard)/materials/actions";
import { SafeText, DateCell, QuantityCell, ActionGroup } from "@/components/ui/enterprise";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { getApprovedProposalSummaryByMaterial } from "@/app/actions/material-request";

interface MaterialDetailDrawerProps {
  material: MaterialItemDto | null;
  projectId: string;
  stock?: ProjectStockDto;
  recentTransactions?: MaterialMovementDto[];
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  permissions: {
    canUpdate: boolean;
    canDelete: boolean;
    canImport: boolean;
    canExport: boolean;
  };
}

export function MaterialDetailDrawer({
  material,
  projectId,
  stock,
  recentTransactions = [],
  onClose,
  onEdit,
  onDelete,
  onImport,
  onExport,
  permissions
}: MaterialDetailDrawerProps) {
  const [proposalSummary, setProposalSummary] = useState<any>(null);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (material && projectId) {
      setIsLoadingProposals(true);
      getApprovedProposalSummaryByMaterial(projectId, material.id, material.code)
        .then((res: any) => {
          if (mounted) setProposalSummary(res);
        })
        .catch(console.error)
        .finally(() => {
          if (mounted) setIsLoadingProposals(false);
        });
    } else {
      setProposalSummary(null);
    }
    return () => { mounted = false; };
  }, [material, projectId]);

  if (!material) return null;

  // Hide raw tags from description
  const cleanDescription = (material.description || "")
    .replace(/\[HAS_APPROVED_REQUEST:[^\]]+\]/g, "")
    .replace(/\[CREATED_FROM_REQUEST:[^\]]+\]/g, "")
    .trim();

  return (
    <AppDrawer isOpen={!!material} onClose={onClose} ariaLabel="Chi tiết vật tư">
      <div className="flex h-full flex-col bg-[var(--surface)]">
        <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[var(--foreground)] line-clamp-1">{material.name}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-[var(--muted-foreground)] font-mono">
                {material.code}
                {material.group && (
                  <>
                    <span className="font-sans text-slate-300">•</span>
                    <span className="font-sans font-medium text-[var(--muted-foreground)] bg-[var(--border)] px-2 py-0.5 rounded-full">{material.group}</span>
                  </>
                )}
              </div>
            </div>
            <CloseButton onClick={onClose} tone="neutral" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="space-y-8">
            
            {/* TỔNG QUAN TỒN KHO */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Tổng quan tồn kho</h3>
                {stock && <StockStatusBadge stock={stock.stock} minStockLevel={stock.minStockLevel} />}
              </div>
              <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-subtle)] p-5">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-sm font-medium text-[var(--muted-foreground)] mb-1">Hiện có</div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-bold font-mono tracking-tight ${stock && stock.stock < 0 ? 'text-amber-600' : 'text-[var(--foreground)]'}`}>
                        {stock ? formatQuantity(stock.stock) : 0}
                      </span>
                      <span className="text-sm font-medium text-[var(--muted-foreground)]">{material.unit}</span>
                    </div>
                  </div>
                  {stock && stock.minStockLevel > 0 && (
                    <div className="text-right">
                      <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Ngưỡng cảnh báo</div>
                      <div className="font-mono font-semibold text-[var(--foreground)]">
                        {formatQuantity(stock.minStockLevel)} {material.unit}
                      </div>
                    </div>
                  )}
                </div>
                
                {stock && stock.minStockLevel > 0 && stock.stock <= stock.minStockLevel && (
                  <div className={`mt-4 rounded-[var(--radius-lg)] p-3 text-sm ${stock.stock < 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-50 text-rose-700'}`}>
                    <span className="font-semibold">Cảnh báo: </span> 
                    {stock.stock < 0 ? "Vật tư đang âm kho." : "Tồn kho đã chạm hoặc dưới ngưỡng cảnh báo tối thiểu."}
                    {stock.stock < stock.minStockLevel && (
                       <span className="block mt-1">Cần bổ sung ít nhất: <span className="font-mono font-bold">{formatQuantity(stock.minStockLevel - stock.stock)}</span> {material.unit}</span>
                    )}
                    {stock.stock === 0 && permissions.canImport && (
                      <Button variant="default" size="sm" onClick={onImport} className="mt-3 bg-emerald-600 hover:bg-emerald-700 w-full sm:w-auto">
                        Nhập kho ban đầu
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* THÔNG TIN BỔ SUNG */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Thông tin bổ sung</h3>
              <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-0 overflow-hidden text-sm">
                <div className="grid grid-cols-3 border-b border-[var(--border)]">
                  <div className="p-3 font-medium text-[var(--muted-foreground)] bg-[var(--surface-subtle)]">Đơn vị</div>
                  <div className="p-3 col-span-2 font-semibold text-[var(--foreground)]">{material.unit}</div>
                </div>
                <div className="grid grid-cols-3 border-b border-[var(--border)]">
                  <div className="p-3 font-medium text-[var(--muted-foreground)] bg-[var(--surface-subtle)]">Nhóm vật tư</div>
                  <div className="p-3 col-span-2 text-[var(--foreground)]">{material.group || "—"}</div>
                </div>
                <div className="grid grid-cols-3">
                  <div className="p-3 font-medium text-[var(--muted-foreground)] bg-[var(--surface-subtle)]">Ghi chú</div>
                  <div className="p-3 col-span-2 text-[var(--foreground)] whitespace-pre-wrap">{cleanDescription || "—"}</div>
                </div>
              </div>
            </div>

            {/* ĐỀ XUẤT LIÊN QUAN */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Đề xuất liên quan</h3>
              {isLoadingProposals ? (
                <div className="rounded-[var(--radius-xl)] border border-[var(--border)] p-6 text-center text-sm text-[var(--muted-foreground)]">
                  Đang tải...
                </div>
              ) : proposalSummary ? (
                <div className="space-y-4">
                  {/* SUMMARY BOX */}
                  <div className="rounded-[var(--radius-xl)] border border-blue-200 bg-blue-50/50 p-4">
                    <h4 className="font-semibold text-blue-900 mb-3 text-sm">Tổng hợp số lượng từ đề xuất</h4>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] p-3 border border-blue-100 shadow-[var(--shadow-card)]">
                        <div className="text-xs text-[var(--muted-foreground)] mb-1 font-medium">Tổng Số lượng đề xuất đã duyệt</div>
                        <div className="text-lg font-bold text-[var(--foreground)] font-mono">
                          {formatQuantity(proposalSummary.approvedRequestedQuantityTotal)} <span className="text-sm font-medium text-[var(--muted-foreground)]">{material.unit}</span>
                        </div>
                      </div>
                      <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] p-3 border border-blue-100 shadow-[var(--shadow-card)]">
                        <div className="text-xs text-[var(--muted-foreground)] mb-1 font-medium">Đã nhập vào kho từ đề xuất</div>
                        <div className="text-lg font-bold text-blue-700 font-mono">
                          {formatQuantity(proposalSummary.importedFromProposalQuantity)} <span className="text-sm font-medium text-[var(--muted-foreground)]">{material.unit}</span>
                        </div>
                      </div>
                      <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] p-3 border border-blue-100 shadow-[var(--shadow-card)]">
                        <div className="text-xs text-[var(--muted-foreground)] mb-1 font-medium">Số đề xuất liên quan</div>
                        <div className="text-lg font-bold text-emerald-600 font-mono">
                          {proposalSummary.relatedRequests.length} <span className="text-sm font-medium text-[var(--muted-foreground)]">phiếu</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* LIST */}
                  <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                    <div className="divide-y divide-slate-100">
                    {proposalSummary.relatedRequests.map((reqItem: any) => (
                      <div key={reqItem.id} className="p-4 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-[var(--foreground)]">{reqItem.materialRequest?.requestNo}</span>
                          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium border border-emerald-200">
                            Đã duyệt
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-[var(--muted-foreground)]">
                          <div><span className="text-[var(--muted-foreground)] opacity-70">Số lượng:</span> <span className="font-semibold text-[var(--foreground)]">{formatQuantity(reqItem.requestedQuantity)}</span> {reqItem.unit}</div>
                          {reqItem.workItemNameSnapshot && (
                            <div><span className="text-[var(--muted-foreground)] opacity-70">Công việc:</span> {reqItem.workItemNameSnapshot}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)] mt-1">
                          <div>Tạo bởi: {reqItem.materialRequest?.requestedBy?.name || "Người dùng"}</div>
                          <div>Ngày: {formatDateTime(reqItem.materialRequest?.requestDate || reqItem.materialRequest?.createdAt)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              ) : (
                <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-6 text-center text-sm text-[var(--muted-foreground)]">
                  Không có đề xuất nào được duyệt cho vật tư này.
                </div>
              )}
            </div>

            {/* GIAO DỊCH GẦN ĐÂY */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Giao dịch gần đây</h3>
              {recentTransactions.length > 0 ? (
                <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className="p-3 flex items-center justify-between hover:bg-[var(--surface-subtle)] transition-colors">
                        <div className="flex items-center gap-3">
                          <MovementTypeBadge type={tx.type} />
                          <div>
                            <div className="font-mono text-xs text-[var(--muted-foreground)]">{tx.id.slice(-8).toUpperCase()}</div>
                            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{formatDateTime(tx.movementDate)}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <QuantityCell 
                            value={tx.quantity * (tx.type === 'EXPORT' || tx.type === 'TRANSFER' ? -1 : 1)} 
                            unit={material.unit} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-6 text-center text-sm text-[var(--muted-foreground)]">
                  Chưa có giao dịch nào cho vật tư này.
                </div>
              )}
            </div>

          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="sticky bottom-0 z-10 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-4 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="flex w-full sm:w-auto gap-2">
              {permissions.canUpdate && (
                <Button variant="outline" onClick={onEdit} className="w-full sm:w-auto">
                  Sửa
                </Button>
              )}
              {permissions.canDelete && (
                <Button variant="outline" onClick={onDelete} className="w-full sm:w-auto text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200">
                  Xóa
                </Button>
              )}
            </div>
            
            <div className="flex w-full sm:w-auto gap-2">
              {permissions.canExport && (
                <Button variant="secondary" onClick={onExport} disabled={!stock || stock.stock <= 0} className="w-full sm:w-auto bg-amber-100 text-amber-800 hover:bg-amber-200">
                  Xuất kho
                </Button>
              )}
              {permissions.canImport && (
                <Button variant="default" onClick={onImport} className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700">
                  Nhập kho
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppDrawer>
  );
}
