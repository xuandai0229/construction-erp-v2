"use client";

import { AlertTriangle, ArrowDownRight, ClipboardList, Package, PackagePlus, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MaterialMovementDto, ProjectStockDto } from "@/app/(dashboard)/materials/actions";
import { MovementTypeBadge, StockStatusBadge } from "./materials-badges";
import { formatDateTime, formatQuantity, getMovementSign } from "./materials-formatters";
import { ContentCard } from "@/components/ui/enterprise";

interface MaterialsOverviewProps {
  stocks: ProjectStockDto[];
  transactions: MaterialMovementDto[];
  onNavigate: (tab: string) => void;
  onGoToCatalog: () => void;
  permissions: {
    canViewTransactions: boolean;
  };
}

export function MaterialsOverview({
  stocks,
  transactions,
  onNavigate,
  onGoToCatalog,
  permissions,
}: MaterialsOverviewProps) {
  const now = new Date();
  const monthlyTransactions = transactions.filter((transaction) => {
    const date = new Date(transaction.movementDate);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });
  const activeStockCount = stocks.filter((stock) => stock.stock > 0).length;
  const lowStocks = stocks.filter((stock) => stock.minStockLevel > 0 && stock.stock <= stock.minStockLevel);
  const recentTransactions = transactions.slice(0, 6);

  const cards = [
    {
      label: "Mã vật tư",
      value: stocks.length,
      unit: "mã",
      icon: Package,
      tone: "blue",
    },
    {
      label: "Có tồn kho",
      value: activeStockCount,
      unit: "mã",
      icon: Warehouse,
      tone: "emerald",
    },
    {
      label: "Cần bổ sung",
      value: lowStocks.length,
      unit: "mục",
      icon: AlertTriangle,
      tone: lowStocks.length > 0 ? "amber" : "slate",
    },
    {
      label: "Giao dịch tháng",
      value: monthlyTransactions.length,
      unit: "phiếu",
      icon: ClipboardList,
      tone: "indigo",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">Tổng quan vật tư</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const toneClass =
            card.tone === "emerald"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : card.tone === "amber"
                ? "bg-amber-50 text-amber-700 border-amber-100"
                : card.tone === "indigo"
                  ? "bg-indigo-50 text-indigo-700 border-indigo-100"
                  : card.tone === "slate"
                    ? "bg-slate-50 text-slate-500 border-slate-100"
                    : "bg-blue-50 text-blue-700 border-blue-100";

          return (
            <ContentCard key={card.label} className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-slate-600">{card.label}</div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${toneClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold tracking-tight text-slate-950">{card.value}</span>
                <span className="text-xs font-semibold text-slate-500">{card.unit}</span>
              </div>
            </ContentCard>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <ContentCard className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">Cảnh báo tồn kho</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("stock")}>Xem tồn</Button>
          </div>
          <div className="divide-y divide-slate-100">
            {lowStocks.slice(0, 6).map((stock) => (
              <div key={stock.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <div className="font-semibold text-slate-900">{stock.materialItem.name}</div>
                  <div className="mt-0.5 text-xs font-medium text-slate-500">
                    {stock.materialItem.code} · tối thiểu {formatQuantity(stock.minStockLevel)} {stock.materialItem.unit}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <div className="text-right font-mono text-sm font-bold text-slate-950">
                    {formatQuantity(stock.stock)} <span className="font-sans text-xs font-medium text-slate-500">{stock.materialItem.unit}</span>
                  </div>
                  <StockStatusBadge stock={stock.stock} minStockLevel={stock.minStockLevel} compact />
                </div>
              </div>
            ))}
            {lowStocks.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Package className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-700">Chưa có vật tư cần bổ sung</p>
              </div>
            )}
          </div>
        </ContentCard>

        <ContentCard className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-base font-bold text-slate-950">Giao dịch gần đây</h2>
            </div>
            {permissions.canViewTransactions && (
              <Button variant="ghost" size="sm" onClick={() => onNavigate("transactions")}>Lịch sử</Button>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="grid gap-3 px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                <MovementTypeBadge type={transaction.type} />
                <div>
                  <div className="font-semibold text-slate-900">{transaction.materialItem.name}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{formatDateTime(transaction.movementDate)}</div>
                </div>
                <div className="text-right font-mono text-sm font-bold text-slate-950">
                  {getMovementSign(transaction.type)}
                  {formatQuantity(transaction.quantity)}
                  <span className="ml-1 font-sans text-xs font-medium text-slate-500">{transaction.materialItem.unit}</span>
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <div className="px-4 py-8 text-center">
                <ArrowDownRight className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-700">Chưa có giao dịch</p>
              </div>
            )}
          </div>
        </ContentCard>
      </div>

      {stocks.length === 0 && (
        <section className="rounded-[14px] lg:rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Warehouse className="mx-auto h-9 w-9 text-slate-300" />
          <h2 className="mt-2 text-sm font-bold text-slate-900">Chưa có vật tư</h2>
          <div className="mt-4 flex justify-center">
            <Button onClick={onGoToCatalog} variant="outline" size="sm">
              <PackagePlus className="mr-2 h-4 w-4" />
              Mở danh mục
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
