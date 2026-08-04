import React from "react";
import { HrWorkspaceShell, HrPageHeader } from "./hr-workspace-shell";
import { HrWorkspaceTabs } from "./hr-workspace-tabs";
import { Construction } from "lucide-react";
import { checkHrPermission } from "@/lib/hr/hr-auth-guard";
import { HrAccessDenied } from "./hr-access-denied";

export function UnimplementedTabPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-10 bg-white border border-slate-200 rounded-xl text-center shadow-xs min-h-[300px] space-y-3">
      <div className="w-14 h-14 bg-amber-50 border border-amber-200 rounded-full flex items-center justify-center">
        <Construction className="w-7 h-7 text-amber-600" />
      </div>
      <div className="space-y-1 max-w-md">
        <h2 className="text-base font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-600 leading-5">
          Tính năng đang được tích hợp và hoàn thiện trong phiên bản nâng cấp tiếp theo. Toàn bộ dữ liệu hồ sơ nhân sự hiện tại được bảo đảm an toàn.
        </p>
      </div>
    </div>
  );
}

export async function HrUnimplementedTabPage({ title }: { title: string }) {
  const permission = await checkHrPermission("hr:employee:read");
  return (
    <HrWorkspaceShell>
      <HrPageHeader
        title="Quản lý nhân sự"
        description="Hệ thống quản trị và phát triển nguồn lực nhân sự công trình"
      />
      <HrWorkspaceTabs />
      {!permission.allowed ? (
        <HrAccessDenied requiredPermission="hr:employee:read" />
      ) : (
        <UnimplementedTabPlaceholder title={title} />
      )}
    </HrWorkspaceShell>
  );
}
