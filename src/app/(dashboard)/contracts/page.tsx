import { EmptyState } from '@/components/ui/empty-state';
import { FileText } from 'lucide-react';

export default function ContractsPage() {
  return (
    <div className="app-page space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-heading">Quản lý hợp đồng</h1>
          <p className="page-description">Tập trung hồ sơ hợp đồng và các mốc thực hiện quan trọng.</p>
        </div>
      </div>
      <EmptyState 
        title="Chưa có hợp đồng" 
        description="Quản lý hợp đồng với chủ đầu tư, thầu phụ và nhà cung cấp." 
        icon={<FileText className="h-6 w-6 text-slate-500" />}
      />
    </div>
  );
}
