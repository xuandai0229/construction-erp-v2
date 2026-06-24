import { EmptyState } from '@/components/ui/empty-state';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="app-page space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-heading">Cài đặt hệ thống</h1>
          <p className="page-description">Quản lý các thiết lập dùng chung của hệ thống ERP.</p>
        </div>
      </div>
      <EmptyState 
        title="Cấu hình hệ thống" 
        description="Quản lý phân quyền, danh mục và thiết lập chung của ERP." 
        icon={<Settings className="h-6 w-6 text-slate-500" />}
      />
    </div>
  );
}
