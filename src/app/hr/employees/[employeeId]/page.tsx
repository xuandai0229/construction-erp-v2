import React from "react";
import Link from "next/link";
import { HrWorkspaceShell, HrPageHeader } from "@/components/hr/hr-workspace-shell";
import { HrWorkspaceTabs } from "@/components/hr/hr-workspace-tabs";
import { HrAccessDenied } from "@/components/hr/hr-access-denied";
import { EmployeeDetailView } from "@/components/hr/employee-detail-view";
import { checkHrPermission, buildEmployeeScopeWhereClause } from "@/lib/hr/hr-auth-guard";
import { maskEmail, projectEmployeeForDetail } from "@/lib/hr/hr-projection";
import prisma from "@/lib/prisma";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface EmployeeDetailPageProps {
  params: Promise<{ employeeId: string }>;
}

export default async function EmployeeDetailPage({ params }: EmployeeDetailPageProps) {
  const permCheck = await checkHrPermission("hr:employee:read");
  if (!permCheck.allowed) {
    return (
      <HrWorkspaceShell>
        <HrPageHeader
          title="Chi tiết hồ sơ nhân viên"
          description="Thông tin chi tiết nhân sự, quá trình công tác và lịch sử liên kết"
        />
        <HrWorkspaceTabs />
        <HrAccessDenied requiredPermission="hr:employee:read" />
      </HrWorkspaceShell>
    );
  }

  const { employeeId } = await params;
  const scopeWhere = await buildEmployeeScopeWhereClause(permCheck.context, permCheck.scope);

  const rawEmployee = await prisma.employee.findFirst({
    where: {
      AND: [{ id: employeeId }, scopeWhere],
    },
    include: {
      user: { select: { id: true, name: true, email: true, username: true, role: true } },
      orgAssignments: {
        where: { endDate: null },
        include: {
          organizationUnit: { select: { id: true, name: true, code: true } },
          position: { select: { id: true, title: true, code: true } },
        },
      },
    },
  });

  if (!rawEmployee) {
    notFound();
  }

  const [
    organizationAssignments,
    projectAssignments,
    changeHistory,
    unlinkedUsers,
    allUnits,
    allPositions,
    updatePerm,
    archivePerm,
    readSensitivePerm,
  ] = await Promise.all([
    prisma.employeeOrganizationAssignment.findMany({
      where: { employeeId },
      include: {
        organizationUnit: { select: { id: true, name: true, code: true } },
        position: { select: { id: true, title: true, code: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.employeeProjectAssignment.findMany({
      where: { employeeId },
      include: {
        project: { select: { id: true, name: true, code: true } },
        projectPersonnelRole: { select: { id: true, name: true, code: true } },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.employeeChangeHistory.findMany({
      where: { employeeId },
      include: {
        performedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
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
    prisma.organizationUnit.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.position.findMany({
      where: { isActive: true },
      select: { id: true, code: true, title: true },
      orderBy: { title: "asc" },
    }),
    checkHrPermission("hr:employee:update", { targetEmployeeId: employeeId }),
    checkHrPermission("hr:employee:delete", { targetEmployeeId: employeeId }),
    checkHrPermission("hr:employee:read_sensitive", { targetEmployeeId: employeeId }),
  ]);

  const employeeDto = projectEmployeeForDetail(rawEmployee, permCheck.sensitiveFieldPolicy);
  const linkedUser = rawEmployee.user ? { ...rawEmployee.user, email: maskEmail(rawEmployee.user.email) } : null;
  const safeUnlinkedUsers = unlinkedUsers.map((user) => ({ ...user, email: maskEmail(user.email) || "***" }));

  return (
    <HrWorkspaceShell>
      <HrPageHeader
        title="Chi tiết hồ sơ nhân viên"
        description={`Mã hồ sơ: ${employeeDto.code} — ${employeeDto.fullName}`}
      />

      <HrWorkspaceTabs
        rightContent={
          <Link
            href="/hr/employees"
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại danh sách</span>
          </Link>
        }
      />

      <EmployeeDetailView
        employee={{ ...employeeDto, user: linkedUser }}
        organizationAssignments={organizationAssignments}
        projectAssignments={projectAssignments}
        changeHistory={changeHistory}
        unlinkedUsers={safeUnlinkedUsers}
        allUnits={allUnits}
        allPositions={allPositions}
        canUpdate={updatePerm.allowed}
        canArchive={archivePerm.allowed}
        canReadSensitive={readSensitivePerm.allowed}
      />
    </HrWorkspaceShell>
  );
}
