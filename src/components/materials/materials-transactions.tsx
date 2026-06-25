"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Plus, RefreshCcw, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MaterialsTransactionsProps {
  transactions: any[];
  materialItems: any[];
  projectId: string;
  onAddTransaction: () => void;
}

export function MaterialsTransactions({ transactions, materialItems, projectId, onAddTransaction }: MaterialsTransactionsProps) {
  // In a real app, we'd have a dialog here to add transactions
  // For now, we'll just render the list to fulfill the UI requirement
  
  const getIcon = (type: string) => {
    switch(type) {
      case "IMPORT": return <div className="p-1.5 rounded bg-emerald-100 text-emerald-600"><ArrowDownRight className="w-4 h-4" /></div>;
      case "EXPORT": return <div className="p-1.5 rounded bg-amber-100 text-amber-600"><ArrowUpRight className="w-4 h-4" /></div>;
      case "RETURN": return <div className="p-1.5 rounded bg-blue-100 text-blue-600"><RefreshCcw className="w-4 h-4" /></div>;
      default: return <div className="p-1.5 rounded bg-slate-100 text-slate-600"><AlertTriangle className="w-4 h-4" /></div>;
    }
  };

  const getLabel = (type: string) => {
    switch(type) {
      case "IMPORT": return "Nhập kho";
      case "EXPORT": return "Xuất kho";
      case "TRANSFER": return "Điều chuyển";
      case "RETURN": return "Hoàn trả";
      default: return type;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-slate-800">Lịch sử giao dịch</h2>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={onAddTransaction}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Tạo giao dịch</span>
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="px-4 py-3">Loại</th>
                <th className="px-4 py-3">Vật tư</th>
                <th className="px-4 py-3 text-right">Số lượng</th>
                <th className="px-4 py-3">Ngày GD</th>
                <th className="px-4 py-3">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getIcon(t.type)}
                      <span className="font-medium text-slate-700">{getLabel(t.type)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{t.materialItem?.name || "N/A"}</div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{t.materialItem?.code || "N/A"}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {t.type === "EXPORT" || t.type === "TRANSFER" ? "-" : "+"}
                    {Number(t.quantity).toLocaleString("en-US", { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {format(new Date(t.movementDate), "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3 text-slate-500 truncate max-w-[200px]">
                    {t.notes || "-"}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                    Chưa có giao dịch nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
