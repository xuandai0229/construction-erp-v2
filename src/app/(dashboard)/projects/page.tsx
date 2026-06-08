import { EmptyState } from '@/components/ui/empty-state';
import { Building2 } from 'lucide-react';

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý Công trình</h1>
      </div>
      <EmptyState 
        title="Chưa có công trình nào" 
        description="Bắt đầu tạo công trình mới để quản lý tiến độ, chi phí và tài liệu." 
        icon={<Building2 className="h-6 w-6 text-slate-500" />}
      />
    </div>
  );
}
