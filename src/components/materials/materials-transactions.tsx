"use client";

import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MaterialMovementDto } from "@/app/(dashboard)/materials/actions";
import { formatDateTime, formatQuantity, getMovementSign } from "./materials-formatters";
import { MovementTypeBadge } from "./materials-badges";
import { ContentCard, EnterpriseTable } from "@/components/ui/enterprise";

interface MaterialsTransactionsProps {
  transactions: MaterialMovementDto[];
  onAddTransaction: () => void;
  hasMaterials: boolean;
  permissions: {
    canImport: boolean;
    canExport: boolean;
  };
}

export function MaterialsTransactions({ transactions, onAddTransaction, hasMaterials, permissions }: MaterialsTransactionsProps) {
  const hasActions = permissions.canImport || permissions.canExport;
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Lịch sử nhập / xuất</h2>
          <p className="mt-1 text-sm text-slate-600">Lịch sử giao dịch vật tư.</p>
        </div>
        {hasActions && (
          <div title={!hasMaterials ? "Tạo vật tư ở tab Danh mục trước." : ""}>
            <Button onClick={onAddTransaction} className="w-full sm:w-auto" disabled={!hasMaterials}>
              <Plus className="h-4 w-4 mr-1.5" />
              Tạo giao dịch
            </Button>
          </div>
        )}
      </div>

      <EnterpriseTable className="hidden md:block">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Vật tư</th>
              <th className="px-4 py-3 text-right">Số lượng</th>
              <th className="px-4 py-3">Ngày giao dịch</th>
              <th className="px-4 py-3">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((transaction) => (
              <tr key={transaction.id} className="transition hover:bg-slate-50/70">
                <td className="px-4 py-3"><MovementTypeBadge type={transaction.type} /></td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-950">{transaction.materialItem.name}</div>
                  <div className="mt-0.5 font-mono text-xs font-medium text-slate-500">{transaction.materialItem.code}</div>
                </td>
                <td className={`px-4 py-3 text-right font-mono font-bold ${getMovementSign(transaction.type) === "+" ? "text-emerald-700" : "text-amber-700"}`}>
                  {getMovementSign(transaction.type)}
                  {formatQuantity(transaction.quantity)}
                  <span className="ml-1 font-sans text-xs font-medium text-slate-500">{transaction.materialItem.unit}</span>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDateTime(transaction.movementDate)}</td>
                <td className="max-w-[260px] truncate px-4 py-3 text-slate-600" title={transaction.notes || ""}>
                  {transaction.notes || "-"}
                </td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <ClipboardList className="mx-auto h-9 w-9 text-slate-300" />
                  <div className="mt-2 font-semibold text-slate-700">Chưa có giao dịch.</div>
                  {!hasMaterials && (
                    <p className="mt-1 text-sm text-slate-500">Tạo vật tư ở tab Danh mục trước.</p>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </EnterpriseTable>

      <div className="space-y-3 md:hidden">
        {transactions.map((transaction) => (
          <ContentCard key={transaction.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <MovementTypeBadge type={transaction.type} />
                <div className="mt-3 font-bold text-slate-950">{transaction.materialItem.name}</div>
                <div className="mt-1 font-mono text-xs font-medium text-slate-500">{transaction.materialItem.code}</div>
              </div>
              <div className={`text-right font-mono text-lg font-bold ${getMovementSign(transaction.type) === "+" ? "text-emerald-700" : "text-amber-700"}`}>
                {getMovementSign(transaction.type)}
                {formatQuantity(transaction.quantity)}
                <div className="font-sans text-xs font-medium text-slate-500">{transaction.materialItem.unit}</div>
              </div>
            </div>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <div className="font-medium text-slate-900">{formatDateTime(transaction.movementDate)}</div>
              {transaction.notes && <div className="mt-1 line-clamp-2">{transaction.notes}</div>}
            </div>
          </ContentCard>
        ))}
        {transactions.length === 0 && (
          <div className="rounded-[14px] lg:rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <ClipboardList className="mx-auto h-9 w-9 text-slate-300" />
            <div className="mt-2 font-semibold text-slate-700">Chưa có giao dịch.</div>
            {!hasMaterials && (
              <p className="mt-1 text-sm text-slate-500">Tạo vật tư ở tab Danh mục trước.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
