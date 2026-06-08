import { EmptyState } from '@/components/ui/empty-state';
import { CreditCard } from 'lucide-react';

export default function AccountingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Kế toán & Thanh toán</h1>
      </div>
      <EmptyState 
        title="Chưa có hồ sơ thanh toán" 
        description="Quản lý đề nghị thanh toán, hoá đơn và kế hoạch dòng tiền." 
        icon={<CreditCard className="h-6 w-6 text-slate-500" />}
      />
    </div>
  );
}
