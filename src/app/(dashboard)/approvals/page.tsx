import { EmptyState } from '@/components/ui/empty-state';
import { CheckSquare } from 'lucide-react';

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Phê duyệt</h1>
      </div>
      <EmptyState 
        title="Không có yêu cầu chờ duyệt" 
        description="Các yêu cầu duyệt thanh toán, vật tư hoặc báo cáo sẽ hiển thị ở đây." 
        icon={<CheckSquare className="h-6 w-6 text-slate-500" />}
      />
    </div>
  );
}
