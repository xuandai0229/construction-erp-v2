"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  Building2,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Globe,
  Package,
  PackagePlus,
  TrendingDown,
  Warehouse,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MaterialMovementDto, PortfolioOverviewDto, ProjectStockDto } from "@/app/(dashboard)/materials/actions";
import { MovementTypeBadge, StockStatusBadge } from "./materials-badges";
import { formatDateTime, formatQuantity, getMovementSign } from "./materials-formatters";
import { ContentCard, SafeText } from "@/components/ui/enterprise";
import { InteractiveKpiCard } from "@/components/ui/interactive-kpi-card";
import { MaterialsPortfolioOverview } from "./materials-portfolio-overview";

interface MaterialsOverviewProps {
  isPortfolioMode?: boolean;
  portfolioOverview?: PortfolioOverviewDto;
  portfolioCatalog?: import("@/app/(dashboard)/materials/actions").PortfolioCatalogItemDto[];
  portfolioStocks?: import("@/app/(dashboard)/materials/actions").PortfolioStockItemDto[];
  portfolioProposals?: Array<{ projectId?: string }>;
  portfolioTransactions?: MaterialMovementDto[];
  projects?: Array<{ id: string; name: string }>;
  stocks: ProjectStockDto[];
  transactions: MaterialMovementDto[];
  requests?: any[];
  onNavigate: (tab: string, additionalParams?: Record<string, string>) => void;
  onGoToCatalog: () => void;
  onSelectProject?: (projectId: string) => void;
  permissions: {
    canViewTransactions: boolean;
  };
}

