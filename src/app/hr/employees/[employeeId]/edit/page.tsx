import React from "react";
import Link from "next/link";
import { HrWorkspaceShell, HrPageHeader } from "@/components/hr/hr-workspace-shell";
import { HrWorkspaceTabs } from "@/components/hr/hr-workspace-tabs";
import { HrAccessDenied } from "@/components/hr/hr-access-denied";
import { EmployeeEditForm } from "@/components/hr/employee-edit-form";
import { checkHrPermission, buildEmployeeScopeWhereClause } from "@/lib/hr/hr-auth-guard";
import prisma from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface EmployeeEditPageProps {
  params: Promise<{ employeeId: string }>;
}

export default async function EmployeeEditPage({ params }: EmployeeEditPageProps) {
  const { employeeId } = await params;

  const permCheck = await checkHrPermission("hr:employee:update", { targetEmployeeId: employeeId });
  if (!permCheck.allowed) {
    return (
      <HrWorkspaceShell>
        <HrPageHeader
          title="Chỉnh sửa hồ sơ nhân viên"
          description="Cập nhật thông tin cá nhân và thông tin nhận dạng bảo mật"
        />
        <HrWorkspaceTabs />
        <HrAccessDenied requiredPermission="hr:employee:update" />
      </HrWorkspaceShell>
    );
  }

  const scopeWhere = await buildEmployeeScopeWhereClause(permCheck.context, permCheck.scope);

  const employee = await prisma.employee.findFirst({
    where: {
      AND: [{ id: employeeId }, scopeWhere],
    },
    select: {
      id: true,
      code: true,
      fullName: true,
      gender: true,
      dateOfBirth: true,
      phoneNumber: true,
      personalEmail: true,
      status: true,
      resignedDate: true,
      updatedAt: true,
    },
  });

  if (!employee) {
    notFound();
  }

  return (
    <HrWorkspaceShell>
      <HrPageHeader
        title="Chỉnh sửa hồ sơ nhân viên"
        description={`Mã NV: ${employee.code} — ${employee.fullName}`}
      />

      <HrWorkspaceTabs
        rightContent={
          <Link
            href={`/hr/employees/${employeeId}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại chi tiết</span>
          </Link>
        }
      />

      <EmployeeEditForm
        employee={{
          ...employee,
          dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.toISOString() : null,
          resignedDate: employee.resignedDate ? employee.resignedDate.toISOString() : null,
          updatedAt: employee.updatedAt.toISOString(),
        }}
      />
    </HrWorkspaceShell>
  );
}
