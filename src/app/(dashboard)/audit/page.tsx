import { EmptyState } from '@/components/ui/empty-state';
import { History } from 'lucide-react';
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolvePermission } from "@/lib/permissions/permission-resolver";

export default async function AuditPage() {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");
  const permission = await resolvePermission(session, "audit.view_global");
  if (!permission.allowed) redirect("/projects");

  return (
    <div className="app-page space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-heading">Nhật ký hệ thống</h1>
          <p className="page-description">Tra cứu lịch sử thao tác để hỗ trợ kiểm soát và truy vết.</p>
        </div>
      </div>
      <EmptyState 
        title="Chưa có nhật ký hoạt động" 
        description="Mọi thao tác thay đổi dữ liệu quan trọng sẽ được lưu vết tại đây." 
        icon={<History className="h-6 w-6 text-slate-500" />}
      />
    </div>
  );
}
