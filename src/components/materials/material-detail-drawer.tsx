"use client";

import { AppDrawer } from "@/components/ui/app-drawer";
import { CloseButton } from "@/components/ui/close-button";
import { formatDateTime, formatQuantity, getStockStatus } from "./materials-formatters";
import { MovementTypeBadge, StockStatusBadge } from "./materials-badges";
import type { MaterialItemDto, ProjectStockDto, MaterialMovementDto } from "@/app/(dashboard)/materials/actions";
import { SafeText, DateCell, QuantityCell, ActionGroup } from "@/components/ui/enterprise";
import { Button } from "@/components/ui/button";

interface MaterialDetailDrawerProps {
  material: MaterialItemDto | null;
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
  stock,
  recentTransactions = [],
  onClose,
  onEdit,
  onDelete,
  onImport,
  onExport,
  permissions
}: MaterialDetailDrawerProps) {
  if (!material) return null;

  return (
    <AppDrawer isOpen={!!material} onClose={onClose} ariaLabel="Chi tiết vật tư">
      <div className="flex h-full flex-col bg-white">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900 line-clamp-1">{material.name}</h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 font-mono">
                {material.code}
                {material.group && (
                  <>
                    <span className="font-sans text-slate-300">•</span>
                    <span className="font-sans font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">{material.group}</span>
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
                <h3 className="text-sm font-semibold text-slate-900">Tổng quan tồn kho</h3>
                {stock && <StockStatusBadge stock={stock.stock} minStockLevel={stock.minStockLevel} />}
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-sm font-medium text-slate-500 mb-1">Hiện có</div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-bold font-mono tracking-tight ${stock && stock.stock < 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                        {stock ? formatQuantity(stock.stock) : 0}
                      </span>
                      <span className="text-sm font-medium text-slate-600">{material.unit}</span>
                    </div>
                  </div>
                  {stock && stock.minStockLevel > 0 && (
                    <div className="text-right">
                      <div className="text-xs font-medium text-slate-500 mb-1">Ngưỡng cảnh báo</div>
                      <div className="font-mono font-semibold text-slate-700">
                        {formatQuantity(stock.minStockLevel)} {material.unit}
                      </div>
                    </div>
                  )}
                </div>
                
                {stock && stock.minStockLevel > 0 && stock.stock <= stock.minStockLevel && (
                  <div className={`mt-4 rounded-lg p-3 text-sm ${stock.stock < 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-50 text-rose-700'}`}>
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
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Thông tin bổ sung</h3>
              <div className="rounded-xl border border-slate-200 bg-white p-0 overflow-hidden text-sm">
                <div className="grid grid-cols-3 border-b border-slate-100">
                  <div className="p-3 font-medium text-slate-500 bg-slate-50/50">Đơn vị</div>
                  <div className="p-3 col-span-2 font-semibold text-slate-900">{material.unit}</div>
                </div>
                <div className="grid grid-cols-3 border-b border-slate-100">
                  <div className="p-3 font-medium text-slate-500 bg-slate-50/50">Nhóm vật tư</div>
                  <div className="p-3 col-span-2 text-slate-900">{material.group || "—"}</div>
                </div>
                <div className="grid grid-cols-3">
                  <div className="p-3 font-medium text-slate-500 bg-slate-50/50">Ghi chú</div>
                  <div className="p-3 col-span-2 text-slate-900 whitespace-pre-wrap">{material.description || "—"}</div>
                </div>
              </div>
            </div>

            {/* GIAO DỊCH GẦN ĐÂY */}
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Giao dịch gần đây</h3>
              {recentTransactions.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                  <div className="divide-y divide-slate-100">
                    {recentTransactions.map((tx) => (
                      <div key={tx.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <MovementTypeBadge type={tx.type} />
                          <div>
                            <div className="font-mono text-xs text-slate-500">{tx.id.slice(-8).toUpperCase()}</div>
                            <div className="text-xs text-slate-500 mt-0.5">{formatDateTime(tx.movementDate)}</div>
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
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  Chưa có giao dịch nào cho vật tư này.
                </div>
              )}
            </div>

          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="sticky bottom-0 z-10 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:px-6">
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
