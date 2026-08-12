"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { MaterialMovementDto } from "@/app/(dashboard)/materials/actions";
import { formatDateTime, formatManufacturerOrigin, formatQuantity, getMovementSign } from "./materials-formatters";
import { MovementTypeBadge } from "./materials-badges";
import { ContentCard, SafeText } from "@/components/ui/enterprise";
import { useRouter, useSearchParams } from "next/navigation";

type MovementFilter = "ALL" | "IMPORT" | "EXPORT";
type DisplayMode = "project" | "all";

interface Props {
  transactions: MaterialMovementDto[];
  onSelectProject: (projectId: string) => void;
}

const filterOptions: Array<{ value: MovementFilter; label: string }> = [
  { value: "ALL", label: "Tất cả" },
  { value: "IMPORT", label: "Nhập kho" },
  { value: "EXPORT", label: "Xuất kho" },
];

function Quantity({ transaction }: { transaction: MaterialMovementDto }) {
  const sign = getMovementSign(transaction.type);
  const color = sign === "+" ? "text-emerald-700" : "text-amber-700";
  return (
    <span className={`font-mono font-bold tabular-nums ${color}`}>
      {sign}{formatQuantity(transaction.quantity)}{" "}
      <span className="font-sans text-xs font-medium text-[var(--muted-foreground)]">{transaction.materialItem.unit}</span>
    </span>
  );
}

function MaterialName({ transaction }: { transaction: MaterialMovementDto }) {
  return (
    <div className="min-w-0">
      <SafeText className="font-semibold text-slate-900">{transaction.materialItem.name}</SafeText>
      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{formatManufacturerOrigin(transaction.materialItem.manufacturer, transaction.materialItem.origin, "Chưa cập nhật")}</p>
    </div>
  );
}

