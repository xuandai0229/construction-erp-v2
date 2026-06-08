import { EmptyState } from '@/components/ui/empty-state';
import { FileText } from 'lucide-react';

export default function ContractsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Quản lý Hợp đồng</h1>
      </div>
      <EmptyState 
        title="Chưa có hợp đồng" 
        description="Quản lý hợp đồng với chủ đầu tư, thầu phụ và nhà cung cấp." 
        icon={<FileText className="h-6 w-6 text-slate-500" />}
      />
    </div>
  );
}
