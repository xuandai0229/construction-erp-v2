import { SettingsWorkspace } from "@/components/settings/settings-workspace";
import { getSession } from "@/lib/auth";
import { canManageUsers } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { getSystemSettings } from "./actions";

export const metadata = {
  title: "Cài đặt hệ thống | ERP Công trình",
  description: "Cấu hình vận hành, bảo mật, tài liệu và dữ liệu cho ERP công trình",
};

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login?reason=session_expired");
  if (!canManageUsers(session)) redirect("/projects");

  const initialSettings = await getSystemSettings();

  return <SettingsWorkspace initialSettings={initialSettings as any} />;
}

/*
  return (
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
*/
