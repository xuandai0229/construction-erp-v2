import { EmptyState } from '@/components/ui/empty-state';
import { Package } from 'lucide-react';

export default function MaterialsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý Vật tư</h1>
      </div>
      <EmptyState 
        title="Chưa có dữ liệu vật tư" 
        description="Theo dõi nhập, xuất, tồn kho vật tư thiết bị tại công trường." 
        icon={<Package className="h-6 w-6 text-slate-500" />}
      />
    </div>
  );
}
