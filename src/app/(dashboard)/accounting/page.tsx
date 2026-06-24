import { EmptyState } from '@/components/ui/empty-state';
import { CreditCard } from 'lucide-react';

export default function AccountingPage() {
  return (
    <div className="app-page space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-heading">Kế toán & thanh toán</h1>
          <p className="page-description">Theo dõi hồ sơ, hóa đơn và kế hoạch thanh toán.</p>
        </div>
      </div>
      <EmptyState 
        title="Chưa có hồ sơ thanh toán" 
        description="Quản lý đề nghị thanh toán, hoá đơn và kế hoạch dòng tiền." 
        icon={<CreditCard className="h-6 w-6 text-slate-500" />}
      />
    </div>
  );
}
