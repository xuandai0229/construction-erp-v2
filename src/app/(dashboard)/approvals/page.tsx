import { EmptyState } from '@/components/ui/empty-state';
import { CheckSquare } from 'lucide-react';

export default function ApprovalsPage() {
  return (
    <div className="app-page space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-heading">Phê duyệt</h1>
          <p className="page-description">Tổng hợp các yêu cầu đang chờ quyết định và phản hồi.</p>
        </div>
      </div>
      <EmptyState 
        title="Không có yêu cầu chờ duyệt" 
        description="Các yêu cầu duyệt thanh toán, vật tư hoặc báo cáo sẽ hiển thị ở đây." 
        icon={<CheckSquare className="h-6 w-6 text-slate-500" />}
      />
    </div>
  );
}
