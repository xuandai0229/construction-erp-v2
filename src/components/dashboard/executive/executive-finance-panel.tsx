import Link from 'next/link';
import { FileText, Wallet, Activity, ChevronRight } from 'lucide-react';
import type { DashboardFinanceSummary } from '@/lib/dashboard/dashboard-queries';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatStatusLabel } from '@/lib/dashboard/dashboard-formatters';

function formatCompactCurrency(value: number) {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  }
  return value.toLocaleString('vi-VN');
}

function getStatusBadge(status: string) {
  let color = "bg-slate-100 text-slate-600 border border-slate-200";
  const label = formatStatusLabel(status) || status;
  
  const upper = status.toUpperCase();
  if (upper === 'SUBMITTED' || upper === 'PENDING') {
    color = "bg-amber-50 text-amber-600 border border-amber-100";
  } else if (upper === 'APPROVED' || upper === 'PAID') {
    color = "bg-emerald-50 text-emerald-600 border border-emerald-100";
  } else if (upper === 'DRAFT') {
    color = "bg-slate-50 text-slate-500 border border-slate-200";
  }
  
  return <span className={cn("rounded-md px-2 py-0.5 text-[10px] font-bold uppercase shrink-0", color)}>{label}</span>;
}

export function ExecutiveFinancePanel({ 
  summary 
}: { 
  summary: DashboardFinanceSummary 
}) {
  if (!summary) return null;

  return (
    <div className="flex flex-col h-full rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4 shrink-0">
        <h3 className="font-bold text-slate-900">Tài chính, hợp đồng, thanh toán</h3>
      </div>

      <div className="p-4 flex flex-col gap-4">
        {/* Mini Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="flex flex-col rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <div className="flex justify-between items-start mb-1 pl-1">
              <span className="text-[10px] font-semibold text-slate-500">Tổng giá trị hợp đồng</span>
              <FileText className="h-3.5 w-3.5 text-blue-500" />
            </div>
            {summary.totalContractValue === 0 && summary.activeContracts === 0 ? (
              <span className="text-[13px] font-medium text-slate-400 pl-1 leading-tight italic mt-1">Chưa có hợp đồng</span>
            ) : (
              <>
                <span className="text-[15px] font-bold text-slate-900 pl-1 leading-tight">{formatCompactCurrency(summary.totalContractValue)}</span>
                <span className="text-[9px] font-medium text-slate-500 pl-1 mt-0.5">{summary.activeContracts} hợp đồng</span>
              </>
            )}
          </div>

          <div className="flex flex-col rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
            <div className="flex justify-between items-start mb-1 pl-1">
              <span className="text-[10px] font-semibold text-slate-500">Hồ sơ cần thanh toán</span>
              <Wallet className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            {summary.pendingPaymentAmount === 0 && summary.pendingPaymentCount === 0 ? (
              <span className="text-[13px] font-medium text-slate-400 pl-1 leading-tight italic mt-1">Chưa có thanh toán</span>
            ) : (
              <>
                <span className="text-[15px] font-bold text-slate-900 pl-1 leading-tight">{formatCompactCurrency(summary.pendingPaymentAmount)}</span>
                <span className="text-[9px] font-medium text-slate-500 pl-1 mt-0.5">{summary.pendingPaymentCount} hồ sơ</span>
              </>
            )}
          </div>

          <div className="flex flex-col rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
            <div className="flex justify-between items-start mb-1 pl-1">
              <span className="text-[10px] font-semibold text-slate-500">Hợp đồng đang thực hiện</span>
              <Activity className="h-3.5 w-3.5 text-amber-500" />
            </div>
            {summary.activeContracts === 0 ? (
              <span className="text-[13px] font-medium text-slate-400 pl-1 leading-tight italic mt-1">Chưa có dữ liệu</span>
            ) : (
              <>
                <span className="text-[15px] font-bold text-slate-900 pl-1 leading-tight">{summary.activeContracts}</span>
                <span className="text-[9px] font-medium text-slate-500 pl-1 mt-0.5">Dự án hoạt động</span>
              </>
            )}
          </div>
        </div>

        {/* List */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5">Hồ sơ gần đây</h4>
          <div className="flex flex-col gap-2">
            {summary.recentPayments.length === 0 ? (
              <div className="py-3 text-center text-sm text-slate-500">Không có hồ sơ gần đây</div>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100 border-t border-slate-100">
                {summary.recentPayments.slice(0, 3).map((payment) => (
                  <div key={payment.id} className="group flex flex-col gap-1.5 py-2.5 hover:bg-slate-50/50 transition-colors">
                    <div className="flex justify-between items-start gap-2">
                      <Link href={payment.href} className="text-[12px] font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1">
                        {payment.title}
                      </Link>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[12.5px] font-bold text-slate-900">{formatCompactCurrency(payment.amount)}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-medium text-slate-500 line-clamp-1">{payment.projectName}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-medium text-slate-400">
                          {format(new Date(payment.createdAt), 'dd/MM/yyyy')}
                        </span>
                        {getStatusBadge(payment.status)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
