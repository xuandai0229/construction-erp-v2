import { EmptyState } from '@/components/ui/empty-state';
import { FolderOpen } from 'lucide-react';

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Tài liệu</h1>
      </div>
      <EmptyState 
        title="Chưa có tài liệu nào" 
        description="Thư mục trống. Bạn có thể tải lên các bản vẽ, hợp đồng hoặc hồ sơ nghiệm thu." 
        icon={<FolderOpen className="h-6 w-6 text-slate-500" />}
      />
    </div>
  );
}
