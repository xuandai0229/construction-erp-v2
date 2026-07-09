import Link from "next/link";
import { ArrowRight, CreditCard, FileText } from "lucide-react";
import type { DashboardFinanceSummary } from "@/lib/dashboard/dashboard-queries";
import { formatCurrencyVND, formatDateVNShort } from "@/lib/dashboard/dashboard-formatters";
import { StatusBadge } from "@/components/ui/status-badge";
import { DashboardEmptyState } from "./dashboard-empty-state";
import { ContentCard } from "@/components/ui/enterprise";

function paymentVariant(status: string) {
  if (status === "PAID") return "success" as const;
  if (status === "REJECTED" || status === "CANCELLED") return "danger" as const;
  if (status === "SUBMITTED" || status === "APPROVED") return "warning" as const;
  return "neutral" as const;
}

export function DashboardFinanceSummaryPanel({ summary }: { summary: DashboardFinanceSummary }) {
  if (!summary) return null;

  return (
    <ContentCard className="flex flex-col">
      <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="text-base font-bold text-slate-950">Tài chính, hợp đồng, thanh toán</h2>
          <p className="mt-1 text-sm text-slate-600">Chỉ hiển thị cho role có quyền xem tài chính.</p>
        </div>
        <Link href="/accounting" className="inline-flex items-center gap-1 text-sm font-semibold text-blue-700 hover:text-blue-800">
          Mở thanh toán <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 divide-y divide-slate-100 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><FileText className="h-4 w-4 text-blue-700" />Tổng giá trị hợp đồng</div>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{formatCurrencyVND(summary.totalContractValue)}</p>
          <p className="mt-1 text-xs font-medium text-slate-600">{summary.activeContracts} hợp đồng đang hiệu lực</p>
        </div>
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700"><CreditCard className="h-4 w-4 text-amber-700" />Thanh toán cần xử lý</div>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950">{formatCurrencyVND(summary.pendingPaymentAmount)}</p>
          <p className="mt-1 text-xs font-medium text-slate-600">{summary.pendingPaymentCount} hồ sơ chưa hoàn tất</p>
        </div>
        <div className="p-4 sm:p-5">
          <h3 className="mb-3 text-sm font-bold text-slate-950">Hồ sơ gần đây</h3>
          {summary.recentPayments.length === 0 ? (
            <p className="text-sm text-slate-500">Chưa có hồ sơ thanh toán.</p>
          ) : (
            <div className="space-y-2">
              {summary.recentPayments.slice(0, 2).map((payment) => (
                <Link key={payment.id} href={payment.href} className="flex items-center justify-between rounded-lg border border-slate-100 p-2 hover:bg-slate-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-xs font-bold text-slate-950">{payment.title}</p>
                    <p className="mt-0.5 line-clamp-1 text-[10px] font-medium text-slate-600">{payment.projectName} · {formatDateVNShort(payment.createdAt)}</p>
                  </div>
                  <div className="ml-2 flex shrink-0 flex-col items-end">
                    <StatusBadge variant={paymentVariant(payment.status)} size="sm">{payment.status}</StatusBadge>
                    <p className="mt-1 text-xs font-bold text-slate-900">{formatCurrencyVND(payment.amount)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </ContentCard>
  );
}
