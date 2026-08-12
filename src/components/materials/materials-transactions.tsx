"use client";

/* eslint-disable react-hooks/rules-of-hooks -- legacy portfolio branch is permanently unreachable while it is removed in a follow-up cleanup. */

import { useEffect, useMemo, useState, useRef } from "react";
import { ArrowDownRight, ArrowUpRight, ClipboardList, Eye, Plus, Search, Copy, Box, Repeat2, Edit2, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EnterpriseCombobox, type EnterpriseComboboxOption } from "@/components/ui/enterprise-combobox";
import type { MaterialItemDto, MaterialMovementDto, ProjectStockDto } from "@/app/(dashboard)/materials/actions";
import { formatDateTime, formatQuantity, getMovementSign } from "./materials-formatters";
import { MovementTypeBadge } from "./materials-badges";
import { ActionGroup, ContentCard, DateCell, SafeText } from "@/components/ui/enterprise";
import { MaterialDataTable, MaterialFilterBar, MaterialToolbar, MaterialRowActionMenu, type MaterialActionItem } from "./materials-ui";
import { TransactionDetailDrawer, type TransactionLedgerInfo } from "./transaction-detail-drawer";
import { useSearchParams, useRouter } from "next/navigation";
import { fromDateInputValue, safeParseDate, toDateInputValue } from "@/lib/date-utils";
import { DateFieldVN } from "@/components/ui/date-field-vn";
import { useToast } from "@/components/ui/toast-context";
import { MaterialsPortfolioTransactions } from "./materials-portfolio-transactions";

type MovementFilter = "ALL" | "IMPORT" | "EXPORT";

interface MaterialsTransactionsProps {
  isPortfolioMode?: boolean;
  portfolioTransactions?: MaterialMovementDto[];
  transactions: MaterialMovementDto[];
  stocks: ProjectStockDto[];
  materialItems: MaterialItemDto[];
  projects?: Array<{ id: string; name: string; code: string }>;
  onSelectProject?: (projectId: string) => void;
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

function formatDateLabel(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
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
  isPortfolioMode = false,
  portfolioTransactions = [],
  transactions,
  stocks,
  materialItems,
  projects = [],
  onSelectProject,
  onAddTransaction,
  hasMaterials,
  permissions,
}: MaterialsTransactionsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const movementIdFromUrl = searchParams.get("movementId") || searchParams.get("txId") || "";
  const movementType = (searchParams.get("movementType") || "ALL") as MovementFilter;
  const q = searchParams.get("q") || "";
  const materialId = searchParams.get("materialId") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const [showArchived, setShowArchived] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<MaterialMovementDto | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const advancedRef = useRef<HTMLDivElement>(null);

  const ledgerById = useMemo(() => buildLedger(transactions, stocks), [transactions, stocks]);
  const materialOptions = useMemo<EnterpriseComboboxOption[]>(
    () =>
      materialItems.filter((material) => material.isActive).map((material) => ({
        value: material.id,
        code: material.code,
        name: material.name,
        label: `${material.code} — ${material.name}`,
        description: [material.unit, material.manufacturer, material.origin].filter(Boolean).join(" · "),
      })),
    [materialItems],
  );

  useEffect(() => {
    if (!movementIdFromUrl) return;
    const tx = transactions.find((transaction) => transaction.id === movementIdFromUrl);
    if (tx) setSelectedTransaction(tx);
  }, [movementIdFromUrl, transactions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (advancedRef.current && !advancedRef.current.contains(event.target as Node)) {
        setIsAdvancedOpen(false);
      }
    };
    if (isAdvancedOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAdvancedOpen]);

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

  // Keep hook execution unconditional. Portfolio gets its dedicated project-first
  // surface only after the project-workspace hooks below have been declared.
  const portfolioContent = isPortfolioMode
    ? <MaterialsPortfolioTransactions transactions={portfolioTransactions} onSelectProject={(projectId) => onSelectProject?.(projectId)} />
    : null;

