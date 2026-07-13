"use client";

import { AppDrawer } from "@/components/ui/app-drawer";
import { CloseButton } from "@/components/ui/close-button";
import { formatDateTime, formatQuantity, getMovementSign } from "./materials-formatters";
import { MovementTypeBadge } from "./materials-badges";
import type { MaterialMovementDto } from "@/app/(dashboard)/materials/actions";
import { DateCell, SafeText } from "@/components/ui/enterprise";

export interface TransactionLedgerInfo {
  stockBefore: number;
  delta: number;
  stockAfter: number;
}

interface TransactionDetailDrawerProps {
  transaction: MaterialMovementDto | null;
  ledgerInfo?: TransactionLedgerInfo;
  sourceLabel?: string;
  displayNote?: string;
  onClose: () => void;
}

export function TransactionDetailDrawer({
  transaction,
  ledgerInfo,
  sourceLabel,
  displayNote,
  onClose,
}: TransactionDetailDrawerProps) {
  if (!transaction) return null;

  const sign = getMovementSign(transaction.type);
  const colorClass = sign === "+" ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50";
  const textClass = sign === "+" ? "text-emerald-700" : "text-amber-700";
  const title = transaction.type === "IMPORT" ? "Nhập kho" : "Xuất kho";
  const note = displayNote ?? transaction.notes ?? "—";

  return (
    <AppDrawer isOpen={!!transaction} onClose={onClose} ariaLabel="Chi tiết giao dịch">
      <div className="flex h-full flex-col bg-white">
        <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900">{title}</h2>
              <SafeText className="text-sm text-slate-500">{transaction.materialItem.code}</SafeText>
            </div>
            <CloseButton onClick={onClose} tone="neutral" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6 pb-[calc(32px+env(safe-area-inset-bottom))] sm:px-6">
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <MovementTypeBadge type={transaction.type} />
                <SafeText className={`mt-2 text-lg font-bold ${textClass}`}>{transaction.materialItem.name}</SafeText>
                <div className={`mt-0.5 truncate font-mono text-sm font-medium ${textClass}`}>{transaction.materialItem.code}</div>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm text-slate-500">Ngày giao dịch</div>
                <div className="font-medium text-slate-900">{formatDateTime(transaction.movementDate)}</div>
              </div>
            </div>

            <div className={`rounded-xl border ${sign === "+" ? "border-emerald-200" : "border-amber-200"} ${colorClass} p-5`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-700 mb-1">Số lượng</div>
                  <div className={`font-mono text-2xl font-bold ${textClass}`}>
                    {sign}{formatQuantity(transaction.quantity)}
                  </div>
                  <div className={`font-sans text-sm font-medium opacity-80 ${textClass}`}>{transaction.materialItem.unit}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-slate-700 mb-1">Mã giao dịch</div>
                  <div className="font-mono text-sm font-semibold text-slate-900">{transaction.id.slice(-8).toUpperCase()}</div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Biến động tồn kho</h3>
              <div className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Tồn trước</div>
                  <div className="mt-1 font-mono font-semibold text-slate-900">
                    {ledgerInfo ? `${formatQuantity(ledgerInfo.stockBefore)} ${transaction.materialItem.unit}` : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Biến động</div>
                  <div className={`mt-1 font-mono font-bold ${textClass}`}>
                    {sign}{formatQuantity(transaction.quantity)} {transaction.materialItem.unit}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Tồn sau</div>
                  <div className="mt-1 font-mono font-semibold text-slate-900">
                    {ledgerInfo ? `${formatQuantity(ledgerInfo.stockAfter)} ${transaction.materialItem.unit}` : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Nguồn liên quan</h3>
              <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                {sourceLabel || "Giao dịch thủ công, chưa liên kết đề xuất vật tư"}
              </div>
            </div>

            {transaction.unitPrice && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-slate-900">Giá trị giao dịch</h3>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Đơn giá:</span>
                    <span className="font-mono font-medium text-slate-900">{formatQuantity(transaction.unitPrice)} VNĐ</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm">
                    <span className="font-semibold text-slate-700">Tổng trị giá:</span>
                    <span className="font-mono font-bold text-slate-900">{formatQuantity(transaction.quantity * transaction.unitPrice)} VNĐ</span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-900">Ghi chú</h3>
              <div className="min-h-[100px] whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                {note === "—" ? <span className="italic text-slate-400">Không có ghi chú.</span> : note}
              </div>
            </div>

            <div className="flex justify-between border-t border-slate-100 pt-4 text-xs text-slate-400">
              <span>Hệ thống ghi nhận lúc:</span>
              <DateCell value={formatDateTime(transaction.createdAt)} />
            </div>
          </div>
        </div>
      </div>
    </AppDrawer>
  );
}
