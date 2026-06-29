import Link from "next/link";
import { ArrowRight, CreditCard, FileText } from "lucide-react";
import type { DashboardFinanceSummary } from "@/lib/dashboard/dashboard-queries";
import { formatCurrencyVND, formatDateVNShort } from "@/lib/dashboard/dashboard-formatters";
import { StatusBadge } from "@/components/ui/status-badge";
import { DashboardEmptyState } from "./dashboard-empty-state";

function paymentVariant(status: string) {
  if (status === "PAID") return "success" as const;
  if (status === "REJECTED" || status === "CANCELLED") return "danger" as const;
  if (status === "SUBMITTED" || status === "APPROVED") return "warning" as const;
  return "neutral" as const;
}

export function DashboardFinanceSummaryPanel({ summary }: { summary: DashboardFinanceSummary }) {
  if (!summary) return null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03]">
      <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="text-base font-bold text-slate-950">Tài chính, hợp đồng, thanh toán</h2>
          <p className="mt-1 text-sm text-slate-600">Chỉ hiển thị cho role có quyền xem tài chính.</p>
        </div>
        <Link href="/accounting" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800">
          Mở thanh toán <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><FileText className="h-4 w-4 text-blue-700" />Tổng giá trị hợp đồng</div>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">{formatCurrencyVND(summary.totalContractValue)}</p>
          <p className="mt-1 text-sm text-slate-600">{summary.activeContracts} hợp đồng đang hiệu lực</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CreditCard className="h-4 w-4 text-amber-700" />Thanh toán cần xử lý</div>
          <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-950">{formatCurrencyVND(summary.pendingPaymentAmount)}</p>
          <p className="mt-1 text-sm text-slate-600">{summary.pendingPaymentCount} hồ sơ chưa hoàn tất</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-950">Hồ sơ gần đây</h3>
          {summary.recentPayments.length === 0 ? (
            <DashboardEmptyState title="Chưa có hồ sơ thanh toán" className="mt-3 min-h-[120px] py-5" />
          ) : (
            <div className="mt-3 space-y-3">
              {summary.recentPayments.slice(0, 3).map((payment) => (
                <Link key={payment.id} href={payment.href} className="block rounded-lg border border-slate-200 p-3 hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-1 text-sm font-bold text-slate-950">{payment.title}</p>
                      <p className="mt-1 text-xs font-medium text-slate-600">{payment.projectName} · {formatDateVNShort(payment.createdAt)}</p>
                    </div>
                    <StatusBadge variant={paymentVariant(payment.status)} size="sm">{payment.status}</StatusBadge>
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-900">{formatCurrencyVND(payment.amount)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
