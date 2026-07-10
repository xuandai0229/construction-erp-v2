"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, ClipboardList, Eye, Plus, Search, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnterpriseCombobox, type EnterpriseComboboxOption } from "@/components/ui/enterprise-combobox";
import type { MaterialItemDto, MaterialMovementDto, ProjectStockDto } from "@/app/(dashboard)/materials/actions";
import { formatDateTime, formatQuantity, getMovementSign } from "./materials-formatters";
import { MovementTypeBadge } from "./materials-badges";
import { ActionGroup, ContentCard, DateCell, EnterpriseTable, FilterBar, KpiCard, SafeText } from "@/components/ui/enterprise";
import { TransactionDetailDrawer, type TransactionLedgerInfo } from "./transaction-detail-drawer";
import { useSearchParams, useRouter } from "next/navigation";
import { fromDateInputValue, safeParseDate, toDateInputValue } from "@/lib/date-utils";

type MovementFilter = "ALL" | "IMPORT" | "EXPORT";

interface MaterialsTransactionsProps {
  transactions: MaterialMovementDto[];
  stocks: ProjectStockDto[];
  materialItems: MaterialItemDto[];
  onAddTransaction: (type?: "IMPORT" | "EXPORT", materialId?: string) => void;
  hasMaterials: boolean;
  permissions: {
    canImport: boolean;
    canExport: boolean;
  };
}

function isSeedNote(note: string | null | undefined) {
  if (!note) return false;
  const normalized = note.toLowerCase();
  return normalized.includes("seed") || normalized.includes("test") || normalized.includes("mock") || normalized.includes("dummy");
}

function displayNote(note: string | null | undefined) {
  if (!note?.trim()) return "—";
  if (isSeedNote(note)) return "Phiếu nhập/xuất từ dữ liệu khởi tạo";
  return note.trim();
}

function sameLocalDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function buildLedger(transactions: MaterialMovementDto[], stocks: ProjectStockDto[]) {
  const runningByMaterial = new Map(stocks.map((stock) => [stock.materialItemId, stock.stock]));
  const sortedDesc = [...transactions].sort((a, b) => {
    const bTime = safeParseDate(b.movementDate)?.getTime() ?? 0;
    const aTime = safeParseDate(a.movementDate)?.getTime() ?? 0;
    return bTime - aTime;
  });
  const ledger = new Map<string, TransactionLedgerInfo>();

  sortedDesc.forEach((transaction) => {
    const currentAfter = runningByMaterial.get(transaction.materialItemId);
    if (currentAfter === undefined) return;
    const sign = getMovementSign(transaction.type);
    const delta = sign === "-" ? -transaction.quantity : transaction.quantity;
    const before = currentAfter - delta;
    ledger.set(transaction.id, {
      stockBefore: before,
      stockAfter: currentAfter,
      delta,
    });
    runningByMaterial.set(transaction.materialItemId, before);
  });

  return ledger;
}

function updateParams(searchParams: URLSearchParams, next: Record<string, string>) {
  const params = new URLSearchParams(searchParams);
  Object.entries(next).forEach(([key, value]) => {
    if (!value || value === "ALL") params.delete(key);
    else params.set(key, value);
  });
  return params;
}