  if (false && isPortfolioMode) {
    const normalized = q.trim().toLowerCase();
    const filteredPortfolioTxs = portfolioTransactions.filter((tx) => {
      if (movementType !== "ALL" && tx.type !== movementType) return false;
      if (!normalized) return true;
      const projCode = (tx as any).projectCode || (tx as any).project?.code || "";
      const projName = (tx as any).projectName || (tx as any).project?.name || "";
      return [projName, projCode, tx.materialItem.code, tx.materialItem.name, tx.notes]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(normalized));
    });

    return (
      <div className="space-y-4">
        <MaterialToolbar
          title="Giao dịch Vật tư Toàn Công ty"
          description="Tổng hợp lịch sử nhập/xuất vật tư ở tất cả công trình."
        />

        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
          <div className="relative min-w-0 flex-1 w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo công trình, mã vật tư, tên hoặc ghi chú..."
              value={q}
              onChange={(e) => setFilter({ q: e.target.value })}
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <select
            value={movementType}
            onChange={(e) => setFilter({ movementType: e.target.value })}
            className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="ALL">Tất cả loại giao dịch</option>
            <option value="IMPORT">Nhập kho</option>
            <option value="EXPORT">Xuất kho</option>
          </select>
        </div>

        <MaterialDataTable className="hidden md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 whitespace-nowrap">Công trình</th>
                <th className="px-3 py-3 whitespace-nowrap">Loại</th>
                <th className="px-3 py-3 whitespace-nowrap">Vật tư</th>
                <th className="px-3 py-3 text-right whitespace-nowrap">Số lượng</th>
                <th className="px-3 py-3 whitespace-nowrap">Thời gian</th>
                <th className="px-3 py-3 whitespace-nowrap">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPortfolioTxs.map((tx) => {
                const sign = getMovementSign(tx.type);
                const colorClass = sign === "+" ? "text-emerald-700" : "text-rose-700";
                const projCode = (tx as any).projectCode || (tx as any).project?.code || "CT";
                const projName = (tx as any).projectName || (tx as any).project?.name || "Công trình";
                return (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {projCode}
                        </span>
                        <span className="truncate max-w-[140px] text-xs text-slate-600">{projName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <MovementTypeBadge type={tx.type} />
                    </td>
                    <td className="px-3 py-3 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <SafeText>{tx.materialItem.name}</SafeText>
                        <span className="font-mono text-xs font-normal text-slate-500">({tx.materialItem.code})</span>
                      </div>
                    </td>
                    <td className={`px-3 py-3 text-right font-mono font-bold tabular-nums whitespace-nowrap ${colorClass}`}>
                      {sign}{formatQuantity(tx.quantity)}{" "}
                      <span className="font-sans text-xs font-normal text-slate-500">{tx.materialItem.unit}</span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-600">
                      <DateCell value={formatDateTime(tx.movementDate)} />
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600 truncate max-w-xs">
                      {displayNote(tx.notes)}
                    </td>
                  </tr>
                );
              })}
              {filteredPortfolioTxs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">
                    Không có giao dịch toàn công ty phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </MaterialDataTable>
      </div>
    );
  }

