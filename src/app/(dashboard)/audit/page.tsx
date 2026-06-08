import { EmptyState } from '@/components/ui/empty-state';
import { History } from 'lucide-react';

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Nhật ký hệ thống</h1>
      </div>
      <EmptyState 
        title="Chưa có nhật ký hoạt động" 
        description="Mọi thao tác thay đổi dữ liệu quan trọng sẽ được lưu vết tại đây." 
        icon={<History className="h-6 w-6 text-slate-500" />}
      />
    </div>
  );
}
