import React from "react";
import Link from "next/link";
import { HrWorkspaceShell, HrPageHeader } from "@/components/hr/hr-workspace-shell";
import { HrWorkspaceTabs } from "@/components/hr/hr-workspace-tabs";
import { HrAccessDenied } from "@/components/hr/hr-access-denied";
import { EmployeeCreateForm } from "@/components/hr/employee-create-form";
import { checkHrPermission } from "@/lib/hr/hr-auth-guard";
import prisma from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { maskEmail } from "@/lib/hr/hr-projection";

export const dynamic = "force-dynamic";

export default async function NewEmployeePage() {
  const permCheck = await checkHrPermission("hr:employee:create");
  if (!permCheck.allowed) {
    return (
      <HrWorkspaceShell>
        <HrPageHeader
          title="Thêm hồ sơ nhân viên mới"
          description="Tạo mới thông tin nhân sự và phân công công tác ban đầu"
        />
        <HrWorkspaceTabs />
        <HrAccessDenied requiredPermission="hr:employee:create" />
      </HrWorkspaceShell>
    );
  }

  // Fetch Master Data & Unlinked Users
  const [organizationUnits, positions, rawUnlinkedUsers] = await Promise.all([
    prisma.organizationUnit.findMany({
      where: { isActive: true },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
    prisma.position.findMany({
      where: { isActive: true },
      select: { id: true, title: true, code: true },
      orderBy: { level: "desc" },
    }),
    prisma.user.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        employee: null,
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const unlinkedUsers = rawUnlinkedUsers.map((user) => ({ ...user, email: maskEmail(user.email) || "***" }));

  return (
    <HrWorkspaceShell>
      <HrPageHeader
        title="Thêm hồ sơ nhân viên mới"
        description="Nhập thông tin nhân sự và phân công ban đầu. Mã nhân viên sẽ tự động tạo theo chuỗi quy định."
        action={
          <Link
            href="/hr/employees"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách</span>
          </Link>
        }
      />

      <HrWorkspaceTabs />

      <EmployeeCreateForm
        organizationUnits={organizationUnits}
        positions={positions}
        unlinkedUsers={unlinkedUsers}
      />
    </HrWorkspaceShell>
  );
}
