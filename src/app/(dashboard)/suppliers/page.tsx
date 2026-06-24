import { EmptyState } from '@/components/ui/empty-state';
import { Users } from 'lucide-react';

export default function SuppliersPage() {
  return (
    <div className="app-page space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-heading">Nhà cung cấp & thầu phụ</h1>
          <p className="page-description">Quản lý đối tác cung ứng và đơn vị thi công theo dự án.</p>
        </div>
      </div>
      <EmptyState 
        title="Chưa có nhà cung cấp" 
        description="Quản lý danh sách nhà cung cấp vật tư và thầu phụ thi công." 
        icon={<Users className="h-6 w-6 text-slate-500" />}
      />
    </div>
  );
}
