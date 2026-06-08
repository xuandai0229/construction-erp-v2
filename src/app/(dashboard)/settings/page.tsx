import { EmptyState } from '@/components/ui/empty-state';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Cài đặt hệ thống</h1>
      </div>
      <EmptyState 
        title="Cấu hình hệ thống" 
        description="Quản lý phân quyền, danh mục và thiết lập chung của ERP." 
        icon={<Settings className="h-6 w-6 text-slate-500" />}
      />
    </div>
  );
}