export function MaterialsOverview({
  isPortfolioMode = false,
  portfolioOverview,
  portfolioCatalog = [],
  portfolioStocks = [],
  portfolioProposals = [],
  portfolioTransactions = [],
  projects = [],
  stocks,
  transactions,
  requests = [],
  onNavigate,
  onGoToCatalog,
  onSelectProject,
  permissions,
}: MaterialsOverviewProps) {
  const renderLegacyPortfolio: boolean = false;
  if (isPortfolioMode && portfolioOverview) {
    return (
      <MaterialsPortfolioOverview
        overview={portfolioOverview}
        projects={projects}
        catalog={portfolioCatalog}
        stocks={portfolioStocks}
        proposals={portfolioProposals}
        transactions={portfolioTransactions}
        onNavigate={onNavigate}
        onSelectProject={(projectId) => onSelectProject?.(projectId)}
      />
    );
  }

  // Retained only while the legacy portfolio markup is removed in a follow-up
  // cleanup. The active portfolio path above is deterministic.
  if (isPortfolioMode && portfolioOverview && renderLegacyPortfolio) {
    const cards = [
      {
        label: "Công trình theo dõi",
        value: `${portfolioOverview.projectsWithMaterialData} / ${portfolioOverview.totalProjects}`,
        helper: "Có dữ liệu vật tư",
        icon: <Building2 className="h-5 w-5" />,
        tone: "blue" as const,
        onClick: () => onNavigate("catalog"),
      },
      {
        label: "Mã vật tư hệ thống",
        value: portfolioOverview.totalMaterialItems,
        helper: "Chủng loại toàn công ty",
        icon: <Package className="h-5 w-5" />,
        tone: "indigo" as const,
        onClick: () => onNavigate("catalog"),
      },
      {
        label: "Công trình cảnh báo tồn",
        value: portfolioOverview.lowStockProjectsCount,
        helper: `${portfolioOverview.lowStockItemsCount} mặt hàng dưới tối thiểu`,
        icon: <AlertTriangle className="h-5 w-5" />,
        tone: portfolioOverview.lowStockProjectsCount > 0 ? ("amber" as const) : ("emerald" as const),
        onClick: () => onNavigate("stock"),
      },
      {
        label: "Tổng đề xuất vật tư",
        value: portfolioOverview.totalProposalsCount,
        helper: "Trên toàn bộ công trình",
        icon: <ClipboardList className="h-5 w-5" />,
        tone: "indigo" as const,
        onClick: () => onNavigate("requests"),
      },
      {
        label: "Giao dịch phát sinh",
        value: portfolioOverview.recentMovementsCount,
        helper: "Lịch sử nhập / xuất kho",
        icon: <TrendingDown className="h-5 w-5" />,
        tone: "emerald" as const,
        onClick: () => onNavigate("transactions"),
      },
    ];

    return (
      <div className="space-y-4 sm:space-y-5">
        {/* Portfolio KPI Row */}
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
          {/* Attention Projects List */}
          <ContentCard className="flex flex-col lg:col-span-1">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 bg-[var(--surface-subtle)]">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h2 className="text-base font-bold text-slate-950">Công trình cần chú ý</h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {portfolioOverview.attentionProjects.length} công trình
              </span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {portfolioOverview.attentionProjects.map((p) => (
                <div
                  key={p.projectId}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--surface-subtle)] transition-all cursor-pointer group"
                  onClick={() => onSelectProject?.(p.projectId)}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        {p.projectCode}
                      </span>
                      <SafeText className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 truncate">
                        {p.projectName}
                      </SafeText>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs font-medium text-slate-500">
                      {p.lowStockCount > 0 && (
                        <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold">
                          {p.lowStockCount} vật tư thiếu
                        </span>
                      )}
                      {p.pendingProposalsCount > 0 && (
                        <span className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-bold">
                          {p.pendingProposalsCount} đề xuất chờ
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="shrink-0 group-hover:bg-blue-50 group-hover:text-blue-700">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {portfolioOverview.attentionProjects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-900">Tất cả công trình đều ổn định</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-[240px]">
                    Không có công trình nào bị thiếu tồn kho hoặc có đề xuất đọng.
                  </p>
                </div>
              )}
            </div>
          </ContentCard>

          {/* Cross-Company Recent Transactions */}
          <ContentCard className="flex flex-col lg:col-span-1">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 bg-[var(--surface-subtle)]">
              <div>
                <h2 className="text-base font-bold text-slate-950">Giao dịch toàn công ty</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate("transactions")}>
                Lịch sử
              </Button>
            </div>
            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {portfolioOverview.recentTransactions.slice(0, 6).map((tx) => (
                <div
                  key={tx.id}
                  className="grid gap-2 px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center hover:bg-[var(--surface-subtle)] transition-all cursor-pointer group"
                  onClick={() => onNavigate("transactions", { txId: tx.id })}
                >
                  <MovementTypeBadge type={tx.type} className="w-[68px]" />
                  <div className="min-w-0">
                    <SafeText className="font-semibold text-sm text-slate-900 group-hover:text-blue-600 truncate">
                      {tx.materialItem.name}
                    </SafeText>
                    <div className="mt-0.5 text-xs text-slate-500 flex items-center gap-1.5 truncate">
                      <span className="font-mono text-[11px] text-blue-700 bg-blue-50 px-1 rounded">
                        {(tx as any).projectCode || "CT"}
                      </span>
                      <span>·</span>
                      <span>{formatDateTime(tx.movementDate)}</span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-sm font-bold shrink-0">
                    <span className={getMovementSign(tx.type) === "+" ? "text-emerald-700" : "text-amber-700"}>
                      {getMovementSign(tx.type)}
                      {formatQuantity(tx.quantity)}
                    </span>
                    <span className="ml-1 font-sans text-xs font-medium text-slate-500">{tx.materialItem.unit}</span>
                  </div>
                </div>
              ))}
              {portfolioOverview.recentTransactions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <p className="text-sm font-semibold text-slate-700">Chưa có giao dịch phát sinh</p>
                  <p className="text-xs text-slate-500 mt-1">Các phiếu nhập / xuất kho toàn công ty sẽ hiển thị tại đây.</p>
                </div>
              )}
            </div>
          </ContentCard>

          {/* Cross-Company Recent Proposals */}
          <ContentCard className="flex flex-col lg:col-span-1">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 bg-[var(--surface-subtle)]">
              <div>
                <h2 className="text-base font-bold text-slate-950">Đề xuất vật tư gần đây</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onNavigate("requests")}>
                Xem tất cả
              </Button>
            </div>
            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto">
              {portfolioOverview.recentProposals.slice(0, 6).map((req: any) => (
                <div
                  key={req.id}
                  className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center hover:bg-[var(--surface-subtle)] transition-all cursor-pointer group"
                  onClick={() => onNavigate("requests", { requestId: req.id })}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] bg-slate-200 text-slate-800 px-1 rounded font-bold">
                        {req.proposalNo}
                      </span>
                      <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1 rounded">
                        {req.projectNameSnapshot || "Công trình"}
                      </span>
                    </div>
                    <SafeText className="mt-1 font-semibold text-sm text-slate-900 group-hover:text-blue-600 truncate">
                      {req.items && req.items.length > 0 ? req.items[0].materialName : "Đề xuất vật tư"}
                      {req.items && req.items.length > 1 && (
                        <span className="text-slate-500 text-xs ml-1">(+{req.items.length - 1})</span>
                      )}
                    </SafeText>
                    <div className="mt-0.5 text-xs text-slate-500 truncate">
                      {req.requesterNameSnapshot || "Người đề nghị"} · {req.requesterRoleSnapshot || "Cán bộ"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 border border-blue-200">
                      {req.status === "SUBMITTED"
                        ? "Chờ duyệt"
                        : req.status === "APPROVED"
                        ? "Đã duyệt"
                        : req.status === "REVISION_REQUESTED"
                        ? "Cần sửa"
                        : "Nháp"}
                    </span>
                  </div>
                </div>
              ))}
              {portfolioOverview.recentProposals.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <p className="text-sm font-semibold text-slate-700">Chưa có đề xuất nào</p>
                  <p className="text-xs text-slate-500 mt-1">Các đề xuất vật tư từ các công trình sẽ xuất hiện tại đây.</p>
                </div>
              )}
            </div>
          </ContentCard>
        </div>
      </div>
    );
  }

  // PROJECT MODE OVERVIEW
  const now = new Date();
  const monthlyTransactions = transactions.filter((transaction) => {
    const date = new Date(transaction.movementDate);
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  });

  const activeStockCount = stocks.filter((stock) => stock.stock > 0).length;
  const lowStocks = stocks.filter(
    (stock) => stock.minStockLevel > 0 && stock.stock > 0 && stock.stock <= stock.minStockLevel
  );
  const outOfStocks = stocks.filter((stock) => stock.stock === 0);
  const negativeStocks = stocks.filter((stock) => stock.stock < 0);

  const recentTransactions = transactions.slice(0, 6);
  const pendingRequests = requests.filter((r) => r.status === "SUBMITTED" || r.status === "APPROVED").length;

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
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 bg-[var(--surface-subtle)]">
            <div>
              <h2 className="text-base font-bold text-slate-950">Cảnh báo tồn kho</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("stock")}>
              Xem tồn
            </Button>
          </div>
          <div className="divide-y divide-slate-100">
            {issues.map((stock) => (
              <div
                key={stock.id}
                className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center hover:bg-[var(--surface-subtle)] transition-all cursor-pointer group active:scale-[0.99]"
                onClick={() => onNavigate("stock", { search: stock.materialItem.code })}
                role="button"
                tabIndex={0}
              >
                <div className="min-w-0">
                  <SafeText className="font-semibold text-[var(--foreground)] group-hover:text-blue-600 transition-colors">
                    {stock.materialItem.name}
                  </SafeText>
                  <div className="mt-0.5 text-xs font-medium text-[var(--muted-foreground)] truncate">
                    {stock.materialItem.code} · tối thiểu {formatQuantity(stock.minStockLevel)} {stock.materialItem.unit}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end shrink-0">
                  <div className="text-right font-mono text-sm font-bold text-slate-950">
                    {formatQuantity(stock.stock)}{" "}
                    <span className="font-sans text-xs font-medium text-[var(--muted-foreground)]">
                      {stock.materialItem.unit}
                    </span>
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
                <p className="text-sm font-semibold text-[var(--foreground)]">Tồn kho an toàn</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-[250px]">
                  Không có vật tư nào dưới mức tối thiểu hoặc hết hàng.
                </p>
              </div>
            )}
          </div>
        </ContentCard>

        <ContentCard className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 bg-[var(--surface-subtle)]">
            <div>
              <h2 className="text-base font-bold text-slate-950">Giao dịch gần đây</h2>
            </div>
            {permissions.canViewTransactions && (
              <Button variant="ghost" size="sm" onClick={() => onNavigate("transactions")}>
                Lịch sử
              </Button>
            )}
          </div>
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="grid gap-3 px-4 py-3 sm:grid-cols-[auto_1fr_auto] sm:items-center hover:bg-[var(--surface-subtle)] transition-all cursor-pointer group active:scale-[0.99]"
                onClick={() => onNavigate("transactions", { txId: transaction.id })}
                role="button"
                tabIndex={0}
              >
                <MovementTypeBadge type={transaction.type} className="w-[72px]" />
                <div className="min-w-0">
                  <SafeText className="font-semibold text-[var(--foreground)] group-hover:text-blue-600 transition-colors">
                    {transaction.materialItem.name}
                  </SafeText>
                  <div className="mt-0.5 text-xs text-[var(--muted-foreground)] flex items-center gap-2">
                    <span className="font-mono">{transaction.id.slice(-8).toUpperCase()}</span>
                    <span>·</span>
                    <span>{formatDateTime(transaction.movementDate)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div
                    className={`text-right font-mono text-sm font-bold ${
                      getMovementSign(transaction.type) === "+" ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {getMovementSign(transaction.type)}
                    {formatQuantity(transaction.quantity)}
                    <span className="ml-1 font-sans text-xs font-medium text-[var(--muted-foreground)]">
                      {transaction.materialItem.unit}
                    </span>
                  </div>
                  <ArrowDownRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 -rotate-90 hidden sm:block" />
                </div>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[var(--muted-foreground)] opacity-70 mb-3">
                  <TrendingDown className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Chưa có giao dịch</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-[250px]">
                  Các phiếu nhập/xuất kho sẽ hiển thị tại đây.
                </p>
              </div>
            )}
          </div>
        </ContentCard>

        <ContentCard className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3 bg-[var(--surface-subtle)]">
            <div>
              <h2 className="text-base font-bold text-slate-950">Đề xuất chờ duyệt</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onNavigate("requests")}>
              Xem tất cả
            </Button>
          </div>
          <div className="divide-y divide-slate-100">
            {requests
              .filter((r) => r.status === "SUBMITTED" || r.status === "REQUESTED" || r.status === "PENDING")
              .slice(0, 5)
              .map((req: any) => (
                <div
                  key={req.id}
                  className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center hover:bg-[var(--surface-subtle)] transition-all cursor-pointer group active:scale-[0.99]"
                  onClick={() => onNavigate("requests", { requestId: req.id })}
                  role="button"
                  tabIndex={0}
                >
                  <div className="min-w-0">
                    <SafeText className="font-semibold text-[var(--foreground)] group-hover:text-blue-600 transition-colors">
                      {req.items && req.items.length > 0 ? req.items[0].materialName : "Phiếu yêu cầu"}
                      {req.items && req.items.length > 1 && (
                        <span className="text-[var(--muted-foreground)] text-xs ml-1">(+{req.items.length - 1})</span>
                      )}
                    </SafeText>
                    <div className="mt-0.5 text-xs text-[var(--muted-foreground)] flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-[var(--border)] px-1 rounded">{req.proposalNo}</span>
                      <span>·</span>
                      <span className="truncate">{req.requesterNameSnapshot || "Người tạo"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center rounded-[var(--radius-md)] bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                      Chờ duyệt
                    </span>
                    <ArrowDownRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500 -rotate-90 hidden sm:block" />
                  </div>
                </div>
              ))}
            {requests.filter((r) => r.status === "SUBMITTED" || r.status === "REQUESTED" || r.status === "PENDING").length ===
              0 && (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[var(--muted-foreground)] opacity-70 mb-3">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Không có đề xuất</p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-[250px]">
                  Chưa có đề xuất vật tư nào đang chờ duyệt.
                </p>
              </div>
            )}
          </div>
        </ContentCard>
      </div>

      {stocks.length === 0 && (
        <section className="rounded-[var(--radius-md)] lg:rounded-[var(--radius-xl)] border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center">
          <Warehouse className="mx-auto h-9 w-9 text-slate-300" />
          <h2 className="mt-2 text-sm font-bold text-[var(--foreground)]">Chưa có vật tư</h2>
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