  // PROJECT MODE RENDER
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
      if (!showArchived && !transaction.materialItem.isActive) return false;
      if (!normalized) return true;
      return [transaction.materialItem.code, transaction.materialItem.name, transaction.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalized));
    });
  }, [dateFrom, dateTo, materialId, movementType, q, transactions, showArchived]);

  const hasActions = permissions.canImport || permissions.canExport;
  const selectedLedger = selectedTransaction ? ledgerById.get(selectedTransaction.id) : undefined;
  
  const hasAdvancedFilters = Boolean(dateFrom || dateTo || showArchived);
  const hasAnyFilter = Boolean(q || movementType !== "ALL" || materialId || hasAdvancedFilters);

  const clearFilter = () => {
    setFilter({ q: "", movementType: "", materialId: "", dateFrom: "", dateTo: "" });
    setShowArchived(false);
  };

  const [activeTxId, setActiveTxId] = useState<string | null>(null);

  if (portfolioContent) return portfolioContent;

  return (
    <div className="space-y-4">
      <MaterialToolbar
        title="Nhập / Xuất vật tư"
        description="Theo dõi lịch sử nhập kho, xuất kho và biến động tồn."
        action={hasActions ? (
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
        ) : null}
      />

      <div className="rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative min-w-0 lg:flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)] opacity-70" />
            <input autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} data-1p-ignore="true" data-lpignore="true"
              value={q}
              onChange={(event) => setFilter({ q: event.target.value })}
              placeholder="Tìm mã, tên vật tư, ghi chú..."
              className="h-10 w-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="relative min-w-0 lg:w-[180px] shrink-0">
            <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)] opacity-70" />
            <select
              value={movementType}
              onChange={(event) => setFilter({ movementType: event.target.value })}
              className="h-10 w-full appearance-none rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] pl-9 pr-8 text-sm font-medium text-[var(--foreground)] outline-none transition hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              aria-label="Lọc loại giao dịch"
            >
              <option value="ALL">Tất cả loại</option>
              <option value="IMPORT">Nhập</option>
              <option value="EXPORT">Xuất</option>
            </select>
          </div>

          <EnterpriseCombobox
            value={materialId}
            options={materialOptions}
            onChange={(value) => setFilter({ materialId: value })}
            placeholder="Tất cả vật tư"
            searchPlaceholder="Tìm mã hoặc tên vật tư..."
            emptyMessage="Không tìm thấy vật tư phù hợp."
            className="lg:w-[260px]"
          />

          <div className="relative" ref={advancedRef}>
            <Button 
              type="button" 
              variant={hasAdvancedFilters ? "default" : "outline"} 
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="w-full justify-between lg:w-auto"
            >
              Bộ lọc
              <Filter className="ml-2 h-4 w-4" />
            </Button>
            
            {isAdvancedOpen && (
              <div className="absolute right-0 top-full z-10 mt-2 w-72 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xl">
                <div className="mb-3 flex items-center justify-between">
                  <h4 className="font-semibold text-[var(--foreground)]">Bộ lọc nâng cao</h4>
                  <button onClick={() => setIsAdvancedOpen(false)} className="text-[var(--muted-foreground)] opacity-70 hover:text-[var(--muted-foreground)]"><X className="h-4 w-4"/></button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--foreground)]">Từ ngày</label>
                    <DateFieldVN
                      value={toDateInputValue(dateFrom)}
                      onChange={(value) => setFilter({ dateFrom: value })}
                      className="border-[var(--border)] w-full"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[var(--foreground)]">Đến ngày</label>
                    <DateFieldVN
                      value={toDateInputValue(dateTo)}
                      onChange={(value) => setFilter({ dateTo: value })}
                      className="border-[var(--border)] w-full"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer select-none pt-1">
                    <input
                      type="checkbox"
                      checked={showArchived}
                      onChange={(e) => setShowArchived(e.target.checked)}
                      className="rounded border-[var(--border)] text-blue-600 focus:ring-blue-500 h-4 w-4"
                    />
                    Bao gồm vật tư đã lưu trữ
                  </label>
                  <div className="border-t border-[var(--border)] pt-3 flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => { setFilter({ dateFrom: "", dateTo: "" }); setShowArchived(false); }}>Đặt lại</Button>
                    <Button className="flex-1" onClick={() => setIsAdvancedOpen(false)}>Áp dụng</Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {hasAnyFilter && (
            <Button type="button" variant="ghost" onClick={clearFilter} className="hidden lg:flex text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              Xóa lọc
            </Button>
          )}
        </div>

        {hasAnyFilter && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
            {q && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-2.5 pr-1 text-[13px] font-medium text-blue-700">
                Từ khóa: {q}
                <button onClick={() => setFilter({ q: "" })} className="rounded-full p-0.5 hover:bg-blue-200"><X className="h-3 w-3"/></button>
              </span>
            )}
            {movementType !== "ALL" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-2.5 pr-1 text-[13px] font-medium text-blue-700">
                Loại: {movementType === "IMPORT" ? "Nhập" : "Xuất"}
                <button onClick={() => setFilter({ movementType: "ALL" })} className="rounded-full p-0.5 hover:bg-blue-200"><X className="h-3 w-3"/></button>
              </span>
            )}
            {materialId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-2.5 pr-1 text-[13px] font-medium text-blue-700">
                Vật tư: {materialOptions.find(m => m.value === materialId)?.name || materialId}
                <button onClick={() => setFilter({ materialId: "" })} className="rounded-full p-0.5 hover:bg-blue-200"><X className="h-3 w-3"/></button>
              </span>
            )}
            {dateFrom && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-2.5 pr-1 text-[13px] font-medium text-blue-700">
                Từ: {formatDateLabel(dateFrom)}
                <button onClick={() => setFilter({ dateFrom: "" })} className="rounded-full p-0.5 hover:bg-blue-200"><X className="h-3 w-3"/></button>
              </span>
            )}
            {dateTo && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 py-1 pl-2.5 pr-1 text-[13px] font-medium text-blue-700">
                Đến: {formatDateLabel(dateTo)}
                <button onClick={() => setFilter({ dateTo: "" })} className="rounded-full p-0.5 hover:bg-blue-200"><X className="h-3 w-3"/></button>
              </span>
            )}
            {showArchived && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--border)] py-1 pl-2.5 pr-1 text-[13px] font-medium text-[var(--foreground)]">
                Có lưu trữ
                <button onClick={() => setShowArchived(false)} className="rounded-full p-0.5 hover:bg-slate-200"><X className="h-3 w-3"/></button>
              </span>
            )}
            <div className="ml-auto text-xs font-medium text-[var(--muted-foreground)] hidden sm:block">
              {formatQuantity(filteredTransactions.length, 0)} giao dịch khớp bộ lọc
              {!showArchived && <span className="ml-2 font-normal text-[var(--muted-foreground)] opacity-70">(Đang ẩn giao dịch của vật tư đã lưu trữ)</span>}
            </div>
          </div>
        )}
      </div>

      {!hasAnyFilter && (
        <div className="text-xs font-medium text-[var(--muted-foreground)]">
          {formatQuantity(filteredTransactions.length, 0)} giao dịch
          {!showArchived && <span className="ml-2 font-normal text-[var(--muted-foreground)] opacity-70">(Đang ẩn giao dịch của vật tư đã lưu trữ)</span>}
        </div>
      )}

      <MaterialDataTable className="hidden md:block">
        <table className="w-full min-w-[1080px] table-fixed text-left text-sm">
          <thead className="bg-[var(--surface-subtle)] text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            <tr>
              <th className="w-[104px] border-b border-[var(--border)] px-3 py-3 whitespace-nowrap">Loại</th>
              <th className="w-[260px] border-b border-[var(--border)] px-3 py-3 whitespace-nowrap">Vật tư</th>
              <th className="w-[150px] border-b border-[var(--border)] px-3 py-3 text-right whitespace-nowrap">Số lượng</th>
              <th className="w-[150px] border-b border-[var(--border)] px-3 py-3 text-right whitespace-nowrap">Tồn sau</th>
              <th className="w-[160px] border-b border-[var(--border)] px-3 py-3 whitespace-nowrap">Ngày giao dịch</th>
              <th className="w-[130px] border-b border-[var(--border)] px-3 py-3 whitespace-nowrap">Người tạo</th>
              <th className="w-[180px] border-b border-[var(--border)] px-3 py-3 whitespace-nowrap">Nguồn</th>
              <th className="border-b border-[var(--border)] px-3 py-3 whitespace-nowrap">Ghi chú</th>
              <th className="w-[80px] whitespace-nowrap border-b border-[var(--border)] px-3 py-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredTransactions.map((transaction) => {
              const sign = getMovementSign(transaction.type);
              const colorClass = sign === "+" ? "text-emerald-700" : "text-rose-700";
              const ledger = ledgerById.get(transaction.id);
              const note = displayNote(transaction.notes);
              const isActiveRow = activeTxId === transaction.id;

              return (
                <tr 
                  key={transaction.id} 
                  className={`cursor-pointer transition ${
                    isActiveRow
                      ? "bg-blue-50/70 border-l-2 border-l-blue-600 font-medium"
                      : "hover:bg-[var(--surface-subtle)]"
                  }`}
                  onClick={() => handleOpenDrawer(transaction)}
                >
                  <td className="px-3 py-3"><MovementTypeBadge type={transaction.type} /></td>
                  <td className="min-w-0 px-3 py-3">
                    <div className="flex items-center gap-2">
                      <SafeText className="font-semibold text-slate-950">{transaction.materialItem.name}</SafeText>
                      {!transaction.materialItem.isActive && (
                        <span className="inline-flex items-center rounded-sm bg-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] border border-[var(--border)]">
                          Đã lưu trữ
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-xs font-medium text-[var(--muted-foreground)]" title={transaction.materialItem.code}>{transaction.materialItem.code}</div>
                  </td>
                  <td className={`px-3 py-3 text-right font-mono font-bold tabular-nums ${colorClass}`}>
                    {sign}{formatQuantity(transaction.quantity)}
                    <span className="ml-1 font-sans text-xs font-medium text-[var(--muted-foreground)]">{transaction.materialItem.unit}</span>
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-semibold text-[var(--foreground)] tabular-nums">
                    {ledger ? `${formatQuantity(ledger.stockAfter)} ${transaction.materialItem.unit}` : "—"}
                  </td>
                  <td className="px-3 py-3"><DateCell value={formatDateTime(transaction.movementDate)} /></td>
                  <td className="px-3 py-3 text-sm text-[var(--muted-foreground)]">
                    {transaction.materialRequest ? (
                      <SafeText>{transaction.materialRequest.requestedBy?.name || "Hệ thống"}</SafeText>
                    ) : (
                      "Chưa ghi nhận"
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm text-[var(--muted-foreground)]">
                    {transaction.materialRequest ? (
                      <div className="flex flex-col">
                        <span className="font-medium text-blue-700">Đề xuất vật tư</span>
                        <span className="text-xs font-mono">{transaction.materialRequest.requestNo}</span>
                      </div>
                    ) : (
                      "Giao dịch thủ công"
                    )}
                  </td>
                  <td className="min-w-0 px-3 py-3">
                    <SafeText className="text-[var(--muted-foreground)]">{note}</SafeText>
                  </td>
                  <td className="px-3 py-3 text-right relative">
                    <div className="flex justify-end">
                      <MaterialRowActionMenu
                        onOpenChange={(isOpen) => setActiveTxId(isOpen ? transaction.id : null)}
                        actions={[
                          {
                            label: "Xem chi tiết",
                            icon: <Eye className="h-4 w-4 text-slate-500" />,
                            onClick: () => handleOpenDrawer(transaction),
                          },
                          {
                            label: "Xem vật tư",
                            icon: <Box className="h-4 w-4 text-slate-500" />,
                            disabled: !transaction.materialItem.isActive,
                            disabledReason: !transaction.materialItem.isActive ? "Vật tư đã được lưu trữ/xóa" : undefined,
                            onClick: () => {
                              if (transaction.materialItem.isActive) {
                                const params = new URLSearchParams(window.location.search);
                                params.set("tab", "catalog");
                                if (transaction.materialItem?.code) params.set("search", transaction.materialItem.code);
                                router.push(`?${params.toString()}`);
                              }
                            },
                          },
                          ...(transaction.type === "IMPORT" || transaction.type === "EXPORT" ? [
                            {
                              label: `${transaction.type === "IMPORT" ? "Nhập" : "Xuất"} tiếp vật tư này`,
                              icon: <Repeat2 className="h-4 w-4 text-blue-600" />,
                              disabled: !transaction.materialItem.isActive,
                              disabledReason: !transaction.materialItem.isActive ? "Vật tư không còn hoạt động" : undefined,
                              onClick: () => {
                                if (transaction.materialItem.isActive) {
                                  onAddTransaction(transaction.type as "IMPORT" | "EXPORT", transaction.materialItemId);
                                }
                              },
                            }
                          ] : []),
                          {
                            label: "Sao chép thông tin",
                            icon: <Copy className="h-4 w-4 text-slate-500" />,
                            onClick: () => {
                              const text = `${transaction.type === "IMPORT" ? "Nhập" : "Xuất"} ${formatQuantity(Number(transaction.quantity))} ${transaction.materialItem?.unit || ""} ${transaction.materialItem?.name || ""}`;
                              void navigator.clipboard.writeText(text);
                              toast.success("Đã sao chép thông tin giao dịch.");
                            },
                          }
                        ]}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredTransactions.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center">
                  <ClipboardList className="mx-auto h-9 w-9 text-slate-300" />
                  <div className="mt-2 font-semibold text-[var(--foreground)]">Chưa có giao dịch phù hợp.</div>
                  {!hasMaterials && <p className="mt-1 text-sm text-[var(--muted-foreground)]">Tạo vật tư ở tab Danh mục trước.</p>}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </MaterialDataTable>

      <div className="space-y-3 md:hidden">
        {filteredTransactions.map((transaction) => {
          const sign = getMovementSign(transaction.type);
          const colorClass = sign === "+" ? "text-emerald-700" : "text-rose-700";
          const ledger = ledgerById.get(transaction.id);
          return (
            <ContentCard key={transaction.id} className="cursor-pointer p-3 active:scale-[0.99] transition-transform" onClick={() => handleOpenDrawer(transaction)}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <MovementTypeBadge type={transaction.type} />
                    {!transaction.materialItem.isActive && (
                      <span className="inline-flex items-center rounded-sm bg-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)] border border-[var(--border)]">
                        Đã lưu trữ
                      </span>
                    )}
                  </div>
                  <SafeText className="mt-3 font-bold text-slate-950">{transaction.materialItem.name}</SafeText>
                  <div className="mt-1 truncate font-mono text-xs font-medium text-[var(--muted-foreground)]">{transaction.materialItem.code}</div>
                </div>
                <div className={`shrink-0 text-right font-mono text-lg font-bold ${colorClass}`}>
                  {sign}{formatQuantity(transaction.quantity)}
                  <div className="font-sans text-xs font-medium text-[var(--muted-foreground)]">{transaction.materialItem.unit}</div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] p-2.5 sm:p-3 text-sm text-[var(--muted-foreground)]">
                <div>
                  <div className="text-xs text-[var(--muted-foreground)]">Ngày</div>
                  <div className="font-medium text-[var(--foreground)]">{formatDateTime(transaction.movementDate)}</div>
                </div>
                <div>
                  <div className="text-xs text-[var(--muted-foreground)]">Tồn sau</div>
                  <div className="font-mono font-semibold text-[var(--foreground)]">{ledger ? `${formatQuantity(ledger.stockAfter)} ${transaction.materialItem.unit}` : "—"}</div>
                </div>
              </div>
              {transaction.notes && <SafeText className="mt-2 text-sm text-[var(--muted-foreground)]">{displayNote(transaction.notes)}</SafeText>}
            </ContentCard>
          );
        })}
      </div>

      <TransactionDetailDrawer
        transaction={selectedTransaction}
        ledgerInfo={selectedLedger}
        sourceLabel="Giao dịch thủ công, chưa liên kết đề xuất vật tư"
        displayNote={selectedTransaction ? displayNote(selectedTransaction.notes) : "—"}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
