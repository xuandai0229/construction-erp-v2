import { EmptyState } from '@/components/ui/empty-state';
import { Package } from 'lucide-react';

export default function MaterialsPage() {
  return (
    <div className="app-page space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-heading">Quản lý vật tư</h1>
          <p className="page-description">Theo dõi vật tư, thiết bị và nhu cầu sử dụng tại công trường.</p>
        </div>
      </div>
      <EmptyState 
        title="Chưa có dữ liệu vật tư" 
        description="Theo dõi nhập, xuất, tồn kho vật tư thiết bị tại công trường." 
        icon={<Package className="h-6 w-6 text-slate-500" />}
      />
    </div>
  );
}
