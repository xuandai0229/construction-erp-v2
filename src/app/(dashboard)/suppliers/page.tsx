import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';

export default function SuppliersPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Nhà cung cấp & Thầu phụ</h1>
      </div>
      <EmptyState 
        title="Chưa có nhà cung cấp" 
        description="Quản lý danh sách nhà cung cấp vật tư và thầu phụ thi công." 
        icon={<Users className="h-6 w-6 text-slate-500" />}
      />
    </div>
  );
}
