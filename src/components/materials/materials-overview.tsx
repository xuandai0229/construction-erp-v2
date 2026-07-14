"use client";

import { AlertTriangle, ArrowDownRight, ClipboardList, Package, PackagePlus, Warehouse, CheckCircle2, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MaterialMovementDto, ProjectStockDto } from "@/app/(dashboard)/materials/actions";
import { MovementTypeBadge, StockStatusBadge } from "./materials-badges";
import { formatDateTime, formatQuantity, getMovementSign } from "./materials-formatters";
import { ContentCard, SafeText } from "@/components/ui/enterprise";
import { InteractiveKpiCard } from "@/components/ui/interactive-kpi-card";

interface MaterialsOverviewProps {
  stocks: ProjectStockDto[];
  transactions: MaterialMovementDto[];
  requests?: { status?: string }[];
  onNavigate: (tab: string, additionalParams?: Record<string, string>) => void;
  onGoToCatalog: () => void;
  permissions: {
    canViewTransactions: boolean;
  };
}

export function MaterialsOverview({
  stocks,
  transactions,
  requests = [],
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
  const lowStocks = stocks.filter((stock) => stock.minStockLevel > 0 && stock.stock > 0 && stock.stock <= stock.minStockLevel);
  const outOfStocks = stocks.filter((stock) => stock.stock === 0);
  const negativeStocks = stocks.filter((stock) => stock.stock < 0);
  
  const recentTransactions = transactions.slice(0, 6);
  const pendingRequests = requests.filter(r => r.status === "SUBMITTED" || r.status === "APPROVED").length;

  const cards = [
    {
      label: "Tổng mã vật tư",
      value: stocks.length,
      helper: "Mã đang theo dõi",
      icon: <Package className="h-5 w-5" />,
      tone: "blue" as const,
      onClick: () => onNavigate("catalog"),
    },
    {
      label: "Có tồn kho",
      value: activeStockCount,
      helper: "Mã sẵn sàng cấp",
      icon: <Warehouse className="h-5 w-5" />,
      tone: "emerald" as const,
      onClick: () => onNavigate("stock", { stockStatus: "healthy" }),
    },
    {
      label: "Cần bổ sung",
      value: lowStocks.length + outOfStocks.length,
      helper: negativeStocks.length > 0 ? `${negativeStocks.length} mã âm kho` : "Dưới mức tối thiểu",
      icon: <AlertTriangle className="h-5 w-5" />,
      tone: "amber" as const,
      onClick: () => onNavigate("stock", { stockStatus: "low" }),
    },
    {
      label: "Cần cấp / Chờ duyệt",
      value: pendingRequests,
      helper: "Phiếu yêu cầu",
      icon: <ClipboardList className="h-5 w-5" />,
      tone: pendingRequests > 0 ? ("rose" as const) : ("slate" as const),
      onClick: () => onNavigate("requests", { requestStatus: "SUBMITTED" }),
    },
    {
      label: "Giao dịch tháng",
      value: monthlyTransactions.length,
      helper: "Nhập / Xuất kho",
      icon: <TrendingDown className="h-5 w-5" />,
      tone: "indigo" as const,
      onClick: () => onNavigate("transactions", { period: "thisMonth" }),
    },
  ];

  const issues = [...negativeStocks, ...outOfStocks, ...lowStocks].slice(0, 5);

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => (
          <InteractiveKpiCard
            key={card.label}
            label={card.label}
            value={card.value}
            helper={card.helper}
            icon={card.icon}
            tone={card.tone}
            onClick={card.onClick}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ContentCard className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 bg-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-slate-950">Cảnh báo tồn kho</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("stock")}>Xem tồn</Button>
          </div>
          <div className="divide-y divide-slate-100">
            {issues.map((stock) => (
              <div 
                key={stock.id} 
                className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center hover:bg-slate-50 transition-all cursor-pointer group active:scale-[0.99]"
                onClick={() => onNavigate("stock", { search: stock.materialItem.code })}
                role="button"
                tabIndex={0}
              >
                <div className="min-w-0">
                  <SafeText className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{stock.materialItem.name}</SafeText>
                  <div className="mt-0.5 text-xs font-medium text-slate-500 truncate">
                    {stock.materialItem.code} · tối thiểu {formatQuantity(stock.minStockLevel)} {stock.materialItem.unit}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end shrink-0">
                  <div className="text-right font-mono text-sm font-bold text-slate-950">
                    {formatQuantity(stock.stock)} <span className="font-sans text-xs font-medium text-slate-500">{stock.materialItem.unit}</span>
                  </div>
                  <StockStatusBadge stock={stock.stock} minStockLevel={stock.minStockLevel} compact />
                  <ArrowDownRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 -rotate-90 hidden sm:block" />
                </div>
              </div>
            ))}
            {issues.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-900">Tồn kho an toàn</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[250px]">Không có vật tư nào dưới mức tối thiểu hoặc hết hàng.</p>
              </div>
            )}
          </div>
        </ContentCard>

        <ContentCard className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 bg-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-slate-950">Giao dịch gần đây</h2>
            </div>
            {permissions.canViewTransactions && (
              <Button variant="ghost" size="sm" onClick={() => onNavigate("transactions")}>Lịch sử</Button>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((transaction) => (
              <div 
                key={transaction.id} 
                className="grid gap-3 px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center hover:bg-slate-50 transition-all cursor-pointer group active:scale-[0.99]"
                onClick={() => onNavigate("transactions", { txId: transaction.id })}
                role="button"
                tabIndex={0}
              >
                <MovementTypeBadge type={transaction.type} className="w-[72px]" />
                <div className="min-w-0">
                  <SafeText className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">{transaction.materialItem.name}</SafeText>
                  <div className="mt-0.5 text-xs text-slate-500 flex items-center gap-2">
                    <span className="font-mono">{transaction.id.slice(-8).toUpperCase()}</span>
                    <span>·</span>
                    <span>{formatDateTime(transaction.movementDate)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className={`text-right font-mono text-sm font-bold ${getMovementSign(transaction.type) === "+" ? "text-emerald-700" : "text-amber-700"}`}>
                    {getMovementSign(transaction.type)}
                    {formatQuantity(transaction.quantity)}
                    <span className="ml-1 font-sans text-xs font-medium text-slate-500">{transaction.materialItem.unit}</span>
                  </div>
                  <ArrowDownRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 -rotate-90 hidden sm:block" />
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-3">
                  <TrendingDown className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-900">Chưa có giao dịch</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[250px]">Các phiếu nhập/xuất kho sẽ hiển thị tại đây.</p>
              </div>
            )}
          </div>
        </ContentCard>

        <ContentCard className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 bg-slate-50/50">
            <div>
              <h2 className="text-base font-bold text-slate-950">Đề xuất chờ duyệt</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("requests")}>Xem tất cả</Button>
          </div>
          <div className="divide-y divide-slate-100">
            {requests.filter(r => r.status === "SUBMITTED" || r.status === "REQUESTED" || r.status === "PENDING").slice(0, 5).map((req: any) => (
              <div 
                key={req.id} 
                className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center hover:bg-slate-50 transition-all cursor-pointer group active:scale-[0.99]"
                onClick={() => onNavigate("requests", { requestId: req.id })}
                role="button"
                tabIndex={0}
              >
                <div className="min-w-0">
                  <SafeText className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {req.items && req.items.length > 0 ? req.items[0].materialName : "Phiếu yêu cầu"}
                    {req.items && req.items.length > 1 && <span className="text-slate-500 text-xs ml-1">(+{req.items.length - 1})</span>}
                  </SafeText>
                  <div className="mt-0.5 text-xs text-slate-500 flex items-center gap-2">
                    <span className="font-mono text-[10px] bg-slate-100 px-1 rounded">{req.requestNo}</span>
                    <span>·</span>
                    <span className="truncate">{req.requestedBy?.name || "Người tạo"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                    Chờ duyệt
                  </span>
                  <ArrowDownRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 -rotate-90 hidden sm:block" />
                </div>
              </div>
            ))}
            {requests.filter(r => r.status === "SUBMITTED" || r.status === "REQUESTED" || r.status === "PENDING").length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 mb-3">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-slate-900">Không có đề xuất</p>
                <p className="text-xs text-slate-500 mt-1 max-w-[250px]">Chưa có đề xuất vật tư nào đang chờ duyệt.</p>
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
