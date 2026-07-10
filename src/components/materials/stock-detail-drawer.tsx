"use client";

import { AppDrawer } from "@/components/ui/app-drawer";
import { CloseButton } from "@/components/ui/close-button";
import { formatDateTime, formatQuantity, getStockDelta, getStockRatio, getStockStatus } from "./materials-formatters";
import { MovementTypeBadge, StockStatusBadge } from "./materials-badges";
import type { ProjectStockDto, MaterialMovementDto } from "@/app/(dashboard)/materials/actions";
import type { MaterialRequestWithItems } from "./materials-stock-table";
import { SafeText, QuantityCell, DateCell } from "@/components/ui/enterprise";
import { Button } from "@/components/ui/button";

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
      <div className="flex h-full flex-col bg-white">
        {/* HEADER */}
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 line-clamp-1">{materialItem.name}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 font-mono">
                {materialItem.code}
                {materialItem.group && (
                  <>
                    <span className="font-sans text-slate-300">•</span>
                    <span className="font-sans font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{materialItem.group}</span>
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
                <h3 className="text-sm font-semibold text-slate-900">Mức tồn kho</h3>
                <StockStatusBadge stock={stock.stock} minStockLevel={stock.minStockLevel} />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-500 mb-1">Hiện có</div>
                      <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-bold font-mono tracking-tight ${stock.stock < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                          {formatQuantity(stock.stock)}
                        </span>
                        <span className="text-sm font-medium text-slate-600">{materialItem.unit}</span>
                      </div>
                    </div>
                    {stock.minStockLevel > 0 && (
                      <div className="text-right">
                        <div className="text-xs font-medium text-slate-500 mb-1">Tối thiểu</div>
                        <div className="font-mono font-semibold text-slate-700">
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
                        <span className="text-slate-500">Tỷ lệ: <span className="text-slate-700 font-bold font-mono">{ratio}%</span></span>
                        <span className={delta >= 0 ? "text-emerald-600" : "text-rose-600"}>
                          {delta >= 0 ? `Dư ${formatQuantity(delta)}` : `Thiếu ${formatQuantity(Math.abs(delta))}`} {materialItem.unit}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 italic">
                      Chưa có mức tồn tối thiểu để đánh giá tỷ lệ an toàn.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* GIAO DỊCH GẦN ĐÂY */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Giao dịch gần đây (5)</h3>
              {recentTransactions.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <MovementTypeBadge type={tx.type} />
                          <div>
                            <div className="font-mono text-xs font-medium text-slate-700">{tx.id.slice(-8).toUpperCase()}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{formatDateTime(tx.movementDate)}</div>
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
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Chưa có giao dịch nhập/xuất nào.
                </div>
              )}
            </div>

            {/* YÊU CẦU VẬT TƯ LIÊN QUAN */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Phiếu yêu cầu liên quan</h3>
              {relatedRequests.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {relatedRequests.slice(0, 5).map((req) => (
                      <div key={req.id} className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-mono text-xs font-bold text-blue-600">{req.code || req.requestNo || req.id.slice(-8).toUpperCase()}</div>
                          <div className="text-xs text-slate-500">{req.createdAt ? formatDateTime(req.createdAt) : "Chưa rõ ngày"}</div>
                        </div>
                        <div className="text-sm text-slate-700 line-clamp-2">{req.notes || "Yêu cầu cung cấp vật tư"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Chưa có phiếu yêu cầu nào liên quan.
                </div>
              )}
            </div>

          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
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
