import { Building2, TriangleAlert, ReceiptText, Wallet, ClipboardCheck, ArrowUp, ArrowDown, HardHat } from 'lucide-react';
import type { DashboardData } from '@/lib/dashboard/dashboard-queries';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { ExecutiveIcon, type IconColorTone } from './executive-icon';

export function ExecutiveKpiGrid({ data }: { data: DashboardData }) {
  const projectsKpi = data.kpis.find(k => k.id === 'projects');
  
  const activeMatch = projectsKpi?.description.match(/(\d+)\/(\d+)/);
  const activeCount = activeMatch ? parseInt(activeMatch[1]) : 0;
  const totalCount = activeMatch ? parseInt(activeMatch[2]) : 0;
  
  const atRiskCount = data.projectOverview.filter(p => p.health === 'AT_RISK' || p.health === 'DELAYED').length;
  
  const contractValue = data.financeSummary?.totalContractValue || 0;
  const pendingPayment = data.financeSummary?.pendingPaymentAmount || 0;
  const pendingPaymentCount = data.financeSummary?.pendingPaymentCount || 0;
  
  const reportsKpi = data.kpis.find(k => k.id === 'documents-reports');
  const reportsCount = reportsKpi ? parseInt(reportsKpi.value) : 0;

  function formatCompactCurrency(value: number) {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tỷ`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
    }
    return value.toLocaleString('vi-VN');
  }

  const kpis = [
    {
      label: 'Tổng công trình',
      value: totalCount,
      subtext: '100% danh mục',
      icon: Building2,
      tone: 'blue' as IconColorTone,
      href: '/projects'
    },
    {
      label: 'Đang thi công',
      value: activeCount,
      subtext: totalCount > 0 ? `${((activeCount/totalCount)*100).toLocaleString('vi-VN', { maximumFractionDigits: 1})}% đang triển khai` : '0%',
      icon: HardHat,
      tone: 'emerald' as IconColorTone,
      trend: 'up',
      href: '/projects'
    },
    {
      label: 'Rủi ro',
      value: atRiskCount,
      subtext: 'Cần theo dõi',
      icon: TriangleAlert,
      tone: 'rose' as IconColorTone,
      trend: atRiskCount > 0 ? 'up-bad' : undefined,
      href: '/projects'
    },
    {
      label: 'Giá trị hợp đồng',
      value: contractValue === 0 ? '0 đ' : formatCompactCurrency(contractValue),
      subtext: contractValue === 0 
        ? (data.selectedProjectId ? 'Chưa có hợp đồng trong công trình này' : 'Chưa có hợp đồng trên toàn hệ thống') 
        : 'Tổng giá trị',
      icon: ReceiptText,
      tone: 'violet' as IconColorTone,
      href: '/contracts'
    },
    {
      label: 'Chờ thanh toán',
      value: pendingPayment === 0 && pendingPaymentCount === 0 ? '0 đ' : formatCompactCurrency(pendingPayment),
      subtext: pendingPayment === 0 && pendingPaymentCount === 0 
        ? (data.selectedProjectId ? 'Chưa có hồ sơ trong công trình này' : 'Chưa có hồ sơ thanh toán nào') 
        : `${pendingPaymentCount} hồ sơ`,
      icon: Wallet,
      tone: 'amber' as IconColorTone,
      trend: pendingPaymentCount > 0 ? 'neutral' : undefined,
      href: '/accounting'
    },
    {
      label: 'Báo cáo 7 ngày',
      value: reportsCount,
      subtext: '+12 so với tuần trước',
      icon: ClipboardCheck,
      tone: 'sky' as IconColorTone,
      trend: 'up',
      href: '/reports'
    }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {kpis.map((kpi, index) => (
        <Link 
          key={index} 
          href={kpi.href || '#'} 
          className="group flex min-h-[120px] flex-col justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 overflow-hidden">
              <p className="truncate whitespace-nowrap text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {kpi.label}
              </p>
              <h3 className="truncate text-2xl font-bold leading-none text-slate-900 mt-1.5">
                {kpi.value}
              </h3>
            </div>
            <ExecutiveIcon icon={kpi.icon} tone={kpi.tone} />
          </div>
          <div className="mt-4 flex items-center gap-1.5">
            {kpi.trend === 'up' && <ArrowUp className="h-3 w-3 shrink-0 text-emerald-500" />}
            {kpi.trend === 'down' && <ArrowDown className="h-3 w-3 shrink-0 text-rose-500" />}
            {kpi.trend === 'up-bad' && <ArrowUp className="h-3 w-3 shrink-0 text-rose-500" />}
            {kpi.trend === 'neutral' && <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />}
            <span className="truncate whitespace-nowrap text-[11px] font-medium text-slate-500">
              {kpi.subtext}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
