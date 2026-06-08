import { EmptyState } from '@/components/ui/empty-state';
import { ClipboardCheck } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Báo cáo hiện trường</h1>
      </div>
      <EmptyState 
        title="Chưa có báo cáo" 
        description="Nhật ký thi công và báo cáo hiện trường sẽ được cập nhật tại đây." 
        icon={<ClipboardCheck className="h-6 w-6 text-slate-500" />}
      />
    </div>
  );
}
