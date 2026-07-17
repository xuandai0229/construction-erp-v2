"use client";

import { useEffect, useState } from "react";
import { AppDrawer } from "@/components/ui/app-drawer";
import { CloseButton } from "@/components/ui/close-button";
import { formatDateTime, formatQuantity, getStockDelta, getStockRatio, getStockStatus } from "./materials-formatters";
import { MovementTypeBadge, StockStatusBadge } from "./materials-badges";
import type { ProjectStockDto, MaterialMovementDto } from "@/app/(dashboard)/materials/actions";
import type { MaterialRequestWithItems } from "./materials-stock-table";
import { SafeText, QuantityCell, DateCell } from "@/components/ui/enterprise";
import { Button } from "@/components/ui/button";
import { getApprovedProposalSummaryByMaterial } from "@/app/actions/material-request";

interface StockDetailDrawerProps {
  stock: ProjectStockDto | null;
  recentTransactions?: MaterialMovementDto[];
  relatedRequests?: MaterialRequestWithItems[];
  onClose: () => void;
  onImport?: () => void;
  onExport?: () => void;
  permissions: {
    canImport: boolean;
    canExport: boolean;
  };
}

export function StockDetailDrawer({
  stock,
  recentTransactions = [],
  relatedRequests = [],
  onClose,
  onImport,
  onExport,
  permissions
}: StockDetailDrawerProps) {
  const [proposalSummary, setProposalSummary] = useState<any>(null);
  const [isLoadingProposals, setIsLoadingProposals] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (stock) {
      setIsLoadingProposals(true);
      getApprovedProposalSummaryByMaterial(stock.projectId, stock.materialItemId)
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
  }, [stock]);

  if (!stock) return null;

  const { materialItem } = stock;
  const status = getStockStatus(stock.stock, stock.minStockLevel);
  const delta = getStockDelta(stock.stock, stock.minStockLevel);
  const ratio = getStockRatio(stock.stock, stock.minStockLevel);

  let healthColor = "bg-emerald-500";
  if (status === "out") healthColor = "bg-slate-400";
  if (status === "low") healthColor = "bg-amber-500";
  if (status === "negative") healthColor = "bg-rose-500";

  return (
    <AppDrawer isOpen={!!stock} onClose={onClose} ariaLabel="Chi tiết tồn kho">
      <div className="flex h-full flex-col bg-[var(--surface)]">
        {/* HEADER */}
        <div className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-[var(--foreground)] line-clamp-1">{materialItem.name}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-[var(--muted-foreground)] font-mono">
                {materialItem.code}
                {materialItem.group && (
                  <>
                    <span className="font-sans text-slate-300">•</span>
                    <span className="font-sans font-medium text-[var(--muted-foreground)] bg-[var(--border)] px-2 py-0.5 rounded-full">{materialItem.group}</span>
                  </>
                )}
              </div>
            </div>
            <CloseButton onClick={onClose} tone="neutral" />
          </div>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="space-y-8">
            
            {/* TỔNG QUAN TỒN KHO & HEALTH */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">Mức tồn kho</h3>
                <StockStatusBadge stock={stock.stock} minStockLevel={stock.minStockLevel} />
              </div>
              <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-subtle)] p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-sm font-medium text-[var(--muted-foreground)] mb-1">Hiện có</div>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-bold font-mono tracking-tight ${stock.stock < 0 ? 'text-rose-600' : 'text-[var(--foreground)]'}`}>
                          {formatQuantity(stock.stock)}
                        </span>
                        <span className="text-sm font-medium text-[var(--muted-foreground)]">{materialItem.unit}</span>
                      </div>
                    </div>
                    {stock.minStockLevel > 0 && (
                      <div className="text-right">
                        <div className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Tối thiểu</div>
                        <div className="font-mono font-semibold text-[var(--foreground)]">
                          {formatQuantity(stock.minStockLevel)} <span className="font-sans">{materialItem.unit}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Progress Bar for Stock Health */}
                  {stock.minStockLevel > 0 ? (
                    <div className="space-y-2">
                      <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${healthColor}`} 
                          style={{ width: `${Math.min(Math.max(ratio, 0), 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs font-medium">
                        <span className="text-[var(--muted-foreground)]">Tỷ lệ: <span className="text-[var(--foreground)] font-bold font-mono">{ratio}%</span></span>
                        <span className={delta >= 0 ? "text-emerald-600" : "text-rose-600"}>
                          {delta >= 0 ? `Dư ${formatQuantity(delta)}` : `Thiếu ${formatQuantity(Math.abs(delta))}`} {materialItem.unit}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-[var(--muted-foreground)] italic">
                      Chưa có mức tồn tối thiểu để đánh giá tỷ lệ an toàn.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* THÔNG TIN ĐỀ XUẤT */}
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
                          {formatQuantity(proposalSummary.approvedRequestedQuantityTotal)} <span className="text-sm font-medium text-[var(--muted-foreground)]">{materialItem.unit}</span>
                        </div>
                      </div>
                      <div className="bg-[var(--surface)] rounded-[var(--radius-lg)] p-3 border border-blue-100 shadow-[var(--shadow-card)]">
                        <div className="text-xs text-[var(--muted-foreground)] mb-1 font-medium">Đã nhập vào kho từ đề xuất</div>
                        <div className="text-lg font-bold text-blue-700 font-mono">
                          {formatQuantity(proposalSummary.importedFromProposalQuantity)} <span className="text-sm font-medium text-[var(--muted-foreground)]">{materialItem.unit}</span>
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
                            <div className="line-clamp-1"><span className="text-[var(--muted-foreground)] opacity-70">Công việc:</span> {reqItem.workItemNameSnapshot}</div>
                          )}
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-6 text-center text-sm text-[var(--muted-foreground)]">
                  Chưa có đề xuất vật tư nào liên quan đến vật tư này.
                </div>
              )}
            </div>

            {/* GIAO DỊCH GẦN ĐÂY */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Giao dịch gần đây (5)</h3>
              {recentTransactions.length > 0 ? (
                <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className="p-3 flex items-center justify-between hover:bg-[var(--surface-subtle)] transition-colors">
                        <div className="flex items-center gap-3">
                          <MovementTypeBadge type={tx.type} />
                          <div>
                            <div className="font-mono text-xs font-medium text-[var(--foreground)]">{tx.id.slice(-8).toUpperCase()}</div>
                            <div className="text-xs text-[var(--muted-foreground)] mt-0.5">{formatDateTime(tx.movementDate)}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <QuantityCell 
                            value={tx.quantity * (tx.type === 'EXPORT' || tx.type === 'TRANSFER' ? -1 : 1)} 
                            unit={materialItem.unit} 
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-6 text-center text-sm text-[var(--muted-foreground)]">
                  Chưa có giao dịch nhập/xuất nào.
                </div>
              )}
            </div>

            {/* YÊU CẦU VẬT TƯ LIÊN QUAN */}
            <div>
              <h3 className="text-sm font-semibold text-[var(--foreground)] mb-3">Phiếu yêu cầu liên quan</h3>
              {relatedRequests.length > 0 ? (
                <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {relatedRequests.slice(0, 5).map((req) => (
                      <div key={req.id} className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-mono text-xs font-bold text-blue-600">{req.code || req.requestNo || req.id.slice(-8).toUpperCase()}</div>
                          <div className="text-xs text-[var(--muted-foreground)]">{req.createdAt ? formatDateTime(req.createdAt) : "Chưa rõ ngày"}</div>
                        </div>
                        <div className="text-sm text-[var(--foreground)] line-clamp-2">{req.notes || "Yêu cầu cung cấp vật tư"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface-subtle)] p-6 text-center text-sm text-[var(--muted-foreground)]">
                  Chưa có đề xuất vật tư nào liên quan.
                </div>
              )}
            </div>

          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="sticky bottom-0 z-10 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-4 py-4 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-end">
            {permissions.canExport && (
              <Button variant="secondary" onClick={onExport} disabled={stock.stock <= 0} className="w-full sm:w-auto bg-amber-100 text-amber-800 hover:bg-amber-200">
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
    </AppDrawer>
  );
}
