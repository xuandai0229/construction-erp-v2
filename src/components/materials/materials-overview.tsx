"use client";

import { AlertTriangle, ArrowDownRight, ClipboardList, Package, PackagePlus, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MaterialItemDto, MaterialMovementDto, ProjectStockDto } from "@/app/(dashboard)/materials/actions";
import { MovementTypeBadge, StockStatusBadge } from "./materials-badges";
import { formatDateTime, formatQuantity, getMovementSign } from "./materials-formatters";

interface MaterialsOverviewProps {
  materialItems: MaterialItemDto[];
  stocks: ProjectStockDto[];
  transactions: MaterialMovementDto[];
  onNavigate: (tab: string) => void;
  onGoToCatalog: () => void;
  onCreateImport: () => void;
  permissions: {
    canViewTransactions: boolean;
  };
}

export function MaterialsOverview({
  materialItems,
  stocks,
  transactions,
  onNavigate,
  onGoToCatalog,
  onCreateImport,
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
      label: "Mã đang theo dõi",
      value: stocks.length,
      unit: "mã",
      icon: Package,
      tone: "blue",
    },
    {
      label: "Mã có tồn kho",
      value: activeStockCount,
      unit: "mã",
      icon: Warehouse,
      tone: "emerald",
    },
    {
      label: "Vật tư cần bổ sung",
      value: lowStocks.length,
      unit: "mục",
      icon: AlertTriangle,
      tone: lowStocks.length > 0 ? "amber" : "slate",
    },
    {
      label: "Giao dịch tháng này",
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
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/[0.03]">
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
            </div>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03]">
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
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03]">
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
                <p className="mt-1 text-sm text-slate-500">Sau khi nhập hoặc xuất kho, lịch sử sẽ hiển thị tại đây.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {stocks.length === 0 && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 md:p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl space-y-4">
              <div>
                <h2 className="text-lg font-bold text-blue-950">Công trình chưa có vật tư</h2>
                <p className="mt-1 text-sm leading-6 text-blue-800">
                  Hãy thêm vật tư đầu tiên để bắt đầu quản lý cho công trình này.
                </p>
              </div>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">1</div>
                  <div>
                    <div className="font-semibold text-blue-950">Thêm vật tư</div>
                    <p className="mt-0.5 text-sm text-blue-800">Tạo mã vật tư đầu tiên cho công trình này.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3 opacity-60">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-800">2</div>
                  <div>
                    <div className="font-semibold text-blue-950">Nhập kho đầu kỳ</div>
                    <p className="mt-0.5 text-sm text-blue-800">Chọn "Nhập kho" để ghi nhận số lượng sẵn có tại công trình.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3 opacity-60">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-200 text-xs font-bold text-blue-800">3</div>
                  <div>
                    <div className="font-semibold text-blue-950">Theo dõi tồn kho</div>
                    <p className="mt-0.5 text-sm text-blue-800">Xuất kho cho các đội thi công và hệ thống sẽ tự động trừ tồn.</p>
                  </div>
                </li>
              </ul>
            </div>
            <div className="shrink-0 flex flex-col gap-3">
              <Button onClick={onGoToCatalog} className="w-full bg-blue-600 hover:bg-blue-700 text-white md:w-auto">
                <PackagePlus className="mr-2 h-4 w-4" />
                Mở danh mục vật tư
              </Button>
              <Button onClick={onCreateImport} variant="outline" className="w-full border-blue-200 text-blue-700 hover:bg-blue-100 md:w-auto" disabled={materialItems.length === 0}>
                <ArrowDownRight className="mr-2 h-4 w-4" />
                Nhập kho đầu kỳ
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
