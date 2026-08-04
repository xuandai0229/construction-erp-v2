import React from "react";
import { HrWorkspaceShell, HrPageHeader } from "@/components/hr/hr-workspace-shell";
import { HrWorkspaceTabs } from "@/components/hr/hr-workspace-tabs";
import { HrAccessDenied } from "@/components/hr/hr-access-denied";
import { OrganizationSubTabs } from "@/components/hr/organization-sub-tabs";
import {
  UnitManagerManagementClient,
  ManagerAssignmentItem,
  UnitOption,
  EmployeeOption,
} from "@/components/hr/unit-manager-management-client";
import { checkHrPermission } from "@/lib/hr/hr-auth-guard";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function OrganizationManagersPage() {
  const permCheck = await checkHrPermission("hr:employee:read");
  if (!permCheck.allowed) {
    return (
      <HrWorkspaceShell>
        <HrPageHeader
          title="Người quản lý đơn vị"
          description="Quản lý Trưởng đơn vị, phụ trách phòng ban và lịch sử nhiệm kỳ"
        />
        <HrWorkspaceTabs />
        <HrAccessDenied requiredPermission="hr:employee:read" />
      </HrWorkspaceShell>
    );
  }

  const managePerm = await checkHrPermission("hr:organization:manage");

  const [rawAssignments, rawUnits, rawEmployees] = await Promise.all([
    prisma.organizationUnitManagerAssignment.findMany({
      orderBy: { startDate: "desc" },
      include: {
        organizationUnit: { select: { id: true, name: true, code: true } },
        employee: { select: { id: true, fullName: true, code: true } },
      },
    }),
    prisma.organizationUnit.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.employee.findMany({
      where: { status: { in: ["ACTIVE", "PROBATION"] } },
      select: { id: true, code: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const assignments: ManagerAssignmentItem[] = rawAssignments.map((a) => ({
    id: a.id,
    organizationUnitId: a.organizationUnitId,
    organizationUnit: a.organizationUnit,
    employeeId: a.employeeId,
    employee: a.employee,
    startDate: a.startDate.toISOString(),
    endDate: a.endDate ? a.endDate.toISOString() : null,
    isPrimary: a.isPrimary,
    decisionNo: a.decisionNo,
    createdAt: a.createdAt.toISOString(),
  }));

  const units: UnitOption[] = rawUnits;
  const employees: EmployeeOption[] = rawEmployees;

  return (
    <HrWorkspaceShell>
      <HrPageHeader
        title="Người quản lý đơn vị"
        description="Quản lý người đứng đầu phòng ban/đơn vị và lịch sử hiệu lực nhiệm kỳ"
      />

      <HrWorkspaceTabs />
      <OrganizationSubTabs />

      <UnitManagerManagementClient
        assignments={assignments}
        units={units}
        employees={employees}
        canManage={managePerm.allowed}
      />
    </HrWorkspaceShell>
  );
}