export function MaterialsPortfolioTransactions({ transactions, onSelectProject }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const movementType = (searchParams.get("movementType") || "ALL") as MovementFilter;
  const view: DisplayMode = searchParams.get("transactionView") === "all" ? "all" : "project";

  useEffect(() => {
    setQuery((current) => current === urlQuery ? current : urlQuery);
  }, [urlQuery]);

  const update = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "ALL") params.delete(key);
      else params.set(key, value);
    });
    params.set("tab", "transactions");
    params.set("scope", "portfolio");
    router.replace(`?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (urlQuery === query) return;
    const timer = window.setTimeout(() => update({ q: query }), 250);
    return () => window.clearTimeout(timer);
  // update is intentionally derived from the latest URL state; query is the only delayed input.
  }, [query, urlQuery]);

  const { validTransactions, unresolvedCount } = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi-VN");
    const filtered = transactions.filter((transaction) => {
      if (movementType !== "ALL" && transaction.type !== movementType) return false;
      if (!normalized) return true;
      return [transaction.project?.name, transaction.project?.code, transaction.materialItem.name, transaction.materialItem.code, transaction.notes]
        .filter(Boolean)
        .some((value) => String(value).toLocaleLowerCase("vi-VN").includes(normalized));
    });
    return {
      validTransactions: filtered.filter((transaction) => Boolean(transaction.project?.name)),
      unresolvedCount: filtered.filter((transaction) => !transaction.project?.name).length,
    };
  }, [movementType, query, transactions]);

  const groups = useMemo(() => {
    const grouped = new Map<string, { id: string; name: string; transactions: MaterialMovementDto[] }>();
    validTransactions.forEach((transaction) => {
      const current = grouped.get(transaction.projectId);
      if (current) current.transactions.push(transaction);
      else grouped.set(transaction.projectId, { id: transaction.projectId, name: transaction.project!.name, transactions: [transaction] });
    });
    return [...grouped.values()]
      .map((group) => ({ ...group, transactions: group.transactions.sort((a, b) => String(b.movementDate).localeCompare(String(a.movementDate))) }))
      .sort((a, b) => a.name.localeCompare(b.name, "vi"));
  }, [validTransactions]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] lg:flex-row lg:items-center">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo công trình, vật tư hoặc ghi chú..." className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </label>
        <div className="inline-flex h-10 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-1" aria-label="Lọc loại giao dịch">
          {filterOptions.map((option) => <button key={option.value} type="button" onClick={() => update({ movementType: option.value })} className={`rounded-md px-3 text-sm font-semibold transition ${movementType === option.value ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950"}`}>{option.label}</button>)}
        </div>
        <div className="inline-flex h-10 shrink-0 rounded-lg border border-[var(--border)] bg-[var(--surface-subtle)] p-1" aria-label="Chế độ hiển thị giao dịch">
          <button type="button" onClick={() => update({ transactionView: "project" })} className={`rounded-md px-3 text-sm font-semibold transition ${view === "project" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950"}`}>Theo công trình</button>
          <button type="button" onClick={() => update({ transactionView: "all" })} className={`rounded-md px-3 text-sm font-semibold transition ${view === "all" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-950"}`}>Tất cả giao dịch</button>
        </div>
      </div>

      {unresolvedCount > 0 && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{unresolvedCount} giao dịch thiếu liên kết tên công trình và không được hiển thị trong màn điều hành. Cần kiểm tra quan hệ dữ liệu tại máy chủ.</div>}

      {view === "project" ? (
        <div className="space-y-4">
          {groups.map((group) => <ContentCard key={group.id} className="overflow-hidden">
            <button type="button" onClick={() => onSelectProject(group.id)} className="flex w-full items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-4 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 sm:px-5">
              <SafeText className="line-clamp-2 text-base font-bold leading-5 text-slate-950">{group.name}</SafeText>
              <span className="shrink-0 text-sm font-medium text-[var(--muted-foreground)]">{group.transactions.length} giao dịch</span>
            </button>
            <div className="hidden border-b border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] sm:grid sm:grid-cols-[100px_minmax(180px,1fr)_140px_155px_minmax(160px,1.4fr)]"><span>Loại</span><span>Vật tư</span><span className="text-right">Số lượng</span><span className="text-right">Thời gian</span><span>Ghi chú</span></div>
            <div className="divide-y divide-slate-100">
              {group.transactions.map((transaction) => <div key={transaction.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[100px_minmax(180px,1fr)_140px_155px_minmax(160px,1.4fr)] sm:items-center sm:px-5"><div><MovementTypeBadge type={transaction.type} compact /></div><MaterialName transaction={transaction} /><div className="sm:text-right"><Quantity transaction={transaction} /></div><time className="text-xs text-[var(--muted-foreground)] sm:text-right">{formatDateTime(transaction.movementDate)}</time><SafeText className="text-sm text-[var(--muted-foreground)]">{transaction.notes?.trim() || "Không có ghi chú"}</SafeText></div>)}
            </div>
          </ContentCard>)}
          {groups.length === 0 && <ContentCard className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">Không có giao dịch phù hợp.</ContentCard>}
        </div>
      ) : (
        <ContentCard className="overflow-hidden">
          <div className="hidden border-b border-[var(--border)] bg-[var(--surface-subtle)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)] sm:grid sm:grid-cols-[minmax(200px,1.2fr)_100px_minmax(180px,1fr)_140px_155px_minmax(160px,1.4fr)]"><span>Công trình</span><span>Loại</span><span>Vật tư</span><span className="text-right">Số lượng</span><span className="text-right">Thời gian</span><span>Ghi chú</span></div>
          <div className="divide-y divide-slate-100">
            {validTransactions.map((transaction) => <div key={transaction.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[minmax(200px,1.2fr)_100px_minmax(180px,1fr)_140px_155px_minmax(160px,1.4fr)] sm:items-center sm:px-5"><button type="button" onClick={() => onSelectProject(transaction.projectId)} className="rounded text-left outline-none hover:underline focus-visible:ring-2 focus-visible:ring-blue-500"><SafeText className="line-clamp-2 font-semibold text-slate-900">{transaction.project!.name}</SafeText></button><div><MovementTypeBadge type={transaction.type} compact /></div><MaterialName transaction={transaction} /><div className="sm:text-right"><Quantity transaction={transaction} /></div><time className="text-xs text-[var(--muted-foreground)] sm:text-right">{formatDateTime(transaction.movementDate)}</time><SafeText className="text-sm text-[var(--muted-foreground)]">{transaction.notes?.trim() || "Không có ghi chú"}</SafeText></div>)}
            {validTransactions.length === 0 && <div className="px-5 py-10 text-center text-sm text-[var(--muted-foreground)]">Không có giao dịch phù hợp.</div>}
          </div>
        </ContentCard>
      )}
    </div>
  );
}