export function MaterialsTransactions({
  transactions,
  stocks,
  materialItems,
  onAddTransaction,
  hasMaterials,
  permissions,
}: MaterialsTransactionsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const movementIdFromUrl = searchParams.get("movementId") || searchParams.get("txId") || "";
  const movementType = (searchParams.get("movementType") || "ALL") as MovementFilter;
  const q = searchParams.get("q") || "";
  const materialId = searchParams.get("materialId") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const [selectedTransaction, setSelectedTransaction] = useState<MaterialMovementDto | null>(null);

  const ledgerById = useMemo(() => buildLedger(transactions, stocks), [transactions, stocks]);
  const materialOptions = useMemo<EnterpriseComboboxOption[]>(
    () =>
      materialItems.map((material) => ({
        value: material.id,
        code: material.code,
        name: material.name,
        label: `${material.code} — ${material.name}`,
        description: `${material.unit}${material.group ? ` · ${material.group}` : ""}`,
      })),
    [materialItems],
  );

  useEffect(() => {
    if (!movementIdFromUrl) return;
    const tx = transactions.find((transaction) => transaction.id === movementIdFromUrl);
    if (tx) setSelectedTransaction(tx);
  }, [movementIdFromUrl, transactions]);

  const setFilter = (next: Record<string, string>) => {
    const params = updateParams(searchParams, next);
    params.set("tab", "transactions");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const handleOpenDrawer = (transaction: MaterialMovementDto) => {
    setSelectedTransaction(transaction);
    setFilter({ movementId: transaction.id });
  };

  const handleCloseDrawer = () => {
    setSelectedTransaction(null);
    const params = new URLSearchParams(searchParams);
    params.delete("movementId");
    params.delete("txId");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  const filteredTransactions = useMemo(() => {
    const normalized = q.trim().toLowerCase();
    const from = fromDateInputValue(dateFrom);
    const to = fromDateInputValue(dateTo);
    if (to) to.setHours(23, 59, 59, 999);

    return transactions.filter((transaction) => {
      if (movementType !== "ALL" && transaction.type !== movementType) return false;
      if (materialId && transaction.materialItemId !== materialId) return false;
      const movementDate = safeParseDate(transaction.movementDate);
      if (from && movementDate && movementDate < from) return false;
      if (to && movementDate && movementDate > to) return false;
      if (!normalized) return true;
      return [transaction.materialItem.code, transaction.materialItem.name, transaction.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [dateFrom, dateTo, materialId, movementType, q, transactions]);

  const today = new Date();
  const importTotal = filteredTransactions.filter((transaction) => transaction.type === "IMPORT").reduce((sum, transaction) => sum + transaction.quantity, 0);
  const exportTotal = filteredTransactions.filter((transaction) => transaction.type === "EXPORT").reduce((sum, transaction) => sum + transaction.quantity, 0);
  const exportToday = transactions.filter((transaction) => {
    const date = safeParseDate(transaction.movementDate);
    return transaction.type === "EXPORT" && date && sameLocalDate(date, today);
  }).length;
  const negativeStocks = stocks.filter((stock) => stock.stock < 0);
  const topExport = Object.values(
    filteredTransactions
      .filter((transaction) => transaction.type === "EXPORT")
      .reduce<Record<string, { name: string; code: string; unit: string; quantity: number }>>((acc, transaction) => {
        const current = acc[transaction.materialItemId] || {
          name: transaction.materialItem.name,
          code: transaction.materialItem.code,
          unit: transaction.materialItem.unit,
          quantity: 0,
        };
        current.quantity += transaction.quantity;
        acc[transaction.materialItemId] = current;
        return acc;
      }, {}),
  ).sort((a, b) => b.quantity - a.quantity)[0];

  const hasActions = permissions.canImport || permissions.canExport;
  const selectedLedger = selectedTransaction ? ledgerById.get(selectedTransaction.id) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-950">Nhập / Xuất vật tư</h2>
          <p className="mt-1 text-sm text-slate-600">Command Center theo dõi luồng nhập kho, xuất kho và biến động tồn.</p>
        </div>
        {hasActions && (
          <ActionGroup className="shrink-0">
            {permissions.canImport && (
              <Button onClick={() => onAddTransaction("IMPORT", materialId)} variant="success" className="w-full sm:w-auto" disabled={!hasMaterials}>
                <ArrowDownRight className="h-4 w-4" />
                Nhập kho
              </Button>
            )}
            {permissions.canExport && (
              <Button onClick={() => onAddTransaction("EXPORT", materialId)} variant="warning" className="w-full sm:w-auto" disabled={!hasMaterials}>
                <ArrowUpRight className="h-4 w-4" />
                Xuất kho
              </Button>
            )}
            {!permissions.canImport && !permissions.canExport ? null : (
              <Button onClick={() => onAddTransaction(permissions.canImport ? "IMPORT" : "EXPORT", materialId)} className="w-full sm:w-auto" disabled={!hasMaterials}>
                <Plus className="h-4 w-4" />
                Tạo giao dịch
              </Button>
            )}
          </ActionGroup>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Tổng giao dịch" value={filteredTransactions.length} helper="Theo bộ lọc hiện tại" icon={<ClipboardList className="h-5 w-5" />} tone="slate" className="p-3" />
        <KpiCard label="Nhập trong kỳ" value={formatQuantity(importTotal)} helper="Tổng số lượng nhập" icon={<ArrowDownRight className="h-5 w-5" />} tone="emerald" className="p-3" />
        <KpiCard label="Xuất trong kỳ" value={formatQuantity(exportTotal)} helper="Tổng số lượng xuất" icon={<ArrowUpRight className="h-5 w-5" />} tone="amber" className="p-3" />
        <KpiCard label="Xuất hôm nay" value={exportToday} helper="Giao dịch xuất kho" icon={<TrendingDown className="h-5 w-5" />} tone="blue" className="p-3" />
        <KpiCard label="Xuất nhiều nhất" value={topExport ? formatQuantity(topExport.quantity) : "—"} helper={topExport ? `${topExport.code} · ${topExport.unit}` : "Chưa có xuất kho"} icon={<ArrowUpRight className="h-5 w-5" />} tone="indigo" className="p-3" />
        <KpiCard label="Cảnh báo" value={negativeStocks.length} helper={negativeStocks.length ? "Có tồn âm cần kiểm tra" : "Không có tồn âm"} icon={<AlertTriangle className="h-5 w-5" />} tone={negativeStocks.length ? "rose" : "emerald"} className="p-3" />
      </div>

      <FilterBar className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_140px_minmax(220px,280px)_160px_160px_auto] lg:items-center">
        <label className="relative min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(event) => setFilter({ q: event.target.value })}
            placeholder="Tìm mã, tên vật tư, ghi chú..."
            className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </label>

        <select
          value={movementType}
          onChange={(event) => setFilter({ movementType: event.target.value })}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          aria-label="Lọc loại giao dịch"
        >
          <option value="ALL">Tất cả</option>
          <option value="IMPORT">Nhập</option>
          <option value="EXPORT">Xuất</option>
        </select>

        <EnterpriseCombobox
          value={materialId}
          options={materialOptions}
          onChange={(value) => setFilter({ materialId: value })}
          placeholder="Tất cả vật tư"
          searchPlaceholder="Tìm mã hoặc tên vật tư..."
          emptyMessage="Không tìm thấy vật tư phù hợp."
        />

        <input
          type="date"
          value={toDateInputValue(dateFrom)}
          onChange={(event) => setFilter({ dateFrom: event.target.value })}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          aria-label="Từ ngày"
        />
        <input
          type="date"
          value={toDateInputValue(dateTo)}
          onChange={(event) => setFilter({ dateTo: event.target.value })}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          aria-label="Đến ngày"
        />
        <Button type="button" variant="outline" onClick={() => setFilter({ q: "", movementType: "", materialId: "", dateFrom: "", dateTo: "" })}>
          Xóa lọc
        </Button>
      </FilterBar>

      <EnterpriseTable className="hidden md:block max-h-[min(640px,calc(100vh-260px))]">
        <table className="w-full min-w-[1080px] table-fixed text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/95 text-xs font-semibold uppercase tracking-wide text-slate-500 shadow-sm backdrop-blur">
            <tr>
              <th className="w-[104px] border-b border-slate-200 px-3 py-3">Loại</th>
              <th className="w-[260px] border-b border-slate-200 px-3 py-3">Vật tư</th>
              <th className="w-[150px] border-b border-slate-200 px-3 py-3 text-right">Số lượng</th>
              <th className="w-[150px] border-b border-slate-200 px-3 py-3 text-right">Tồn sau</th>
              <th className="w-[160px] border-b border-slate-200 px-3 py-3">Ngày giao dịch</th>
              <th className="w-[130px] border-b border-slate-200 px-3 py-3">Người tạo</th>
              <th className="w-[180px] border-b border-slate-200 px-3 py-3">Nguồn</th>
              <th className="border-b border-slate-200 px-3 py-3">Ghi chú</th>
              <th className="w-[72px] border-b border-slate-200 px-3 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTransactions.map((transaction) => {
              const sign = getMovementSign(transaction.type);
              const colorClass = sign === "+" ? "text-emerald-700" : "text-rose-700";
              const ledger = ledgerById.get(transaction.id);
              const note = displayNote(transaction.notes);

              return (
                <tr key={transaction.id} className="cursor-pointer transition hover:bg-slate-50" onClick={() => handleOpenDrawer(transaction)}>
                  <td className="px-3 py-3"><MovementTypeBadge type={transaction.type} /></td>
                  <td className="min-w-0 px-3 py-3">
                    <SafeText className="font-semibold text-slate-950">{transaction.materialItem.name}</SafeText>
                    <div className="mt-0.5 truncate font-mono text-xs font-medium text-slate-500" title={transaction.materialItem.code}>{transaction.materialItem.code}</div>
                  </td>
                  <td className={`px-3 py-3 text-right font-mono font-bold tabular-nums ${colorClass}`}>
                    {sign}{formatQuantity(transaction.quantity)}
                    <span className="ml-1 font-sans text-xs font-medium text-slate-500">{transaction.materialItem.unit}</span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-semibold text-slate-900 tabular-nums">
                    {ledger ? `${formatQuantity(ledger.stockAfter)} ${transaction.materialItem.unit}` : "—"}
                  </td>
                  <td className="px-3 py-3"><DateCell value={formatDateTime(transaction.movementDate)} /></td>
                  <td className="px-3 py-3 text-sm text-slate-500">Chưa ghi nhận</td>
                  <td className="px-3 py-3 text-sm text-slate-500">Giao dịch thủ công</td>
                  <td className="min-w-0 px-3 py-3">
                    <SafeText className="text-slate-600">{note}</SafeText>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleOpenDrawer(transaction);
                      }}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      aria-label="Xem chi tiết giao dịch"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <ClipboardList className="mx-auto h-9 w-9 text-slate-300" />
                  <div className="mt-2 font-semibold text-slate-700">Chưa có giao dịch phù hợp.</div>
                  {!hasMaterials && <p className="mt-1 text-sm text-slate-500">Tạo vật tư ở tab Danh mục trước.</p>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </EnterpriseTable>

      <div className="space-y-3 md:hidden">
        {filteredTransactions.map((transaction) => {
          const sign = getMovementSign(transaction.type);
          const colorClass = sign === "+" ? "text-emerald-700" : "text-rose-700";
          const ledger = ledgerById.get(transaction.id);
          return (
            <ContentCard key={transaction.id} className="cursor-pointer p-4 transition-transform active:scale-[0.99]" onClick={() => handleOpenDrawer(transaction)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <MovementTypeBadge type={transaction.type} />
                  <SafeText className="mt-3 font-bold text-slate-950">{transaction.materialItem.name}</SafeText>
                  <div className="mt-1 truncate font-mono text-xs font-medium text-slate-500">{transaction.materialItem.code}</div>
                </div>
                <div className={`shrink-0 text-right font-mono text-lg font-bold ${colorClass}`}>
                  {sign}{formatQuantity(transaction.quantity)}
                  <div className="font-sans text-xs font-medium text-slate-500">{transaction.materialItem.unit}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                <div>
                  <div className="text-xs text-slate-500">Ngày</div>
                  <div className="font-medium text-slate-900">{formatDateTime(transaction.movementDate)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Tồn sau</div>
                  <div className="font-mono font-semibold text-slate-900">{ledger ? `${formatQuantity(ledger.stockAfter)} ${transaction.materialItem.unit}` : "—"}</div>
                </div>
              </div>
              {transaction.notes && <SafeText className="mt-2 text-sm text-slate-500">{displayNote(transaction.notes)}</SafeText>}
            </ContentCard>
          );
        })}
        {filteredTransactions.length === 0 && (
          <div className="rounded-[14px] border border-dashed border-slate-300 bg-white p-8 text-center">
            <ClipboardList className="mx-auto h-9 w-9 text-slate-300" />
            <div className="mt-2 font-semibold text-slate-700">Chưa có giao dịch phù hợp.</div>
            {!hasMaterials && <p className="mt-1 text-sm text-slate-500">Tạo vật tư ở tab Danh mục trước.</p>}
          </div>
        )}
      </div>

      <TransactionDetailDrawer
        transaction={selectedTransaction}
        ledgerInfo={selectedLedger}
        sourceLabel="Giao dịch thủ công, chưa liên kết phiếu yêu cầu"
        displayNote={selectedTransaction ? displayNote(selectedTransaction.notes) : "—"}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
